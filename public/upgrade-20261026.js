/* HONOR B2B · interfaz comercial simplificada V4
 * - Cuatro vistas: Resumen, Cuentas, Seguimiento y Aportes.
 * - Edición rápida: cuenta bloqueada; solo estado y unidades efectivas por modelo.
 * - Diseño adaptable para móvil, tablet y computadora.
 */
(()=>{
'use strict';

const MONTH_ORDER=['may-26','jun-26','jul-26','ago-26','sep-26','oct-26','nov-26','dic-26'];
const MONTH_NAMES={'may-26':'Mayo','jun-26':'Junio','jul-26':'Julio','ago-26':'Agosto','sep-26':'Septiembre','oct-26':'Octubre','nov-26':'Noviembre','dic-26':'Diciembre'};
const CLOSE_MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const COLORS={Ganada:'#2e8b57',Perdida:'#c94b43','En curso':'#438dcc','Sin definir':'#b88924',Descartado:'#758195'};
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
const money=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(n)||0);
const money2=n=>new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',minimumFractionDigits:0,maximumFractionDigits:2}).format(Number(n)||0);
const num=n=>new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(Number(n)||0);
const nval=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0};
const uid=()=>('M-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7));
let started=false;

function parseModels(row){
  if(Array.isArray(row?.modelItems)&&row.modelItems.length){
    return row.modelItems.map((x,i)=>({
      id:String(x.id||('M'+(i+1))),
      modelo:String(x.modelo||''),
      unidades:nval(x.unidades),
      aporteUnitario:nval(x.aporteUnitario),
      unidadesGanadas:nval(x.unidadesGanadas),
      estado:['Sin definir','En curso','Ganada','Perdida','Descartado'].includes(x.estado)?x.estado:'En curso',
      nota:String(x.nota||'')
    }));
  }
  const raw=String(row?.modelos||'').trim();
  if(!raw)return [];
  const parts=raw.split(/\s*\|\s*/).filter(Boolean);
  return parts.map((part,i)=>{
    const bits=part.split('·').map(x=>x.trim());
    const modelo=bits[0]||part;
    const um=(bits[1]||'').match(/([\d,.]+|\?)\s*u/i);
    const am=(bits[2]||'').match(/\$\s*([\d,.]+)/i);
    const unidades=um&&um[1]!=='?'?nval(um[1]):0;
    const aporteUnitario=am?nval(am[1]):0;
    let estado='En curso',unidadesGanadas=0;
    if(row?.estado==='Perdida')estado='Perdida';
    else if(row?.estado==='Ganada'&&parts.length===1){
      estado='Ganada';
      unidadesGanadas=nval(row.unidadesEntregadas||row.unidades||unidades);
    }else if(row?.estado==='Ganada')estado='Sin definir';
    return {id:'M'+(i+1),modelo,unidades,aporteUnitario,unidadesGanadas,estado,nota:''};
  });
}

function rowMetrics(row){
  const items=parseModels(row);
  const approved=nval(row?.aporte);
  const wonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+nval(x.unidadesGanadas),0);
  let cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+nval(x.unidadesGanadas)*nval(x.aporteUnitario),0);
  if(!Array.isArray(row?.modelItems)&&row?.estado==='Ganada'&&items.length===1&&!cost){
    const inferredUnits=nval(row.unidadesEntregadas||row.unidades||items[0].unidades);
    cost=inferredUnits*nval(items[0].aporteUnitario);
  }
  const hasOpen=items.some(x=>x.estado==='En curso'||x.estado==='Sin definir');
  const hasWon=items.some(x=>x.estado==='Ganada');
  let state=row?.estado||'En curso';
  if(Array.isArray(row?.modelItems)&&row.modelItems.length){
    state=hasOpen?'En curso':(hasWon?'Ganada':'Perdida');
  }
  const pending=hasOpen?Math.max(0,approved-cost):0;
  const released=Math.max(0,approved-cost-pending);
  return {items,approved,wonUnits,cost,pending,released,state,refUnits:nval(row?.unidades)};
}

function currentRows(){
  try{return typeof window.F==='function'?window.F():(window.DATA||[])}catch{return window.DATA||[]}
}

