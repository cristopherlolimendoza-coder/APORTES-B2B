/*
 * Normalización de cuentas y KAM confirmada por el usuario.
 * - Relaciona todas las oportunidades por RUC, aunque el nombre del cliente o KAM venga abreviado.
 * - No elimina oportunidades: varias filas del mismo RUC pueden ser negocios distintos.
 * - Detecta únicamente posibles duplicados exactos para revisión.
 */
(()=>{
  const normalize = value => String(value ?? '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

  const accounts = new Map([
    ['20104505784', {cliente:'Bodegas y Viñedos Tabernero S.A.C.', ejecutivo:'Rocío del Carmen Valdivia Nava'}],
    ['20382748566', {cliente:'Interseguro Compañía de Seguros S.A.', ejecutivo:'Jessica Paula Gonzales Bamonde'}],
    ['20521218097', {cliente:'Inmobiliaria Alquife S.A.C.', ejecutivo:'María Gabriela Díaz Gonzales'}],
    ['20506675457', {cliente:'Minera Chinalco Perú S.A.', ejecutivo:'Ljubica Velickovich Roca'}],
    ['20256211310', {cliente:'Mitsui Automotriz S.A.', ejecutivo:'Vanessa Tuesta Lujan'}],
    ['20505880171', {cliente:'Red de Combustibles Líquidos S.A.C.', ejecutivo:'Brunella Huarcaya Lora'}],
    ['20231843460', {cliente:'Costa del Sol S.A.', ejecutivo:'Santiago Diez de Tejada Agar'}],
    ['20536727524', {cliente:'Costeño Alimentos S.A.C.', ejecutivo:'Rocío del Carmen Valdivia Nava'}],
    ['20601762219', {cliente:'Autoniza S.A.C.', ejecutivo:'Valeria Brandariz'}],
    ['20336448337', {cliente:'Transportes y Comercio Sol del Pacífico E.I.R.L.', ejecutivo:'Valeria Brandariz'}],
    ['20475428634', {cliente:'Estanterías Metálicas J.R.M. S.A.C.', ejecutivo:'Valeria Brandariz'}],
    ['20101308678', {cliente:'Cía. Industrial Continental S.A.C.', ejecutivo:'Rocío del Carmen Valdivia Nava'}],
    ['20607649937', {cliente:'Haleon Perú S.R.L.', ejecutivo:'Rocío del Carmen Valdivia Nava'}],
    ['20546349781', {cliente:'Grupo de Contratistas Internacionales S.A.C.', ejecutivo:'Mónica Teresa Castro Ríos'}],
    ['20424295036', {cliente:'Los Andes S.A.C.', ejecutivo:'Mónica Teresa Castro Ríos'}],
    ['20206018411', {cliente:'Tecsur S.A.', ejecutivo:'Mónica Teresa Castro Ríos'}],
    ['20100061474', {cliente:'Representaciones Deco S.A.', ejecutivo:'Mónica Teresa Castro Ríos'}],
    ['20131376503', {cliente:'Servicio Nacional de Adiestramiento en Trabajo Industrial (SENATI)', ejecutivo:'Álvaro Gomezdecordova'}]
  ]);

  const aliases = new Map();
  const addAliases = (canonical, values) => values.forEach(v => aliases.set(normalize(v), canonical));
  addAliases('Rocío del Carmen Valdivia Nava', [
    'Rocío del Carmen Valdivia Nava','Rocio del Carmen Valdivia Nava','Rocío Valdivia','Rocio Valdivia','Carmen Valdivia Nava'
  ]);
  addAliases('Jessica Paula Gonzales Bamonde', [
    'Jessica Paula Gonzales Bamonde','Jessica Paola Gonzales Bamonde','Jessica Gonzales','Jessica Paula Gonzales','Jessica Gonzales Bamonde'
  ]);
  addAliases('María Gabriela Díaz Gonzales', [
    'María Gabriela Díaz Gonzales','Maria Gabriela Diaz Gonzales','Maria Gabriela Diaz'
  ]);
  addAliases('Ljubica Velickovich Roca', [
    'Ljubica Velickovich Roca','Ljubica Velicovich','Ljubica Velickovich','Ljubica Velicovich Roca'
  ]);
  addAliases('Vanessa Tuesta Lujan', ['Vanessa Tuesta Lujan','Vanessa Tuesta']);
  addAliases('Brunella Huarcaya Lora', ['Brunella Huarcaya Lora','Brunella Huarcaya']);
  addAliases('Santiago Diez de Tejada Agar', ['Santiago Diez de Tejada Agar','Santiago Diez de Tejada']);
  addAliases('Valeria Brandariz', ['Valeria Brandariz']);
  addAliases('Mónica Teresa Castro Ríos', [
    'Mónica Teresa Castro Ríos','Monica Teresa Castro Rios','Monica Teresa Castro','Mónica Castro','Monica Castro'
  ]);
  addAliases('María Fernanda Zamora Wong', ['María Fernanda Zamora Wong','Maria Fernanda Zamora Wong','María Fernanda Zamora Vong']);
  addAliases('Violeta Aguilar Regalado', ['Violeta Aguilar Regalado','Violeta Aguilar']);
  addAliases('José Antonio Garay Pfuyo', ['José Antonio Garay Pfuyo','Jose Antonio Garay Pfuyo','Jose Antonio Garay']);
  addAliases('Álvaro Gomezdecordova', ['Álvaro Gomezdecordova','Alvaro Gomezdecordova']);
  addAliases('Soraya Farra Muñoz Tremolada', ['Soraya Farra Muñoz Tremolada','Soraya Fara Muñoz Tremolada']);
  addAliases('Ángela Chonyen', ['Ángela Chonyen','Angela Chonyen','Chonyen']);

  function auditAndNormalize(apply=false){
    let accountUpdates = 0, aliasUpdates = 0;
    const signatures = new Map(), duplicateCandidates = [];

    for(const row of (typeof DATA !== 'undefined' ? DATA : [])){
      const ruc = String(row.ruc || '').replace(/\D/g,'');
      const account = accounts.get(ruc);
      if(account){
        if(row.cliente !== account.cliente || row.ejecutivo !== account.ejecutivo) accountUpdates++;
        if(apply){row.cliente = account.cliente;row.ejecutivo = account.ejecutivo;}
      }else{
        const canonical = aliases.get(normalize(row.ejecutivo));
        if(canonical && row.ejecutivo !== canonical){ if(apply) row.ejecutivo = canonical; aliasUpdates++; }
      }

      const signature = [
        ruc || normalize(row.cliente),
        String(row.mesOrigen || ''),
        normalize(row.modelos),
        Number(row.unidades || 0),
        Number(row.aporte || 0)
      ].join('|');
      const previous = signatures.get(signature);
      if(previous && String(previous.id) !== String(row.id)){
        duplicateCandidates.push({id:String(row.id), duplicateOf:String(previous.id), cliente:row.cliente, ruc});
      }else signatures.set(signature,row);
    }

    const multiOpportunityAccounts = [];
    const grouped = new Map();
    for(const row of (typeof DATA !== 'undefined' ? DATA : [])){
      const key = String(row.ruc || '').replace(/\D/g,'') || normalize(row.cliente);
      if(!key) continue;
      const list = grouped.get(key) || [];
      list.push(row); grouped.set(key,list);
    }
    for(const list of grouped.values()){
      if(list.length > 1) multiOpportunityAccounts.push({
        cliente:list[0].cliente, ruc:list[0].ruc || '', oportunidades:list.length,
        ids:list.map(x=>String(x.id))
      });
    }

    const result = {accountUpdates, aliasUpdates, duplicateCandidates, multiOpportunityAccounts};
    window.HONOR_ACCOUNT_AUDIT = result;
    console.info('HONOR B2B: cuentas/KAM normalizados', result);
    return result;
  }

  window.HONOR_NORMALIZE_ACCOUNTS = auditAndNormalize;
  auditAndNormalize(true);
})();

/*
 * Compatibilidad entre el formato visual ago-26 y la validación histórica ago-2026.
 * La API recibe cuatro dígitos, mientras que la aplicación sigue trabajando con dos.
 */
(()=>{
  if(window.__honorMonthApiCompat)return;
  window.__honorMonthApiCompat=true;
  const nativeFetch=window.fetch.bind(window);
  const toApiMonth=value=>/^[a-z]{3}-\d{2}$/.test(String(value||''))
    ? String(value).slice(0,4)+'20'+String(value).slice(-2)
    : value;
  const toUiMonth=value=>/^[a-z]{3}-20\d{2}$/.test(String(value||''))
    ? String(value).slice(0,4)+String(value).slice(-2)
    : value;
  const normalizePayload=data=>{
    if(!data||typeof data!=='object')return data;
    if(Array.isArray(data.entries))data.entries.forEach(entry=>{
      if(entry?.patch?.mesOrigen)entry.patch.mesOrigen=toUiMonth(entry.patch.mesOrigen);
    });
    if(data.entry?.patch?.mesOrigen)data.entry.patch.mesOrigen=toUiMonth(data.entry.patch.mesOrigen);
    return data;
  };
  window.fetch=async function(input,init){
    let requestInput=input,requestInit=init;
    const rawUrl=typeof input==='string'?input:(input?.url||'');
    let path='';
    try{path=new URL(rawUrl,location.href).pathname}catch{}
    if(path==='/api/save'&&requestInit?.body){
      try{
        const body=JSON.parse(requestInit.body);
        if(body?.patch?.mesOrigen)body.patch.mesOrigen=toApiMonth(body.patch.mesOrigen);
        requestInit={...requestInit,body:JSON.stringify(body)};
      }catch{}
    }
    const response=await nativeFetch(requestInput,requestInit);
    if(!['/api/data','/api/save','/api/history'].includes(path))return response;
    const type=response.headers.get('content-type')||'';
    if(!type.includes('application/json'))return response;
    try{
      const data=normalizePayload(await response.clone().json());
      const headers=new Headers(response.headers);
      headers.delete('content-length');headers.delete('content-encoding');
      return new Response(JSON.stringify(data),{status:response.status,statusText:response.statusText,headers});
    }catch{return response;}
  };
})();

(()=>{
  const load=()=>{
    if(document.querySelector('script[data-editor-close-v5]'))return;
    const s=document.createElement('script');s.src='editor-close-v5.js?v=20261027-closure-save-3';s.dataset.editorCloseV5='1';document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();

(()=>{
  const load=()=>{
    if(document.querySelector('script[data-filter-persistence-v6]'))return;
    const s=document.createElement('script');s.src='filter-persistence-v6.js?v=20261027-filters-1';s.dataset.filterPersistenceV6='1';document.body.appendChild(s);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
})();
