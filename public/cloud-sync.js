// HONOR B2B - guardado central para la web existente; no se almacenan credenciales en el repositorio.
(function(){
const SESSION_KEY='honor_b2b_admin_session', LOCAL_KEY='honor_b2b_editor_v1';
const by=id=>DATA.find(r=>String(r.id)===String(id));
const ver=new Map();let secret='',ready=false;
const access=document.createElement('div');access.className='access-panel';
access.style.cssText='display:flex;align-items:center;gap:9px;flex-wrap:wrap;border:1px solid #dfe6ef;background:#f7f9fc;border-radius:12px;padding:12px;margin-top:10px';
access.innerHTML='<b style="min-width:140px">Edición protegida</b><input type="password" id="cloudKey" placeholder="Clave de edición" autocomplete="off" style="min-width:200px;flex:1"><button type="button" class="btn primary" id="cloudLogin">Activar edición</button><button type="button" class="btn" id="cloudLogout" style="display:none">Salir</button><span id="cloudAccess" class="mut">Solo consulta</span>';
const box=document.querySelector('#cue .box');
const warn=box&&box.querySelector('.warn');if(warn){warn.textContent='Conectando con el almacenamiento central…';warn.id='cloudInfo';warn.after(access);}
const importBlock=document.createElement('div');importBlock.className='warn';importBlock.style.display='none';importBlock.style.marginTop='10px';
importBlock.innerHTML='Se encontraron cambios anteriores guardados solo en este navegador. <button class="btn" id="cloudImport" type="button">Pasarlos a la nube</button>';
access.after(importBlock);
const oldLocal=(()=>{try{return JSON.parse(localStorage.getItem(LOCAL_KEY)||'null')||{}}catch(e){return {}}})();
function msg(s,fail){let el=document.getElementById('saveMsg');if(el){el.textContent=s;el.style.color=fail?'#bb3930':'#248446';}}
function patch(r){return {cliente:String(r.cliente||''),ruc:String(r.ruc||''),canal:r.canal||'Empresas',ejecutivo:String(r.ejecutivo||''),modelos:String(r.modelos||''),unidades:Number(r.unidades)||0,aporte:Number(r.aporte)||0,estado:r.estado||'En curso',mesOrigen:r.mesOrigen||'oct-26',mesCierre:r.mesCierre||'',anioCierre:r.anioCierre||null,comentario:String(r.comentario||'')};}
function canEdit(){if(!secret){msg('Para modificar cuentas, primero ingresa tu clave y pulsa Activar edición',true);document.getElementById('cloudKey').scrollIntoView({behavior:'smooth',block:'center'});document.getElementById('cloudKey').focus();return false}if(!ready){msg('Esperando a la base central',true);return false}return true;}
function lockControls(){
 let ok=!!secret&&ready;
 let input=document.getElementById('cloudKey'),btn=document.getElementById('cloudLogin'),exit=document.getElementById('cloudLogout');
 input.style.display=btn.style.display=ok?'none':'';
 exit.style.display=ok?'':'none';
 document.getElementById('cloudAccess').textContent=ok?'Edición habilitada · guardado en la nube':'Modo consulta';
 document.getElementById('newAccount').disabled=false;
 document.querySelectorAll('[data-state],[data-close]').forEach(el=>{el.disabled=!ok;});
 document.querySelectorAll('[data-edit]').forEach(el=>{el.disabled=false;el.title=ok?'Editar esta cuenta':'Haz clic para activar edición con tu clave';});
 let drafts=(oldLocal.overrides&&Object.keys(oldLocal.overrides).length)||(oldLocal.newRows&&oldLocal.newRows.length);
 importBlock.style.display=drafts?'':'none';document.getElementById('cloudImport').disabled=!ok;
}
async function submit(r,isNew){
 if(!canEdit())throw Error('Acceso de edición necesario');
 let id=String(r.id),resp=await fetch('/api/save',{method:'PUT',headers:{Authorization:'Bearer '+secret,'Content-Type':'application/json'},body:JSON.stringify({id,isNew:!!isNew,rev:ver.get(id)||0,patch:patch(r)})});
 let data;try{data=await resp.json()}catch{throw Error('Sin respuesta válida del servidor')}
 if(!resp.ok||!data.ok)throw Error(data.error||'No se guardó el cambio');
 let row=by(id);if(!row){row={id,fecha:null,mesSeguimiento:r.mesOrigen,nota:'Creada desde la web'};DATA.push(row)}
 Object.assign(row,data.entry.patch);ver.set(id,data.entry.rev);
 msg('Guardado en Cloudflare');strategyGo();lockControls();return data.entry;
}
async function cloudState(id,value){if(!canEdit()){strategyGo();lockControls();return}
 let row=by(id);if(!row)return;let copy={...row,estado:value};
 if(value==='En curso'){copy.mesCierre='';copy.anioCierre=null;copy.cierre='';}
 try{await submit(copy,false)}catch(e){msg(e.message,true);strategyGo();lockControls();}
}
async function cloudClose(id,value,selectedYear){if(!canEdit()){strategyGo();lockControls();return}
 let row=by(id);if(!row)return;
 if(value&&row.estado==='En curso'){msg('Primero elige Ganada o Perdida',true);strategyGo();lockControls();return}
 const dropdown=document.querySelector('[data-close-year="'+CSS.escape(encodeURIComponent(String(id)))+'"]');
 const preferred=Number(selectedYear||dropdown?.value||row.anioCierre||2026);
 try{await submit({...row,mesCierre:value,anioCierre:value?preferred:null},false)}
 catch(e){msg(e.message,true);strategyGo();lockControls();}
}
async function cloudForm(){
 if(!canEdit())return;let $=id=>document.getElementById(id),id=$('eid').value.trim(),isNew=!id;
 let row={
 id:id||'WEB-'+Date.now()+'-'+crypto.randomUUID().slice(0,8),
 cliente:$('ecliente').value.trim(),ruc:$('eruc').value.trim(),canal:$('ecanal').value,
 ejecutivo:$('eejecutivo').value.trim(),modelos:$('emodelos').value.trim(),
 unidades:$('eunidades').value,aporte:$('eaporte').value,estado:$('eestado').value,
 mesOrigen:$('emesOrigen').value,mesCierre:$('emesCierre').value,anioCierre:$('emesCierre').value?(Number($('eanio').value)||2026):null,comentario:$('ecomentario').value.trim()
 };
 if(!row.cliente||!row.modelos||!/^\d{11}$/.test(row.ruc)){msg('Completa cliente, modelo y RUC (11 dígitos)',true);return}
 if(isNew){
  let same=DATA.filter(x=>String(x.ruc)===row.ruc);
  if(same.some(x=>x.mesOrigen===row.mesOrigen&&String(x.modelos).trim().toLowerCase()===row.modelos.toLowerCase())){msg('Posible duplicado: edita la oportunidad anterior',true);return}
  if(same.length&&!confirm('Este RUC ya tiene '+same.length+' oportunidades. Si es un seguimiento, actualiza una anterior. ¿Es un negocio nuevo e independiente?'))return;
 }
 let button=$('saveEdit');button.disabled=true;button.textContent='Guardando…';
 try{await submit(row,isNew);$('editDlg').close()}catch(e){msg(e.message,true)}
 finally{button.disabled=false;button.textContent='Guardar cambios'}
}
async function login(){
 let el=document.getElementById('cloudKey'),key=el.value.trim();if(!key)return msg('Ingresa la clave',true);
 let b=document.getElementById('cloudLogin');b.disabled=true;msg('Verificando clave…');
 try{let resp=await fetch('/api/auth',{method:'POST',headers:{Authorization:'Bearer '+key},cache:'no-store'});
 if(!resp.ok)throw Error('Clave de edición incorrecta');
 let test=await fetch('/api/test-write',{method:'POST',headers:{Authorization:'Bearer '+key},cache:'no-store'});
 let t;try{t=await test.json()}catch(e){t={ok:false,error:'Respuesta inválida'};}
 if(!test.ok||!t.ok)throw Error('La clave es válida, pero la base de datos no permitió guardar: '+(t.error||test.status));
 secret=key;sessionStorage.setItem(SESSION_KEY,key);el.value='';msg('Edición habilitada y escritura verificada');lockControls()}
 catch(e){msg(e.message,true)}finally{b.disabled=false}
}
async function start(){
 try{
 let resp=await fetch('/api/data',{cache:'no-store'});if(!resp.ok)throw Error('No disponible');
 let j=await resp.json();if(!Array.isArray(j.entries))throw Error('Datos no válidos');
 for(let item of j.entries){let row=by(item.id);
 if(!row){row={id:item.id,fecha:null,mesSeguimiento:item.patch?.mesOrigen||'oct-26',nota:'Creada desde la web'};DATA.push(row)}
 Object.assign(row,item.patch||{});ver.set(String(item.id),Number(item.rev)||0);}
 ready=true;document.getElementById('cloudInfo').textContent='Conectado a Cloudflare. Los cambios autorizados se guardan en una base central y se verán desde la laptop o el celular.';
 let k=sessionStorage.getItem(SESSION_KEY);if(k){let ar=await fetch('/api/test-write',{method:'POST',headers:{Authorization:'Bearer '+k},cache:'no-store'});if(ar.ok)secret=k;else sessionStorage.removeItem(SESSION_KEY);}
 msg('Datos sincronizados');
 }catch(e){ready=false;secret='';document.getElementById('cloudInfo').textContent='Conexión central no disponible. La web sigue en consulta y no permitirá guardar hasta recuperar el servicio.';msg(e.message,true)}
 strategyGo();lockControls();
}
async function migrate(){
 if(!canEdit())return;
 let rows=[...Object.values(oldLocal.overrides||{}).map(r=>({r,n:false})),...(oldLocal.newRows||[]).map(r=>({r,n:!BASE_IDS.has(String(r.id))}))];
 if(!rows.length)return;
 if(!confirm('¿Publicar '+rows.length+' cambios anteriores de este dispositivo en la base central?'))return;
 let done=0;
 for(let entry of rows){try{await submit(entry.r,entry.n);done++}catch(e){msg('Migrados '+done+'/'+rows.length+': '+e.message,true);return}}
 localStorage.removeItem(LOCAL_KEY);oldLocal.overrides={};oldLocal.newRows=[];msg('Migrados '+done+' registros');lockControls();
}
const originalStrategyGo=strategyGo;strategyGo=function(){originalStrategyGo();lockControls()};
const legacyOpenEdit=openEdit,legacyNewEdit=newEdit;
openEdit=function(id){if(!canEdit())return;legacyOpenEdit(id)};
newEdit=function(){if(!canEdit())return;legacyNewEdit()};
document.getElementById('newAccount').onclick=newEdit;
quickState=cloudState;quickClose=cloudClose;
document.getElementById('saveEdit').onclick=cloudForm;
document.getElementById('resetLocal').onclick=()=>location.reload();
document.getElementById('resetLocal').textContent='Recargar datos';
document.getElementById('cloudLogin').onclick=login;
document.getElementById('cloudLogout').onclick=()=>{secret='';sessionStorage.removeItem(SESSION_KEY);lockControls();msg('Modo consulta')};
document.getElementById('cloudImport').onclick=migrate;
document.getElementById('cloudKey').addEventListener('keydown',e=>{if(e.key==='Enter')login()});
lockControls();start();
})();