function aggregate(rows){
  const a={clients:new Set(),ops:rows.length,won:0,lost:0,open:0,refUnits:0,wonUnits:0,approved:0,cost:0,pending:0,released:0};
  rows.forEach(r=>{
    const m=rowMetrics(r);a.clients.add(r.ruc||r.cliente);a.refUnits+=m.refUnits;a.wonUnits+=m.wonUnits;a.approved+=m.approved;a.cost+=m.cost;a.pending+=m.pending;a.released+=m.released;
    if(m.state==='Ganada')a.won++;else if(m.state==='Perdida')a.lost++;else a.open++;
  });
  a.closed=a.won+a.lost;a.winRate=a.closed?a.won/a.closed*100:0;return a;
}

function addStyles(){
  if($('simpleV4Styles'))return;
  const s=document.createElement('style');s.id='simpleV4Styles';s.textContent=`
    .simple-hidden{display:none!important}
    .filters{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:12px!important;align-items:end!important}
    .filters>div{min-width:0}.filters select,.filters input,.filters .btn{width:100%;min-width:0}
    .filters>div:has(#fq){grid-column:span 2}.filters>#cl{width:100%}
    .tabs{display:grid!important;grid-template-columns:repeat(4,minmax(135px,1fr));gap:7px!important;overflow:visible!important}
    .tabs .tab{width:100%;text-align:center}
    #simpleAccountsPanel{display:grid;gap:12px;margin:12px 0}
    .sv4-card{background:#fff;border:1px solid #dfe6ef;border-radius:15px;padding:14px;min-width:0}
    .sv4-head{display:flex;justify-content:space-between;gap:12px;align-items:center;flex-wrap:wrap}
    .sv4-title{font-size:17px;font-weight:900}.sv4-sub{font-size:11px;color:#718096;margin-top:3px}
    .sv4-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px}
    .sv4-kpi{background:#fff;border:1px solid #dfe6ef;border-radius:13px;padding:12px;min-height:85px}
    .sv4-kpi span{display:block;font-size:10px;font-weight:900;color:#75849a}.sv4-kpi b{display:block;font-size:22px;margin:5px 0}.sv4-kpi small{font-size:10px;color:#75849a}
    .sv4-kpi.good b{color:#267a45}.sv4-kpi.bad b{color:#ad3731}.sv4-kpi.open b{color:#2b73aa}
    .sv4-two{display:grid;grid-template-columns:minmax(250px,.75fr) minmax(0,1.6fr);gap:10px}
    .sv4-donut{width:168px;height:168px;border-radius:50%;position:relative;margin:8px auto}.sv4-donut:after{content:'';position:absolute;inset:32px;background:#fff;border-radius:50%}.sv4-center{position:absolute;inset:0;z-index:2;display:grid;place-items:center;text-align:center;font-size:24px;font-weight:900}
    .sv4-legend{display:flex;justify-content:center;gap:11px;flex-wrap:wrap;font-size:11px;color:#617087}.sv4-legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px}
    .sv4-months{display:grid;gap:8px}.sv4-month{display:grid;grid-template-columns:76px minmax(0,1fr) 190px;gap:8px;align-items:center;font-size:11px}.sv4-stack{height:20px;background:#edf1f6;border-radius:6px;overflow:hidden;display:flex}.sv4-stack i{height:100%}.sv4-month-total{text-align:right;color:#56667b}
    .sv4-table-wrap{overflow:auto;border:1px solid #dfe6ef;border-radius:12px}.sv4-table{width:100%;border-collapse:collapse;min-width:1040px}.sv4-table th{font-size:10px;color:#526176;background:#f7f9fc;padding:9px;text-align:left;position:sticky;top:0}.sv4-table td{font-size:11px;padding:10px;border-top:1px solid #edf1f5;vertical-align:top}
    .sv4-model-list{display:grid;gap:5px;min-width:310px}.sv4-model{display:grid;grid-template-columns:minmax(160px,1fr) 70px 80px;gap:6px;padding:6px 8px;border:1px solid #e4ebf3;border-radius:8px;align-items:center}.sv4-model strong{font-size:10px}.sv4-model span{font-size:9px;color:#6d7c90}.sv4-model em{font-style:normal;font-size:9px;font-weight:900}
    .sv4-money{display:grid;gap:3px;white-space:nowrap}.sv4-money b{font-size:12px}.sv4-muted{font-size:10px;color:#718096}.sv4-badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:10px;font-weight:900}.sv4-badge.good{background:#e8f6ed;color:#24743e}.sv4-badge.bad{background:#fcebea;color:#a6332e}.sv4-badge.open{background:#e9f3fb;color:#276d9c}
    .sv4-btn{height:34px;border:1px solid #d7e0eb;border-radius:9px;background:#fff;padding:0 11px;font-weight:900;cursor:pointer}.sv4-btn.primary{background:#10233b;color:#fff;border-color:#10233b}.sv4-btn:disabled{opacity:.55;cursor:not-allowed}
    .sv4-mobile{display:none}.sv4-account-card{background:#fff;border:1px solid #dfe6ef;border-radius:14px;padding:13px;display:grid;gap:9px}.sv4-account-top{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.sv4-account-name{font-weight:900}.sv4-account-meta{font-size:10px;color:#718096}.sv4-account-model{border-top:1px solid #edf1f5;padding-top:7px;display:grid;grid-template-columns:1fr auto;gap:5px;font-size:10px}.sv4-account-fin{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.sv4-mini{background:#f7f9fc;border-radius:8px;padding:8px}.sv4-mini span{display:block;font-size:9px;color:#718096}.sv4-mini b{font-size:12px}
    .sv4-access{margin-top:10px}.sv4-access .access-panel{margin:0!important}
    .sv4-dialog{border:0;border-radius:17px;padding:0;width:min(820px,calc(100% - 18px));max-width:820px;box-shadow:0 24px 80px rgba(16,35,59,.27)}.sv4-dialog::backdrop{background:rgba(16,35,59,.48)}.sv4-dialog-inner{padding:17px}.sv4-dialog-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px}.sv4-account-summary{display:grid;grid-template-columns:2fr 1fr 1fr;gap:8px;background:#f7f9fc;border:1px solid #e2e9f1;border-radius:12px;padding:11px;margin:12px 0}.sv4-account-summary div{min-width:0}.sv4-account-summary span{display:block;font-size:9px;font-weight:900;color:#75849a}.sv4-account-summary b{font-size:12px;overflow-wrap:anywhere}
    .sv4-edit-items{display:grid;gap:8px}.sv4-edit-item{display:grid;grid-template-columns:minmax(180px,1.5fr) 95px 150px 120px;gap:8px;align-items:end;border:1px solid #e1e8f0;background:#fbfcfe;border-radius:11px;padding:10px}.sv4-edit-item label{display:block;font-size:9px;font-weight:900;color:#75849a;margin-bottom:4px}.sv4-edit-item select,.sv4-edit-item input{width:100%;height:38px;border:1px solid #d7e0eb;border-radius:8px;background:#fff;padding:0 8px}.sv4-read{font-size:11px}.sv4-read strong{display:block;font-size:12px}.sv4-error{display:none;background:#fff0ee;color:#a9362e;border:1px solid #f0c6c1;border-radius:9px;padding:9px;font-size:11px;font-weight:800;margin-top:9px}.sv4-savebar{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-top:12px}.sv4-calc{font-size:11px;color:#526176}.sv4-calc b{color:#10233b}
    @media(max-width:1100px){.filters{grid-template-columns:repeat(3,minmax(0,1fr))!important}.sv4-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.sv4-two{grid-template-columns:1fr}.sv4-month{grid-template-columns:68px minmax(0,1fr) 165px}}
    @media(max-width:900px){.sv4-desktop{display:none!important}.sv4-mobile{display:grid;gap:9px}.sv4-edit-item{grid-template-columns:1fr 100px 150px}.sv4-edit-item .sv4-model-name{grid-column:1/-1}.sv4-account-summary{grid-template-columns:1fr 1fr}}
    @media(max-width:720px){.filters{grid-template-columns:repeat(2,minmax(0,1fr))!important}.filters>div:has(#fq){grid-column:1/-1}.tabs{display:flex!important;overflow-x:auto!important}.tabs .tab{min-width:130px}.sv4-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.sv4-month{grid-template-columns:58px minmax(0,1fr)}.sv4-month-total{grid-column:1/-1;text-align:left}.sv4-dialog-inner{padding:13px}.sv4-savebar{align-items:stretch;flex-direction:column}.sv4-savebar>div:last-child{display:grid;grid-template-columns:1fr 1fr;gap:7px}.sv4-account-fin{grid-template-columns:1fr 1fr}}
    @media(max-width:480px){.filters{grid-template-columns:1fr!important}.filters>div:has(#fq){grid-column:auto}.sv4-kpis{grid-template-columns:1fr 1fr}.sv4-kpi{padding:10px;min-height:78px}.sv4-kpi b{font-size:19px}.sv4-account-summary{grid-template-columns:1fr}.sv4-edit-item{grid-template-columns:1fr}.sv4-edit-item .sv4-model-name{grid-column:auto}.sv4-account-fin{grid-template-columns:1fr}.top{align-items:flex-start}.top h1{font-size:20px}.w{padding:8px}}
  `;document.head.appendChild(s);
}

