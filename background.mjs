import {parseInventory, transcriptPath, dataURL, safeName} from './core.mjs';
import {openUnitFolder} from './downloads.mjs';
import {createJob, TranscriptQueue, progress, assertReplaceable} from './queue.mjs';

const queues=new Map(),contexts=new Map(),labels=new Map();
let activeKey=null,driving=false;
const courseOf=url=>/^https:\/\/canvas\.sydney\.edu\.au\/courses\/(\d+)(?:\/|$)/.exec(url||'')?.[1];
const echoOrigin=url=>{try{const u=new URL(url);return u.protocol==='https:' && (u.hostname==='echo360.net.au'||u.hostname.endsWith('.echo360.net.au'))?u.origin:null;}catch{return null;}};
const keyFor=job=>`job:${job.origin}|${job.courseId}|${job.sectionId}`;
const error=(message,code='stale')=>Object.assign(new Error(message),{code});

async function liveContext(tabId,expected) {
  const tab=await chrome.tabs.get(tabId).catch(()=>null);
  if(!tab || courseOf(tab.url)!==expected.courseId) throw error('The original Canvas unit is no longer open. Reopen Recorded Lectures for that unit and Resume.');
  const stored=contexts.get(tabId) || (await chrome.storage.session.get(`context:${tabId}`))[`context:${tabId}`];
  if(!stored || stored.courseId!==expected.courseId || (expected.sectionId && stored.sectionId!==expected.sectionId)) throw error('Open this unit’s Recorded Lectures class list, then try again.');
  let ping;try{ping=await chrome.tabs.sendMessage(tabId,{type:'ECHO_PING'},{documentId:stored.documentId});}catch{throw error('Echo is loading or its frame was replaced. Wait for the class list, then Resume.');}
  if(!ping || ping.sectionId!==stored.sectionId || ping.origin!==stored.origin) throw error('Echo section changed. Scan the open unit again.');
  return {...stored,route:ping.route};
}

async function request(job,path,kind='json') {
  const context=await liveContext(job.sourceTabId,job);
  let response;
  try{response=await chrome.tabs.sendMessage(job.sourceTabId,{type:'ECHO_REQUEST',sectionId:job.sectionId,route:context.route,path,kind},{documentId:context.documentId});}
  catch{throw error('Echo frame disappeared during the request. Reopen this unit and Resume.');}
  // A Canvas top-level navigation can occur while the old iframe finishes its request.
  await liveContext(job.sourceTabId,job);
  if(!response?.ok) throw Object.assign(new Error(response?.error||'No response from Echo.'),{code:response?.code||'stale',retryAfter:response?.retryAfter});
  return response;
}

async function fetchRecord(job,task) {
  let lastError,absent=false;
  for(const reference of task.recording.references) {
    try {
      const info=(await request(job,transcriptPath(reference.lessonId,task.recording.mediaId,'info'))).json;
      if(!Array.isArray(info?.data?.transcriptFiles)) throw error('Echo download metadata has changed; transcript availability could not be checked.','invalid');
      const available=info.data.transcriptFiles.some(file=>String(file.label).toLowerCase()===task.format);
      if(!available){absent=true;continue;}
      const result=await request(job,transcriptPath(reference.lessonId,task.recording.mediaId,'file',task.format),'text');
      return {kind:'file',...result};
    } catch(e) {if(['auth','stale','transient'].includes(e.code))throw e;lastError=e;}
  }
  if(lastError)throw lastError;
  return {kind:'unavailable',message:absent?`Echo does not offer a ${task.format.toUpperCase()} transcript for this recording. It may be pending or restricted.`:'No accessible class reference.'};
}

function queueFor(job) {
  const queue=new TranscriptQueue(job,{
    persist:snapshot=>chrome.storage.local.set({[keyFor(snapshot)]:snapshot}),
    fetchRecord,
    saveFile:({text,format,filename})=>chrome.downloads.download({url:dataURL(text,format),filename,saveAs:false,conflictAction:'uniquify'}),
    findDownload:async task=>{
      const query=task.downloadId?{id:task.downloadId}:{filenameRegex:`\\[${task.intent.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\]`,startedAfter:new Date(task.startedAt-2000).toISOString(),limit:100};
      return (await chrome.downloads.search(query)).filter(item=>item.byExtensionId===chrome.runtime.id);
    },
    now:()=>Date.now(),token:()=>crypto.randomUUID().slice(0,8)
  });
  queues.set(keyFor(job),queue);return queue;
}

const ready=(async()=>{
  await chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'});
  const stored=await chrome.storage.local.get(null);activeKey=stored.activeKey||null;
  for(const [key,job] of Object.entries(stored)) if(key.startsWith('job:') && job?.version===1) await queueFor(job).recover();
  await chrome.alarms.create('echo-transcript-queue',{periodInMinutes:0.5});
})();

async function drive() {
  await ready;if(driving)return;const queue=queues.get(activeKey);if(!queue)return;driving=true;
  try{await queue.step();}catch(e){await queue.pause('Could not save progress: '+e.message).catch(()=>{});}
  finally{driving=false;}
  if(queue.job.state==='running' || queue.job.tasks.some(t=>t.status==='saving')) setTimeout(drive,500);
}
chrome.alarms.onAlarm.addListener(alarm=>{if(alarm.name==='echo-transcript-queue')void drive();});
chrome.downloads.onChanged.addListener(delta=>{void (async()=>{await ready;for(const queue of queues.values())await queue.downloadChanged(delta);await drive();})();});
chrome.downloads.onErased.addListener(id=>{void (async()=>{await ready;for(const queue of queues.values())await queue.downloadErased(id);})();});
chrome.runtime.onStartup.addListener(()=>void drive());
chrome.tabs.onRemoved.addListener(tabId=>{contexts.delete(tabId);void chrome.storage.session.remove(`context:${tabId}`);});

