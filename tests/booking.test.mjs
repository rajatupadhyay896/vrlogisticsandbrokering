import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_API;
if(!base || new URL(base).hostname!=='127.0.0.1')throw Error('Set TEST_API to a disposable loopback Spring Boot instance');

test('Spring Boot with PostgreSQL handles a booking from enquiry through POD and final settlement',async()=>{
  const env={BROKER_ADMIN_PASSWORD:process.env.BROKER_ADMIN_PASSWORD};
  let cookie='';
  async function call(method,path,body,status=200){
    const req=new Request(base+'/api/freight/'+path,{method,headers:{'Content-Type':'application/json',cookie},
      body:body===undefined?undefined:JSON.stringify(body)});
    const res=await fetch(req);
    const result=res.headers.get('content-type').startsWith('application/json')?await res.json():await res.text();
    assert.equal(res.status,status,method+' '+path+' '+JSON.stringify(result));
    if(res.headers.has('set-cookie'))cookie=res.headers.get('set-cookie').split(';')[0];
    return result;
  }
  await call('GET','admin/dashboard',undefined,401);
  const date='2099-05-10';
  const common={contactName:'Test user',phone:'9999999999',origin:'Mumbai',destination:'Pune',bodyType:'open',feet:32,consent:'yes'};
  const load=(await call('POST','public/loads',{...common,weightMt:8,loadingDate:date,material:'Paper'},201)).reference;
  const owner={...common,capacityMt:9,availableFrom:date};
  const truck=(await call('POST','public/trucks',owner,201)).reference;
  const apl=(await call('POST','public/applications',{...owner,loadId:load},201)).reference;
  assert.equal((await call('GET','public/board')).trucks[0].phone,undefined);
  await call('POST','admin/login',{password:env.BROKER_ADMIN_PASSWORD});
  await call('PATCH','admin/applications/'+apl+'/status',{status:'shortlisted'});
  assert.equal((await call('GET','admin/matches/'+load)).matches[0].id,truck);
  const quote=(await call('POST','admin/quotes',{loadId:load,truckId:truck,customerRate:45000,truckerRate:42000,validUntil:date},201)).quote;
  for(const status of ['sent','accepted'])await call('PATCH','admin/quotes/'+quote.id+'/status',{status});
  const trip=(await call('POST','admin/trips',{quoteId:quote.id},201)).trip;
  assert.equal((await call('POST','admin/trips',{quoteId:quote.id},201)).trip.id,trip.id);
  const driver='public/trips/'+trip.token,broker='admin/trips/'+trip.id;
  const halt=await call('POST',driver+'/requests',{type:'halt',location:'Pune',reason:'Loading delay'},201);
  await call('POST',driver+'/requests',{type:'payment',amount:100},201);
  for(const status of ['approved','resolved'])await call('PATCH','admin/requests/'+halt.reference+'/status',{status});
  for(const status of ['loaded','in_transit','delivered'])await call('PATCH',broker+'/status',{status});
  await call('PATCH',broker+'/status',{status:'pod_submitted'},409);
  const file={name:'sample.pdf',kind:'pod',mime:'application/pdf',base64:Buffer.from('%PDF-sample').toString('base64')};
  const doc=(await call('POST',driver+'/documents',file,201)).document.id;
  await call('POST','admin/documents',{...file,truckId:truck,kind:'vehicle'},201);
  assert.equal((await call('GET',driver)).documents.length,1);
  assert.equal(await call('GET',driver+'/documents/'+doc),'%PDF-sample');
  assert.equal(await call('GET','admin/documents/'+doc),'%PDF-sample');
  for(const status of ['pod_submitted','pod_accepted'])await call('PATCH',broker+'/status',{status});
  await call('PATCH',broker+'/status',{status:'closed'},409);
  for(const [side,amount] of [['customer',45000],['trucker',42000]])await call('POST',broker+'/payments',{side,amount});
  await call('PATCH',broker+'/status',{status:'closed'});
  assert.equal((await call('GET','admin/dashboard')).summary.expectedSpread,3000);
  assert.equal((await call('GET','admin/export')).trips[0].status,'closed');
  await call('POST','admin/logout',{});
  await call('GET','admin/export',undefined,401);
});
