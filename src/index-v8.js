import base, { AportesDB } from './index-v7.js';
export { AportesDB };

const FOLLOW_RE=/\s*\[MES_SEGUIMIENTO:([a-z]{3}-\d{2,4})\]\s*/i;
const activeLoader=`
;(()=>{
  const load=()=>{
    if(!document.querySelector('script[data-active-period-v8]')){
      const s=document.createElement('script');
      s.src='active-period-v8.js?v=20261027-active-period-1';
      s.dataset.activePeriodV8='1';
      document.body.appendChild(s);
    }
    if(!document.querySelector('script[data-period-label-v8]')){
      const l=document.createElement('script');
      l.src='period-label-v8.js?v=20261027-period-label-1';
      l.dataset.periodLabelV8='1';
      document.body.appendChild(l);
    }
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
`;

function encodeFollow(patch){
  if(!patch||typeof patch!=='object'||!Object.prototype.hasOwnProperty.call(patch,'mesSeguimiento'))return patch;
  const follow=String(patch.mesSeguimiento||'').trim();
  const clean=String(patch.nota||'').replace(FOLLOW_RE,' ').replace(/\s+/g,' ').trim();
  patch.nota=follow?(clean?clean+' ':'')+'[MES_SEGUIMIENTO:'+follow+']':clean;
  delete patch.mesSeguimiento;
  return patch;
}
function decodePatch(patch){
  if(!patch||typeof patch!=='object')return patch;
  const note=String(patch.nota||''),match=note.match(FOLLOW_RE);
  if(match)patch.mesSeguimiento=match[1];
  patch.nota=note.replace(FOLLOW_RE,' ').replace(/\s+/g,' ').trim();
  return patch;
}
function decodePayload(data){
  if(!data||typeof data!=='object')return data;
  if(Array.isArray(data.entries))data.entries.forEach(x=>decodePatch(x?.patch));
  if(data.entry?.patch)decodePatch(data.entry.patch);
  return data;
}
async function jsonResponse(response){
  const type=response.headers.get('content-type')||'';
  if(!type.includes('application/json'))return response;
  try{
    const data=decodePayload(await response.clone().json());
    const headers=new Headers(response.headers);
    headers.delete('content-length');headers.delete('content-encoding');
    return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
  }catch{return response;}
}

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url),path=url.pathname;
    let request=req;
    if(path==='/api/save'&&req.method==='PUT'){
      try{
        const body=await req.clone().json();
        if(body?.patch)encodeFollow(body.patch);
        request=new Request(req.url,{method:req.method,headers:req.headers,body:JSON.stringify(body)});
      }catch{}
    }
    let response=await base.fetch(request,env,ctx);
    if(path==='/kam-20261026.js'){
      const text=await response.text(),headers=new Headers(response.headers);
      headers.set('content-type','application/javascript; charset=utf-8');
      headers.set('cache-control','no-store, max-age=0');
      headers.delete('content-length');headers.delete('content-encoding');
      return new Response(text+'\n'+activeLoader,{status:response.status,statusText:response.statusText,headers});
    }
    if(['/api/data','/api/save','/api/history'].includes(path))response=await jsonResponse(response);
    return response;
  }
};
