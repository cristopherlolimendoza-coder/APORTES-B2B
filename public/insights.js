(function(){
'use strict';
var monthOrder=['may-26','jun-26','jul-26','ago-26','sep-26','oct-26'];
var monthNames={'may-26':'Mayo','jun-26':'Junio','jul-26':'Julio','ago-26':'Agosto','sep-26':'Septiembre','oct-26':'Octubre'};
var monthLong=['Mayo','Junio','Julio','Agosto','Septiembre','Octubre'];
var colors={Ganada:'#459e61',Perdida:'#d25147','En curso':'#5499da'};
var aliases={
 'Monica Teresa Castro Rios':'Mónica Teresa Castro Ríos',
 'Monica Teresa Castro Ríos':'Mónica Teresa Castro Ríos',
 'Mónica Teresa Castro Ríos':'Mónica Teresa Castro Ríos',
 'Alvaro Gomezdecordova':'Álvaro Gomezdecordova',
 'Álvaro Gomezdecordova':'Álvaro Gomezdecordova',
 'Soraya Fara Muñoz Tremolada':'Soraya Farra Muñoz Tremolada',
 'Soraya Farra Muñoz Tremolada':'Soraya Farra Muñoz Tremolada',
 'Maria Fernanda Zamora Wong':'María Fernanda Zamora Wong',
 'María Fernanda Zamora Vong':'María Fernanda Zamora Wong',
 'Violeta Aguilar':'Violeta Aguilar Regalado',
 'Jose Antonio Garay':'José Antonio Garay Pfuyo',
 'José Antonio Garay Pfuyo':'José Antonio Garay Pfuyo',
 'Angela Chonyen':'Ángela Chonyen',
 'Chonyen':'Ángela Chonyen',
 'Rocio del Carmen Valdivia Nava':'Rocío del Carmen Valdivia Nava',
 'Carmen Valdivia Nava':'Rocío del Carmen Valdivia Nava'
};
var normalized=[];
DATA.forEach(function(r){var old=(r.ejecutivo||'').trim();var n=aliases[old]||old;if(old&&old!==n){r.ejecutivoOriginal=old;r.ejecutivo=n;normalized.push({old:old,name:n,id:r.id});}});
var style=document.createElement('style');
style.textContent='.ins-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.ins-full{grid-column:1/-1}.ins-card{background:white;border:1px solid #dfe6ef;border-radius:15px;padding:16px;min-width:0}.ins-card h3{font-size:15px;margin:0 0 5px}.ins-sub{font-size:11px;color:#73849b;margin:0 0 14px}.ins-chart{width:100%;height:auto;display:block}.ins-axis{stroke:#dde6f0;stroke-width:1}.ins-month{cursor:pointer}.ins-month:hover{opacity:.82}.ins-mrow{display:grid;grid-template-columns:80px minmax(0,1fr) 98px;gap:9px;align-items:center;margin:9px 0;font-size:12px}.ins-stack{height:24px;display:flex;overflow:hidden;border-radius:7px;background:#ecf1f6;cursor:pointer}.ins-piece{height:100%;min-width:0;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:10px}.ins-stackleg{display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;color:#677b94;font-size:11px}.ins-dot{display:inline-block;height:9px;width:9px;border-radius:100%;margin-right:4px}.ins-exec{display:grid;grid-template-columns:minmax(0,1fr) minmax(70px,2fr) 45px;gap:9px;align-items:center;margin:9px 0;font-size:12px;cursor:pointer}.ins-exec:hover{background:#f4f8fc}.ins-track{height:9px;background:#eef2f7;border-radius:99px;overflow:hidden}.ins-fill{height:100%;background:#5b83cf;border-radius:99px}.ins-hbar{display:grid;grid-template-columns:120px minmax(0,1fr) 120px;align-items:center;gap:8px;margin:11px 0;font-size:11px}.ins-htrack{height:18px;border-radius:6px;background:#eff3f8;overflow:hidden}.ins-hfill{height:100%;background:#7394d6;border-radius:6px}.ins-delta{font-size:11px;font-weight:700;color:#7a8796}.ins-up{color:#238451}.ins-down{color:#c45c50}.ins-select{width:100%;max-width:520px}.ins-lane{display:grid;grid-template-columns:minmax(125px,2fr) repeat(6,minmax(35px,1fr));gap:3px;align-items:center;margin:6px 0;font-size:10px}.ins-lane span{text-align:center;color:#617187}.ins-cell{height:24px;background:#f2f5fa;border-radius:4px}.ins-cell.on{background:#78a9dc}.ins-cell.done{background:#57a675}.ins-cell.lost{background:#d66e65}.ins-audit{max-height:260px;overflow:auto}.ins-entry{border-bottom:1px solid #ecf0f5;padding:9px 0;font-size:12px}.ins-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.ins-note{padding:10px;border:1px solid #e5edf5;border-radius:9px;font-size:11px;color:#617187;background:#f8fbff}.ins-b{font-weight:800}.ins-summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:13px}.ins-stat{background:#f7f9fc;padding:12px;border-radius:9px}.ins-stat b{display:block;font-size:20px}.ins-stat small{color:#687e98}@media(max-width:900px){.ins-grid{grid-template-columns:1fr}.ins-summary{grid-template-columns:repeat(2,1fr)}}@media(max-width:600px){.ins-lane{grid-template-columns:minmax(75px,2fr) repeat(6,minmax(22px,1fr));font-size:9px}.ins-mrow{grid-template-columns:65px minmax(0,1fr) 65px}.ins-hbar{grid-template-columns:75px minmax(0,1fr) 80px}}';
document.head.appendChild(style);
function el(tag,html,cls){var n=document.createElement(tag);if(html!==null)n.innerHTML=html;if(cls)n.className=cls;return n}
function sum(rows,key){return rows.reduce(function(s,r){return s+(+r[key]||0)},0)}
function money(n){return new Intl.NumberFormat('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(n||0)}
function integer(n){return new Intl.NumberFormat('en-US',{maximumFractionDigits:0}).format(n||0)}
function percent(n,d){return d?((100*n/d).toFixed(1)+'%'):'0%'}
function safe(s){return String(s==null?'':s).replace(/[&<>"']/g,function(a){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[a]})}
function scoped(){return typeof F==='function'?F():DATA}
function scopeIgnoreMonth(){var m=document.getElementById('fm'),old=m.value;m.value='';var a=scoped();m.value=old;return a}
function grouped(rows){return monthOrder.map(function(m){var a=rows.filter(function(r){return r.mesOrigen===m});var s={};['Ganada','Perdida','En curso'].forEach(function(st){s[st]=a.filter(function(r){return r.estado===st})});return {m:m,all:a,n:a.length,units:sum(a,'unidades'),aporte:sum(a,'aporte'),by:s}})}
function gotoMonth(m){var x=document.getElementById('fm');x.value=x.value===m?'':m;if(typeof strategyGo==='function')strategyGo();draw();window.scrollTo({top:0,behavior:'smooth'})}
function wireMonths(box){box.querySelectorAll('[data-month]').forEach(function(n){n.addEventListener('click',function(){gotoMonth(n.dataset.month)})})}
function lineChart(rows,field,kind){
 var values=rows.map(function(x){return x[field]}),max=Math.max(1,...values),W=650,H=228,x0=44,x1=628,y0=18,y1=180;
 var pts=values.map(function(v,i){return {x:x0+i*(x1-x0)/5,y:y1-v/max*(y1-y0),v:v,m:rows[i].m}});
 var s='<svg viewBox="0 0 '+W+' '+H+'" class="ins-chart" role="img" aria-label="Evolución mensual">';
 for(var j=0;j<4;j++){var y=y1-j*(y1-y0)/3;s+='<line class="ins-axis" x1="'+x0+'" y1="'+y+'" x2="'+x1+'" y2="'+y+'"/><text x="2" y="'+(y+4)+'" fill="#8393a7" font-size="10">'+(kind==='money'?money(max*j/3):integer(max*j/3))+'</text>'}
 s+='<polyline points="'+pts.map(function(p){return p.x+','+p.y}).join(' ')+'" fill="none" stroke="#527fca" stroke-width="3.5" stroke-linejoin="round"/>';
 pts.forEach(function(p,i){s+='<g class="ins-month" data-month="'+p.m+'"><circle cx="'+p.x+'" cy="'+p.y+'" r="6" fill="#527fca" stroke="white" stroke-width="2"><title>'+monthNames[p.m]+': '+(kind==='money'?money(p.v):integer(p.v))+'</title></circle><text text-anchor="middle" x="'+p.x+'" y="204" fill="#61748f" font-size="11">'+monthNames[p.m].slice(0,3)+'</text></g>';if(i){var prev=pts[i-1].v,delta=p.v-prev;s+='<text x="'+p.x+'" y="'+Math.max(11,p.y-14)+'" text-anchor="middle" fill="'+(delta<0?'#ba5e58':'#338c60')+'" font-weight="700" font-size="10">'+(delta>0?'+':'')+(kind==='money'?money(delta):integer(delta))+'</text>'}});
 s+='</svg>';return s;
}
function stateBars(rows,metric){
 var html='<div class="ins-stackleg"><span><i class="ins-dot" style="background:'+colors.Ganada+'"></i>Ganadas</span><span><i class="ins-dot" style="background:'+colors.Perdida+'"></i>Perdidas</span><span><i class="ins-dot" style="background:'+colors['En curso']+'"></i>En curso</span></div>';
 rows.forEach(function(q){var total=metric==='aporte'?q.aporte:q.n;html+='<div class="ins-mrow"><strong>'+monthNames[q.m]+'</strong><div class="ins-stack" data-month="'+q.m+'" title="Filtrar '+monthNames[q.m]+'">';['Ganada','Perdida','En curso'].forEach(function(k){var v=metric==='aporte'?sum(q.by[k],'aporte'):q.by[k].length,part=total?100*v/total:0;if(part>0)html+='<div class="ins-piece" style="width:'+part+'%;background:'+colors[k]+'" title="'+k+': '+(metric==='aporte'?money(v):v)+' · '+percent(v,total)+'">'+(part>=13?part.toFixed(0)+'%':'')+'</div>'});html+='</div><b>'+ (metric==='aporte'?money(total):integer(total)) +'</b></div>'});return html;
}
function execRanking(rows){
 var map={};rows.forEach(function(r){var x=r.ejecutivo||'Sin ejecutivo';if(!map[x])map[x]={name:x,n:0,u:0};map[x].n++;map[x].u+=+r.unidades||0});
 var a=Object.values(map).sort(function(x,y){return y.n-x.n}).slice(0,12),mx=Math.max(1,...a.map(function(x){return x.n}));
 return a.map(function(r){return '<div class="ins-exec" data-exec="'+safe(r.name)+'" title="Filtrar ejecutivo"><span>'+safe(r.name)+'</span><div class="ins-track"><div class="ins-fill" style="width:'+(r.n/mx*100)+'%"></div></div><b>'+integer(r.n)+'</b></div>'}).join('');
}
function financeMonthly(rows){
 var max=Math.max(1,...rows.map(function(q){return q.aporte}));
 return rows.map(function(q){var old=rows[rows.indexOf(q)-1],diff=old&&old.aporte?((q.aporte/old.aporte-1)*100):null;return '<div class="ins-hbar"><strong>'+monthNames[q.m]+'</strong><div class="ins-htrack ins-month" data-month="'+q.m+'"><div class="ins-hfill" style="width:'+(q.aporte/max*100)+'%"></div></div><div style="text-align:right"><b>'+money(q.aporte)+'</b><div class="ins-delta '+(diff>=0?'ins-up':'ins-down')+'">'+(diff==null?'—':((diff>0?'+':'')+diff.toFixed(1)+'% vs ant.'))+'</div></div></div>'}).join('');
}
function title(t,s){return '<h3>'+t+'</h3><p class="ins-sub">'+s+'</p>'}
function card(t,s,html,full){return '<div class="ins-card'+(full?' ins-full':'')+'">'+title(t,s)+html+'</div>'}
function monthInputs(){var fm=document.getElementById('fm');if(!fm)return;for(var i=0;i<monthOrder.length;i++){if(!fm.querySelector('option[value="'+monthOrder[i]+'"]')){var op=document.createElement('option');op.value=monthOrder[i];op.textContent=monthNames[monthOrder[i]];fm.appendChild(op)}}}
function addExecFilter(){
 var filters=document.querySelector('.filters'),anchor=document.getElementById('fe');if(!filters||!anchor||document.getElementById('fej'))return;
 var block=el('div','<label>EJECUTIVO</label><select id="fej"><option value="">Todos</option></select>');
 filters.insertBefore(block,anchor.closest('div'));
 var sel=document.getElementById('fej');var names=[...new Set(DATA.map(function(r){return r.ejecutivo||''}).filter(Boolean))].sort(function(a,b){return a.localeCompare(b,'es')});
 names.forEach(function(n){var op=document.createElement('option');op.value=n;op.textContent=n;sel.appendChild(op)});
 sel.onchange=function(){if(typeof strategyGo==='function')strategyGo();draw()}
 if(typeof window.F==='function'){var oldF=window.F;window.F=function(){var a=oldF(),v=sel.value;return v?a.filter(function(r){return r.ejecutivo===v}):a}}
}
var auditKey='honor_b2b_changes_v1',audit=[];
try{var saved=JSON.parse(localStorage.getItem(auditKey)||'[]');if(Array.isArray(saved))audit=saved}catch(e){}
function copyRow(r){return r?JSON.parse(JSON.stringify(r)):null}
function diffRow(before,after){var changes=[];var keys=['cliente','ruc','canal','ejecutivo','modelos','unidades','aporte','mesOrigen','estado','mesCierre','anioCierre','comentario'];keys.forEach(function(k){var a=before?before[k]:undefined,b=after?after[k]:undefined;if(String(a??'')!==String(b??''))changes.push({campo:k,antes:a??'',despues:b??''})});return changes}
function logChange(action,before,after){if(!after)return;var changes=diffRow(before,after);if(action!=='Nueva cuenta'&&changes.length===0)return;audit.unshift({fecha:new Date().toISOString(),accion:action,id:after.id,cliente:after.cliente,changes:changes});audit=audit.slice(0,2000);try{localStorage.setItem(auditKey,JSON.stringify(audit))}catch(e){alert('No se pudo guardar el historial de cambios. Descarga un respaldo.')}renderAudit()}
function augmentEditing(){
 if(window.quickState){var qs=window.quickState;window.quickState=function(id,v){var old=copyRow(DATA.find(function(r){return String(r.id)===String(id)}));qs(id,v);logChange('Estado',old,DATA.find(function(r){return String(r.id)===String(id)}));draw()}}
 if(window.quickClose){var qc=window.quickClose;window.quickClose=function(id,v){var old=copyRow(DATA.find(function(r){return String(r.id)===String(id)}));qc(id,v);logChange('Cierre',old,DATA.find(function(r){return String(r.id)===String(id)}));draw()}}
 if(window.saveEditForm){var sf=window.saveEditForm;window.saveEditForm=function(){
  var id=document.getElementById('eid').value,old=copyRow(DATA.find(function(r){return String(r.id)===String(id)}));var ruc=document.getElementById('eruc').value.trim(),model=document.getElementById('emodelos').value.trim(),mes=document.getElementById('emesOrigen').value;
  if(!document.getElementById('ecliente').value.trim()){alert('Ingresa el nombre del cliente.');return}
  if(!id){var dupl=DATA.find(function(r){return ruc&&r.ruc===ruc&&r.mesOrigen===mes&&r.modelos.trim().toLowerCase()===model.toLowerCase()});
   if(dupl){alert('Ya existe esta oportunidad para el mismo RUC, mes y modelos. Usa Editar en la cuenta existente para evitar duplicarla.');return}
   if(ruc&&DATA.some(function(r){return r.ruc===ruc})&&!confirm('Este RUC ya tiene antecedentes. ¿Confirmas que es una operación comercial distinta y no una reconsulta?'))return
  }
  var oldIds=new Set(DATA.map(function(r){return r.id}));var nameInput=document.getElementById('eejecutivo');nameInput.value=aliases[nameInput.value.trim()]||nameInput.value.trim();sf();
  var after=id?DATA.find(function(r){return String(r.id)===String(id)}):DATA.find(function(r){return !oldIds.has(r.id)});
  logChange(id?'Edición':'Nueva cuenta',old,after);draw()
 };document.getElementById('saveEdit').onclick=window.saveEditForm}
}
function exportBackup(){var bundle={version:1,createdAt:new Date().toISOString(),localChanges:typeof LOCAL==='object'?LOCAL:null,audit:audit};
 var blob=new Blob([JSON.stringify(bundle,null,2)],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='HONOR_B2B_ediciones_e_historial.json';a.click();setTimeout(function(){URL.revokeObjectURL(a.href)},3000)}
function importBackup(e){var f=e.target.files&&e.target.files[0];if(!f)return;var reader=new FileReader();reader.onload=function(){try{var b=JSON.parse(String(reader.result));if(!b.localChanges||!b.localChanges.overrides||!Array.isArray(b.localChanges.newRows))throw Error('Formato incompleto');if(!confirm('Esto reemplazará las ediciones locales actuales. ¿Continuar?'))return;localStorage.setItem(LOCAL_KEY,JSON.stringify(b.localChanges));localStorage.setItem(auditKey,JSON.stringify(Array.isArray(b.audit)?b.audit:[]));location.reload()}catch(err){alert('No se pudo importar el respaldo: '+err.message)}};reader.readAsText(f)}
function renderAudit(){
 var area=document.getElementById('auditList');if(!area)return;
 area.innerHTML=audit.slice(0,25).map(function(v){return '<div class="ins-entry"><strong>'+safe(v.accion)+' · '+safe(v.cliente)+'</strong> <span class="mut">'+safe(new Date(v.fecha).toLocaleString('es-PE'))+'</span><div class="mut">'+(v.changes||[]).map(function(c){return safe(c.campo)+': '+safe(c.antes)+' → '+safe(c.despues)}).join(' · ')+'</div></div>'}).join('')||'<div class="ins-note">Aún no hay cambios editados desde este navegador. Los cambios futuros aparecerán aquí con fecha, valor anterior y nuevo.</div>';
}
function historyTimeline(){
 var select=document.getElementById('histAccount'),panel=document.getElementById('histPlot'),detail=document.getElementById('histDetails');if(!select||!panel)return;
 var key=select.value;if(!key){panel.innerHTML='<div class="ins-note">Selecciona una cuenta para ver sus oportunidades y seguimiento mes a mes.</div>';detail.innerHTML='';return}
 var rows=DATA.filter(function(r){return (r.ruc||r.cliente)===key}).sort(function(a,b){return monthOrder.indexOf(a.mesOrigen)-monthOrder.indexOf(b.mesOrigen)});
 var html='<div class="ins-lane"><strong>Operación</strong>'+monthOrder.map(function(m){return '<span><b>'+monthNames[m].slice(0,3)+'</b></span>'}).join('')+'</div>';
 rows.forEach(function(r){var start=monthOrder.indexOf(r.mesOrigen),end=Math.max(start,monthOrder.indexOf(r.mesSeguimiento||r.mesOrigen),monthLong.indexOf(r.mesCierre)),label=r.modelos.length>28?r.modelos.slice(0,28)+'…':r.modelos;
  html+='<div class="ins-lane"><span title="'+safe(r.modelos)+'"><b>'+safe(label)+'</b></span>';
  monthOrder.forEach(function(m,i){var on=i>=start&&i<=end,type=r.estado==='Ganada'?'done':r.estado==='Perdida'?'lost':'on';html+='<div class="ins-cell '+(on?type:'')+'" title="'+safe(monthNames[m]+(on?' · actividad referencial':'')+' · '+r.estado)+'"></div>'});html+='</div>'
 });
 panel.innerHTML=html;var sumA=sum(rows,'aporte'),sumU=sum(rows,'unidades');
 detail.innerHTML='<div class="ins-note">'+rows.length+' oportunidad(es), '+integer(sumU)+' unidades referenciales y '+money(sumA)+' de aporte. Esta línea de tiempo cubre desde el mes de origen hasta el último seguimiento o cierre registrado; no confirma actividad diaria ni entrega de equipos.</div>'+rows.map(function(r){return '<div class="ins-entry"><b>'+safe(r.estado)+' · '+safe(r.modelos)+'</b><div class="mut">'+safe(r.nota||r.comentario||'Sin comentario registrado')+'</div></div>'}).join('');
}
function build(){
 var res=document.getElementById('res'),cue=document.getElementById('cue'),apo=document.getElementById('apo');
 if(!res||!cue||!apo)return;
 var x=el('div','<div class="ins-grid" id="summaryInsights"></div>','box');
 x.insertBefore(el('div','Comparativo comercial por mes','h'),x.firstChild);x.insertBefore(el('div','Los gráficos responden a los filtros. Haz clic en un mes para filtrar o volver a Todos.','desc'),x.children[1]);
 res.appendChild(x);
 var y=el('div','<div class="ins-grid" id="accountInsights"></div>','box');y.insertBefore(el('div','Análisis de cuentas y ejecutivos','h'),y.firstChild);cue.insertBefore(y,cue.querySelector('.editable-table'));
 var h=el('div','<div class="ins-grid" id="historyInsights"><div class="ins-card ins-full"><h3>Histórico de cuenta · línea de tiempo</h3><p class="ins-sub">Origen, seguimiento y cierre por operación; útil para reconocer reconsultas sin duplicar.</p><select id="histAccount" class="ins-select"><option value="">Selecciona un cliente único</option></select><div id="histPlot" style="margin-top:15px"></div><div id="histDetails"></div></div></div>','box');
 cue.insertBefore(h,cue.querySelector('.editable-table'));
 var au=el('div','<div class="ins-grid"><div class="ins-card ins-full"><h3>Historial de ediciones</h3><p class="ins-sub">Trazabilidad local: quién o qué cuenta cambió, cuándo y valores antes/después.</p><div class="ins-actions"><button class="btn" id="jsonBackup">Descargar respaldo completo + historial</button><button class="btn" id="jsonImportBtn">Restaurar respaldo</button><input type="file" accept=".json,application/json" id="jsonImport" style="display:none"></div><div id="auditList" class="ins-audit"></div></div><div class="ins-card ins-full"><h3>Unificación de nombres de ejecutivos</h3><p class="ins-sub">Variantes equivalentes se muestran como una sola persona. No se combinan apellidos distintos sin evidencia.</p><div id="nameAliases" class="ins-note"></div></div></div>','box');
 cue.appendChild(au);
 var ap=el('div','<div class="ins-grid" id="aporteInsights"></div>','box');
 ap.insertBefore(el('div','Evolución y distribución de aportes','h'),ap.firstChild);ap.insertBefore(el('div','Comparaciones por mes, estado comercial y modelo. No confundir aporte aprobado con pago efectivo.','desc'),ap.children[1]);apo.appendChild(ap);
 document.getElementById('jsonBackup').onclick=exportBackup;document.getElementById('jsonImportBtn').onclick=function(){document.getElementById('jsonImport').click()};document.getElementById('jsonImport').onchange=importBackup;
 document.getElementById('histAccount').onchange=historyTimeline;
 document.getElementById('nameAliases').innerHTML=normalized.length?normalized.map(function(q){return safe(q.old)+' → <b>'+safe(q.name)+'</b>'}).filter(function(s,i,arr){return arr.indexOf(s)===i}).join(' · '):'No se encontraron variantes verificables.';
}
function draw(){
 var a=scoped(),all=scopeIgnoreMonth(),monthly=grouped(all),cur=grouped(a),s=document.getElementById('summaryInsights'),c=document.getElementById('accountInsights'),p=document.getElementById('aporteInsights');if(!s||!c||!p)return;
 var first=monthly[0],last=monthly[monthly.length-1],delta=first.n?((last.n-first.n)/first.n*100):0;
 s.innerHTML=card('Evolución de oportunidades','Cantidad mensual de solicitudes/opciones comerciales registradas; haz clic en un punto para filtrar.',lineChart(monthly,'n','integer'))+
 card('Estado comercial por mes','Dentro de cada mes, Ganada + Perdida + En curso = 100% de oportunidades.',stateBars(monthly,'n'))+
 card('Evolución de aporte referencial','Comparación mensual del monto asociado a oportunidades, no desembolsos.',lineChart(monthly,'aporte','money'),true)+
 card('Lectura del periodo','Indicadores calculados con los datos de mayo a octubre y los filtros de canal/ejecutivo.', '<div class="ins-summary"><div class="ins-stat"><small>Primer mes</small><b>'+first.n+'</b><small>'+monthNames[first.m]+'</small></div><div class="ins-stat"><small>Último mes</small><b>'+last.n+'</b><small>'+monthNames[last.m]+'</small></div><div class="ins-stat"><small>Variación oportunidades</small><b class="'+(delta>=0?'ins-up':'ins-down')+'">'+(delta>0?'+':'')+delta.toFixed(1)+'%</b></div><div class="ins-stat"><small>Clientes filtrados</small><b>'+new Set(a.map(function(r){return r.ruc||r.cliente})).size+'</b></div></div>',true);
 c.innerHTML=card('Oportunidades por mes','Variación de la carga comercial sin añadir columnas o campos.',lineChart(monthly,'n','integer'))+
 card('Participación de estados','Resultado y pipeline por mes de origen.',stateBars(monthly,'n'))+
 card('Ejecutivos consolidados','Haz clic en un ejecutivo para filtrar toda la web.',execRanking(a),true);
 p.innerHTML=card('Aporte referencial por mes','Gráfico con variaciones mensuales y filtros por canal/ejecutivo.',lineChart(monthly,'aporte','money'))+
 card('Aporte por situación comercial','Distribución del aporte en cada mes; porcentajes suman 100%.',stateBars(monthly,'aporte'))+
 card('Variación frente al mes anterior','Montos nominales y evolución porcentual versus el mes previo.',financeMonthly(monthly),true)+
 card('Aportes por modelo','Ranking informativo: una propuesta puede contener alternativas, por lo que no debe sumarse al aprobado total.','<div id="insModelRanking"></div>',true);
 var models=typeof MB==='function'?MB(a):[],top=models.slice(0,12),max=Math.max(1,...top.map(function(t){return t.v})),target=document.getElementById('insModelRanking');
 if(target)target.innerHTML=top.map(function(t){return '<div class="ins-exec"><span>'+safe(t.n)+'</span><div class="ins-track"><div class="ins-fill" style="width:'+(t.v/max*100)+'%"></div></div><b>'+money(t.v)+'</b></div>'}).join('')||'<div class="mut">Sin datos</div>';
 [s,c,p].forEach(wireMonths);
 c.querySelectorAll('[data-exec]').forEach(function(n){n.onclick=function(){var f=document.getElementById('fej');if(f){f.value=f.value===n.dataset.exec?'':n.dataset.exec;if(typeof strategyGo==='function')strategyGo();draw()}}});
 var h=document.getElementById('histAccount');if(h){var selected=h.value,accountMap={};DATA.forEach(function(r){var key=r.ruc||r.cliente;if(!accountMap[key])accountMap[key]=r.cliente+' · '+(r.ruc||'sin RUC')});h.innerHTML='<option value="">Selecciona un cliente único</option>'+Object.keys(accountMap).sort(function(a,b){return accountMap[a].localeCompare(accountMap[b],'es')}).map(function(k){return '<option value="'+safe(k)+'">'+safe(accountMap[k])+'</option>'}).join('');h.value=selected||'';historyTimeline()}
 renderAudit();
}
monthInputs();addExecFilter();build();augmentEditing();draw();
['fm','fc','fe','fz','fq'].forEach(function(id){var e=document.getElementById(id);if(e)e.addEventListener(id==='fq'?'input':'change',function(){setTimeout(draw,25)})});
document.getElementById('cl').addEventListener('click',function(){setTimeout(draw,25)});
})();