function simplifyTabs(){
  const tabs=document.querySelector('.tabs');if(!tabs)return;
  const keep=[['res','Resumen'],['cue','Cuentas'],['pip','Seguimiento'],['apo','Aportes']];
  tabs.querySelectorAll('.tab').forEach(b=>{
    const found=keep.find(x=>x[0]===b.dataset.v);
    if(!found)b.classList.add('simple-hidden');else{b.classList.remove('simple-hidden');b.textContent=found[1];}
  });
  keep.forEach(([id])=>{const b=tabs.querySelector('[data-v="'+id+'"]');if(b)tabs.appendChild(b)});
  ['fun','for','per','gra','cie','cli'].forEach(id=>{$(id)?.classList.remove('on')});
  const pip=$('pip');if(pip){const h=pip.querySelector('.h');if(h)h.textContent='Seguimiento comercial';const d=pip.querySelector('.desc');if(d)d.textContent='Cuentas abiertas, volumen pendiente y evolución mensual del pipeline.';}
}

function buildQuickDialog(){
  if($('sv4EditDlg'))return;
  const d=document.createElement('dialog');d.id='sv4EditDlg';d.className='sv4-dialog';d.innerHTML=`
    <div class="sv4-dialog-inner">
      <div class="sv4-dialog-head"><div><div class="sv4-title">Actualizar cuenta</div><div class="sv4-sub">Los datos del cliente están bloqueados. Solo define qué modelo va y cuántas unidades se concretaron.</div></div><button class="sv4-btn" id="sv4Close" type="button">Cerrar</button></div>
      <input type="hidden" id="sv4EditId">
      <div id="sv4AccountSummary" class="sv4-account-summary"></div>
      <div class="sv4-title" style="font-size:14px">Modelos</div><div class="sv4-sub">Usa “Sí va” para el modelo elegido y “No va” para descartarlo. Si solo se concretó una parte, cambia las unidades.</div>
      <div id="sv4EditItems" class="sv4-edit-items"></div>
      <div id="sv4EditError" class="sv4-error"></div>
      <div class="sv4-savebar"><div id="sv4EditCalc" class="sv4-calc"></div><div><button class="sv4-btn" id="sv4Cancel" type="button">Cancelar</button> <button class="sv4-btn primary" id="sv4Save" type="button">Guardar cambios</button></div></div>
    </div>`;
  document.body.appendChild(d);
  $('sv4Close').onclick=$('sv4Cancel').onclick=()=>d.close();
  $('sv4Save').onclick=saveQuickEdit;
  d.addEventListener('change',e=>{
    const sel=e.target.closest('[data-sv4-state]');if(!sel)return;
    const row=sel.closest('.sv4-edit-item'),units=row.querySelector('[data-sv4-won]'),proposed=nval(row.dataset.proposed);
    units.disabled=sel.value!=='Ganada';
    if(sel.value==='Ganada'&&!nval(units.value))units.value=proposed;
    if(sel.value!=='Ganada')units.value=0;
    updateQuickCalc();
  });
  d.addEventListener('input',e=>{if(e.target.matches('[data-sv4-won]'))updateQuickCalc()});
}

