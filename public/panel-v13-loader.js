(()=>{
  if(window.__HONOR_PANEL_V13_LOADER__) return;
  window.__HONOR_PANEL_V13_LOADER__=true;
  const files=['/panel-v13-part1.txt','/panel-v13-part2.txt','/panel-v13-part3a.txt','/panel-v13-part3b.txt','/panel-v13-part4a.txt','/panel-v13-part4b.txt','/panel-v13-part5a.txt','/panel-v13-part5b.txt','/panel-v13-part6a.txt','/panel-v13-part6b.txt'];
  Promise.all(files.map(url=>fetch(url+'?v=20261030-2',{cache:'no-store'}).then(response=>{
    if(!response.ok) throw new Error('No se pudo cargar '+url);
    return response.text();
  })))
    .then(parts=>(0,eval)(parts.join('')+'\n//# sourceURL=panel-v13.js'))
    .catch(error=>console.error('HONOR Panel V13:',error));
})();
