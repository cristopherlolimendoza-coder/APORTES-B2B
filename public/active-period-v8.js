/* HONOR B2B V8: mes vigente editable para cuentas En proceso y mes de resultado para cuentas cerradas. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ABBR=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const SESSION_FILTER='honor_b2b_filter_state_v1';
const rows=()=>typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[];
let installed=false,applying=false,monthObserver=null;

function internalState(v){return v==='Ganada'?'Ganada':v==='Perdida'||v==='Descartado'?'Perdida':'En curso'}
function normalizeCode(v){
 const s=String(v||'').trim().toLowerCase();
 let m=s.match(/^([a-z]{3})-(\d{2})$/);if(m&&ABBR.includes(m[1]))return m[1]+'-'+m[2];
 m=s.match(/^([a-z]{3})-(20\d{2})$/);if(m&&ABBR.includes(m[1]))return m[1]+'-'+m[2].slice(-2);
 m=s.match(/^(20\d{2})-(\d{1,2})$/);if(m&&Number(m[2])>=1&&Number(m[2])<=12)return ABBR[Number(m[2])-1]+'-'+m[1].slice(-2);
 return'';
}
function codeFromClose(month,year){const i=MONTHS.indexOf(String(month||'')),y=Number(year);return i>=0&&y>=2020&&y<=2099?ABBR[i]+'-'+String(y).slice(-2):''}
function parseCode(code){const m=normalizeCode(code).match(/^([a-z]{3})-(\d{2})$/);if(!m)return null;return{month:ABBR.indexOf(m[1]),year:2000+Number(m[2])}}
function codeLabel(code){const p=parseCode(code);return p?MONTHS[p.month]+' '+p.year:String(code||'Sin periodo')}
function originalCode(r){if(!r)return'';if(!r.__mesOrigenOriginal)r.__mesOrigenOriginal=normalizeCode(r.mesOrigen);return r.__mesOrigenOriginal||normalizeCode(r.mesOrigen)}
function effectiveCode(r){
 if(!r)return'';const st=internalState(r.estado);
 if(st==='En curso')return normalizeCode(r.mesSeguimiento)||originalCode(r);
 return codeFromClose(r.mesCierre,r.anioCierre)||normalizeCode(r.mesSeguimiento)||originalCode(r);
}
function periodSort(a,b){const pa=parseCode(a),pb=parseCode(b);return(pa?.year||0)-(pb?.year||0)||(pa?.month||0)-(pb?.month||0)}
function captureFilterState(){
 try{const old=JSON.parse(sessionStorage.getItem(SESSION_FILTER)||'null')||{},values={};['fMonth','fChannel','fExec','fState','fSearch'].forEach(id=>{const e=$(id);if(e)values[id]=e.value||''});sessionStorage.setItem(SESSION_FILTER,JSON.stringify({...old,values,view:document.querySelector('.tab.on')?.dataset.view||old.view||'accounts',scrollY:window.scrollY||0,savedAt:Date.now()}))}catch{}
}
function savedMonth(){try{return JSON.parse(sessionStorage.getItem(SESSION_FILTER)||'null')?.values?.fMonth||''}catch{return''}}

function replaceMonthSelect(){
 const old=$('fMonth');if(!old||old.dataset.v8==='1')return old;
 const next=old.cloneNode(false);next.dataset.v8='1';const oldHandler=old.onchange;const selected=old.value||savedMonth();
 old.replaceWith(next);
 next.onchange=function(e){if(typeof oldHandler==='function')oldHandler.call(next,e);captureFilterState();setTimeout(applyAll,30)};
 next.addEventListener('change',captureFilterState);
 next.dataset.pendingValue=selected;
 return next;
}
function refreshMonthOptions(){
 const select=replaceMonthSelect();if(!select)return;
 const codes=[...new Set(rows().map(effectiveCode).filter(Boolean))].sort(periodSort);
 const selected=select.value||select.dataset.pendingValue||savedMonth();
 const html='<option value="">Todos</option>'+codes.map(c=>'<option value="'+c+'">'+codeLabel(c)+'</option>').join('');
 if(select.innerHTML!==html)select.innerHTML=html;
 if(!selected||codes.includes(selected))select.value=selected||'';else select.value='';
 select.dataset.pendingValue='';
 if(monthObserver)monthObserver.disconnect();
 monthObserver=new MutationObserver(()=>setTimeout(refreshMonthOptions,0));monthObserver.observe(select,{childList:true});
}
function applyEffectiveMonths(){rows().forEach(r=>{originalCode(r);const code=effectiveCode(r);if(code)r.mesOrigen=code;});}
function recordByButton(btn){const id=decodeURIComponent(btn?.dataset?.edit||'');return rows().find(r=>String(r.id)===String(id))}
function patchVisibleMonths(){
 document.querySelectorAll('#accountRows [data-edit]').forEach(btn=>{const r=recordByButton(btn),tr=btn.closest('tr');if(r&&tr?.children[2])tr.children[2].textContent=codeLabel(effectiveCode(r));});
 document.querySelectorAll('#accountCards [data-edit]').forEach(btn=>{const r=recordByButton(btn),meta=btn.closest('.account-card')?.querySelector('.account-meta');if(r&&meta)meta.textContent=(r.ejecutivo||'Sin KAM')+' · '+(r.ruc||'')+' · '+codeLabel(effectiveCode(r));});
 const r=currentRecord();if(r){const origin=[...document.querySelectorAll('#editSummary span')].find(x=>x.textContent.trim()==='MES DE ORIGEN');if(origin?.nextElementSibling)origin.nextElementSibling.textContent=codeLabel(originalCode(r));}
}
function currentRecord(){const id=$('editId')?.value;return rows().find(r=>String(r.id)===String(id))}
function editorState(){const states=[...document.querySelectorAll('#editItems [data-state]')].map(x=>internalState(x.value));return states.includes('En curso')?'En curso':states.includes('Ganada')?'Ganada':'Perdida'}
function selectedPeriodCode(){const month=$('editCloseMonth')?.value,year=$('editCloseYear')?.value;return codeFromClose(month,year)}
function syncEditorPeriod(){
 const dlg=$('editDlg'),r=currentRecord(),box=$('editClosePeriod');if(!dlg?.open||!r||!box)return;
 const st=editorState(),code=st==='En curso'?(normalizeCode(r.mesSeguimiento)||effectiveCode(r)):(codeFromClose(r.mesCierre,r.anioCierre)||effectiveCode(r)),p=parseCode(code)||{month:new Date().getMonth(),year:new Date().getFullYear()};
 const month=$('editCloseMonth'),year=$('editCloseYear');if(month)month.value=MONTHS[p.month];if(year)year.value=String(p.year);
 const title=box.querySelector('.period-title b'),desc=box.querySelector('.period-title span'),labels=box.querySelectorAll('label');
 if(st==='En curso'){
   if(title)title.textContent='Mes vigente de seguimiento';if(desc)desc.textContent='La cuenta seguirá En proceso y aparecerá en el mes y año seleccionados.';if(labels[0])labels[0].textContent='MES VIGENTE';if(labels[1])labels[1].textContent='AÑO VIGENTE';
 }else{
   if(title)title.textContent='Mes del resultado';if(desc)desc.textContent='La cuenta cerrada se contabilizará en el mes y año seleccionados.';if(labels[0])labels[0].textContent='MES DE RESULTADO';if(labels[1])labels[1].textContent='AÑO DE RESULTADO';
 }
 updateEditorHint();patchVisibleMonths();
}
function updateEditorHint(){
 const hint=$('editCloseHint');if(!hint)return;const st=editorState(),label=codeLabel(selectedPeriodCode());
 hint.innerHTML=st==='En curso'?'La cuenta permanecerá <b>En proceso</b> y se moverá al periodo <b>'+label+'</b>. Ya no aparecerá en su mes anterior.':'La cuenta se guardará como <b>'+st+'</b> y aparecerá en el análisis de <b>'+label+'</b>.';
}
function setVersion(){const v=document.querySelector('.version');if(v?.firstChild)v.firstChild.textContent='V8 MES VIGENTE Y RESULTADO';}

function installFetch(){
 if(window.__honorActivePeriodFetch)return;window.__honorActivePeriodFetch=true;const previous=window.fetch.bind(window);
 window.fetch=async function(input,init){
   let nextInit=init;const raw=typeof input==='string'?input:(input?.url||'');let path='';try{path=new URL(raw,location.href).pathname}catch{}
   if(path==='/api/save'&&nextInit?.body){
     try{const body=JSON.parse(nextInit.body),r=rows().find(x=>String(x.id)===String(body.id));
       if(body?.patch){body.patch.mesOrigen=originalCode(r)||normalizeCode(body.patch.mesOrigen)||body.patch.mesOrigen;body.patch.nota=String(r?.nota||body.patch.nota||'');let follow='';if(body.isNew)follow=normalizeCode(body.patch.mesOrigen);else if(String($('editId')?.value||'')===String(body.id))follow=selectedPeriodCode();else follow=normalizeCode(r?.mesSeguimiento)||effectiveCode(r);body.patch.mesSeguimiento=follow||normalizeCode(body.patch.mesOrigen);}
       nextInit={...nextInit,body:JSON.stringify(body)};
     }catch{}
   }
   const response=await previous(input,nextInit);
   if(['/api/data','/api/save','/api/history'].includes(path))setTimeout(applyAll,80);
   return response;
 };
}
function installEvents(){
 document.addEventListener('click',e=>{if(e.target.closest('[data-edit]'))setTimeout(syncEditorPeriod,80)});
 $('editDlg')?.addEventListener('change',e=>{if(e.target.matches('[data-state],#editCloseMonth,#editCloseYear'))setTimeout(()=>{if(e.target.matches('[data-state]'))syncEditorPeriod();else updateEditorHint()},40)});
 const dlg=$('editDlg');if(dlg)new MutationObserver(()=>{if(dlg.open)setTimeout(syncEditorPeriod,80)}).observe(dlg,{attributes:true,attributeFilter:['open']});
 ['accountRows','accountCards','followRows','followCards','resMonths','fundMonths'].forEach(id=>{const el=$(id);if(el)new MutationObserver(()=>setTimeout(()=>{applyEffectiveMonths();patchVisibleMonths();setVersion()},20)).observe(el,{childList:true,subtree:true})});
}
function applyAll(){if(applying)return;applying=true;try{applyEffectiveMonths();refreshMonthOptions();patchVisibleMonths();syncEditorPeriod();setVersion()}finally{applying=false}}
function install(){if(installed)return;installed=true;installFetch();installEvents();applyAll();setTimeout(applyAll,500);setTimeout(applyAll,1600);setTimeout(applyAll,3200)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
