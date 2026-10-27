/* HONOR B2B V5: cierre editable, guardado directo y análisis por mes de resultado. */
(()=>{
'use strict';
const SESSION='honor_b2b_admin_session';
const CLOSE_MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const CLOSE_INDEX=Object.fromEntries(CLOSE_MONTHS.map((m,i)=>[m,i]));
const ORIGIN_NAMES={ene:'Enero',feb:'Febrero',mar:'Marzo',abr:'Abril',may:'Mayo',jun:'Junio',jul:'Julio',ago:'Agosto',sep:'Septiembre',oct:'Octubre',nov:'Noviembre',dic:'Diciembre'};
const ORIGIN_INDEX={ene:0,feb:1,mar:2,abr:3,may:4,jun:5,jul:6,ago:7,sep:8,oct:9,nov:10,dic:11};
const $=id=>document.getElementById(id);
const nval=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0};
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const rows=()=>typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[];
const uid=()=>('M-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
let installed=false,renderingHistory=false;

function addStyles(){
 if($('close-fix-style'))return;
 const style=document.createElement('style');style.id='close-fix-style';style.textContent=`
 .close-period{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:9px;align-items:end;background:#eef6ff;border:1px solid #cfe2f5;border-radius:12px;padding:11px;margin:10px 0 12px}.close-period .period-title{align-self:center}.close-period .period-title b{display:block;font-size:13px}.close-period .period-title span{font-size:10px;color:#61748a}.close-period label{display:block;font-size:9px;font-weight:900;color:#718096;margin-bottom:4px}.close-period select{width:100%;height:38px;border:1px solid #cbd8e6;border-radius:8px;background:#fff;padding:0 8px}.close-hint{grid-column:1/-1;font-size:10px;color:#52677d}.save-ok{display:block!important;background:#eaf7ed!important;color:#24743e!important;border-color:#bfe3c8!important}.save-error{display:block!important;background:#fff0ee!important;color:#a9362e!important;border-color:#f0c6c1!important}
 @media(max-width:720px){.close-period{grid-template-columns:1fr 1fr}.close-period .period-title{grid-column:1/-1}}
 @media(max-width:480px){.close-period{grid-template-columns:1fr}}
 `;document.head.appendChild(style);
}

function ensurePeriodUI(){
 const summary=$('editSummary');if(!summary||$('editClosePeriod'))return;
 const wrap=document.createElement('div');wrap.id='editClosePeriod';wrap.className='close-period';
 wrap.innerHTML='<div class="period-title"><b>Mes del resultado</b><span>El cierre se contabilizará en este mes, aunque la oportunidad se haya creado antes.</span></div><div><label>MES DE CIERRE</label><select id="editCloseMonth">'+CLOSE_MONTHS.map(m=>'<option>'+m+'</option>').join('')+'</select></div><div><label>AÑO DE CIERRE</label><select id="editCloseYear">'+Array.from({length:17},(_,i)=>2020+i).map(y=>'<option value="'+y+'">'+y+'</option>').join('')+'</select></div><div id="editCloseHint" class="close-hint"></div>';
 summary.after(wrap);
}

function currentRecord(){const id=$('editId')?.value;return rows().find(r=>String(r.id)===String(id));}
function stateRows(){return [...document.querySelectorAll('#editItems .edit-item')];}
function selectedItems(){
 const existing=currentRecord();const oldItems=Array.isArray(existing?.modelItems)?existing.modelItems:[];
 return stateRows().map((el,i)=>{
   const old=oldItems.find(x=>String(x.id||'')===String(el.dataset.mid||''))||oldItems[i]||{};
   const state=el.querySelector('[data-state]')?.value||'En curso';
   const proposed=nval(el.dataset.proposed),won=state==='Ganada'?nval(el.querySelector('[data-won]')?.value):0;
   return {id:el.dataset.mid||old.id||uid(),modelo:el.querySelector('.model-name strong')?.textContent.trim()||old.modelo||'',unidades:proposed,aporteUnitario:nval(el.dataset.rate),estado:state,unidadesGanadas:won,nota:String(old.nota||'')};
 });
}
function accountState(items){const open=items.some(x=>x.estado==='En curso'||x.estado==='Sin definir');if(open)return'En curso';return items.some(x=>x.estado==='Ganada')?'Ganada':'Perdida';}
function updatePeriodHint(){
 const hint=$('editCloseHint');if(!hint)return;const items=selectedItems(),state=accountState(items),m=$('editCloseMonth')?.value,y=$('editCloseYear')?.value;
 hint.innerHTML=state==='En curso'?'La cuenta seguirá <b>En curso</b> porque queda al menos un modelo abierto o por definir. Para cerrarla, marca los demás modelos como “No va” o “Perdida”.':'La cuenta se guardará como <b>'+state+'</b> y aparecerá en el análisis de <b>'+esc(m)+' '+esc(y)+'</b>.';
}
function populatePeriod(){
 const r=currentRecord();if(!r||!$('editCloseMonth'))return;const now=new Date();
 $('editCloseMonth').value=r.mesCierre&&CLOSE_MONTHS.includes(r.mesCierre)?r.mesCierre:CLOSE_MONTHS[now.getMonth()];
 $('editCloseYear').value=String(r.anioCierre||now.getFullYear());
 updatePeriodHint();
}
function message(text,ok=false){const box=$('editError');if(!box)return;box.textContent=text;box.classList.remove('save-ok','save-error');box.classList.add(ok?'save-ok':'save-error');}

async function cloudRevision(id){
 const res=await fetch('/api/data',{cache:'no-store'});if(!res.ok)throw Error('No se pudo consultar la versión actual de la cuenta.');
 const json=await res.json(),entry=(json.entries||[]).find(x=>String(x.id)===String(id));return Number(entry?.rev)||0;
}
async function putAccount(record,revision){
 const key=sessionStorage.getItem(SESSION)||'';if(!key)throw Error('La edición no está activa. Ingresa nuevamente la clave.');
 const payload={id:String(record.id),isNew:false,rev:revision,patch:{cliente:String(record.cliente||''),ruc:String(record.ruc||''),canal:record.canal||'Empresas',ejecutivo:String(record.ejecutivo||''),modelos:String(record.modelos||''),unidades:nval(record.unidades),aporte:nval(record.aporte),estado:record.estado||'En curso',mesOrigen:record.mesOrigen||'oct-26',mesCierre:record.mesCierre||'',anioCierre:record.anioCierre||null,comentario:String(record.comentario||''),unidadesEntregadas:nval(record.unidadesEntregadas),aportePagado:nval(record.aportePagado),modelItems:record.modelItems||[]}};
 const res=await fetch('/api/save',{method:'PUT',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify(payload)});let json={};try{json=await res.json()}catch{}
 if(res.status===409){const fresh=await cloudRevision(record.id);if(fresh!==revision)return putAccount(record,fresh);}
 if(!res.ok||!json.ok)throw Error(json.error||('No se pudo guardar. Código '+res.status));return json.entry;
}
async function saveEnhanced(){
 const r=currentRecord();if(!r)return message('No se encontró la cuenta seleccionada.');
 const items=selectedItems();if(!items.length)return message('La cuenta no tiene modelos para actualizar.');
 if(items.some(x=>x.estado==='Ganada'&&x.unidadesGanadas<=0))return message('Cuando un modelo sí va, indica al menos una unidad.');
 if(items.some(x=>x.estado==='Ganada'&&x.unidades>0&&x.unidadesGanadas>x.unidades))return message('Las unidades que sí van no pueden superar las unidades referenciales.');
 const state=accountState(items),month=$('editCloseMonth')?.value||'',year=Number($('editCloseYear')?.value)||null;
 if(state!=='En curso'&&(!month||!year))return message('Selecciona el mes y el año de cierre.');
 const wonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0),cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0);
 const updated={...r,estado:state,mesCierre:state==='En curso'?'':month,anioCierre:state==='En curso'?null:year,cierre:state==='En curso'?'':month+' '+year,unidadesEntregadas:wonUnits,aportePagado:cost,modelItems:items};
 const btn=$('editSave');btn.disabled=true;btn.textContent='Guardando…';message('Guardando y verificando el cambio…',true);
 try{const rev=await cloudRevision(r.id),entry=await putAccount(updated,rev);Object.assign(r,entry.patch||updated);message('Cambio guardado correctamente. Actualizando el panel…',true);setTimeout(()=>location.reload(),450)}catch(err){message(err.message||'No se pudo guardar el cambio.');btn.disabled=false;btn.textContent='Guardar cambios';}
}

