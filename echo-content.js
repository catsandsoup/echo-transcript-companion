(() => {
  let lastReport='',timer;
  function context() {
    const direct=/^\/section\/([^/]+)/.exec(location.pathname)?.[1];
    const linked=[...document.querySelectorAll('a[href]')].map(a=>{try{return new URL(a.href);}catch{return null;}}).find(url=>url?.origin===location.origin && /^\/section\/[^/]+/.test(url.pathname));
    let sectionId=direct || (linked && /^\/section\/([^/]+)/.exec(linked.pathname)?.[1]);
    return {sectionId:sectionId ? decodeURIComponent(sectionId) : '',route:location.href,origin:location.origin};
  }
  function report() {
    const value=context();const signature=JSON.stringify(value);
    if(signature!==lastReport) {lastReport=signature;chrome.runtime.sendMessage({type:'ECHO_CONTEXT',...value}).catch(()=>{});}
  }
  new MutationObserver(()=>{clearTimeout(timer);timer=setTimeout(report,400);}).observe(document.documentElement,{subtree:true,childList:true});
  addEventListener('popstate',report);addEventListener('hashchange',report);setInterval(report,4000);report();
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(sender.id!==chrome.runtime.id) return;
    if(message.type==='ECHO_PING') {reply(context());return;}
    if(message.type!=='ECHO_REQUEST') return;
    (async()=>{
      const before=context();
      if(before.route!==message.route || before.sectionId!==message.sectionId) throw Object.assign(new Error('Echo changed. Return to this unit’s class list and Resume.'),{code:'stale'});
      const path=message.path;
      if(typeof path!=='string' || !(/^\/section\/[^/]+\/syllabus$/.test(path) || /^\/api\/ui\/echoplayer\/lessons\/[^/]+\/medias\/[^/]+\/(download-info|transcript-file\?format=(text|vtt))$/.test(path))) throw new Error('Unapproved Echo request');
      let response;
      try {response=await fetch(new URL(path,location.origin),{credentials:'include',cache:'no-store',signal:AbortSignal.timeout(25000),headers:{Accept:message.kind==='json'?'application/json':'text/plain, text/vtt'}});}
      catch(error){throw Object.assign(new Error('Echo request timed out or the network is unavailable.'),{code:'transient'});}
      if(response.redirected && new URL(response.url).pathname!==new URL(path,location.origin).pathname) throw Object.assign(new Error('Echo requires sign-in. Reopen Recorded Lectures, then Resume.'),{code:'auth'});
      if(!response.ok) {
        const code=response.status===401?'auth':[408,429,500,502,503,504].includes(response.status)?'transient':'forbidden';
        throw Object.assign(new Error(`Echo returned HTTP ${response.status}. ${code==='auth'?'Reopen Recorded Lectures, then Resume.':'This recording may be restricted or unavailable.'}`),{code,retryAfter:Math.min(300000,(Number(response.headers.get('retry-after'))||0)*1000)});
      }
      const contentType=response.headers.get('content-type')||'';
      if(/html/i.test(contentType)) throw Object.assign(new Error('Echo returned a sign-in page. Reopen Recorded Lectures, then Resume.'),{code:'auth'});
      // Bound decoded response size too, rather than trusting compressed Content-Length.
      const reader=response.body.getReader();const chunks=[];let size=0;
      while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>12*1024*1024){await reader.cancel();throw new Error('Echo response exceeds the 12 MB limit.');}chunks.push(value);}
      const buffer=new Uint8Array(size);let offset=0;for(const chunk of chunks){buffer.set(chunk,offset);offset+=chunk.byteLength;}
      const text=new TextDecoder('utf-8',{fatal:true}).decode(buffer);
      if(context().route!==before.route || context().sectionId!==before.sectionId) throw Object.assign(new Error('The Echo page changed during the request. Return to the unit and Resume.'),{code:'stale'});
      if(message.kind==='json') {
        let data;try{data=JSON.parse(text);}catch{throw new Error('Unrecognized Echo JSON response.');}
        if(data?.status!=='ok') throw new Error('Echo did not return a successful response.');
        return {json:data};
      }
      return {text,contentType};
    })().then(value=>reply({ok:true,...value})).catch(error=>reply({ok:false,error:error.message,code:error.code||'invalid',retryAfter:error.retryAfter||0}));
    return true;
  });
})();
