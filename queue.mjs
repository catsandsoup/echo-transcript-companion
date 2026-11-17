import {filePath, validateTranscript} from './core.mjs';

export function createJob(context, inventory) {
  return {version:1,...context,createdAt:Date.now(),updatedAt:Date.now(),state:'ready',error:'',inventory,
    tasks:inventory.recordings.flatMap(recording=>['txt','vtt'].map(format=>({key:`${recording.mediaId}:${format}`,recording,format,baseFilename:filePath(context,recording,format),status:'pending',attempts:0,nextAt:0,error:''})))};
}

export class TranscriptQueue {
  constructor(job, adapters) { this.job=job;this.a=adapters;this.busy=false;this.generation=0;this.writes=Promise.resolve();this.deletedIds=new Set();this.checking=null; }
  persist() {
    this.job.updatedAt=this.a.now(); const snapshot=structuredClone(this.job);
    this.writes=this.writes.then(()=>this.a.persist(snapshot)); return this.writes;
  }
  hasUnfinishedWork() {return this.job.tasks.some(t=>['pending','fetching','starting','saving'].includes(t.status));}
  async pause(reason='Paused. Resume when you are ready.') { this.generation++;this.job.state=this.hasUnfinishedWork()?'paused':'finished';this.job.error=this.hasUnfinishedWork()?reason:'';await this.persist(); }
  async resume({retryFailed=false}={}) {
    if (retryFailed) for(const task of this.job.tasks) if(['failed','unavailable','uncertain','missing'].includes(task.status)) Object.assign(task,{status:'pending',attempts:0,nextAt:0,error:'',downloadId:null,intent:null,savedFilename:null});
    this.job.state='running';this.job.error='';await this.persist();
  }
  async reconcile(task) {
    const {downloadId,intent,status}=task;
    const matches=await this.a.findDownload(task);
    // A deletion event, cleared history or explicit retry can supersede this
    // search while Chrome is answering. Never revive the older attempt.
    if(task.downloadId!==downloadId || task.intent!==intent || task.status!==status)return;
    if (matches.length!==1) {
      task.status='uncertain';task.error='Save could not be reconciled. Check the output folder before choosing Retry missing / failed.'; return;
    }
    const item=matches[0];task.downloadId=item.id;
    if(this.deletedIds.has(item.id) || item.exists===false){this.markMissing(task);return;}
    if(item.state==='complete' && item.exists!==false) {
      task.status='complete';task.error='';task.savedFilename=item.filename;
      if(typeof item.fileSize==='number' && item.fileSize>=0 && item.fileSize!==task.bytes) {task.status='failed';task.error='Saved file size does not match the validated transcript. Retry this file.';}
    }
    else if(item.state==='interrupted') { task.status='failed';task.error=`Chrome interrupted the save: ${item.error || 'unknown reason'}`; }
    else { task.status='saving';task.error=item.paused?'Chrome download is paused; resume it in Chrome.':''; }
  }
  markMissing(task) {
    this.deletedIds.add(task.downloadId);task.status='missing';
    task.error='File was deleted or moved from its saved location. Retry missing / failed to download it again.';
  }
  async downloadChanged(delta) {
    if(delta.exists?.current!==false)return;
    this.deletedIds.add(delta.id);
    const tasks=this.job.tasks.filter(t=>t.downloadId===delta.id && ['complete','starting','saving'].includes(t.status));
    for(const task of tasks)this.markMissing(task);
    if(tasks.length)await this.persist();
  }
  async downloadErased(id) {
    const tasks=this.job.tasks.filter(t=>t.downloadId===id && ['complete','starting','saving'].includes(t.status));
    for(const task of tasks){task.status='uncertain';task.error='Chrome download history was cleared. Check the folder before retrying; the file may still exist.';}
    if(tasks.length)await this.persist();
  }
  async checkSavedFiles() {
    if(this.checking)return this.checking;
    this.checking=(async()=>{
      const before=JSON.stringify(this.job.tasks);
      // search() starts Chrome's asynchronous existence check. Later onChanged
      // events are authoritative; a cached positive result is not a disk audit.
      for(const task of this.job.tasks)if(task.status==='complete')await this.reconcile(task);
      this.verifySavedNames();
      if(before!==JSON.stringify(this.job.tasks))await this.persist();
    })();
    try{await this.checking;}finally{this.checking=null;}
  }
  async recover() {
    for(const task of this.job.tasks) {
      if(task.status==='fetching') task.status='pending';
      if(['starting','saving','complete'].includes(task.status)) await this.reconcile(task);
    }
    this.verifySavedNames();
    if(!this.hasUnfinishedWork()){this.job.state='finished';this.job.error='';}
    await this.persist();
  }
  verifySavedNames() {
    const paths=new Map();
    for(const task of this.job.tasks.filter(t=>t.status==='complete')) {
      const name=String(task.savedFilename||'').replaceAll('\\','/');
      const previous=paths.get(name);paths.set(name,task);
      if(previous)for(const affected of [previous,task]) {affected.status='failed';affected.error='Two transcripts were saved to the same path; one may have replaced the other. Retry both files.';}
      else if(!('/'+name).includes('/'+task.baseFilename.slice(0,task.baseFilename.lastIndexOf('/')+1))) {task.status='failed';task.error='Chrome saved this file outside its unit folder. Retry to save it in the unit folder.';}
      else if(!name.split('/').at(-1).includes(`[${task.intent}]`) || !name.toLowerCase().endsWith(`.${task.format}`)) {task.status='failed';task.error='Chrome saved this file under a different name. Retry to restore its distinct transcript filename.';}
    }
  }
  async step() {
    if(this.busy) return;this.busy=true;
    try {
      for(const task of this.job.tasks) if(['starting','saving'].includes(task.status)) await this.reconcile(task);
      this.verifySavedNames();
      if(this.job.tasks.some(t=>['starting','saving'].includes(t.status))) {await this.persist();return;}
      if(this.job.state!=='running') {await this.persist();return;}
      const pending=this.job.tasks.filter(t=>t.status==='pending');
      if(!pending.length) {this.job.state='finished';await this.persist();return;}
      const task=pending.find(t=>!t.nextAt || t.nextAt<=this.a.now());
      if(!task) {await this.persist();return;}
      const generation=this.generation;
      task.status='fetching';task.attempts++;task.error='';await this.persist();
      try {
        const result=await this.a.fetchRecord(this.job,task);
        if(generation!==this.generation || this.job.state!=='running') {task.status='pending';task.attempts--;await this.persist();return;}
        if(result.kind==='unavailable') {task.status='unavailable';task.error=result.message || 'This format is not offered by Echo.';await this.persist();return;}
        task.bytes=validateTranscript(result.text,task.format,result.contentType).bytes;
        task.intent=this.a.token();task.startedAt=this.a.now();
        task.filename=task.baseFilename.replace(/\.(txt|vtt)$/,` [${task.intent}].$1`);
        task.status='starting';await this.persist();
        // No await between the final pause check and initiating the browser side effect.
        if(generation!==this.generation || this.job.state!=='running') {task.status='pending';await this.persist();return;}
        task.downloadId=await this.a.saveFile({text:result.text,format:task.format,filename:task.filename});
        task.status='saving';await this.persist();
      } catch(error) {
        task.error=error.message || 'Unknown error';
        if(task.status==='starting') {task.status='uncertain';task.error='Chrome did not confirm whether saving started. Check the folder before retrying. '+task.error;}
        else if(['auth','stale'].includes(error.code)) {task.status='pending';task.attempts--;this.job.state='paused';this.job.error=task.error;}
        else if(error.code==='transient' && task.attempts<3) {task.status='pending';task.nextAt=this.a.now()+Math.max(Number(error.retryAfter)||0,2000*2**task.attempts);}
        else task.status='failed';
        await this.persist();
      }
    } finally {this.busy=false;}
  }
}

export function progress(job) {
  const counts={complete:0,unavailable:0,failed:0,uncertain:0,missing:0,pending:0,fetching:0,starting:0,saving:0};
  for(const task of job.tasks) counts[task.status]=(counts[task.status]||0)+1;
  return {...counts,total:job.tasks.length,settled:counts.complete+counts.unavailable+counts.failed+counts.uncertain+counts.missing};
}

export function assertReplaceable(expected,current) {
  if(expected!==current || current?.busy || current?.job.state==='running' || current?.job.tasks.some(t=>['starting','saving'].includes(t.status))) throw new Error('The queue changed or is still active. Pause it and wait for the current file before scanning again.');
}