async function stateFor(tabId) {
  const tab=await chrome.tabs.get(tabId),courseId=courseOf(tab.url);
  if(!courseId)throw new Error('Open Recorded Lectures inside a Sydney Canvas unit.');
  let context=null,contextError='';try{context=await liveContext(tabId,{courseId});}catch(e){contextError=e.message;}
  const matching=[...queues.values()].filter(q=>q.job.courseId===courseId);
  await Promise.all(matching.map(queue=>queue.checkSavedFiles()));
  const jobs=matching.map(q=>({...q.job,progress:progress(q.job)}));
  return {courseId,courseName:labels.get(tabId)||context?.courseName||`Canvas ${courseId}`,context,contextError,jobs};
}

async function handle(message,sender) {
  await ready;
  const isCanvas=sender.tab && sender.frameId===0 && !!courseOf(sender.url);
  const isPopup=!sender.tab && sender.url===chrome.runtime.getURL('popup.html');
  if(message.type==='ECHO_CONTEXT') {
    if(!sender.tab || !sender.documentId || !echoOrigin(sender.url) || echoOrigin(sender.url)!==message.origin || message.route!==sender.url) return;
    const tab=await chrome.tabs.get(sender.tab.id);const courseId=courseOf(tab.url);
    if(!courseId || !message.sectionId || String(message.sectionId).length>200)return;
    const context={sourceTabId:tab.id,courseId,courseName:labels.get(tab.id)||`Canvas ${courseId}`,sectionId:message.sectionId,origin:message.origin,route:message.route,documentId:sender.documentId};
    contexts.set(tab.id,context);await chrome.storage.session.set({[`context:${tab.id}`]:context});return;
  }
  if(!isCanvas && !isPopup)throw new Error('Untrusted extension caller.');
  const tabId=isCanvas?sender.tab.id:message.tabId;
  if(message.type==='STATE') {if(isCanvas && message.courseName)labels.set(tabId,safeName(message.courseName,100));return stateFor(tabId);}
  if(message.type==='SHOW') {await chrome.tabs.sendMessage(tabId,{type:'SHOW_PANEL'},{frameId:0});return;}
  if(message.type==='SCAN') {
    const tab=await chrome.tabs.get(tabId);const courseId=courseOf(tab.url);const context=await liveContext(tabId,{courseId});
    const old=queues.get(keyFor(context));
    if(old)await old.checkSavedFiles();
    assertReplaceable(old,queues.get(keyFor(context)));
    const payload=(await request(context,`/section/${encodeURIComponent(context.sectionId)}/syllabus`)).json;
    const inventory=parseInventory(payload,context.sectionId);
    assertReplaceable(old,queues.get(keyFor(context)));
    const job=createJob({...context,courseName:labels.get(tabId)||context.courseName},inventory);
    if(old)for(const task of job.tasks){const previous=old.job.tasks.find(t=>t.key===task.key);if(previous?.status==='complete')Object.assign(task,previous);}
    if(job.tasks.length && job.tasks.every(t=>t.status==='complete'))job.state='finished';
    const queue=queueFor(job);await queue.persist();return stateFor(tabId);
  }
  const queue=queues.get(message.key);
  if(!queue || courseOf((await chrome.tabs.get(tabId)).url)!==queue.job.courseId)throw new Error('This queue belongs to another unit. Open that unit to continue.');
  if(message.type==='PAUSE') await queue.pause();
  else if(message.type==='RESUME' || message.type==='RETRY') {
    await queue.checkSavedFiles();
    const context=await liveContext(tabId,queue.job);queue.job.sourceTabId=tabId;
    if(context.origin!==queue.job.origin)throw new Error('Echo origin changed; scan this unit again.');
    const previous=queues.get(activeKey);if(previous && previous!==queue){await previous.pause('Paused while another unit downloads.');if(previous.busy||previous.job.tasks.some(t=>['starting','saving'].includes(t.status)))throw new Error('Another unit is finishing a file. Try again in a moment.');}
    activeKey=message.key;await chrome.storage.local.set({activeKey});await queue.resume({retryFailed:message.type==='RETRY'});void drive();
  } else if(message.type==='CHECK') {
    await queue.checkSavedFiles();
  } else if(message.type==='OPEN_FOLDER') {
    await queue.checkSavedFiles();await openUnitFolder(queue.job,chrome.downloads,chrome.runtime.id);
  } else if(message.type==='EXPORT') {
    const text=JSON.stringify({...queue.job,sourceTabId:undefined,documentId:undefined,route:undefined},null,2);
    await chrome.downloads.download({url:dataURL(text,'json'),filename:`EchoVideo Transcripts/${safeName(queue.job.courseName,60)}-download-report.json`,saveAs:false,conflictAction:'uniquify'});
  } else throw new Error('Unknown command.');
  return stateFor(tabId);
}
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(sender.id!==chrome.runtime.id)return;
  handle(message,sender).then(value=>reply({ok:true,value})).catch(e=>reply({ok:false,error:e.message}));return true;
});
