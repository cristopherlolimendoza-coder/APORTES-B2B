/* HONOR B2B V7: solo Ganada, Perdida y En proceso; totales consistentes por estado. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const DATA_ROWS=()=>typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[];
const nval=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0};
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
let applying=false,queued=false;

function state(v){
 if(v==='Ganada')return'Ganada';
 if(v==='Perdida'||v==='Descartado')return'Perdida';
 return'En curso';
}
function label(v){return state(v)==='En curso'?'En proceso':state(v)}
function badgeClass(v){return state(v)==='Ganada'?'good':state(v)==='Perdida'?'bad':'open'}

/* La cuenta es la fuente de verdad. Los estados históricos adicionales se reducen a tres. */
function normalizeData(){
 DATA_ROWS().forEach(r=>{
   const account=state(r.estado);r.estado=account;
   if(!Array.isArray(r.modelItems)||!r.modelItems.length)return;
   r.modelItems.forEach(x=>{
     let s=state(x.estado);
     if(account==='Ganada'&&s==='En curso')s='Ganada';
     if(account==='Perdida')s='Perdida';
     x.estado=s;
     if(s!=='Ganada')x.unidadesGanadas=0;
   });
   if(account==='En curso'&&!r.modelItems.some(x=>state(x.estado)==='En curso')){
     const candidate=r.modelItems.find(x=>state(x.estado)!=='Ganada')||r.modelItems[0];
     if(candidate){candidate.estado='En curso';candidate.unidadesGanadas=0;}
   }
 });
}

function rowMetric(r){
 const st=state(r.estado),approved=nval(r.aporte),refUnits=nval(r.unidades);
 if(st==='Ganada'){
   const units=nval(r.unidadesEntregadas)||refUnits;
   const rawExecuted=nval(r.aportePagado)||approved;
   const executed=approved>0?Math.min(rawExecuted,approved):0;
   return{state:st,units,approved,executed,pending:0,released:Math.max(0,approved-executed),stateAmount:executed,missingAmount:approved<=0};
 }
 if(st==='Perdida')return{state:st,units:refUnits,approved,executed:0,pending:0,released:approved,stateAmount:approved,missingAmount:approved<=0};
 return{state:st,units:refUnits,approved,executed:0,pending:approved,released:0,stateAmount:approved,missingAmount:approved<=0};
}
function currentRows(){
 const month=$('fMonth')?.value||'',channel=$('fChannel')?.value||'',exec=$('fExec')?.value||'',st=$('fState')?.value||'',q=($('fSearch')?.value||'').trim().toLowerCase();
 return DATA_ROWS().filter(r=>(!month||r.mesOrigen===month)&&(!channel||r.canal===channel)&&(!exec||r.ejecutivo===exec)&&(!st||state(r.estado)===state(st))&&(!q||[r.cliente,r.ruc,r.ejecutivo,r.modelos].join(' ').toLowerCase().includes(q)));
}
function aggregate(rows){
 const a={clients:new Set(),ops:rows.length,won:0,lost:0,open:0,units:0,approved:0,executed:0,pending:0,released:0,stateAmount:0,missingAmount:0};
 rows.forEach(r=>{const m=rowMetric(r);a.clients.add(r.ruc||r.cliente);a.units+=m.units;a.approved+=m.approved;a.executed+=m.executed;a.pending+=m.pending;a.released+=m.released;a.stateAmount+=m.stateAmount;if(m.missingAmount)a.missingAmount++;if(m.state==='Ganada')a.won++;else if(m.state==='Perdida')a.lost++;else a.open++;});return a;
}
function kpi(t,v,s,c=''){return'<div class="kpi '+c+'"><span>'+esc(t)+'</span><b>'+v+'</b><small>'+esc(s||'')+'</small></div>'}

