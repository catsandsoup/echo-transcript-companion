import test from 'node:test';
import assert from 'node:assert/strict';
const module = await import('../queue.mjs').catch(()=>({}));
const inventory={recordings:[{mediaId:'m',lessonId:'l',title:'Week 1',date:'',references:[{lessonId:'l'}]}],issues:[],lessonCount:1,complete:true};
function setup(overrides={}) {
  assert.equal(typeof module.createJob,'function');
  let stored, count=0; const downloads=new Map();
  const job=module.createJob({sectionId:'s',courseId:'c',courseName:'Synthetic Unit',origin:'https://echo360.net.au'},inventory);
  const adapters={persist:async state=>{stored=structuredClone(state);},fetchRecord:async (_,task)=>({kind:'file',text:task.format==='vtt'?'WEBVTT\n\n00:00.000 --> 00:01.000\nHi':'Hello lecture',contentType:'text/plain'}),saveFile:async options=>{assert.equal(stored.tasks.find(t=>t.filename===options.filename).status,'starting'); const id=++count;downloads.set(id,{id,state:'complete',exists:true,filename:options.filename});return id;},findDownload:async task=>task.downloadId?[downloads.get(task.downloadId)].filter(Boolean):[],now:()=>1000,token:()=>`attempt-${count+1}`,...overrides};
  return {queue:new module.TranscriptQueue(job,adapters),adapters,downloads,get stored(){return stored;},get count(){return count;}};
}
test('TXT and VTT complete separately only after Chrome completion',async()=>{
  const s=setup(); await s.queue.resume(); await s.queue.step();
  assert.equal(s.queue.job.tasks[0].status,'saving'); assert.equal(s.queue.job.tasks[1].status,'pending');
  await s.queue.step(); await s.queue.step();
  assert.equal(s.queue.job.tasks.filter(t=>t.status==='complete').length,2); assert.equal(s.count,2);
});
test('worker restart reconciles saved download IDs without downloading again',async()=>{
  const s=setup(); await s.queue.resume(); await s.queue.step();
  const restored=new module.TranscriptQueue(s.stored,s.adapters); await restored.recover();
  assert.equal(restored.job.tasks[0].status,'complete'); assert.equal(s.count,1);
});
test('ambiguous save intent never automatically retries and missing file is explicit',async()=>{
  const s=setup(); s.queue.job.tasks[0].status='starting'; s.queue.job.tasks[0].intent='lost';
  await s.queue.recover(); assert.equal(s.queue.job.tasks[0].status,'uncertain'); assert.equal(s.count,0);
  s.queue.job.tasks[1].status='saving';s.queue.job.tasks[1].downloadId=99;
  s.downloads.set(99,{id:99,state:'complete',exists:false}); await s.queue.recover();
  assert.equal(s.queue.job.tasks[1].status,'missing');
});
test('pause during fetch prevents a new browser download; resume preserves completed files',async()=>{
  let release;const s=setup({fetchRecord:()=>new Promise(resolve=>{release=resolve;})});
  await s.queue.resume(); const step=s.queue.step();
  while(!release) await new Promise(resolve=>setImmediate(resolve));
  await s.queue.pause();release({kind:'file',text:'Hello',contentType:'text/plain'});await step;
  assert.equal(s.count,0);assert.equal(s.queue.job.tasks[0].status,'pending');assert.equal(s.queue.job.state,'paused');
});
test('transient failures retry with backoff then stop, explicit retry resets failed attempts',async()=>{
  let now=0;const s=setup({now:()=>now,fetchRecord:async()=>{throw Object.assign(new Error('server busy'),{code:'transient'});}});
  await s.queue.resume();await s.queue.step(); assert.equal(s.queue.job.tasks[0].attempts,1);
  await s.queue.step(); assert.equal(s.queue.job.tasks[0].attempts,1);
  for(let i=0;i<8;i++){now+=60000;await s.queue.step();}
  assert.equal(s.queue.job.tasks[0].status,'failed');assert.equal(s.queue.job.tasks[0].attempts,3);
  await s.queue.resume({retryFailed:true});assert.equal(s.queue.job.tasks[0].status,'pending');assert.equal(s.queue.job.tasks[0].attempts,0);
});
test('authentication expiry pauses; absent format is a distinct outcome',async()=>{
  const s=setup({fetchRecord:async()=>{throw Object.assign(new Error('Sign in to Echo'),{code:'auth'});}});
  await s.queue.resume();await s.queue.step();assert.equal(s.queue.job.state,'paused');assert.equal(s.queue.job.tasks[0].status,'pending');
  const a=setup({fetchRecord:async()=>({kind:'unavailable',message:'No VTT offered'})});await a.queue.resume();await a.queue.step();assert.equal(a.queue.job.tasks[0].status,'unavailable');
});
test('scan replacement is refused if the old queue resumes or another scan replaces it',()=>{
  assert.equal(typeof module.assertReplaceable,'function');
  const s=setup();module.assertReplaceable(s.queue,s.queue);
  s.queue.job.state='running';assert.throws(()=>module.assertReplaceable(s.queue,s.queue));
  s.queue.job.state='paused';assert.throws(()=>module.assertReplaceable(s.queue,setup().queue));
});
test('a renamed browser save cannot silently overwrite another completed transcript',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();
  const first=s.queue.job.tasks[0],second=s.queue.job.tasks[1];
  s.downloads.get(second.downloadId).filename=first.savedFilename;
  await s.queue.step();
  assert.equal(first.status,'failed');assert.equal(second.status,'failed');
  assert.match(first.error,/same|replaced|collision/i);
});
test('switching away from a completed unit keeps it finished',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();await s.queue.step();
  await s.queue.pause('Another unit is downloading');
  assert.equal(s.queue.job.state,'finished');assert.equal(s.queue.job.error,'');
});

