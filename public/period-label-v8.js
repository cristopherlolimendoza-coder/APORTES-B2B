/* Ajustes de texto para distinguir origen histórico del periodo vigente/resultado. */
(()=>{
'use strict';
function apply(){
 const month=document.getElementById('fMonth');
 const label=month?.closest('div')?.querySelector('label');
 if(label)label.textContent='MES VIGENTE / RESULTADO';
 const table=document.querySelector('#accountRows')?.closest('table');
 if(table){const th=[...table.querySelectorAll('th')].find(x=>x.textContent.trim()==='Mes');if(th)th.textContent='Mes vigente / resultado';}
 const follow=document.querySelector('#followRows')?.closest('table');
 if(follow){const th=[...follow.querySelectorAll('th')].find(x=>x.textContent.trim()==='Mes');if(th)th.textContent='Mes vigente';}
}
function install(){apply();setTimeout(apply,500);setTimeout(apply,1800);const root=document.querySelector('.app');if(root)new MutationObserver(()=>setTimeout(apply,0)).observe(root,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