function patchFilter(){
 const el=$('fState');if(!el)return;const selected=state(el.value||'');
 const html='<option value="">Todos</option><option value="Ganada">Ganada</option><option value="Perdida">Perdida</option><option value="En curso">En proceso</option>';
 if(el.innerHTML!==html)el.innerHTML=html;
 el.value=el.dataset.v7HadSelection==='1'||selected!=='En curso'?selected:'';
 if(selected==='En curso'&&el.dataset.v7HadSelection==='1')el.value='En curso';
 if(el.value)el.dataset.v7HadSelection='1';
}
function patchKpis(){
 const rows=currentRows(),a=aggregate(rows),filter=state($('fState')?.value||'');
 const filtered=!!$('fState')?.value;
 const unitTitle=filtered?(filter==='Ganada'?'Unidades ganadas':filter==='Perdida'?'Unidades perdidas':'Unidades en proceso'):'Unidades del estado';
 const unitSub=filtered?'Suma del estado seleccionado':'Ganadas + perdidas + en proceso';
 const missing=a.missingAmount?(' · '+a.missingAmount+' sin aporte definido'):'';
 const html=kpi('Clientes',num(a.clients.size),'Únicos por RUC')+
   kpi('Oportunidades',num(a.ops),'Dentro del filtro')+
   kpi('Resultado','G '+a.won+' · P '+a.lost,'EP '+a.open,a.open?'open':'good')+
   kpi(unitTitle,num(a.units),unitSub,filter==='Ganada'?'good':filter==='Perdida'?'bad':'open')+
   kpi('Aporte aprobado',money(a.approved),'Total del filtro'+missing)+
   kpi('Ganado / ejecutado',money(a.executed),'Cuentas ganadas','good')+
   kpi('En proceso',money(a.pending),'Cuentas abiertas','open')+
   kpi('Perdido / liberado',money(a.released),'Cuentas perdidas o saldo','bad');
 ['resKpis','accountKpis'].forEach(id=>{const el=$(id);if(el&&el.innerHTML!==html)el.innerHTML=html;});
 const fund=$('fundKpis');if(fund){const f=kpi('Aporte aprobado',money(a.approved),'Total del filtro'+missing)+kpi('Ganado / ejecutado',money(a.executed),'Ganadas','good')+kpi('En proceso',money(a.pending),'Abiertas','open')+kpi('Perdido / liberado',money(a.released),'Perdidas o saldo','bad');if(fund.innerHTML!==f)fund.innerHTML=f;}
 const donut=$('fundDonut');if(donut){const total=Math.max(1,a.approved),g=a.executed/total*360,p=a.pending/total*360;const d='<div class="donut" style="background:conic-gradient(var(--good) 0 '+g+'deg,var(--open) '+g+'deg '+(g+p)+'deg,var(--bad) '+(g+p)+'deg 360deg)"><div class="donut-center"><div>'+money(a.approved)+'<div class="mut">aprobado</div></div></div></div><div class="legend"><span><i style="background:var(--good)"></i>Ganado '+money(a.executed)+'</span><span><i style="background:var(--open)"></i>En proceso '+money(a.pending)+'</span><span><i style="background:var(--bad)"></i>Perdido '+money(a.released)+'</span></div>';if(donut.innerHTML!==d)donut.innerHTML=d;}
}