function modelOptions(selected){
  const opts=[['En curso','En curso'],['Ganada','Sí va / Ganada'],['Descartado','No va / Descartado'],['Perdida','Perdida'],['Sin definir','Por definir']];
  return opts.map(([v,t])=>'<option value="'+v+'" '+(selected===v?'selected':'')+'>'+t+'</option>').join('');
}

function openQuickEdit(id){
  const canEdit=typeof window.HONOR_CLOUD_CAN_EDIT==='function'&&window.HONOR_CLOUD_CAN_EDIT();
  if(!canEdit){const key=$('cloudKey');if(key){key.scrollIntoView({behavior:'smooth',block:'center'});key.focus();}alert('Primero activa la edición con tu clave. Luego vuelve a pulsar Editar.');return;}
  const row=(window.DATA||[]).find(x=>String(x.id)===String(id));if(!row)return alert('No se encontró la cuenta. Recarga la página.');
  const items=parseModels(row);$('sv4EditId').value=String(row.id);$('sv4EditError').style.display='none';
  $('sv4AccountSummary').innerHTML=`
    <div><span>CLIENTE</span><b>${esc(row.cliente||'—')}</b></div><div><span>RUC</span><b>${esc(row.ruc||'—')}</b></div><div><span>KAM / EJECUTIVO</span><b>${esc(row.ejecutivo||'Sin asignar')}</b></div><div><span>CANAL</span><b>${esc(row.canal||'—')}</b></div><div><span>MES DE ORIGEN</span><b>${esc(MONTH_NAMES[row.mesOrigen]||row.mesOrigen||'—')}</b></div><div><span>APORTE APROBADO</span><b>${money(row.aporte)}</b></div>`;
  $('sv4EditItems').innerHTML=items.map(x=>`<div class="sv4-edit-item" data-mid="${esc(x.id||uid())}" data-proposed="${nval(x.unidades)}" data-rate="${nval(x.aporteUnitario)}">
    <div class="sv4-model-name"><label>MODELO</label><div class="sv4-read"><strong>${esc(x.modelo||'Modelo sin nombre')}</strong><span>${num(x.unidades)} unidades referenciales · ${money2(x.aporteUnitario)} por equipo</span></div></div>
    <div><label>UNID. REF.</label><div class="sv4-read"><strong>${num(x.unidades)}</strong><span>No editable</span></div></div>
    <div><label>¿QUÉ PASÓ?</label><select data-sv4-state>${modelOptions(x.estado)}</select></div>
    <div><label>UNID. QUE SÍ VAN</label><input data-sv4-won type="number" min="0" step="1" value="${nval(x.unidadesGanadas)}" ${x.estado==='Ganada'?'':'disabled'}></div>
  </div>`).join('')||'<div class="sv4-muted">No se encontraron modelos en esta cuenta.</div>';
  updateQuickCalc();$('sv4EditDlg').showModal();
}

