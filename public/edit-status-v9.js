/* HONOR B2B V9: el editor solo permite Ganada, Perdida y En proceso. */
(()=>{
'use strict';
const $=id=>document.getElementById(id);
const normalize=v=>v==='Ganada'?'Ganada':(v==='Perdida'||v==='Descartado'?'Perdida':'En curso');
const OPTIONS='<option value="Ganada">Ganada</option><option value="Perdida">Perdida</option><option value="En curso">En proceso</option>';
let applying=false,queued=false;

function patchSelect(select){
  if(!select)return;
  const current=normalize(select.value);
  if(select.innerHTML!==OPTIONS)select.innerHTML=OPTIONS;
  select.value=current;
  const won=select.closest('.edit-item')?.querySelector('[data-won]');
  if(won){
    won.disabled=current!=='Ganada';
    if(current!=='Ganada')won.value=0;
  }
}
function patchEditor(){
  if(applying)return;applying=true;
  try{
    document.querySelectorAll('#editItems select[data-state]').forEach(patchSelect);
    const sub=$('editDlg')?.querySelector('.dlg-head .sub');
    if(sub)sub.textContent='Cliente, RUC, KAM, canal y mes de origen no se editan. Solo puedes elegir Ganada, Perdida o En proceso.';
    const modelSub=$('editItems')?.previousElementSibling;
    if(modelSub?.classList?.contains('sub'))modelSub.textContent='Selecciona Ganada, Perdida o En proceso. Si se ganó parcialmente, indica las unidades que sí van.';
    const version=document.querySelector('.version');
    if(version?.firstChild)version.firstChild.textContent='V9 EDICIÓN CON 3 ESTADOS';
  }finally{applying=false;}
}
function schedule(){if(queued)return;queued=true;setTimeout(()=>{queued=false;patchEditor();},0)}
function install(){
  const items=$('editItems'),dlg=$('editDlg');
  if(!items||!dlg)return setTimeout(install,100);
  new MutationObserver(schedule).observe(items,{childList:true,subtree:true});
  new MutationObserver(()=>{if(dlg.open){schedule();setTimeout(patchEditor,40);setTimeout(patchEditor,160)}}).observe(dlg,{attributes:true,attributeFilter:['open']});
  document.addEventListener('click',e=>{if(e.target.closest('[data-edit]')){setTimeout(patchEditor,0);setTimeout(patchEditor,80);setTimeout(patchEditor,250)}});
  dlg.addEventListener('change',e=>{if(e.target.matches('select[data-state]')){patchSelect(e.target);setTimeout(patchEditor,0)}});
  patchEditor();setTimeout(patchEditor,600);setTimeout(patchEditor,1800);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
