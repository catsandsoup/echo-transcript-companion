// Reveal an existing transcript in its containing unit folder. No arbitrary paths
// or unrelated download history are opened.
export async function openUnitFolder(job, downloads, extensionId) {
  for(const task of job.tasks.filter(t=>t.status==='complete' && t.downloadId)) {
    const [item]=await downloads.search({id:task.downloadId});
    const folder=task.baseFilename.slice(0,task.baseFilename.lastIndexOf('/')+1);
    if(item?.byExtensionId===extensionId && item.state==='complete' && item.exists!==false &&
      ('/'+String(item.filename).replaceAll('\\','/')).includes('/'+folder)) {
      await downloads.show(item.id);return;
    }
  }
  throw new Error('No saved file remains in this unit’s folder. Retry missing / failed to recreate it.');
}
