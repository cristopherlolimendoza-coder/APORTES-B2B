/* Mejoras no destructivas: edición guiada, meses/años de cierre, historial y auditoría. */
(()=>{
  const MONTHS=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const YEARS=Array.from({length:21},(_,i)=>2020+i); // 2020–2040
  const KAMS=[
    'Rocío del Carmen Valdivia Nava','Jessica Paula Gonzales Bamonde','María Gabriela Díaz Gonzales',
    'Ljubica Velickovich Roca','Vanessa Tuesta Lujan','Brunella Huarcaya Lora',
    'Santiago Diez de Tejada Agar','Valeria Brandariz','Mónica Teresa Castro Ríos'
  ];
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const by=id=>(typeof DATA !== 'undefined' ? DATA : []).find(r=>String(r.id)===String(id));
  const editingEnabled=()=>/Edición habilitada/i.test(document.getElementById('cloudAccess')?.textContent||'');
  let pendingEdit='',pendingNew=false,filterWrapped=false,renderWrapped=false;

  const style=document.createElement('style');
  style.textContent=`
    .date-pair{display:flex;gap:5px;align-items:center;flex-wrap:wrap}.date-pair .mini{min-width:95px}
    .quality-ok{color:#22733a!important;background:#eef9f1!important;border-color:#bfe3c8!important}
    .quality-warn{color:#8a5d00!important;background:#fff8df!important;border-color:#f2df9c!important}
    .access-hint{font-size:11px;color:#526176;flex-basis:100%;margin-top:2px}
    #historyDlg .history-item{padding:10px 0;border-bottom:1px solid #e5eaf2}
    #historyDlg .history-item:last-child{border-bottom:0}
    @media(min-width:901px){.filters{grid-template-columns:135px 155px 135px 145px 115px minmax(210px,1fr) auto!important}}
  `;
  document.head.appendChild(style);

  function monthOptions(selected,blank=true){return (blank?'<option value="">Sin confirmar</option>':'')+MONTHS.map(m=>`<option value="${m}" ${selected===m?'selected':''}>${m}</option>`).join('')}
  function yearOptions(selected){return YEARS.map(y=>`<option value="${y}" ${Number(selected)===y?'selected':''}>${y}</option>`).join('')}

  function normalize(){return typeof window.HONOR_NORMALIZE_ACCOUNTS==='function'?window.HONOR_NORMALIZE_ACCOUNTS():window.HONOR_ACCOUNT_AUDIT}

  function addKamList(){
    if(!document.getElementById('kamList')){
      const d=document.createElement('datalist');d.id='kamList';d.innerHTML=KAMS.map(k=>`<option value="${esc(k)}"></option>`).join('');document.body.appendChild(d);
    }
    const input=document.getElementById('eejecutivo');if(input){input.setAttribute('list','kamList');input.autocomplete='off'}
  }

  function enhanceForm(){
    const close=document.getElementById('emesCierre');if(close){const v=close.value;close.innerHTML=monthOptions(v,true);close.value=v;}
    let year=document.getElementById('eanio');
    if(year&&year.tagName!=='SELECT'){
      const s=document.createElement('select');s.id='eanio';s.innerHTML=yearOptions(Number(year.value)||2026);year.replaceWith(s);year=s;
    }else if(year){const v=Number(year.value)||2026;year.innerHTML=yearOptions(v);year.value=String(v);}
    const state=document.getElementById('eestado');if(state&&close&&year){const enabled=state.value!=='En curso';close.disabled=!enabled;year.disabled=!enabled;}
    const filter=document.getElementById('fz');if(filter){const v=filter.value;filter.innerHTML='<option value="">Todos</option>'+MONTHS.map(m=>`<option value="${m}" ${v===m?'selected':''}>${m}</option>`).join('')+`<option value="SIN" ${v==='SIN'?'selected':''}>Sin confirmar</option>`;filter.value=v;}
    addKamList();
  }

  function addYearFilter(){
    if(document.getElementById('fy'))return;
    const close=document.getElementById('fz')?.parentElement;if(!close)return;
    const wrap=document.createElement('div');wrap.innerHTML='<label>AÑO CIERRE</label><select id="fy"><option value="">Todos</option>'+YEARS.map(y=>`<option value="${y}">${y}</option>`).join('')+'</select>';close.after(wrap);
    document.getElementById('fy').addEventListener('change',()=>window.strategyGo?.());
    if(!filterWrapped&&typeof window.F==='function'){
      const base=window.F;window.F=function(){const y=document.getElementById('fy')?.value;return base().filter(r=>!y||String(r.anioCierre||'')===String(y))};filterWrapped=true;
    }
    document.getElementById('cl')?.addEventListener('click',()=>{const fy=document.getElementById('fy');if(fy)fy.value='';setTimeout(()=>window.strategyGo?.(),0)});
  }

  function qualityPanel(){
    let panel=document.getElementById('accountQuality');
    if(!panel){panel=document.createElement('div');panel.id='accountQuality';panel.className='warn';panel.style.marginTop='10px';const access=document.querySelector('.access-panel');(access||document.getElementById('cloudInfo'))?.after(panel);}
    const a=normalize()||{},dups=a.duplicateCandidates||[],multi=a.multiOpportunityAccounts||[];
    panel.classList.toggle('quality-warn',!!dups.length);panel.classList.toggle('quality-ok',!dups.length);
    panel.innerHTML=dups.length
      ?`Control de calidad: <b>${dups.length} posible(s) duplicado(s) exacto(s)</b>. No se eliminaron automáticamente para evitar borrar negocios distintos. ${dups.slice(0,4).map(d=>esc(d.cliente)).join(' · ')}`
      :`Control de calidad: <b>sin duplicados exactos detectados</b>. ${multi.length} cuenta(s) tienen varias oportunidades y se consolidan por RUC en la vista Account.`;
  }

  function addAccessHelp(){
    const access=document.querySelector('.access-panel');if(!access||access.querySelector('.access-hint'))return;
    const hint=document.createElement('div');hint.className='access-hint';hint.textContent='Para editar: pulsa Editar, ingresa la clave larga de Aportes y la cuenta seleccionada se abrirá automáticamente. La contraseña de HONOR Rewards es distinta.';access.appendChild(hint);
    if(!document.getElementById('cloudRetry')){const retry=document.createElement('button');retry.type='button';retry.id='cloudRetry';retry.className='btn';retry.textContent='Recargar conexión';retry.onclick=()=>location.reload();document.getElementById('cloudLogout')?.before(retry);}
  }

  function enhanceRows(){
    document.querySelectorAll('select[data-close]').forEach(sel=>{
      const id=decodeURIComponent(sel.dataset.close),row=by(id);if(!row)return;
      const month=row.mesCierre||'';sel.innerHTML=monthOptions(month,true);sel.value=month;sel.title='Mes de cierre';
      const cell=sel.parentElement;cell.classList.add('date-pair');
      let year=cell.querySelector('[data-close-year]');if(!year){year=document.createElement('select');year.className='mini';year.dataset.closeYear=encodeURIComponent(String(id));sel.after(year);}
      year.innerHTML=yearOptions(row.anioCierre||2026);year.value=String(row.anioCierre||2026);year.disabled=!editingEnabled()||!row.mesCierre;year.title='Año de cierre';
      if(row.estado!=='En curso'&&!row.mesCierre){sel.style.borderColor='#d97706';sel.title='Falta completar fecha de cierre'}else sel.style.borderColor='';
    });
    document.querySelectorAll('[data-edit]').forEach(btn=>{
      const id=btn.dataset.edit;if([...btn.parentElement.querySelectorAll('[data-history]')].some(x=>x.dataset.history===id))return;
      const h=document.createElement('button');h.type='button';h.className='editbtn';h.dataset.history=id;h.textContent='Historial';h.style.marginLeft='5px';btn.after(h);
    });
    const th=[...document.querySelectorAll('#cue th')].find(x=>x.textContent.trim()==='Mes cierre');if(th)th.textContent='Fecha de cierre';
  }

  function createHistoryDialog(){
    if(document.getElementById('historyDlg'))return;
    const dlg=document.createElement('dialog');dlg.id='historyDlg';dlg.innerHTML='<div class="dlg"><div class="dlghead"><div><div class="h">Historial de cambios</div><div id="historyTitle" class="mut"></div></div><button class="editbtn" id="historyClose" type="button">Cerrar</button></div><div id="historyBody">Cargando…</div></div>';document.body.appendChild(dlg);document.getElementById('historyClose').onclick=()=>dlg.close();
  }

  async function showHistory(id){
    createHistoryDialog();const dlg=document.getElementById('historyDlg'),row=by(id);document.getElementById('historyTitle').textContent=`${row?.cliente||id} · ${row?.ruc||''}`;document.getElementById('historyBody').textContent='Cargando…';dlg.showModal();
    try{const r=await fetch('/api/history?id='+encodeURIComponent(id),{cache:'no-store'}),j=await r.json();if(!r.ok||!j.ok)throw Error(j.error||'No disponible');const entries=j.entries||[];document.getElementById('historyBody').innerHTML=entries.length?entries.map(e=>`<div class="history-item"><b>${esc(new Date(e.updatedAt).toLocaleString('es-PE'))}</b><div style="margin-top:6px">${Object.entries(e.patch||{}).map(([k,v])=>`<span class="pill"><strong>${esc(k)}:</strong> ${esc(v)}</span>`).join(' ')}</div></div>`).join(''):'Sin cambios guardados en la nube todavía.'}catch(e){document.getElementById('historyBody').textContent=e.message;}
  }

  function waitForAccess(){
    let attempts=0;const timer=setInterval(()=>{attempts++;if(editingEnabled()){clearInterval(timer);const id=pendingEdit,makeNew=pendingNew;pendingEdit='';pendingNew=false;if(id)originalOpen(id);else if(makeNew)originalNew();setTimeout(()=>{enhanceForm();},0)}else if(attempts>120)clearInterval(timer)},250);
  }

  const originalOpen=window.openEdit,originalNew=window.newEdit;
  if(typeof originalOpen==='function')window.openEdit=function(id){if(!editingEnabled()){pendingEdit=id;pendingNew=false;originalOpen(id);waitForAccess();return}originalOpen(id);setTimeout(enhanceForm,0)};
  if(typeof originalNew==='function')window.newEdit=function(){if(!editingEnabled()){pendingNew=true;pendingEdit='';originalNew();waitForAccess();return}originalNew();setTimeout(enhanceForm,0)};

  function enhance(){enhanceForm();addYearFilter();addAccessHelp();qualityPanel();enhanceRows();}
  if(!renderWrapped&&typeof window.strategyGo==='function'){
    const base=window.strategyGo;window.strategyGo=function(){normalize();base();enhance()};renderWrapped=true;
  }

  document.addEventListener('change',e=>{
    if(e.target.matches('#eestado')){enhanceForm();if(e.target.value==='En curso'){document.getElementById('emesCierre').value='';}}
    if(e.target.matches('[data-close-year]')){const id=decodeURIComponent(e.target.dataset.closeYear),row=by(id);if(row&&row.mesCierre){window.quickClose?.(id,row.mesCierre,Number(e.target.value));}}
  },true);
  document.addEventListener('click',e=>{const h=e.target.closest('[data-history]');if(h){e.preventDefault();showHistory(decodeURIComponent(h.dataset.history));}});
  document.getElementById('cloudLogin')?.addEventListener('click',waitForAccess);
  document.getElementById('cloudKey')?.addEventListener('keydown',e=>{if(e.key==='Enter')waitForAccess()});

  enhance();normalize();window.strategyGo?.();
  let rounds=0;const syncTimer=setInterval(()=>{rounds++;normalize();enhance();if(rounds>=20||/Conectado a Cloudflare/i.test(document.getElementById('cloudInfo')?.textContent||''))clearInterval(syncTimer)},500);
})();