test('completed files are rechecked without restarting; deleted formats become retryable',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();await s.queue.step();
  s.downloads.get(s.queue.job.tasks[0].downloadId).exists=false;
  await s.queue.checkSavedFiles();
  assert.equal(s.queue.job.tasks[0].status,'missing');assert.equal(s.queue.job.tasks[1].status,'complete');
  assert.equal(module.progress(s.queue.job).complete,1);assert.equal(module.progress(s.queue.job).missing,1);
  await s.queue.resume({retryFailed:true});await s.queue.step();await s.queue.step();
  assert.equal(s.count,3);assert.equal(module.progress(s.queue.job).complete,2);
});
test('delayed Chrome deletion event overrides a cached positive search result',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();await s.queue.step();
  const first=s.queue.job.tasks[0];
  await s.queue.checkSavedFiles();assert.equal(first.status,'complete');
  await s.queue.downloadChanged({id:first.downloadId,exists:{current:false}});
  assert.equal(first.status,'missing');assert.equal(s.count,2);
  // A stale query result must never resurrect a known deleted file.
  await s.queue.checkSavedFiles();assert.equal(first.status,'missing');
});
test('erased download history is uncertain, never falsely saved or automatically redownloaded',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();await s.queue.step();
  s.downloads.delete(s.queue.job.tasks[0].downloadId);await s.queue.checkSavedFiles();
  assert.equal(s.queue.job.tasks[0].status,'uncertain');assert.equal(s.count,2);
});
test('completed files saved outside the unit folder cannot count as successful',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();
  const first=s.queue.job.tasks[0];s.downloads.get(first.downloadId).filename='/Downloads/'+first.filename.split('/').at(-1);
  await s.queue.step();assert.equal(first.status,'failed');assert.match(first.error,/unit folder/);
});
test('a stale search cannot undo a retry after deletion',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.pause();
  const task=s.queue.job.tasks[0],oldId=task.downloadId;let release;
  s.adapters.findDownload=()=>new Promise(resolve=>{release=resolve;});
  const step=s.queue.step();while(!release)await new Promise(resolve=>setImmediate(resolve));
  await s.queue.downloadChanged({id:oldId,exists:{current:false}});await s.queue.resume({retryFailed:true});await s.queue.pause();
  release([{id:oldId,state:'complete',exists:false}]);await step;
  assert.equal(task.status,'pending');assert.equal(task.downloadId,null);
});
test('a stale search cannot restore saved status after history was erased',async()=>{
  const s=setup();await s.queue.resume();await s.queue.step();await s.queue.step();await s.queue.step();
  const task=s.queue.job.tasks[0],oldItem=s.downloads.get(task.downloadId);let release;
  const find=s.adapters.findDownload;s.adapters.findDownload=t=>t===task?new Promise(resolve=>{release=resolve;}):find(t);
  const check=s.queue.checkSavedFiles();while(!release)await new Promise(resolve=>setImmediate(resolve));
  await s.queue.downloadErased(task.downloadId);release([oldItem]);await check;
  assert.equal(task.status,'uncertain');
});
