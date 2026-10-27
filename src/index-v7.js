import base, { AportesDB } from './index-v5.js';
export { AportesDB };

const statusLoader=`
;(()=>{
  const load=()=>{
    if(document.querySelector('script[data-status-totals-v7]'))return;
    const s=document.createElement('script');
    s.src='status-totals-v7.js?v=20261027-status-totals-2';
    s.dataset.statusTotalsV7='1';
    document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});
  else load();
})();
`;

export default {
  async fetch(req,env,ctx){
    const url=new URL(req.url);
    const response=await base.fetch(req,env,ctx);
    if(url.pathname!=='/kam-20261026.js')return response;
    const text=await response.text();
    const headers=new Headers(response.headers);
    headers.set('content-type','application/javascript; charset=utf-8');
    headers.set('cache-control','no-store, max-age=0');
    headers.delete('content-length');
    headers.delete('content-encoding');
    return new Response(text+'\n'+statusLoader,{status:response.status,statusText:response.statusText,headers});
  }
};
