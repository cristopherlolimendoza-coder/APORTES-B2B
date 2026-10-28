/* HONOR B2B V10: guardado explícito y verificado del mes vigente / resultado. */
(()=>{
'use strict';
const SESSION='honor_b2b_admin_session';
const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const ABBR=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const $=id=>document.getElementById(id);
const nval=v=>{const n=Number(String(v??'').replace(/,/g,''));return Number.isFinite(n)&&n>=0?n:0};
const uid=()=>('M-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
const rows=()=>typeof DATA!=='undefined'&&Array.isArray(DATA)?DATA:[];
let installed=false;

function internalState(v){return v==='Ganada'?'Ganada':v==='Perdida'||v==='Descartado'?'Perdida':'En curso'}
function codeFromPeriod(month,year){const i=MONTHS.indexOf(String(month||'')),y=Number(year);return i>=0&&y>=2020&&y<=2099?ABBR[i]+'-'+String(y).slice(-2):''}
function currentRecord(){const id=$('editId')?.value;return rows().find(r=>String(r.id)===String(id))}
function originalMonth(r){return String(r?.__mesOrigenOriginal||r?.mesOrigen||'').trim()}
function editorItems(r){
 const old=Array.isArray(r?.modelItems)?r.modelItems:[];
 return [...document.querySelectorAll('#editItems .edit-item')].map((el,i)=>{
   const prior=old.find(x=>String(x.id||'')===String(el.dataset.mid||''))||old[i]||{};
   const estado=internalState(el.querySelector('[data-state]')?.value);
   const unidades=nval(el.dataset.proposed),unidadesGanadas=estado==='Ganada'?nval(el.querySelector('[data-won]')?.value):0;
   return {id:el.dataset.mid||prior.id||uid(),modelo:el.querySelector('.model-name strong')?.textContent.trim()||prior.modelo||'',unidades,aporteUnitario:nval(el.dataset.rate),estado,unidadesGanadas,nota:String(prior.nota||'')};
 });
}
function accountState(items){return items.some(x=>x.estado==='En curso')?'En curso':items.some(x=>x.estado==='Ganada')?'Ganada':'Perdida'}
function show(text,ok=false){const e=$('editError');if(!e)return;e.textContent=text;e.style.display='block';e.classList.remove('save-ok','save-error');e.classList.add(ok?'save-ok':'save-error')}
async function latestRevision(id){
 const res=await fetch('/api/data',{cache:'no-store'});if(!res.ok)throw Error('No se pudo consultar la versión actual de la cuenta.');
 const data=await res.json(),entry=(data.entries||[]).find(x=>String(x.id)===String(id));return Number(entry?.rev)||0;
}
function buildPatch(r,items,state,period){
 const wonUnits=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas,0);
 const cost=items.filter(x=>x.estado==='Ganada').reduce((s,x)=>s+x.unidadesGanadas*x.aporteUnitario,0);
 const month=$('editCloseMonth')?.value||'',year=Number($('editCloseYear')?.value)||null;
 return {
   cliente:String(r.cliente||''),ruc:String(r.ruc||''),canal:r.canal||'Empresas',ejecutivo:String(r.ejecutivo||''),
   modelos:String(r.modelos||''),unidades:nval(r.unidades),aporte:nval(r.aporte),estado,
   mesOrigen:originalMonth(r),mesSeguimiento:period,
   mesCierre:state==='En curso'?'':month,anioCierre:state==='En curso'?null:year,
   comentario:String(r.comentario||''),nota:String(r.nota||''),
   unidadesEntregadas:wonUnits,aportePagado:cost,modelItems:items
 };
}
async function saveV10(ev){
 ev?.preventDefault();ev?.stopImmediatePropagation();
 const r=currentRecord();if(!r)return show('No se encontró la cuenta seleccionada.');
 const items=editorItems(r);if(!items.length)return show('La cuenta no tiene modelos para actualizar.');
 if(items.some(x=>x.estado==='Ganada'&&x.unidadesGanadas<=0))return show('Cuando un modelo está Ganada, indica al menos una unidad.');
 if(items.some(x=>x.estado==='Ganada'&&x.unidades>0&&x.unidadesGanadas>x.unidades))return show('Las unidades ganadas no pueden superar las referenciales.');
 const month=$('editCloseMonth')?.value||'',year=$('editCloseYear')?.value||'',period=codeFromPeriod(month,year);
 if(!period)return show('Selecciona el mes y el año vigentes.');
 const state=accountState(items),key=sessionStorage.getItem(SESSION)||'';
 if(!key)return show('La edición no está activa. Ingresa nuevamente la clave.');
 const btn=$('editSave');btn.disabled=true;btn.textContent='Guardando…';show('Guardando '+(state==='En curso'?'mes vigente':'mes del resultado')+' y verificando la base…',true);
 try{
   const rev=await latestRevision(r.id),patch=buildPatch(r,items,state,period);
   const res=await fetch('/api/save',{method:'PUT',headers:{Authorization:'Bearer '+key,'Content-Type':'application/json'},body:JSON.stringify({id:String(r.id),isNew:false,rev,patch})});
   let data={};try{data=await res.json()}catch{}
   if(!res.ok||!data.ok)throw Error(data.error||('No se pudo guardar. Código '+res.status));
   const verify=await fetch('/api/data',{cache:'no-store'});if(!verify.ok)throw Error('Se guardó, pero no se pudo verificar la base.');
   const check=await verify.json(),entry=(check.entries||[]).find(x=>String(x.id)===String(r.id));
   const saved=String(entry?.patch?.mesSeguimiento||'');
   if(saved!==period)throw Error('La cuenta se guardó, pero el mes vigente no quedó registrado. Reintenta una vez.');
   Object.assign(r,data.entry?.patch||patch);
   show('Guardado correcto: '+month+' '+year+'. Actualizando el panel…',true);
   setTimeout(()=>location.reload(),650);
 }catch(err){show(err.message||'No se pudo guardar el cambio.');btn.disabled=false;btn.textContent='Guardar cambios';}
}
function installButton(){
 const old=$('editSave');if(!old)return false;
 if(old.dataset.v10==='1')return true;
 const btn=old.cloneNode(true);btn.dataset.v10='1';btn.textContent='Guardar cambios';old.replaceWith(btn);btn.addEventListener('click',saveV10,true);return true;
}
function setVersion(){const v=document.querySelector('.version');if(v?.firstChild)v.firstChild.textContent='V10 MES VIGENTE GUARDADO';}
function install(){
 if(installed)return;installed=true;
 const tryInstall=()=>{installButton();setVersion()};
 tryInstall();setTimeout(tryInstall,500);setTimeout(tryInstall,1600);
 const dlg=$('editDlg');if(dlg)new MutationObserver(tryInstall).observe(dlg,{childList:true,subtree:true});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