function patchModelLabels(container,r){
 if(!container)return;container.querySelectorAll('.model em,.account-model>b').forEach((el,i)=>{
   const raw=Array.isArray(r?.modelItems)?r.modelItems[i]?.estado:el.textContent.trim();
   const text=label(raw==='Sin definir'?r?.estado:raw);
   if(el.textContent.trim()!==text)el.textContent=text;
   el.style.color=text==='Ganada'?'var(--good)':text==='Perdida'?'var(--bad)':'var(--open)';
 });
}
function patchRows(){
 const rowsById=new Map(DATA_ROWS().map(r=>[String(r.id),r]));
 const header=[...document.querySelectorAll('#accountRows')].flatMap(x=>[...x.closest('table')?.querySelectorAll('th')||[]]);
 const unitsHeader=header.find(x=>/Unid\./i.test(x.textContent));if(unitsHeader&&unitsHeader.textContent!=='Unidades del estado')unitsHeader.textContent='Unidades del estado';
 document.querySelectorAll('#accountRows [data-edit]').forEach(btn=>{
   const id=decodeURIComponent(btn.dataset.edit||''),r=rowsById.get(id);if(!r)return;const m=rowMetric(r),tr=btn.closest('tr');if(!tr)return;const cells=tr.children;
   if(cells[0])cells[0].innerHTML='<span class="badge '+badgeClass(m.state)+'">'+label(m.state)+'</span>';
   patchModelLabels(cells[3],r);
   if(cells[4])cells[4].innerHTML='<b>'+num(m.units)+'</b><div class="mut">'+(m.state==='Ganada'?'ganadas':m.state==='Perdida'?'perdidas':'en proceso')+'</div>';
   if(cells[5])cells[5].innerHTML='<div class="moneycell"><span>Aprobado <b>'+money(m.approved)+'</b></span><span>Ganado <b>'+money(m.executed)+'</b></span><span>En proceso <b>'+money(m.pending)+'</b></span><span>Perdido <b>'+money(m.released)+'</b></span>'+(m.missingAmount?'<span class="mut">Sin aporte definido</span>':'')+'</div>';
 });
 document.querySelectorAll('#accountCards [data-edit]').forEach(btn=>{
   const id=decodeURIComponent(btn.dataset.edit||''),r=rowsById.get(id);if(!r)return;const m=rowMetric(r),card=btn.closest('.account-card');if(!card)return;const badge=card.querySelector('.badge');if(badge){badge.className='badge '+badgeClass(m.state);badge.textContent=label(m.state);}patchModelLabels(card,r);
   const grid=card.querySelector('.mini-grid');if(grid)grid.innerHTML='<div class="mini"><span>Unidades</span><b>'+num(m.units)+'</b></div><div class="mini"><span>Ganado</span><b>'+money(m.executed)+'</b></div><div class="mini"><span>En proceso</span><b>'+money(m.pending)+'</b></div><div class="mini"><span>Perdido</span><b>'+money(m.released)+'</b></div>'+(m.missingAmount?'<div class="mini"><span>Dato</span><b>Sin aporte</b></div>':'');
 });
}

function patchEditor(){
 document.querySelectorAll('#editItems [data-state]').forEach(select=>{
   const old=state(select.value),html='<option value="Ganada">Ganada</option><option value="Perdida">Perdida</option><option value="En curso">En proceso</option>';
   if(select.innerHTML!==html)select.innerHTML=html;select.value=old;
   const input=select.closest('.edit-item')?.querySelector('[data-won]');if(input){input.disabled=old!=='Ganada';if(old!=='Ganada')input.value=0;}
 });
 const sub=$('editDlg')?.querySelector('.dlg-head .sub');if(sub)sub.textContent='Cliente, RUC, KAM, canal y mes de origen no se editan. El resultado solo puede ser Ganada, Perdida o En proceso.';
}
function patchWords(){
 document.querySelectorAll('.badge,.legend span,.sub,.note,.month-total,.account-meta').forEach(el=>{
   if(el.children.length&&el.matches('.legend span'))return;
   const old=el.textContent,newText=old.replace(/En curso/g,'En proceso').replace(/Sin definir/g,'En proceso').replace(/Descartado/g,'Perdida').replace(/EC\s/g,'EP ');
   if(old!==newText&&el.children.length===0)el.textContent=newText;
 });
 const version=document.querySelector('.version');if(version&&version.firstChild)version.firstChild.textContent='V7 ESTADOS Y TOTALES CORREGIDOS';
}
function apply(){
 if(applying)return;applying=true;
 try{normalizeData();patchFilter();patchKpis();patchRows();patchEditor();patchWords();}finally{applying=false;}
}
function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;apply();},35)}
function install(){
 ['fMonth','fChannel','fExec','fState'].forEach(id=>$(id)?.addEventListener('change',schedule));$('fSearch')?.addEventListener('input',schedule);$('clearFilters')?.addEventListener('click',schedule);document.querySelectorAll('.tab').forEach(x=>x.addEventListener('click',schedule));$('editDlg')?.addEventListener('change',schedule);
 const targets=['resKpis','accountKpis','accountRows','accountCards','fundKpis','fundDonut','editItems'];targets.forEach(id=>{const el=$(id);if(el)new MutationObserver(schedule).observe(el,{childList:true,subtree:true});});
 apply();setTimeout(apply,600);setTimeout(apply,1900);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();