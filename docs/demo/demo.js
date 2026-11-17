// Only synthetic data. Uses the unmodified production panel and queue format.
import {createJob,progress} from '../../queue.mjs';
const titles=['Week 1 — Introduction','Week 2 — Core concepts','Week 3 — Worked examples','Week 4 — Review'];
const inventory={complete:true,lessonCount:4,issues:[],recordings:titles.map((title,index)=>({title,date:'',mediaId:`demo-media-${index+1}`,references:[{lessonId:`demo-lesson-${index+1}`}]}))};
const context={courseId:'example',courseName:'Example unit',origin:'https://echo360.net.au',sectionId:'example-section'};
const key=`job:${context.origin}|${context.courseId}|${context.sectionId}`;
let job=createJob(context,inventory),listeners=[];
function mode(value){
  job=createJob(context,inventory);job.state=value==='missing'?'finished':value;
  if(value==='finished'||value==='missing')job.tasks.forEach(task=>{task.status='complete';task.downloadId=1;});
  if(value==='missing')job.tasks.slice(0,2).forEach(task=>{task.status='missing';task.error='File was deleted or moved from its saved location. Retry missing / failed to download it again.';});
  if(value==='running'){job.tasks.slice(0,4).forEach(task=>{task.status='complete';task.downloadId=1;});job.tasks[4].status='fetching';}
  document.getElementById('demo-state').value=value;
}
const state=()=>({...context,context,contextError:'',jobs:[{...job,progress:progress(job)}]});
window.chrome={runtime:{id:'synthetic-demo',onMessage:{addListener:listener=>listeners.push(listener)},sendMessage:async message=>{
  if(message.type==='RESUME'||message.type==='RETRY')mode('running');
  if(message.type==='PAUSE')job.state='paused';
  return {ok:true,value:state()};
}}};
document.getElementById('demo-state').addEventListener('change',event=>{mode(event.target.value);for(const listener of listeners)listener({type:'SHOW_PANEL'},{id:'synthetic-demo'},()=>{});});
mode('ready');await import('../../canvas-content.js');
