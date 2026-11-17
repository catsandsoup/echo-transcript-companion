document.getElementById('open').addEventListener('click',async()=>{
  try{const [tab]=await chrome.tabs.query({active:true,currentWindow:true});const result=await chrome.runtime.sendMessage({type:'SHOW',tabId:tab.id});if(!result?.ok)throw new Error(result?.error);window.close();}
  catch{document.getElementById('status').textContent='Open Recorded Lectures in Sydney Canvas. If you just installed the extension, reload the Canvas tab, then try again.';}
});