function collectQuickItems(){
  return [...$('sv4EditItems').querySelectorAll('.sv4-edit-item')].map(el=>({
    id:el.dataset.mid||uid(),modelo:el.querySelector('.sv4-model-name strong')?.textContent.trim()||'',unidades:nval(el.dataset.proposed),aporteUnitario:nval(el.dataset.rate),estado:el.querySelector('[data-sv4-state]').value,unidadesGanadas:nval(el.querySelector('[data-sv4-won]').value),nota:''
  }));
}

function updateQuickCalc(){
  if(!$('sv4EditCalc'))return;
  const items=collectQuickItems();const won=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0);const cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0);const open=items.filter(x=>x.estado==='En curso'||x.estado==='Sin definir').length;
  $('sv4EditCalc').innerHTML='Unidades que sí van: <b>'+num(won)+'</b> · Costo confirmado: <b>'+money(cost)+'</b> · Pendientes: <b>'+num(open)+'</b>';
}

function currentClose(){const now=new Date();return {month:CLOSE_MONTHS[now.getMonth()],year:now.getFullYear()}}
function showQuickError(msg){const e=$('sv4EditError');e.textContent=msg;e.style.display='block'}

async function saveQuickEdit(){
  const id=$('sv4EditId').value,row=(window.DATA||[]).find(x=>String(x.id)===String(id));if(!row)return showQuickError('La cuenta ya no está disponible. Recarga la página.');
  const items=collectQuickItems();if(!items.length)return showQuickError('La cuenta no tiene modelos para actualizar.');
  if(items.some(x=>x.estado==='Ganada'&&x.unidades>0&&x.unidadesGanadas>x.unidades))return showQuickError('Las unidades que sí van no pueden superar las unidades referenciales.');
  if(items.some(x=>x.estado==='Ganada'&&x.unidadesGanadas<=0))return showQuickError('Cuando un modelo “Sí va”, indica al menos una unidad.');
  const hasOpen=items.some(x=>x.estado==='En curso'||x.estado==='Sin definir'),hasWon=items.some(x=>x.estado==='Ganada');
  const estado=hasOpen?'En curso':(hasWon?'Ganada':'Perdida');const wonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0);const cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0);
  let mesCierre=row.mesCierre||'',anioCierre=row.anioCierre||null;if(estado==='En curso'){mesCierre='';anioCierre=null}else if(!mesCierre){const c=currentClose();mesCierre=c.month;anioCierre=c.year}
  const updated={...row,cliente:row.cliente,ruc:row.ruc,canal:row.canal,ejecutivo:row.ejecutivo,mesOrigen:row.mesOrigen,modelos:row.modelos,unidades:row.unidades,aporte:row.aporte,estado,mesCierre,anioCierre,cierre:mesCierre?(mesCierre+' '+anioCierre):'',unidadesEntregadas:wonUnits,aportePagado:cost,modelItems:items};
  const btn=$('sv4Save');btn.disabled=true;btn.textContent='Guardando…';$('sv4EditError').style.display='none';
  try{
    if(typeof window.HONOR_CLOUD_SAVE!=='function')throw Error('El guardado central aún no está disponible. Recarga la página.');
    await window.HONOR_CLOUD_SAVE(updated,false);$('sv4EditDlg').close();window.strategyGo?.();setTimeout(renderAccounts,80);
  }catch(e){showQuickError(e.message||'No se pudo guardar el cambio.')}finally{btn.disabled=false;btn.textContent='Guardar cambios'}
}

