// HONOR B2B - editable backend. Only the SHA-256 verifier is public.
const ADMIN_HASH='1fbebe1a249010f50c9c86a1a20ff5d0ae4164ef165e971c6cc2bdbfcda6bf17';
const months=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const states=['Ganada','Perdida','En curso'], channels=['Empresas','Corpo + Gobierno'], mc=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
const headers={'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'};
function response(x,s=200){return new Response(JSON.stringify(x),{status:s,headers});}
function str(v,n=500){return typeof v==='string'?v.trim().slice(0,n):'';}
function numeric(v,max=100000000,integer=false){let n=Number(v);if(!Number.isFinite(n)||n<0||n>max||(integer&&!Number.isInteger(n)))throw Error('Valor numérico inválido');return n;}
function clean(raw,isNew){
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw Error('Datos inválidos');
 let out={};const ss={cliente:180,ruc:11,ejecutivo:120,modelos:1500,comentario:1000,nota:1300};
 for(let [k,max] of Object.entries(ss))if(Object.hasOwn(raw,k))out[k]=str(raw[k],max);
 if('ruc'in out&&out.ruc&&!/^\d{11}$/.test(out.ruc))throw Error('RUC: 11 dígitos');
 if('estado'in raw){if(!states.includes(raw.estado))throw Error('Estado inválido');out.estado=raw.estado;}
 if('canal'in raw){if(!channels.includes(raw.canal))throw Error('Canal inválido');out.canal=raw.canal;}
 if('mesOrigen'in raw){if(!/^[a-z]{3}-20\d{2}$/.test(raw.mesOrigen)||!mc.includes(raw.mesOrigen.slice(0,3)))throw Error('Mes origen inválido');out.mesOrigen=raw.mesOrigen;}
 if('mesCierre'in raw){if(raw.mesCierre&&!months.includes(raw.mesCierre))throw Error('Mes cierre inválido');out.mesCierre=raw.mesCierre||'';}
 if('anioCierre'in raw){let n=raw.anioCierre;out.anioCierre=n===null||n===''?null:numeric(n,2040,true);if(out.anioCierre!==null&&out.anioCierre<2020)throw Error('Año inválido');}
 for(let k of ['unidades','aporte','unidadesEntregadas','aportePagado'])if(k in raw){out[k]=raw[k]===null||raw[k]===''&&k!=='unidades'&&k!=='aporte'?null:numeric(raw[k],k.toLowerCase().includes('unidades')?1000000:100000000,k.toLowerCase().includes('unidades'));}
 if(isNew)for(let k of ['cliente','ruc','canal','estado','mesOrigen','modelos','unidades','aporte'])if(!(k in out)||out[k]===null||out[k]==='')throw Error('Falta '+k);
 if(!Object.keys(out).length)throw Error('Nada para guardar');
 if(out.estado==='En curso'){out.mesCierre='';out.anioCierre=null;out.cierre='';}
 else if('estado'in out||'mesCierre'in out||'anioCierre'in out)out.cierre=(out.mesCierre||'')+(out.mesCierre&&out.anioCierre?' '+out.anioCierre:'');
 return out;
}
async function permitted(req){const m=(req.headers.get('authorization')||'').match(/^Bearer\s+(.+)$/);if(!m||m[1].length<24||m[1].length>200)return false;const dig=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(m[1])));const actual=[...dig].map(n=>n.toString(16).padStart(2,'0')).join('');let xor=0;for(let i=0;i<64;i++)xor|=actual.charCodeAt(i)^ADMIN_HASH.charCodeAt(i);return xor===0;}
export class AportesDB{
 constructor(state,env){this.state=state;this.env=env;}
 async fetch(req){
  const u=new URL(req.url);
  if(u.pathname==='/data'){const records=await this.state.storage.list({prefix:'item:'});return response({ok:true,entries:[...records.values()]});}
  if(u.pathname==='/test-write'&&req.method==='POST'){
    const key='health:writeprobe',stamp=new Date().toISOString();
    try{
      await this.state.storage.put(key,{stamp});
      const result=await this.state.storage.get(key);
      await this.state.storage.delete(key);
      if(!result||result.stamp!==stamp)throw Error('No se pudo verificar escritura');
      return response({ok:true,storage:'read-write'});
    }catch(e){return response({ok:false,error:'La base no permitió escribir. Reintenta o comunica el error.'},503);}
  }
  if(u.pathname==='/history'){let id=str(u.searchParams.get('id'),130);const records=await this.state.storage.list({prefix:'hist:'+id+':',reverse:true,limit:25});return response({ok:true,entries:[...records.values()]});}
  if(u.pathname==='/save'&&req.method==='PUT'){
   let body;try{body=await req.json();}catch{return response({ok:false,error:'JSON inválido'},400);}
   const id=str(body.id,130),newEntry=body.isNew===true;
   if(!/^[a-zA-Z0-9_-]{8,130}$/.test(id))return response({ok:false,error:'ID inválido'},400);
   let prev=await this.state.storage.get('item:'+id);
   if(prev&&newEntry)return response({ok:false,error:'Registro existente'},409);
   if(!newEntry&&body.rev!==undefined&&body.rev!==((prev&&prev.rev)||0))return response({ok:false,error:'Otro cambio se guardó antes. Actualiza la página.'},409);
   let patch;try{patch=clean(body.patch,newEntry);}catch(e){return response({ok:false,error:e.message},400);}
   const rev=((prev&&prev.rev)||0)+1,now=new Date().toISOString();
   const entry={id,isNew:(prev&&prev.isNew)||newEntry,patch:{...((prev&&prev.patch)||{}),...patch},rev,updatedAt:now};
   await this.state.storage.put('item:'+id,entry);
   await this.state.storage.put('hist:'+id+':'+now+':'+rev,{id,rev,updatedAt:now,patch});
   return response({ok:true,entry});
  }
  return response({ok:false,error:'Ruta no encontrada'},404);
 }
}
export default {
 async fetch(req,env){
  const u=new URL(req.url),p=u.pathname;
  if(p==='/api/health'){
   if(!env.APORTES_DB)return response({ok:true,persistence:false,write:false,version:'honor-live-3'});
   try{
    const obj=env.APORTES_DB.get(env.APORTES_DB.idFromName('honor-b2b-master'));
    const probe=await obj.fetch(new Request(new URL('/test-write',u.origin),{method:'POST'}));
    const j=await probe.json();
    return response({ok:true,persistence:true,write:!!j.ok,version:'honor-live-3'});
   }catch(e){return response({ok:true,persistence:true,write:false,version:'honor-live-3'});}
  }
  if(p.startsWith('/api/')){
   if(!env.APORTES_DB)return response({ok:false,error:'Almacenamiento no disponible'},503);
   if(p==='/api/auth'&&req.method==='POST'){const ok=await permitted(req);return response({ok},ok?200:401);}
   if(p==='/api/save'||p==='/api/test-write'){
    if(req.method!==(p.endsWith('/test-write')?'POST':'PUT'))return response({ok:false,error:'Método inválido'},405);
    if(req.headers.get('origin')&&req.headers.get('origin')!==u.origin)return response({ok:false,error:'Origen inválido'},403);
    if(!await permitted(req))return response({ok:false,error:'Clave inválida'},401);
    if(+(req.headers.get('content-length')||0)>30000)return response({ok:false,error:'Solicitud extensa'},413);
   }else if(!['/api/data','/api/history'].includes(p)||req.method!=='GET')return response({ok:false,error:'Ruta inválida'},404);
   const obj=env.APORTES_DB.get(env.APORTES_DB.idFromName('honor-b2b-master'));
   return obj.fetch(new Request(new URL(p.replace('/api/','/')+u.search,u.origin),req));
  }
  return env.ASSETS.fetch(req);
 }
};