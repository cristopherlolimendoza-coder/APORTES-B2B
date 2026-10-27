(function(){
'use strict';
const MONTHS=['may-26','jun-26','jul-26','ago-26','sep-26','oct-26','nov-26','dic-26'];
const MONTH_NAMES={'may-26':'Mayo','jun-26':'Junio','jul-26':'Julio','ago-26':'Agosto','sep-26':'Septiembre','oct-26':'Octubre','nov-26':'Noviembre','dic-26':'Diciembre'};
const CLOSE_MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const MODEL_STATES=['Sin definir','En curso','Ganada','Perdida','Descartado'];
const COLORS={Ganada:'#3b9b5f',Perdida:'#d4544a','En curso':'#4f97d7',Descartado:'#7b8798','Sin definir':'#c49b37'};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const money2=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
const uid=()=>('M-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7));
function nval(v){const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0}
function parseModelText(row){
 if(Array.isArray(row.modelItems)&&row.modelItems.length){return row.modelItems.map((x,i)=>({
  id:String(x.id||('M'+(i+1))),modelo:String(x.modelo||''),unidades:nval(x.unidades),aporteUnitario:nval(x.aporteUnitario),unidadesGanadas:nval(x.unidadesGanadas),estado:MODEL_STATES.includes(x.estado)?x.estado:'En curso',nota:String(x.nota||'')
 }))}
 const raw=String(row.modelos||'').trim();if(!raw)return [];
 const parts=raw.split(/\s*\|\s*/).filter(Boolean);
 return parts.map((p,i)=>{
  const bits=p.split('·').map(x=>x.trim());
  const modelo=bits[0]||p;
  const um=(bits[1]||'').match(/([\d,.]+|\?)\s*u/i),am=(bits[2]||'').match(/\$\s*([\d,.]+)/i);
  const unidades=um&&um[1]!=='?'?nval(um[1]):0,aporteUnitario=am?nval(am[1]):0;
  let estado=row.estado||'En curso',unidadesGanadas=0;
  if(parts.length>1&&row.estado==='Ganada'){estado='Sin definir';}
  else if(row.estado==='Ganada'){estado='Ganada';unidadesGanadas=nval(row.unidadesEntregadas||row.unidades||unidades);}
  else if(row.estado==='Perdida'){estado='Perdida';}
  else estado='En curso';
  return {id:'M'+(i+1),modelo,unidades,aporteUnitario,unidadesGanadas,estado,nota:''};
 });
}
function structured(row){return Array.isArray(row.modelItems)&&row.modelItems.length>0}
function metrics(row){
 const items=parseModelText(row),has=structured(row);
 let approved=has?items.reduce((s,x)=>s+x.unidades*x.aporteUnitario,0):nval(row.aporte);
 const inferredWonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0);
 const inferredCost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0);
 let wonUnits=has?inferredWonUnits:(nval(row.unidadesEntregadas||0)||inferredWonUnits);
 let cost=has?inferredCost:(nval(row.aportePagado||0)||inferredCost);
 let pending=has?items.filter(x=>x.estado==='En curso').reduce((s,x)=>s+x.unidades*x.aporteUnitario,0):(row.estado==='En curso'?approved:0);
 let released=0,unresolved=0;
 if(has){
  items.forEach(x=>{
   const full=x.unidades*x.aporteUnitario;
   if(x.estado==='Perdida'||x.estado==='Descartado')released+=full;
   else if(x.estado==='Ganada')released+=Math.max(0,(x.unidades-x.unidadesGanadas)*x.aporteUnitario);
   else if(x.estado==='Sin definir')unresolved+=full;
  });
 }else if(row.estado==='Perdida')released=approved;
 let state=row.estado||'En curso';
 if(has){
   if(items.some(x=>x.estado==='En curso'))state='En curso';
   else if(items.some(x=>x.estado==='Sin definir'))state=row.estado||'En curso';
   else if(items.some(x=>x.estado==='Ganada'))state='Ganada';
   else state='Perdida';
 }
 const pendingTotal=pending+unresolved;
 return {items,approved,wonUnits,cost,pending,pendingTotal,released,unresolved,state,refUnits:nval(row.unidades)};
}
function ensureCommercialFields(){
 const probs={'Identificada':.10,'Propuesta':.30,'Negociación':.60,'Por cerrar':.85,'Ganada':1,'Perdida':0};
 (window.DATA||[]).forEach(r=>{
  const m=metrics(r);if(structured(r))r.estado=m.state;
  r.etapa=r.etapa||(r.estado==='Ganada'?'Ganada':r.estado==='Perdida'?'Perdida':'Propuesta');
  r.probabilidad=(r.probabilidad??probs[r.etapa]??.30);
  r.forecastCategoria=r.forecastCategoria||(r.estado==='Ganada'?'Cerrada ganada':r.estado==='Perdida'?'Cerrada perdida':'Pipeline');
 });
}
function currentRows(){try{return typeof window.F==='function'?window.F():window.DATA||[]}catch{return window.DATA||[]}}
function agg(rows){
 const a={ops:rows.length,clients:new Set(),won:0,lost:0,open:0,refUnits:0,wonUnits:0,approved:0,cost:0,pending:0,released:0,unresolved:0};
 rows.forEach(r=>{a.clients.add(r.ruc||r.cliente);const m=metrics(r);a.refUnits+=m.refUnits;a.wonUnits+=m.wonUnits;a.approved+=m.approved;a.cost+=m.cost;a.pending+=m.pendingTotal;a.released+=m.released;a.unresolved+=m.unresolved;if(m.state==='Ganada')a.won++;else if(m.state==='Perdida')a.lost++;else a.open++;});
 a.closed=a.won+a.lost;a.winRate=a.closed?a.won/a.closed*100:0;return a;
}
function kpi(label,value,sub,cls=''){return '<div class="cv3-kpi '+cls+'"><span>'+esc(label)+'</span><b>'+value+'</b><small>'+esc(sub||'')+'</small></div>'}
function statusBadge(s){const c=s==='Ganada'?'good':s==='Perdida'?'bad':'open';return '<span class="cv3-badge '+c+'">'+esc(s)+'</span>'}
function buildStyles(){
 const s=document.createElement('style');s.id='cv3-style';s.textContent=`
 .cv3-wrap{display:grid;gap:12px;margin:12px 0}.cv3-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.cv3-kpi{background:#fff;border:1px solid #dfe6ef;border-radius:13px;padding:13px;min-height:92px}.cv3-kpi span{display:block;color:#74839a;font-size:11px;font-weight:800}.cv3-kpi b{display:block;font-size:23px;margin:5px 0 2px}.cv3-kpi small{color:#74839a;font-size:10px}.cv3-kpi.good b{color:#267a45}.cv3-kpi.bad b{color:#b53a34}.cv3-kpi.open b{color:#2f76af}.cv3-grid{display:grid;grid-template-columns:minmax(280px,.75fr) minmax(0,1.6fr);gap:10px}.cv3-card{background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:14px}.cv3-title{font-size:15px;font-weight:900;margin-bottom:3px}.cv3-sub{font-size:11px;color:#74839a;margin-bottom:11px}.cv3-donut{width:180px;height:180px;border-radius:50%;position:relative;margin:8px auto}.cv3-donut:after{content:'';position:absolute;inset:35px;background:#fff;border-radius:50%}.cv3-donut-label{position:absolute;inset:0;z-index:2;display:grid;place-items:center;text-align:center;font-weight:900;font-size:25px}.cv3-legend{display:flex;justify-content:center;gap:12px;flex-wrap:wrap;font-size:11px;color:#617087}.cv3-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}.cv3-months{display:grid;gap:7px}.cv3-month{display:grid;grid-template-columns:78px minmax(0,1fr) 200px;gap:8px;align-items:center;font-size:11px}.cv3-stack{height:20px;display:flex;overflow:hidden;border-radius:6px;background:#edf1f6}.cv3-stack i{height:100%}.cv3-month-metric{text-align:right;color:#526176}.cv3-table{overflow:auto;border:1px solid #dfe6ef;border-radius:12px}.cv3-table table{min-width:1340px}.cv3-table td,.cv3-table th{font-size:11px}.cv3-badge{display:inline-block;padding:4px 8px;border-radius:99px;font-size:10px;font-weight:900}.cv3-badge.good{background:#e8f6ed;color:#24743e}.cv3-badge.bad{background:#fcebea;color:#a6332e}.cv3-badge.open{background:#e9f3fb;color:#276d9c}.cv3-models{display:grid;gap:5px;min-width:260px}.cv3-model{display:grid;grid-template-columns:minmax(160px,1fr) 70px 80px 82px;gap:6px;align-items:center;padding:6px;border:1px solid #e7edf4;border-radius:8px}.cv3-model strong{font-size:10px}.cv3-model span{font-size:9px;color:#74839a}.cv3-btn{height:31px;border:1px solid #d7e0eb;border-radius:8px;background:#fff;padding:0 9px;font-weight:800;cursor:pointer}.cv3-btn.primary{background:#10233b;color:#fff;border-color:#10233b}.cv3-btn.danger{color:#aa3730}.cv3-toolbar{display:flex;gap:7px;flex-wrap:wrap;align-items:center;justify-content:space-between;margin-bottom:10px}.cv3-note{font-size:11px;color:#617087;background:#f7fbff;border:1px solid #dce9f5;border-radius:9px;padding:9px}.cv3-filtername{font-weight:900;color:#10233b}.cv3-dialog{border:0;border-radius:16px;padding:0;width:min(1120px,calc(100% - 20px));max-width:1120px;box-shadow:0 24px 80px rgba(16,35,59,.25)}.cv3-dialog::backdrop{background:rgba(16,35,59,.48)}.cv3-dlg{padding:17px}.cv3-dlghead{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;margin-bottom:12px}.cv3-form{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}.cv3-form .span2{grid-column:span 2}.cv3-form label,.cv3-item label{font-size:9px;font-weight:900;color:#74839a}.cv3-form input,.cv3-form select,.cv3-form textarea,.cv3-item input,.cv3-item select{width:100%;height:36px;border:1px solid #dfe6ef;border-radius:8px;padding:0 9px;background:#fff}.cv3-form textarea{min-height:68px;height:auto;padding:8px}.cv3-items{display:grid;gap:7px;margin-top:9px}.cv3-item{display:grid;grid-template-columns:minmax(190px,2fr) 95px 95px 125px 110px 72px;gap:6px;align-items:end;background:#f8fafc;border:1px solid #e3eaf2;border-radius:10px;padding:8px}.cv3-item .remove{height:36px}.cv3-error{display:none;background:#fff0ee;color:#a9362e;border:1px solid #f0c6c1;border-radius:9px;padding:9px;font-size:11px;font-weight:800;margin-top:9px}.cv3-savebar{display:flex;justify-content:space-between;gap:10px;align-items:center;margin-top:12px}.cv3-summary{font-size:11px;color:#526176}.cv3-summary b{color:#10233b}.cv3-hidden{display:none!important}@media(max-width:1000px){.cv3-kpis{grid-template-columns:repeat(2,1fr)}.cv3-grid{grid-template-columns:1fr}.cv3-form{grid-template-columns:1fr 1fr}.cv3-item{grid-template-columns:1fr 90px 90px}.cv3-item .wide-status{grid-column:span 1}.cv3-month{grid-template-columns:65px minmax(0,1fr) 140px}}@media(max-width:620px){.cv3-kpis,.cv3-form{grid-template-columns:1fr}.cv3-form .span2{grid-column:auto}.cv3-item{grid-template-columns:1fr 1fr}.cv3-item .model-name{grid-column:1/-1}.cv3-month{grid-template-columns:58px minmax(0,1fr);}.cv3-month-metric{grid-column:1/-1;text-align:left}.cv3-donut{width:150px;height:150px}}
 `;document.head.appendChild(s);
}
function addTabs(){
 const tabs=document.querySelector('.tabs');if(!tabs)return;const list=[['res','Resumen'],['cue','Cuentas'],['pip','Pipeline'],['fun','Funnel'],['for','Forecast'],['per','Performance'],['apo','Aportes']];
 list.forEach(([id,label])=>{if(!$(id)||tabs.querySelector('[data-v="'+id+'"]'))return;const b=document.createElement('button');b.className='tab';b.dataset.v=id;b.textContent=label;tabs.appendChild(b)});
 list.forEach(([id])=>{const b=tabs.querySelector('[data-v="'+id+'"]');if(b)tabs.appendChild(b)});
 tabs.querySelectorAll('.tab').forEach(b=>{b.onclick=()=>{document.querySelectorAll('.tab,.v').forEach(x=>x.classList.remove('on'));b.classList.add('on');$(b.dataset.v)?.classList.add('on');if(b.dataset.v==='cue')render();}});
}
function buildPanel(){
 const cue=$('cue');if(!cue||$('cv3-panel'))return;
 const panel=document.createElement('div');panel.id='cv3-panel';panel.className='cv3-wrap';
 panel.innerHTML='<div class="cv3-card"><div class="cv3-toolbar"><div><div class="cv3-title">Panel comercial de cuentas</div><div class="cv3-sub">Los números responden a todos los filtros, incluido Ejecutivo. El costo confirmado solo usa modelos y unidades marcados como ganados.</div></div><button id="cv3New" class="cv3-btn primary">+ Nueva cuenta</button></div><div id="cv3FilterText" class="cv3-note"></div></div><div id="cv3Kpis" class="cv3-kpis"></div><div class="cv3-grid"><div class="cv3-card"><div class="cv3-title">Estado del filtro</div><div class="cv3-sub">Ganada · Perdida · En curso</div><div id="cv3Donut"></div></div><div class="cv3-card"><div class="cv3-title">Trazabilidad mensual</div><div class="cv3-sub">Oportunidades por estado, unidades ganadas y costo confirmado por mes de origen.</div><div id="cv3Months" class="cv3-months"></div></div></div><div class="cv3-card"><div class="cv3-toolbar"><div><div class="cv3-title">Cuentas y modelos</div><div class="cv3-sub">Cada modelo puede cerrarse por separado. “Descartado” libera su aporte sin marcar toda la cuenta como perdida.</div></div><div class="cv3-note">Aporte aprobado ≠ costo. <b>Costo</b> = unidades ganadas × aporte por equipo.</div></div><div class="cv3-table"><table><thead><tr><th>Estado</th><th>Cliente / Ejecutivo</th><th>Mes</th><th>Modelos</th><th>Unid. ref.</th><th>Unid. ganadas</th><th>Aporte aprobado</th><th>Costo confirmado</th><th>Pendiente</th><th>Liberado</th><th>Acción</th></tr></thead><tbody id="cv3Rows"></tbody></table></div></div>';
 const first=cue.querySelector('.box');if(first)first.after(panel);else cue.prepend(panel);
 cue.querySelectorAll('.editable-table').forEach(x=>x.classList.add('cv3-hidden'));
 const ai=$('accountInsights');if(ai?.parentElement)ai.parentElement.classList.add('cv3-hidden');
 const hi=$('historyInsights');if(hi?.parentElement)hi.parentElement.classList.add('cv3-hidden');
 $('cv3New').onclick=()=>openEditor(null,true);
}
function buildDialog(){
 if($('cv3Dlg'))return;
 const d=document.createElement('dialog');d.id='cv3Dlg';d.className='cv3-dialog';d.innerHTML='<div class="cv3-dlg"><div class="cv3-dlghead"><div><div class="cv3-title" id="cv3DlgTitle">Editar cuenta</div><div class="cv3-sub">Guarda una sola vez después de definir la cuenta y sus modelos.</div></div><button class="cv3-btn" id="cv3Close">Cerrar</button></div><input type="hidden" id="cv3Id"><div class="cv3-form"><div class="span2"><label>CLIENTE</label><input id="cv3Cliente"></div><div><label>RUC</label><input id="cv3Ruc" maxlength="11"></div><div><label>CANAL</label><select id="cv3Canal"><option>Corpo + Gobierno</option><option>Empresas</option></select></div><div class="span2"><label>EJECUTIVO / KAM</label><input id="cv3Ejecutivo"></div><div><label>MES ORIGEN</label><select id="cv3MesOrigen">'+MONTHS.map(m=>'<option value="'+m+'">'+(MONTH_NAMES[m]||m)+'</option>').join('')+'</select></div><div><label>UNIDADES CUENTA · REFERENCIAL</label><input id="cv3RefUnits" type="number" min="0" step="1"></div><div><label>MES CIERRE</label><select id="cv3MesCierre"><option value="">Sin confirmar</option>'+CLOSE_MONTHS.map(m=>'<option>'+m+'</option>').join('')+'</select></div><div><label>AÑO CIERRE</label><select id="cv3Anio">'+Array.from({length:11},(_,i)=>2024+i).map(y=>'<option>'+y+'</option>').join('')+'</select></div><div class="span2"><label>COMENTARIO</label><textarea id="cv3Comentario"></textarea></div></div><div style="margin-top:13px"><div class="cv3-toolbar"><div><div class="cv3-title">Modelos de la cuenta</div><div class="cv3-sub">Define unidades propuestas, aporte por equipo, estado del modelo y unidades realmente ganadas.</div></div><button class="cv3-btn" id="cv3AddModel" type="button">+ Agregar modelo</button></div><div id="cv3Items" class="cv3-items"></div></div><div id="cv3Error" class="cv3-error"></div><div class="cv3-savebar"><div id="cv3Calc" class="cv3-summary"></div><div><button class="cv3-btn" id="cv3Cancel">Cancelar</button> <button class="cv3-btn primary" id="cv3Save">Guardar cuenta</button></div></div></div>';document.body.appendChild(d);
 $('cv3Close').onclick=$('cv3Cancel').onclick=()=>d.close();$('cv3AddModel').onclick=()=>addItemRow();$('cv3Save').onclick=saveEditor;
 d.addEventListener('input',updateEditorCalc);d.addEventListener('change',e=>{if(e.target.matches('[data-ms]'))toggleWonInput(e.target.closest('.cv3-item'));updateEditorCalc()});
 d.addEventListener('click',e=>{const b=e.target.closest('[data-remove-model]');if(b){b.closest('.cv3-item').remove();if(!$('cv3Items').children.length)addItemRow();updateEditorCalc()}});
}
function addItemRow(item={}){
 const row=document.createElement('div');row.className='cv3-item';row.dataset.mid=item.id||uid();row.innerHTML='<div class="model-name"><label>MODELO</label><input data-m="modelo" value="'+esc(item.modelo||'')+'"></div><div><label>UNID. PROP.</label><input data-m="unidades" type="number" min="0" step="1" value="'+nval(item.unidades)+'"></div><div><label>USD / EQ</label><input data-m="aporte" type="number" min="0" step="0.01" value="'+nval(item.aporteUnitario)+'"></div><div class="wide-status"><label>ESTADO MODELO</label><select data-ms data-m="estado">'+MODEL_STATES.map(s=>'<option '+(String(item.estado||'En curso')===s?'selected':'')+'>'+s+'</option>').join('')+'</select></div><div><label>UNID. GANADAS</label><input data-m="ganadas" type="number" min="0" step="1" value="'+nval(item.unidadesGanadas)+'"></div><button class="cv3-btn danger remove" type="button" data-remove-model>Quitar</button>';$('cv3Items').appendChild(row);toggleWonInput(row);
}
function toggleWonInput(row){const st=row.querySelector('[data-m="estado"]')?.value,g=row.querySelector('[data-m="ganadas"]');if(!g)return;g.disabled=st!=='Ganada';if(st!=='Ganada')g.value=0;}
function editorItems(){return [...$('cv3Items').querySelectorAll('.cv3-item')].map(r=>({id:r.dataset.mid||uid(),modelo:r.querySelector('[data-m="modelo"]').value.trim(),unidades:nval(r.querySelector('[data-m="unidades"]').value),aporteUnitario:nval(r.querySelector('[data-m="aporte"]').value),estado:r.querySelector('[data-m="estado"]').value,unidadesGanadas:nval(r.querySelector('[data-m="ganadas"]').value),nota:''}))}
function updateEditorCalc(){
 if(!$('cv3Calc'))return;const items=editorItems(),approved=items.reduce((s,x)=>s+x.unidades*x.aporteUnitario,0),cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0),pending=items.filter(x=>x.estado==='En curso').reduce((s,x)=>s+x.unidades*x.aporteUnitario,0),won=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0);$('cv3Calc').innerHTML='Aprobado <b>'+money(approved)+'</b> · Costo <b>'+money(cost)+'</b> · Pendiente <b>'+money(pending)+'</b> · Unid. ganadas <b>'+num(won)+'</b>';
}
function showError(msg){const e=$('cv3Error');e.textContent=msg;e.style.display='block';}
function openEditor(id,isNew=false){
 buildDialog();const editOK=typeof window.HONOR_CLOUD_CAN_EDIT==='function'&&window.HONOR_CLOUD_CAN_EDIT();if(!editOK){showCloudAccessHint();return}
 const r=isNew?null:(window.DATA||[]).find(x=>String(x.id)===String(id));$('cv3DlgTitle').textContent=isNew?'Nueva cuenta':'Editar cuenta';$('cv3Id').value=r?.id||'';$('cv3Cliente').value=r?.cliente||'';$('cv3Ruc').value=r?.ruc||'';$('cv3Canal').value=r?.canal||'Empresas';$('cv3Ejecutivo').value=r?.ejecutivo||'';$('cv3MesOrigen').value=r?.mesOrigen||'oct-26';$('cv3RefUnits').value=nval(r?.unidades||0);$('cv3MesCierre').value=r?.mesCierre||'';$('cv3Anio').value=String(r?.anioCierre||2026);$('cv3Comentario').value=r?.comentario||'';$('cv3Items').innerHTML='';const items=r?parseModelText(r):[{id:uid(),modelo:'',unidades:0,aporteUnitario:0,unidadesGanadas:0,estado:'En curso'}];items.forEach(addItemRow);$('cv3Error').style.display='none';$('cv3Dlg').dataset.new=isNew?'1':'0';updateEditorCalc();$('cv3Dlg').showModal();
}
function showCloudAccessHint(){const input=$('cloudKey');const info=$('cloudAccess');if(input){input.scrollIntoView({behavior:'smooth',block:'center'});input.focus();}alert('Activa primero la edición con tu clave. Luego vuelve a pulsar Editar o Nueva cuenta.');if(info)info.style.fontWeight='900';}
function formatModels(items){return items.map(x=>x.modelo+' · '+(x.unidades||'?')+' u · '+(x.aporteUnitario?('$'+Number(x.aporteUnitario).toFixed(x.aporteUnitario%1?2:0)):'Pend.')+'/eq').join(' | ')}
async function saveEditor(){
 const isNew=$('cv3Dlg').dataset.new==='1',id=$('cv3Id').value||('WEB-'+Date.now()+'-'+Math.random().toString(36).slice(2,9)),items=editorItems();$('cv3Error').style.display='none';
 const cliente=$('cv3Cliente').value.trim(),ruc=$('cv3Ruc').value.trim();if(!cliente)return showError('Ingresa el cliente.');if(!/^\d{11}$/.test(ruc))return showError('El RUC debe tener 11 dígitos.');if(!items.length||items.some(x=>!x.modelo))return showError('Completa el nombre de todos los modelos.');if(items.some(x=>x.estado==='Sin definir'))return showError('Antes de guardar, define cada modelo como En curso, Ganada, Perdida o Descartado.');if(items.some(x=>x.unidadesGanadas>x.unidades&&x.unidades>0))return showError('Las unidades ganadas no pueden superar las propuestas.');
 const anyOpen=items.some(x=>x.estado==='En curso'),anyWon=items.some(x=>x.estado==='Ganada');let estado=anyOpen?'En curso':(anyWon?'Ganada':'Perdida');let mesCierre=$('cv3MesCierre').value,anioCierre=mesCierre?Number($('cv3Anio').value):null;if(estado!=='En curso'&&!mesCierre)return showError('La cuenta ya está cerrada. Selecciona mes y año de cierre.');if(estado==='En curso'){mesCierre='';anioCierre=null;}
 const approved=items.reduce((s,x)=>s+x.unidades*x.aporteUnitario,0),wonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0),cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0),base=(window.DATA||[]).find(x=>String(x.id)===String(id))||{};
 const row={...base,id,cliente,ruc,canal:$('cv3Canal').value,ejecutivo:$('cv3Ejecutivo').value.trim(),mesOrigen:$('cv3MesOrigen').value,unidades:nval($('cv3RefUnits').value)||Math.max(0,...items.map(x=>x.unidades)),modelos:formatModels(items),aporte:approved,estado,mesCierre,anioCierre,cierre:mesCierre?(mesCierre+' '+anioCierre):'',comentario:$('cv3Comentario').value.trim(),unidadesEntregadas:wonUnits,aportePagado:cost,modelItems:items};
 const btn=$('cv3Save');btn.disabled=true;btn.textContent='Guardando…';try{if(typeof window.HONOR_CLOUD_SAVE!=='function')throw Error('Guardado central no disponible');await window.HONOR_CLOUD_SAVE(row,isNew);$('cv3Dlg').close();ensureCommercialFields();window.strategyGo?.();render();}catch(e){showError(e.message||'No se pudo guardar')}finally{btn.disabled=false;btn.textContent='Guardar cuenta'}
}
function filterLabel(){const p=[];const ids=[['fm','Mes'],['fc','Canal'],['fej','Ejecutivo'],['fe','Estado'],['fz','Cierre'],['fy','Año']];ids.forEach(([id,l])=>{const e=$(id);if(e?.value)p.push(l+': '+(e.options?.[e.selectedIndex]?.text||e.value))});if($('fq')?.value)p.push('Buscar: '+$('fq').value);return p.length?p.join(' · '):'Todos los datos';}
function render(){
 if(!$('cv3-panel'))return;ensureCommercialFields();const rows=currentRows(),a=agg(rows);$('cv3FilterText').innerHTML='Filtro activo: <span class="cv3-filtername">'+esc(filterLabel())+'</span> · '+num(a.clients.size)+' cliente(s)';
 $('cv3Kpis').innerHTML=kpi('Ventas ganadas',num(a.won),a.winRate.toFixed(1)+'% win rate','good')+kpi('Perdidas',num(a.lost),num(a.open)+' en curso','bad')+kpi('Unidades ganadas',num(a.wonUnits),'Confirmadas por modelo','good')+kpi('Aporte aprobado',money(a.approved),'Potencial máximo')+kpi('Costo confirmado',money(a.cost),'Ganadas × aporte/eq','good')+kpi('Pendiente / por definir',money(a.pending),'En curso + históricos por resolver','open')+kpi('Liberado',money(a.released),'Perdidos, descartados o saldo')+kpi('Oportunidades',num(a.ops),num(a.refUnits)+' unid. ref.');
 const total=Math.max(1,a.ops),g=a.won/total*360,p=a.lost/total*360;$('cv3Donut').innerHTML='<div class="cv3-donut" style="background:conic-gradient('+COLORS.Ganada+' 0 '+g+'deg,'+COLORS.Perdida+' '+g+'deg '+(g+p)+'deg,'+COLORS['En curso']+' '+(g+p)+'deg 360deg)"><div class="cv3-donut-label"><div>'+num(a.ops)+'<div style="font-size:10px;color:#74839a">oportunidades</div></div></div></div><div class="cv3-legend"><span><i style="background:'+COLORS.Ganada+'"></i>Ganadas '+a.won+'</span><span><i style="background:'+COLORS.Perdida+'"></i>Perdidas '+a.lost+'</span><span><i style="background:'+COLORS['En curso']+'"></i>En curso '+a.open+'</span></div>';
 $('cv3Months').innerHTML=MONTHS.filter(m=>rows.some(r=>r.mesOrigen===m)).map(m=>{const rr=rows.filter(r=>r.mesOrigen===m),aa=agg(rr),t=Math.max(1,aa.ops);return '<div class="cv3-month"><b>'+(MONTH_NAMES[m]||m)+'</b><div class="cv3-stack" title="G '+aa.won+' · P '+aa.lost+' · EC '+aa.open+'"><i style="width:'+(aa.won/t*100)+'%;background:'+COLORS.Ganada+'"></i><i style="width:'+(aa.lost/t*100)+'%;background:'+COLORS.Perdida+'"></i><i style="width:'+(aa.open/t*100)+'%;background:'+COLORS['En curso']+'"></i></div><div class="cv3-month-metric"><b>'+num(aa.wonUnits)+' u</b> · '+money(aa.cost)+' costo · '+money(aa.pending)+' pend.</div></div>'}).join('')||'<div class="cv3-note">Sin datos para el filtro actual.</div>';
 $('cv3Rows').innerHTML=rows.map(r=>{const m=metrics(r),items=m.items,modelHtml=items.map(x=>'<div class="cv3-model"><strong title="'+esc(x.modelo)+'">'+esc(x.modelo)+'</strong><span>'+num(x.unidades)+' u</span><span>'+money2(x.aporteUnitario)+'/eq</span><span style="color:'+(COLORS[x.estado]||'#617087')+';font-weight:900">'+esc(x.estado)+'</span></div>').join('')||'<span class="mut">Sin modelos</span>';return '<tr><td>'+statusBadge(m.state)+'</td><td><b>'+esc(r.cliente)+'</b><div class="mut">'+esc(r.ejecutivo||'Sin KAM')+' · '+esc(r.ruc||'')+'</div></td><td>'+esc(MONTH_NAMES[r.mesOrigen]||r.mesOrigen||'')+'</td><td><div class="cv3-models">'+modelHtml+'</div>'+(m.unresolved?'<div class="warn" style="margin-top:5px">'+money(m.unresolved)+' sin definir por modelo</div>':'')+'</td><td>'+num(m.refUnits)+'</td><td><b>'+num(m.wonUnits)+'</b></td><td>'+money(m.approved)+'</td><td><b>'+money(m.cost)+'</b></td><td>'+money(m.pendingTotal)+'</td><td>'+money(m.released)+'</td><td><button class="cv3-btn" data-cv3-edit="'+encodeURIComponent(String(r.id))+'">Editar</button></td></tr>'}).join('')||'<tr><td colspan="11" class="mut">Sin cuentas para el filtro actual.</td></tr>';
 document.querySelectorAll('[data-cv3-edit]').forEach(b=>b.onclick=()=>openEditor(decodeURIComponent(b.dataset.cv3Edit),false));
 overrideFilterTotals(rows,a);
}
function overrideFilterTotals(rows,a){const el=$('filterTotals');if(!el)return;el.innerHTML=kpi('Clientes',num(a.clients.size),'Únicos por RUC')+kpi('Ganadas / Perdidas',a.won+' / '+a.lost,a.open+' en curso')+kpi('Unidades ganadas',num(a.wonUnits),'Confirmadas')+kpi('Costo confirmado',money(a.cost),money(a.pending)+' pendiente');el.classList.add('cv3-kpis');}
function wrapRender(){
 const base=window.strategyGo;if(typeof base==='function'&&!base.__cv3){const wrapped=function(){ensureCommercialFields();const out=base.apply(this,arguments);setTimeout(render,0);return out};wrapped.__cv3=true;window.strategyGo=wrapped;}
 ['fm','fc','fe','fz','fy','fej','fq'].forEach(id=>{const e=$(id);if(e&&!e.dataset.cv3){e.dataset.cv3='1';e.addEventListener(id==='fq'?'input':'change',()=>setTimeout(render,20));}});$('cl')?.addEventListener('click',()=>setTimeout(render,20));
}
function init(){if($('cv3-style'))return;buildStyles();addTabs();buildPanel();buildDialog();wrapRender();const ver=document.querySelector('.top>.mut');if(ver)ver.textContent='27/10/2026 · V20261027-COMERCIAL-V3';ensureCommercialFields();render();setTimeout(()=>{wrapRender();render()},700);setTimeout(()=>{wrapRender();render()},1800);}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();