function badge(state){const c=state==='Ganada'?'good':state==='Perdida'?'bad':'open';return '<span class="sv4-badge '+c+'">'+esc(state)+'</span>'}
function kpi(label,value,sub,cls=''){return '<div class="sv4-kpi '+cls+'"><span>'+esc(label)+'</span><b>'+value+'</b><small>'+esc(sub||'')+'</small></div>'}

function buildAccountsPanel(){
  const cue=$('cue');if(!cue||$('simpleAccountsPanel'))return;
  const panel=document.createElement('div');panel.id='simpleAccountsPanel';panel.innerHTML=`
    <div class="sv4-card"><div class="sv4-head"><div><div class="sv4-title">Cuentas comerciales</div><div class="sv4-sub">Vista simple: totales, trazabilidad y actualización por modelo.</div></div><button class="sv4-btn primary" id="sv4NewAccount" type="button">+ Nueva cuenta</button></div><div id="sv4ActiveFilter" class="cv3-note" style="margin-top:10px"></div><div id="sv4Access" class="sv4-access"></div></div>
    <div id="sv4Kpis" class="sv4-kpis"></div>
    <div class="sv4-two"><div class="sv4-card"><div class="sv4-title">Estado del filtro</div><div class="sv4-sub">Ganadas, perdidas y en curso.</div><div id="sv4Donut"></div></div><div class="sv4-card"><div class="sv4-title">Trazabilidad mensual</div><div class="sv4-sub">Estado, unidades ganadas y costo confirmado por mes.</div><div id="sv4Months" class="sv4-months"></div></div></div>
    <div class="sv4-card"><div class="sv4-head" style="margin-bottom:10px"><div><div class="sv4-title">Detalle de cuentas</div><div class="sv4-sub">Los datos de cliente y RUC no se editan. El botón Editar cambia únicamente resultado y unidades por modelo.</div></div></div><div class="sv4-table-wrap sv4-desktop"><table class="sv4-table"><thead><tr><th>Estado</th><th>Cuenta</th><th>Mes</th><th>Modelos</th><th>Unid. ganadas</th><th>Finanzas</th><th>Acción</th></tr></thead><tbody id="sv4Rows"></tbody></table></div><div id="sv4Cards" class="sv4-mobile"></div></div>`;
  cue.appendChild(panel);$('sv4NewAccount').onclick=()=>$('newAccount')?.click();
  const old=$('cv3-panel');if(old)old.classList.add('simple-hidden');
  [...cue.children].forEach(ch=>{if(ch!==panel&&ch.id!=='sv4EditDlg')ch.classList.add('simple-hidden')});
}

