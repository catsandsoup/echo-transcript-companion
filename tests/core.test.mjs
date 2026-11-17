import test from 'node:test';
import assert from 'node:assert/strict';
const core = await import('../core.mjs').catch(() => ({}));
const row = (id, medias, extra = {}) => ({type:'SyllabusLessonType',lesson:{lesson:{id,sectionId:'sec',name:'Week 2 / Finance',timing:{start:'2026-08-14T04:00:00Z'},...extra},medias}});
test('inventory retains multiple recordings and repeated class references, skips inaccessible content', () => {
  assert.equal(typeof core.parseInventory, 'function');
  const out = core.parseInventory({status:'ok',data:[row('opaque/lesson',[{id:'media-a',mediaType:'Video',isAvailable:true},{id:'media-b',mediaType:'Video',isAvailable:true}]),row('repeat',[{id:'media-a',mediaType:'Video',isAvailable:true}]),row('closed',[{id:'hidden',mediaType:'Video',isAvailable:false}]),row('empty',[])]},'sec');
  assert.equal(out.recordings.length,2); assert.equal(out.recordings[0].references.length,2);
  assert.equal(out.lessonCount,4); assert.equal(out.issues.length,2);
});
test('nested groups enumerate child lessons and unsupported pagination is explicit', () => {
  assert.equal(typeof core.parseInventory, 'function');
  const out=core.parseInventory({status:'ok',data:[{type:'SyllabusGroupType',group:{name:'Block',lessons:[row('nested',[{id:'m',mediaType:'Video',isAvailable:true}])]}}],next:'cursor'},'sec');
  assert.equal(out.recordings.length,1); assert.equal(out.complete,false);
  assert.throws(()=>core.parseInventory({status:'ok',data:{items:[]}},'sec'),/inventory/i);
  assert.equal(core.parseInventory({status:'ok',data:[{type:'new shape'}]},'sec').complete,false);
});
test('filenames remain readable, unique and cannot escape the downloads folder',()=>{
  assert.equal(typeof core.filePath,'function');
  const recording={lessonId:'lesson',mediaId:'aabbccdd-1111',title:'../../Week 2: Finance / recording',date:'2026-08-14T04:00:00Z'};
  const path=core.filePath({courseName:'FINC1000',sectionId:'sec'},recording,'vtt');
  assert.match(path,/^EchoVideo Transcripts\/FINC1000/); assert.match(path,/Week 2/); assert.match(path,/\.vtt$/);
  assert.ok(!path.split('/').includes('..')); assert.equal(path.split('/').length,3);
  assert.notEqual(path,core.filePath({courseName:'FINC1000',sectionId:'sec'},{...recording,mediaId:'aabbccdd-2222'},'vtt'));
});
test('opaque identifiers are encoded as path segments, never URL instructions',()=>{
  assert.equal(typeof core.transcriptPath,'function');
  assert.equal(core.transcriptPath('lesson/a?b','media#c','file','txt'),'/api/ui/echoplayer/lessons/lesson%2Fa%3Fb/medias/media%23c/transcript-file?format=text');
  assert.throws(()=>core.transcriptPath('a','b','arbitrary'),/operation/i);
  assert.throws(()=>core.transcriptPath('..','b','info'),/identity/i);
});
test('download data URLs retain Unicode transcript bytes',()=>{
  const source='SPEAKER 1\nCafé — 财务 😊';
  assert.equal(Buffer.from(core.dataURL(source,'txt').split(',')[1],'base64').toString('utf8'),source);
});
test('validates real transcript formats and rejects successful login/error bodies',()=>{
  assert.equal(typeof core.validateTranscript,'function');
  assert.ok(core.validateTranscript('\uFEFFWEBVTT\n\n00:00:00.000 --> 00:00:01.000\nHello','vtt','text/vtt').bytes>0);
  assert.ok(core.validateTranscript('Hello, this lecture has no speaker markers.','txt','text/plain').bytes>0);
  assert.ok(core.validateTranscript('[Music]\nWelcome to the lecture.','txt','text/plain').bytes>0);
  assert.ok(core.validateTranscript('[Speaker 1]\nHello everyone.','txt','text/plain').bytes>0);
  for(const text of ['<!DOCTYPE html><html>login</html>','{"status":"error"}','', '<html>Sign in</html>']) assert.throws(()=>core.validateTranscript(text,'txt','text/plain'));
  assert.throws(()=>core.validateTranscript('Not WebVTT','vtt','text/plain'));
});
