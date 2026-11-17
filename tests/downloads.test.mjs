import test from 'node:test';
import assert from 'node:assert/strict';
import {openUnitFolder} from '../downloads.mjs';

test('Open folder reveals only an existing own-extension file in this unit folder',async()=>{
  const job={tasks:[1,2,3,4].map(downloadId=>({downloadId,status:'complete',baseFilename:'EchoVideo Transcripts/Unit/a.txt'}))};
  const items=[null,
    {id:1,state:'complete',exists:false,byExtensionId:'self',filename:'/Downloads/EchoVideo Transcripts/Unit/a.txt'},
    {id:2,state:'complete',exists:true,byExtensionId:'other',filename:'/Downloads/EchoVideo Transcripts/Unit/a.txt'},
    {id:3,state:'complete',exists:true,byExtensionId:'self',filename:'/Downloads/EchoVideo Transcripts/Other/a.txt'},
    {id:4,state:'complete',exists:true,byExtensionId:'self',filename:'/Downloads/EchoVideo Transcripts/Unit/a.txt'}];
  const shown=[];await openUnitFolder(job,{search:async({id})=>[items[id]],show:async id=>shown.push(id)},'self');
  assert.deepEqual(shown,[4]);
  items[4].exists=false;
  await assert.rejects(openUnitFolder(job,{search:async({id})=>[items[id]],show:async()=>assert.fail('must not reveal missing file')},'self'),/Retry/);
});
