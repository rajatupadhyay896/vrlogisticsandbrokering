// Netlify handles HTTP and storage. Freight rules execute in CPython.
import {getStore} from '@netlify/blobs';
import {run} from '../../adapters/runtime.mjs';

const common={'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'};
const error=(message,status)=>Response.json({error:message},{status,headers:common});
export async function serve(req,openStore,env){
  const url=new URL(req.url);
  const path=url.pathname.replace(/^\/(?:api\/freight|\.netlify\/functions\/freight)\/?/,'');
  const limit=path.endsWith('/documents')?4300000:18000;
  if(Number(req.headers.get('content-length'))>limit)return error('Request too large.',413);
  const raw=await req.text();
  if(Buffer.byteLength(raw)>limit)return error('Request too large.',413);
  const input={path,method:req.method,host:url.host,secure:url.protocol==='https:',raw,
    headers:Object.fromEntries(req.headers),password:env.BROKER_ADMIN_PASSWORD||'',secret:env.BROKER_SESSION_SECRET||''};
  const key='bookings-database-v1';
  const needsStore=!['config','health','admin/login','admin/logout'].includes(path);
  const store=needsStore?openStore():null;
  for(let attempt=0;attempt<8;attempt++){
    const previous=store?await store.getWithMetadata(key,{type:'json'}):null;
    const result=await run(input,previous?.data);
    if(result.download){
      const doc=result.download;
      const bytes=await store.get('documents/'+doc.id,{type:'arrayBuffer'});
      if(!bytes)return error('Document content unavailable.',404);
      return new Response(bytes,{headers:{...common,'Content-Type':doc.mime,'Content-Disposition':"attachment; filename*=UTF-8''"+encodeURIComponent(doc.name),
        'Content-Security-Policy':"default-src 'none'; sandbox",'X-Robots-Tag':'noindex, nofollow'}});
    }
    if(result.db){
      const attachment=result.upload&&'documents/'+result.upload;
      if(attachment){
        const bytes=Buffer.from(JSON.parse(raw).base64,'base64');
        await store.set(attachment,bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
      }
      const saved=await store.setJSON(key,result.db,previous?{onlyIfMatch:previous.etag}:{onlyIfNew:true});
      if(!saved.modified){
        if(attachment)await store.delete(attachment);
        continue;
      }
    }
    return Response.json(result.body,{status:result.status,headers:{...common,...(result.cookie?{'Set-Cookie':result.cookie}:{})}});
  }
  return error('Concurrent submissions; please retry.',409);
}
export default async function freight(req){
  try{return await serve(req,()=>getStore({name:'vr-logistics-v1',consistency:'strong'}),process.env);}
  catch{ return error('Temporary server error. Please retry.',500); }
}
