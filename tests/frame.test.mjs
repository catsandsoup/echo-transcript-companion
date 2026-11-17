import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
test('a direct lesson cannot inherit a previous unit section from tab session storage',async()=>{
  const sent=[];
  const sandbox={location:{pathname:'/lesson/unit-b-lesson/classroom',href:'https://echo360.net.au/lesson/unit-b-lesson/classroom',origin:'https://echo360.net.au'},sessionStorage:{getItem:()=> 'section-from-unit-a',setItem(){}},document:{querySelectorAll:()=>[],documentElement:{}},MutationObserver:class{observe(){}},addEventListener(){},setInterval(){},setTimeout(){},clearTimeout(){},chrome:{runtime:{sendMessage:value=>{sent.push(value);return Promise.resolve();},onMessage:{addListener(){}}}},URL};
  vm.runInNewContext(await readFile(new URL('../echo-content.js',import.meta.url),'utf8'),sandbox);
  assert.equal(sent[0].sectionId,'');
});
