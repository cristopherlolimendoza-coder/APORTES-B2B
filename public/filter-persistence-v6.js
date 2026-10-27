/* HONOR B2B V6: conserva filtros, pestaña y posición después de guardar o recargar. */
(()=>{
'use strict';
const KEY='honor_b2b_filter_state_v1';
const ids=['fMonth','fChannel','fExec','fState','fSearch'];
let restoring=false,restoreTimer=0;
const $=id=>document.getElementById(id);
function readSaved(){try{return JSON.parse(sessionStorage.getItem(KEY)||'null')||null}catch{return null}}
function currentView(){return document.querySelector('.tab.on')?.dataset.view||'accounts'}
function capture(){
 if(restoring)return;
 const values={};ids.forEach(id=>{const el=$(id);if(el)values[id]=el.value||''});
 const state={values,view:currentView(),scrollY:window.scrollY||0,savedAt:Date.now()};
 try{sessionStorage.setItem(KEY,JSON.stringify(state))}catch{}
}
function canSelect(el,value){return !value||el.tagName!=='SELECT'||[...el.options].some(o=>o.value===value)}
function applyValue(id,value){
 const el=$(id);if(!el||!canSelect(el,value))return false;
 if(el.value!==value){el.value=value;el.dispatchEvent(new Event(id==='fSearch'?'input':'change',{bubbles:true}))}
 return true;
}
function restore(){
 const state=readSaved();if(!state)return;
 restoring=true;
 let complete=true;
 for(const id of ids){const value=state.values?.[id]||'';if(!applyValue(id,value))complete=false}
 const tab=document.querySelector('.tab[data-view="'+CSS.escape(state.view||'accounts')+'"]');
 if(tab&&!tab.classList.contains('on'))tab.click();
 restoring=false;
 if(complete){
   clearTimeout(restoreTimer);
   setTimeout(()=>window.scrollTo({top:Number(state.scrollY)||0,behavior:'auto'}),80);
 }else{
   clearTimeout(restoreTimer);restoreTimer=setTimeout(restore,250);
 }
}
function install(){
 if(!ids.every(id=>$(id)))return setTimeout(install,100);
 ids.forEach(id=>{const el=$(id);el.addEventListener(id==='fSearch'?'input':'change',capture)});
 document.querySelectorAll('.tab[data-view]').forEach(tab=>tab.addEventListener('click',()=>setTimeout(capture,0)));
 window.addEventListener('beforeunload',capture);
 window.addEventListener('pagehide',capture);
 const observer=new MutationObserver(()=>setTimeout(restore,0));
 ['fMonth','fExec'].forEach(id=>{const el=$(id);if(el)observer.observe(el,{childList:true})});
 restore();setTimeout(restore,500);setTimeout(restore,1500);setTimeout(restore,3000);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
