(() => {
  if(window!==top || document.getElementById('assignment-dates-transcripts'))return;
  const host=document.createElement('div');host.id='assignment-dates-transcripts';document.body.append(host);
  const root=host.attachShadow({mode:'open'});
  root.innerHTML=`<style>
    :host{all:initial;color-scheme:light dark;font:14px/1.45 system-ui,-apple-system,sans-serif;color:CanvasText}
    *{box-sizing:border-box}button,select{font:inherit}button{min-height:36px;border:1px solid color-mix(in srgb,CanvasText 25%,transparent);border-radius:8px;padding:7px 12px;background:Canvas;color:CanvasText;cursor:pointer}button:hover{background:color-mix(in srgb,CanvasText 8%,Canvas)}button:disabled{opacity:.5;cursor:default}button:focus-visible,select:focus-visible{outline:3px solid Highlight;outline-offset:2px}.primary{background:Highlight;color:HighlightText;border-color:Highlight}.primary:hover{filter:brightness(.92);background:Highlight}
    #launcher{position:fixed;right:20px;bottom:20px;z-index:2147483646;box-shadow:0 3px 16px #0003;font-weight:600}
    #panel{position:fixed;right:18px;top:24px;z-index:2147483647;width:min(480px,calc(100vw - 36px));max-height:calc(100vh - 48px);display:flex;flex-direction:column;background:Canvas;border:1px solid color-mix(in srgb,CanvasText 25%,transparent);border-radius:14px;box-shadow:0 12px 60px #0005;overflow:hidden}
    #panel[hidden]{display:none}header{display:flex;align-items:start;gap:12px;padding:18px;border-bottom:1px solid color-mix(in srgb,CanvasText 15%,transparent)}h2{font-size:19px;line-height:1.2;margin:0 0 5px}#course{margin:0;overflow-wrap:anywhere}header div{flex:1}#close{padding:5px 10px}.body{padding:16px 18px;overflow:auto}.muted{opacity:.75;font-size:13px}p{margin:0 0 12px}.actions{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}progress{width:100%;height:12px;accent-color:Highlight}#counts{font-weight:650;margin:8px 0}#error{color:light-dark(#9d251a,#ffb3a9);white-space:pre-wrap}#message{white-space:pre-wrap}#error:empty{display:none}details{margin:14px 0}summary{cursor:pointer;font-weight:600;padding:6px 0}ul{padding-left:20px;margin:8px 0}.record{border-top:1px solid color-mix(in srgb,CanvasText 15%,transparent);padding:10px 0;overflow-wrap:anywhere}.record strong{display:block}.formats{font-size:13px;margin:5px 0}.reason{font-size:12px;opacity:.8;margin:4px 0}#jobs{max-width:100%;margin-bottom:12px}footer{padding:12px 18px;border-top:1px solid color-mix(in srgb,CanvasText 15%,transparent);font-size:12px;opacity:.8}
  </style>
  <button id="launcher" class="primary" aria-expanded="false">Lecture transcripts</button>
  <section id="panel" role="region" aria-label="Lecture transcript downloads" hidden>
    <header><div><h2>Lecture transcripts</h2><p id="course"></p></div><button id="close" aria-label="Close transcript panel">×</button></header>
    <div class="body"><p>Save the available TXT and VTT transcripts for this unit.</p><p id="error" role="alert"></p>
      <button id="scan">Scan this unit</button><p class="muted" style="margin-top:8px">Open Recorded Lectures first. Keep this unit open while downloading.</p>
      <select id="jobs" aria-label="Echo section" hidden></select>
      <div id="job" hidden><p id="inventory"></p><progress id="progress" max="1" value="0" aria-label="Transcript files processed"></progress><p id="counts" role="status" aria-live="polite"></p><p id="message"></p>
        <div class="actions"><button id="resume" class="primary">Download TXT + VTT</button><button id="pause">Pause</button><button id="retry">Retry missing / failed</button><button id="folder">Open folder</button><button id="check">Check saved files</button><button id="export">Save report</button></div>
        <p class="muted">Deleted or moved files become Missing and can be downloaded again. Chrome checks while this panel is open; detection can take about 10 seconds. If download history was cleared, check the folder before retrying.</p>
        <details id="issues"><summary>Availability and inventory notes</summary><ul id="issue-list"></ul></details>
        <details open><summary>Recordings and file status</summary><div id="records"></div></details>
      </div>
    </div><footer>TXT and VTT save into this unit’s folder under Downloads → EchoVideo Transcripts. Turn off Chrome’s “Ask where to save each file” for automatic saving. Progress stays on this Mac. No content is uploaded.</footer>
  </section>`;
  const $=id=>root.getElementById(id);let state=null,key='',pending=false,opened=false;
  const courseName=()=>document.querySelector('[aria-label="breadcrumbs"] a[href*="/courses/"]')?.textContent.trim() || document.title;
  const keyOf=job=>`job:${job.origin}|${job.courseId}|${job.sectionId}`;
  const names={pending:'Pending',fetching:'Fetching',starting:'Starting save',saving:'Saving in Chrome',complete:'Saved',missing:'Missing',unavailable:'Not available',failed:'Failed',uncertain:'Check save'};
  async function send(type,extra={}) {
    const response=await chrome.runtime.sendMessage({type,courseName:courseName(),key,...extra});
    if(!response?.ok)throw new Error(response?.error||'Extension unavailable. Reload this Canvas page.');return response.value;
  }
  function render() {
    if(!state)return;$('course').textContent=state.courseName;
    const jobs=state.jobs;let job=jobs.find(j=>keyOf(j)===key);
    if(!job){job=jobs.find(j=>j.sectionId===state.context?.sectionId)||jobs.at(-1);key=job?keyOf(job):'';}
    $('jobs').replaceChildren(...jobs.map(j=>{const option=document.createElement('option');option.value=keyOf(j);option.textContent=`${j.inventory.recordings.length} recordings · section ${j.sectionId.slice(0,8)}`;option.selected=option.value===key;return option;}));$('jobs').hidden=jobs.length<2;
    $('job').hidden=!job;$('scan').disabled=pending||job?.state==='running'||job?.tasks.some(t=>['starting','saving'].includes(t.status));
    if(!job){$('message').textContent='';if(!pending)$('error').textContent=state.contextError;return;}
    const p=job.progress;$('inventory').textContent=`${job.inventory.lessonCount} classes · ${job.inventory.recordings.length} accessible recordings · ${p.total} requested files${job.inventory.complete?'':' · inventory needs review'}`;
    $('progress').max=Math.max(p.total,1);$('progress').value=p.settled;
    $('counts').textContent=`${p.complete} of ${p.total} saved · ${p.unavailable} unavailable · ${p.missing||0} missing · ${p.failed+p.uncertain} need attention`;
    $('message').textContent=job.state==='finished'?(p.complete===p.total && job.inventory.complete?'All listed transcripts saved. Checking for deleted or moved files while this panel is open.':(p.missing?'Files are missing from their saved locations. Choose Retry missing / failed.':'Finished checking this inventory. See unavailable files and notes below.')):job.error || (job.state==='running'?'Downloading one file at a time…':'Ready to download.');
    $('resume').textContent=job.state==='ready'?'Download TXT + VTT':'Resume';$('resume').disabled=pending||job.state==='running'||!job.tasks.some(t=>['pending','fetching'].includes(t.status));
    $('pause').disabled=pending||job.state!=='running';$('retry').disabled=pending||job.state==='running'||!job.tasks.some(t=>['failed','unavailable','uncertain','missing'].includes(t.status));$('export').disabled=pending;$('check').disabled=pending;$('folder').disabled=pending||!p.complete;$('folder').title=p.complete?'Open this unit’s folder in Finder':'Available after a file has been saved in this unit’s folder';
    $('issues').hidden=!job.inventory.issues.length;$('issue-list').replaceChildren(...job.inventory.issues.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));
    const groups=new Map();for(const task of job.tasks){if(!groups.has(task.recording.mediaId))groups.set(task.recording.mediaId,[]);groups.get(task.recording.mediaId).push(task);}
    $('records').replaceChildren(...[...groups.values()].map(tasks=>{const div=document.createElement('div');div.className='record';const title=document.createElement('strong');title.textContent=tasks[0].recording.title;div.append(title);const statuses=document.createElement('div');statuses.className='formats';statuses.textContent=tasks.map(t=>`${t.format.toUpperCase()}: ${names[t.status]||t.status}`).join(' · ');div.append(statuses);for(const task of tasks.filter(t=>t.error)){const reason=document.createElement('p');reason.className='reason';reason.textContent=`${task.format.toUpperCase()}: ${task.error}`;div.append(reason);}return div;}));
  }
  async function refresh(){if(pending)return;try{state=await send('STATE');render();}catch(e){$('error').textContent=e.message;}}
  function show(){opened=true;$('panel').hidden=false;$('launcher').setAttribute('aria-expanded','true');void refresh();$('close').focus();}
  function close(){opened=false;$('panel').hidden=true;$('launcher').setAttribute('aria-expanded','false');$('launcher').focus();}
  $('launcher').addEventListener('click',()=>opened?close():show());$('close').addEventListener('click',close);root.addEventListener('keydown',event=>{if(event.key==='Escape')close();});
  $('jobs').addEventListener('change',()=>{key=$('jobs').value;render();});
  for(const [id,type] of [['scan','SCAN'],['resume','RESUME'],['pause','PAUSE'],['retry','RETRY'],['export','EXPORT'],['folder','OPEN_FOLDER'],['check','CHECK']])$(id).addEventListener('click',async()=>{if(pending)return;pending=true;$('error').textContent='';render();try{state=await send(type);}catch(e){$('error').textContent=e.message;}finally{pending=false;render();}});
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{if(sender.id===chrome.runtime.id && message.type==='SHOW_PANEL'){show();reply({ok:true});}});
  setInterval(()=>{if(opened)void refresh();},2000);void refresh();
})();
