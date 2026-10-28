import base, { AportesDB } from './index-v8.js';
export { AportesDB };

const editorStatusLoader=`
;(()=>{
  const load=()=>{
    if(!document.querySelector('script[data-edit-status-v9]')){
      const s=document.createElement('script');
      s.src='edit-status-v9.js?v=20261027-edit-status-1';
      s.dataset.editStatusV9='1';
      document.body.appendChild(s);
    }
    if(!document.querySelector('script[data-follow-period-save-v10]')){
      const f=document.createElement('script');
      f.src='follow-period-save-v10.js?v=20261027-follow-save-1';
      f.dataset.followPeriodSaveV10='1';
      document.body.appendChild(f);
    }
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
    return new Response(text+'\n'+editorStatusLoader,{status:response.status,statusText:response.statusText,headers});
  }
};
