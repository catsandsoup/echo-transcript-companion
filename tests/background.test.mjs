import test from 'node:test';
import assert from 'node:assert/strict';
import {createJob} from '../queue.mjs';
import {parseInventory} from '../core.mjs';

const tick=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate) {
  for(let i=0;i<100;i++){if(predicate())return;await tick();}
  assert.fail('Background event did not settle');
}
function event() {
  const listeners=[];
  return {addListener:listener=>listeners.push(listener),emit:(...args)=>listeners.forEach(listener=>listener(...args))};
}

test('real background messages and download events preserve saved files and invalidate stale checks', async t=>{
  const previousChrome=globalThis.chrome;
  t.after(()=>{if(previousChrome===undefined)delete globalThis.chrome;else globalThis.chrome=previousChrome;});
  const origin='https://echo360.net.au',tabId=7,courseId='123',sectionId='sec';
  const context={origin,sourceTabId:tabId,courseId,sectionId,courseName:'Synthetic Unit',documentId:'echo-document',route:origin+'/section/sec/home'};
  const syllabus={status:'ok',data:[{type:'SyllabusLessonType',lesson:{lesson:{id:'lesson',sectionId,name:'Week 1'},medias:[{id:'media',mediaType:'Video',isAvailable:true}]}}]};
  const job=createJob(context,parseInventory(syllabus,sectionId));job.state='finished';
  const items=new Map();
  for(const [index,task] of job.tasks.entries()) {
    Object.assign(task,{status:'complete',downloadId:index+1,intent:`attempt-${index}`,bytes:12});
    task.savedFilename='/Downloads/'+task.baseFilename.replace(/\.(txt|vtt)$/,` [${task.intent}].$1`);
    items.set(task.downloadId,{id:task.downloadId,byExtensionId:'self',state:'complete',exists:true,fileSize:12,filename:task.savedFilename});
  }
  const key=`job:${origin}|${courseId}|${sectionId}`;
  const local={[key]:structuredClone(job)},session={[`context:${tabId}`]:context};
  const area=data=>({setAccessLevel:async()=>{},get:async key=>structuredClone(key===null?data:{[key]:data[key]}),set:async values=>Object.assign(data,structuredClone(values)),remove:async key=>{delete data[key];}});
  const onMessage=event(),onChanged=event(),onErased=event();
  let holdId=null,held=null,saveCalls=0,searches=0;
  globalThis.chrome={
    storage:{local:area(local),session:area(session)},
    alarms:{create:async()=>{},onAlarm:event()},
    runtime:{id:'self',getURL:path=>'chrome-extension://self/'+path,onMessage,onStartup:event()},
    tabs:{get:async id=>({id,url:`https://canvas.sydney.edu.au/courses/${courseId}/external_tools/1`}),onRemoved:event(),sendMessage:async(id,message,target)=>{
      assert.equal(id,tabId);assert.equal(target.documentId,context.documentId);
      if(message.type==='ECHO_PING')return context;
      assert.equal(message.type,'ECHO_REQUEST');assert.equal(message.path,'/section/sec/syllabus');
      return {ok:true,json:syllabus};
    }},
    downloads:{onChanged,onErased,download:async()=>{saveCalls++;throw new Error('Read/check/scan must not start a download');},search:async query=>{
      searches++;const snapshot=items.has(query.id)?[structuredClone(items.get(query.id))]:[];
      if(query.id===holdId){holdId=null;return new Promise(resolve=>{held={resolve:()=>resolve(snapshot)};});}
      return snapshot;
    }}
  };
  await import(`../background.mjs?background-wiring=${Date.now()}`);
  const sender={id:'self',tab:{id:tabId},frameId:0,url:`https://canvas.sydney.edu.au/courses/${courseId}/external_tools/1`};
  const send=message=>new Promise((resolve,reject)=>{
    onMessage.emit(message,sender,response=>response.ok?resolve(response.value):reject(new Error(response.error)));
  });

  const state=await send({type:'STATE'});
  assert.equal(state.jobs[0].progress.complete,2);
  assert.ok(searches>=4,'startup recovery and STATE both query completed downloads');
  const preserved=await send({type:'SCAN'});
  assert.equal(preserved.jobs[0].progress.complete,2);
  assert.equal(preserved.jobs[0].state,'finished');

  // Chrome can return a cached positive result after its deletion event arrived.
  holdId=1;held=null;
  const checkingDeleted=send({type:'STATE'});
  await until(()=>held);
  onChanged.emit({id:1,exists:{current:false}});
  await until(()=>local[key].tasks[0].status==='missing');
  held.resolve();
  const deleted=await checkingDeleted;
  assert.equal(deleted.jobs[0].progress.missing,1);
  assert.equal(deleted.jobs[0].progress.complete,1);

  // A rescan preserves the extant format and queues only the missing format.
  const rescanned=await send({type:'SCAN'});
  assert.deepEqual(rescanned.jobs[0].tasks.map(task=>task.status),['pending','complete']);
  assert.equal(rescanned.jobs[0].tasks[1].downloadId,2);

  holdId=2;held=null;
  const checkingErased=send({type:'STATE'});
  await until(()=>held);
  items.delete(2);
  onErased.emit(2);
  await until(()=>local[key].tasks[1].status==='uncertain');
  held.resolve();
  const erased=await checkingErased;
  assert.equal(erased.jobs[0].tasks[1].status,'uncertain');
  assert.match(erased.jobs[0].tasks[1].error,/history was cleared/);
  assert.equal(saveCalls,0,'refresh, asynchronous events and scans never redownload implicitly');
});