function installEditor(){
 addStyles();ensurePeriodUI();
 const old=$('editSave');if(old&&!old.dataset.v5){const btn=old.cloneNode(true);btn.dataset.v5='1';old.replaceWith(btn);btn.addEventListener('click',saveEnhanced);}
 document.addEventListener('click',e=>{if(e.target.closest('[data-edit]'))setTimeout(populatePeriod,0)});
 $('editDlg')?.addEventListener('change',e=>{if(e.target.matches('[data-state],#editCloseMonth,#editCloseYear'))setTimeout(updatePeriodHint,0)});
 const dlg=$('editDlg');if(dlg){new MutationObserver(()=>{if(dlg.open)setTimeout(populatePeriod,0)}).observe(dlg,{attributes:true,attributeFilter:['open']});}
}

function originPeriod(r){const m=String(r.mesOrigen||'').match(/^([a-z]{3})-(\d{2,4})$/);if(!m)return null;const year=Number(m[2].length===2?'20'+m[2]:m[2]),month=ORIGIN_INDEX[m[1]];return Number.isInteger(month)?{year,month}:null;}
function resultPeriod(r){const state=String(r.estado||'En curso');if(state!=='En curso'&&r.mesCierre&&r.anioCierre&&CLOSE_INDEX[r.mesCierre]!==undefined)return{year:Number(r.anioCierre),month:CLOSE_INDEX[r.mesCierre]};return originPeriod(r);}
function periodKey(p){return p?p.year+'-'+String(p.month+1).padStart(2,'0'):'';}
function periodLabel(key){const [y,m]=key.split('-').map(Number);return CLOSE_MONTHS[m-1]+' '+y;}
function parseItems(r){if(Array.isArray(r.modelItems)&&r.modelItems.length)return r.modelItems;const text=String(r.modelos||'');return text.split(/\s*\|\s*/).filter(Boolean).map(part=>{const b=part.split('·').map(x=>x.trim()),u=(b[1]||'').match(/([\d,.]+)\s*u/i),a=(b[2]||'').match(/\$\s*([\d,.]+)/i);return{modelo:b[0]||part,unidades:u?nval(u[1]):0,aporteUnitario:a?nval(a[1]):0,unidadesGanadas:r.estado==='Ganada'?nval(r.unidadesEntregadas||r.unidades):0,estado:r.estado||'En curso'}});}
function rowMetrics(r){const items=parseItems(r),cost=nval(r.aportePagado)||items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+nval(x.unidadesGanadas)*nval(x.aporteUnitario),0),wonUnits=nval(r.unidadesEntregadas)||items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+nval(x.unidadesGanadas),0),approved=nval(r.aporte),state=r.estado||'En curso',pending=state==='En curso'?Math.max(0,approved-cost):0,released=Math.max(0,approved-cost-pending);return{cost,wonUnits,approved,pending,released,state};}
function filteredRows(){const month=$('fMonth')?.value||'',channel=$('fChannel')?.value||'',exec=$('fExec')?.value||'',state=$('fState')?.value||'',q=($('fSearch')?.value||'').trim().toLowerCase();return rows().filter(r=>{const m=rowMetrics(r);return(!month||r.mesOrigen===month)&&(!channel||r.canal===channel)&&(!exec||r.ejecutivo===exec)&&(!state||m.state===state)&&(!q||[r.cliente,r.ruc,r.ejecutivo,r.modelos].join(' ').toLowerCase().includes(q));});}
function historicalHtml(finance=false){
 const buckets=new Map();for(const r of filteredRows()){const p=resultPeriod(r),key=periodKey(p);if(!key)continue;const m=rowMetrics(r),b=buckets.get(key)||{ops:0,won:0,lost:0,open:0,cost:0,pending:0,released:0,wonUnits:0,approved:0};b.ops++;b.approved+=m.approved;b.cost+=m.cost;b.pending+=m.pending;b.released+=m.released;b.wonUnits+=m.wonUnits;if(m.state==='Ganada')b.won++;else if(m.state==='Perdida')b.lost++;else b.open++;buckets.set(key,b);}
 return [...buckets.entries()].sort((a,b)=>a[0].localeCompare(b[0])).map(([key,b])=>{const total=Math.max(1,finance?b.approved:b.ops),v1=finance?b.cost:b.won,v2=finance?b.pending:b.lost,v3=finance?b.released:b.open;return'<div class="month"><b>'+esc(periodLabel(key))+'</b><div class="barstack"><i style="width:'+(v1/total*100)+'%;background:var(--good)"></i><i style="width:'+(v2/total*100)+'%;background:'+(finance?'var(--open)':'var(--bad)')+'"></i><i style="width:'+(v3/total*100)+'%;background:'+(finance?'#8793a5':'var(--open)')+'"></i></div><div class="month-total">'+(finance?'<b>'+money(b.cost)+'</b> costo · '+money(b.pending)+' pend.':'<b>'+num(b.wonUnits)+' u</b> · '+money(b.cost)+' costo · '+money(b.pending)+' pend.')+'</div></div>'}).join('')||'<div class="mut">Sin datos.</div>';
}
function renderHistorical(){if(renderingHistory)return;renderingHistory=true;try{const res=$('resMonths'),fund=$('fundMonths');if(res){const html=historicalHtml(false);if(res.innerHTML!==html)res.innerHTML=html;}if(fund){const html=historicalHtml(true);if(fund.innerHTML!==html)fund.innerHTML=html;}const rt=res?.closest('.card')?.querySelector('.title');if(rt)rt.textContent='Trazabilidad por mes de resultado';const ft=fund?.closest('.card')?.querySelector('.title');if(ft)ft.textContent='Aporte ejecutado por mes de resultado';}finally{renderingHistory=false;}}
function installHistorical(){const schedule=()=>setTimeout(renderHistorical,20);['fMonth','fChannel','fExec','fState','fSearch','clearFilters'].forEach(id=>$(id)?.addEventListener(id==='fSearch'?'input':'change',schedule));document.querySelectorAll('.tab').forEach(x=>x.addEventListener('click',schedule));['resMonths','fundMonths'].forEach(id=>{const el=$(id);if(el)new MutationObserver(schedule).observe(el,{childList:true,subtree:true});});setTimeout(renderHistorical,500);setTimeout(renderHistorical,1800);}
function install(){if(installed)return;installed=true;installEditor();installHistorical();const version=document.querySelector('.version');if(version)version.firstChild.textContent='V5 CIERRE Y GUARDADO CORREGIDO';}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
