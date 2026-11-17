(function(){
  if(location.protocol==='file:')return;
  let current=null,busy=false;
  async function check(){
    if(busy)return;
    busy=true;
    try{
      const response=await fetch('/__version',{cache:'no-store'});
      if(!response.ok)return;
      const next=(await response.json()).version;
      if(!current){current=next;return}
      if(current===next)return;
      // Wait until the user finishes a dialog or file attachment operation.
      if(document.querySelector('dialog[open]')||document.getElementById('file')?.files.length)return;
      try{
        localStorage.setItem('wasaa-recon-v1',JSON.stringify(state));
        sessionStorage.setItem('wasaa-active-run',JSON.stringify(activeRun));
      }catch(error){return}
      location.reload();
    }catch(error){/* Retry when the local server becomes available. */}
    finally{busy=false}
  }
  check();setInterval(check,1500);
})();