function moveAccess(){
  const slot=$('sv4Access'),access=document.querySelector('.access-panel'),info=$('cloudInfo');if(!slot)return;
  if(info&&info.parentElement!==slot)slot.appendChild(info);
  if(access&&access.parentElement!==slot)slot.appendChild(access);
}

function filterText(){
  const vals=[];[['fm','Mes'],['fc','Canal'],['fej','Ejecutivo'],['fe','Estado'],['fz','Cierre'],['fy','Año']].forEach(([id,label])=>{const e=$(id);if(e?.value)vals.push(label+': '+(e.options?.[e.selectedIndex]?.text||e.value))});if($('fq')?.value)vals.push('Buscar: '+$('fq').value);return vals.length?vals.join(' · '):'Todos los datos';
}

function renderAccounts(){
  if(!$('simpleAccountsPanel'))return;const rows=currentRows(),a=aggregate(rows);
  $('sv4ActiveFilter').innerHTML='Filtro activo: <b>'+esc(filterText())+'</b> · '+num(a.clients.size)+' cliente(s)';
  $('sv4Kpis').innerHTML=kpi('Clientes',num(a.clients.size),'Únicos por RUC')+kpi('Oportunidades',num(a.ops),num(a.refUnits)+' unidades ref.')+kpi('Resultado','G '+a.won+' · P '+a.lost,'EC '+a.open,a.open?'open':'good')+kpi('Unidades ganadas',num(a.wonUnits),'Confirmadas','good')+kpi('Aporte aprobado',money(a.approved),'Referencia total')+kpi('Costo confirmado',money(a.cost),'Unidades que sí van','good')+kpi('Pendiente',money(a.pending),'En curso o por definir','open')+kpi('Liberado',money(a.released),'No ejecutado');
  const total=Math.max(1,a.ops),g=a.won/total*360,p=a.lost/total*360;
  $('sv4Donut').innerHTML='<div class="sv4-donut" style="background:conic-gradient('+COLORS.Ganada+' 0 '+g+'deg,'+COLORS.Perdida+' '+g+'deg '+(g+p)+'deg,'+COLORS['En curso']+' '+(g+p)+'deg 360deg)"><div class="sv4-center"><div>'+num(a.ops)+'<div style="font-size:10px;color:#75849a">oportunidades</div></div></div></div><div class="sv4-legend"><span><i style="background:'+COLORS.Ganada+'"></i>Ganadas '+a.won+'</span><span><i style="background:'+COLORS.Perdida+'"></i>Perdidas '+a.lost+'</span><span><i style="background:'+COLORS['En curso']+'"></i>En curso '+a.open+'</span></div>';
  $('sv4Months').innerHTML=MONTH_ORDER.filter(m=>rows.some(r=>r.mesOrigen===m)).map(m=>{const aa=aggregate(rows.filter(r=>r.mesOrigen===m)),t=Math.max(1,aa.ops);return '<div class="sv4-month"><b>'+(MONTH_NAMES[m]||m)+'</b><div class="sv4-stack"><i style="width:'+(aa.won/t*100)+'%;background:'+COLORS.Ganada+'"></i><i style="width:'+(aa.lost/t*100)+'%;background:'+COLORS.Perdida+'"></i><i style="width:'+(aa.open/t*100)+'%;background:'+COLORS['En curso']+'"></i></div><div class="sv4-month-total"><b>'+num(aa.wonUnits)+' u</b> · '+money(aa.cost)+' costo · '+money(aa.pending)+' pend.</div></div>'}).join('')||'<div class="sv4-muted">Sin datos para el filtro actual.</div>';
  const desktop=rows.map(r=>{const m=rowMetrics(r),models=m.items.map(x=>'<div class="sv4-model"><strong>'+esc(x.modelo||'Modelo')+'</strong><span>'+num(x.unidades)+' u · '+money2(x.aporteUnitario)+'/eq</span><em style="color:'+(COLORS[x.estado]||'#617087')+'">'+esc(x.estado)+'</em></div>').join('')||'<span class="sv4-muted">Sin modelos</span>';return '<tr><td>'+badge(m.state)+'</td><td><b>'+esc(r.cliente||'')+'</b><div class="sv4-muted">'+esc(r.ejecutivo||'Sin KAM')+' · '+esc(r.ruc||'')+'</div></td><td>'+esc(MONTH_NAMES[r.mesOrigen]||r.mesOrigen||'')+'</td><td><div class="sv4-model-list">'+models+'</div></td><td><b>'+num(m.wonUnits)+'</b></td><td><div class="sv4-money"><span>Aprobado <b>'+money(m.approved)+'</b></span><span>Costo <b>'+money(m.cost)+'</b></span><span>Pendiente <b>'+money(m.pending)+'</b></span></div></td><td><button class="sv4-btn" data-sv4-edit="'+encodeURIComponent(String(r.id))+'">Editar</button></td></tr>'}).join('')||'<tr><td colspan="7" class="sv4-muted">Sin cuentas para el filtro actual.</td></tr>';
  $('sv4Rows').innerHTML=desktop;
  $('sv4Cards').innerHTML=rows.map(r=>{const m=rowMetrics(r),models=m.items.map(x=>'<div class="sv4-account-model"><div><b>'+esc(x.modelo||'Modelo')+'</b><div class="sv4-muted">'+num(x.unidades)+' u ref. · '+money2(x.aporteUnitario)+'/eq</div></div><b style="color:'+(COLORS[x.estado]||'#617087')+'">'+esc(x.estado)+'</b></div>').join('');return '<div class="sv4-account-card"><div class="sv4-account-top"><div><div class="sv4-account-name">'+esc(r.cliente||'')+'</div><div class="sv4-account-meta">'+esc(r.ejecutivo||'Sin KAM')+' · '+esc(r.ruc||'')+' · '+esc(MONTH_NAMES[r.mesOrigen]||r.mesOrigen||'')+'</div></div>'+badge(m.state)+'</div><div>'+models+'</div><div class="sv4-account-fin"><div class="sv4-mini"><span>Unid. ganadas</span><b>'+num(m.wonUnits)+'</b></div><div class="sv4-mini"><span>Costo</span><b>'+money(m.cost)+'</b></div><div class="sv4-mini"><span>Pendiente</span><b>'+money(m.pending)+'</b></div></div><button class="sv4-btn" data-sv4-edit="'+encodeURIComponent(String(r.id))+'">Editar modelos</button></div>'}).join('')||'<div class="sv4-muted">Sin cuentas para el filtro actual.</div>';
  document.querySelectorAll('[data-sv4-edit]').forEach(b=>b.onclick=()=>openQuickEdit(decodeURIComponent(b.dataset.sv4Edit)));
  moveAccess();
}

function wire(){
  ['fm','fc','fe','fz','fy','fej','fq'].forEach(id=>{const e=$(id);if(e&&!e.dataset.sv4){e.dataset.sv4='1';e.addEventListener(id==='fq'?'input':'change',()=>setTimeout(renderAccounts,20))}});$('cl')?.addEventListener('click',()=>setTimeout(renderAccounts,30));
  const base=window.strategyGo;if(typeof base==='function'&&!base.__sv4){const wrap=function(){const out=base.apply(this,arguments);setTimeout(renderAccounts,0);return out};wrap.__sv4=true;window.strategyGo=wrap;}
}

function init(){
  if(started)return;
  if(!window.DATA||!document.querySelector('.tabs')||!$('cue')||!$('cv3-panel'))return setTimeout(init,180);
  started=true;addStyles();simplifyTabs();buildQuickDialog();buildAccountsPanel();wire();renderAccounts();moveAccess();
  const version=document.querySelector('.top>.mut');if(version)version.textContent='27/10/2026 · V4 SIMPLE RESPONSIVE';
  let rounds=0;const timer=setInterval(()=>{rounds++;simplifyTabs();moveAccess();wire();renderAccounts();if(rounds>20)clearInterval(timer)},400);
}

if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();