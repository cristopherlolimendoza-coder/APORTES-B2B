(()=>{
  if(window.__HONOR_PANEL_V12_LOADER__) return;
  window.__HONOR_PANEL_V12_LOADER__=true;
  const files=['/panel-v12-part1.txt','/panel-v12-part2.txt','/panel-v12-part3.txt','/panel-v12-part4.txt','/panel-v12-part5.txt','/panel-v12-part6.txt'];
  Promise.all(files.map(url=>fetch(url+'?v=20261028-1',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error('No se pudo cargar '+url);return r.text()})))
    .then(parts=>(0,eval)(parts.join('')+'\n//# sourceURL=panel-v12.js'))
    .catch(error=>console.error('HONOR Panel V12:',error));
})();
