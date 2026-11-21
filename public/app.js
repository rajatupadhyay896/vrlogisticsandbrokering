import {api,esc,toast,copy,message,VEHICLE_PRESETS} from './lib.js';
import {localize,setLanguage,getLanguage,t} from './i18n.js';
import {home,formTruck,formLoad,findTrucks,selectTrucks,boardCards} from './public.js';
import {findLoads,selectLoads,loadCards,applicationForm} from './load-market.js';
import {loginView,brokerView,loadDetail,truckDetail,matchingView,manualQuoteForm,shareQuote,quoteMessage,applicationDetail} from './broker.js';
import {driverEntry,driverView,driverRequestForm,fileForm,tripDetail,paymentForm} from './operations.js';

const pages=new Set(['home','find-trucks','find-loads','list-truck','post-load','broker','driver']);
const app=document.querySelector('#app');
const state={page:'home',board:null,config:null,dash:null,adminTab:'overview',search:'',body:'all',busy:false,modal:null,quoteLang:'en',driverToken:'',driver:null,loadSearch:'',loadBody:'all'};
document.querySelector('#year').textContent=String(new Date().getFullYear());

async function refreshBoard(silent=false){
 try{state.board=await api('public/board');if(state.page==='home'||state.page==='find-trucks'||state.page==='find-loads')render();}
 catch(e){state.board=null;if(!silent)toast(e.message);if(state.page==='home'||state.page==='find-trucks'||state.page==='find-loads')render();}
}
async function getConfig(){
 try{state.config=await api('config');}catch{state.config={configured:false};}
}
function render(){
 document.querySelectorAll('#nav [data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===state.page));
 document.querySelectorAll('.mobile-quick-nav [data-page]').forEach(a=>a.classList.toggle('active',a.dataset.page===state.page));
 if(state.page==='home')app.innerHTML=home(state.board)+(state.board===null?'<div class="container"><p class="safety-note">Live availability is not currently connected. The public board will refresh when the brokerage server is configured.</p></div>':'');
 if(state.page==='find-trucks')app.innerHTML=findTrucks(state.board,state.search,state.body)+(state.board===null?'<div class="container"><p class="setup-warning">Live truck data is currently unavailable. Please try again later.</p></div>':'');
 if(state.page==='find-loads')app.innerHTML=findLoads(state.board,state.loadSearch,state.loadBody)+(state.board===null?'<div class="container"><p class="setup-warning">Live freight requests are unavailable until the server is configured.</p></div>':'');
 if(state.page==='list-truck')app.innerHTML=formTruck();
 if(state.page==='post-load')app.innerHTML=formLoad();
 if(state.page==='broker')app.innerHTML=state.dash?brokerView(state.dash,state.adminTab):loginView(state.config||{});
 if(state.page==='driver')app.innerHTML=state.driverToken?driverView(state.driver,state.driverToken):driverEntry();
 localize(document.querySelector('#app'));
}
async function refreshAdmin(options={}){
 try{
  state.dash=await api('admin/dashboard');
  if(state.page==='broker')render();
  return true;
 }catch(e){
  if(e.message.includes('Sign in')||e.message.includes('401')||e.message.includes('password')){
   state.dash=null;
   if(state.page==='broker')render();
   return false;
  }
  if(!options.silent)toast(e.message);
  state.dash=null;
  if(state.page==='broker')render();
  return false;
 }
}
async function navigate(){
 if(state.modal)closeModal();
 const raw=decodeURIComponent((location.hash||'#home').replace(/^#\/?/,''));
 state.page=raw.startsWith('driver/')?'driver':pages.has(raw)?raw:'home';
 state.driverToken=state.page==='driver'&&raw.startsWith('driver/')?raw.slice(7):'';
 document.querySelector('#nav').classList.remove('open');
 document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');
 if(state.page==='broker'){
  await getConfig();
  if(state.config?.configured)await refreshAdmin({silent:true});
  else {state.dash=null;render();}
 }else if(state.page==='driver'&&state.driverToken){
  await refreshDriver();
 }else render();
 window.scrollTo({top:0,behavior:'auto'});
}
async function refreshDriver(){
 if(!state.driverToken){state.driver=null;render();return;}
 try{state.driver=await api('public/trips/'+encodeURIComponent(state.driverToken));}
 catch(e){state.driver={error:e.message};}
 if(state.page==='driver')render();
}
const tripData=id=>state.dash?.trips?.find(t=>t.id===id);
async function refreshTrip(id){
 await refreshAdmin();
 const trip=tripData(id);
 if(trip)modal('Manage shipment',id,tripDetail(state.dash,trip));
}
function openDocumentForm(opts={}){
 if(opts.driver)modal('Upload trip document','Private file upload: up to 3 MB.',fileForm(null,{driver:true}));
 else modal('Add a private document','Link the file to a trip or vehicle.',fileForm(state.dash,opts));
}
function readFileBase64(file){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onerror=()=>reject(Error('File could not be read.'));
  reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');
  reader.readAsDataURL(file);
 });
}
async function submitDocument(form,driver=false){
 if(state.busy)return;
 const file=form.querySelector('input[type="file"]')?.files?.[0];
 if(!file)return toast('Choose an image or PDF file.');
 if(file.size>3*1024*1024)return toast('Maximum upload is 3 MB. Compress the photo or PDF before uploading.');
 if(!['image/jpeg','image/png','image/webp','application/pdf'].includes(file.type))return toast('Only JPEG, PNG, WebP or PDF files are supported.');
 const data=formValues(form);
 const body={kind:data.kind,name:file.name,mime:file.type,base64:await readFileBase64(file)};
 if(!driver){
  if(!data.record)return toast('Choose a trip or truck.');
  if(data.record.startsWith('trip:'))body.tripId=data.record.slice(5);
  else if(data.record.startsWith('truck:'))body.truckId=data.record.slice(6);
 }
 state.busy=true;setFormBusy(form,true);
 try{
  await api(driver?'public/trips/'+encodeURIComponent(state.driverToken)+'/documents':'admin/documents',{method:'POST',body:JSON.stringify(body)});
  closeModal();
  if(driver)await refreshDriver();else await refreshAdmin();
  toast('Document securely uploaded. Verification is still required.');
 }catch(e){toast(e.message);setFormBusy(form,false);}
 finally{state.busy=false;}
}
async function downloadDocument(id,driver=false){
 const path=driver?'public/trips/'+encodeURIComponent(state.driverToken)+'/documents/'+encodeURIComponent(id):'admin/documents/'+encodeURIComponent(id);
 try{
  const response=await fetch('/api/freight/'+path,{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw Error('Document not available. Check your session.');
  const type=response.headers.get('content-type')||'application/octet-stream';
  const docs=driver?state.driver?.documents:state.dash?.documents;
  const doc=docs?.find(x=>x.id===id);
  const fileName=(doc?.name||'document').replace(/[^\w.() -]/g,'_');
  const url=URL.createObjectURL(await response.blob());
  const link=document.createElement('a');link.href=url;link.download=fileName;
  document.body.appendChild(link);link.click();link.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1500);
 }catch(e){toast(e.message);}
}
async function doTripStatus(id,status){
 if(!confirm('Confirm trip stage: '+status.replaceAll('_',' ')+'?'))return;
 try{
  await api('admin/trips/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status})});
  await refreshTrip(id);toast('Trip status updated.');
 }catch(e){toast(e.message);}
}
async function doRequestReview(id,status){
 if(!confirm('Mark driver request '+status+'? Approving a payment request does not transfer money.'))return;
 try{
  await api('admin/requests/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status})});
  await refreshAdmin();toast('Driver request '+status+'.');
 }catch(e){toast(e.message);}
}
async function submitTripPayment(form){
 const id=form.dataset.trip,side=form.dataset.side;
 const body=formValues(form);
 if(!confirm('Have you independently verified that this payment '+(side==='customer'?'was received':'was sent')+'?'))return;
 try{
  await api('admin/trips/'+encodeURIComponent(id)+'/payments',{method:'POST',body:JSON.stringify({side,amount:body.amount,reference:body.reference})});
  await refreshTrip(id);toast('Verified ledger entry recorded.');
 }catch(e){toast(e.message);}
}
async function submitDriverRequest(form){
 const body=formValues(form);body.type=form.dataset.type;
 try{
  const r=await api('public/trips/'+encodeURIComponent(state.driverToken)+'/requests',{method:'POST',body:JSON.stringify(body)});
  closeModal();await refreshDriver();toast('Request received: '+r.reference);
 }catch(e){toast(e.message);}
}

let dialogOpener=null;
function modal(title,subtitle,body,footer='',narrow=false){
 if(!state.modal)dialogOpener=document.activeElement;
 document.querySelector('.site-wrap').inert=true;
 state.modal=title;
 document.querySelector('#modal-root').innerHTML=
  '<div class="modal-backdrop" data-backdrop="1"><section class="modal '+(narrow?'narrow':'')+'" role="dialog" aria-modal="true" aria-label="'+esc(title)+'">'+
  '<div class="modal-head"><div><h2>'+esc(title)+'</h2><p>'+esc(subtitle||'')+'</p></div><button class="close-modal" data-action="close-modal" aria-label="Close">×</button></div>'+
  '<div class="modal-body">'+body+'</div>'+
  (footer?'<div class="modal-foot">'+footer+'</div>':'')+'</section></div>';
 localize(document.querySelector('#modal-root'));
 document.querySelector('.close-modal').focus({preventScroll:true});
}
function closeModal(){
 state.modal=null;
 document.querySelector('#modal-root').replaceChildren();
 document.querySelector('.site-wrap').inert=false;
 if(dialogOpener?.isConnected)dialogOpener.focus({preventScroll:true});
 dialogOpener=null;
}
function loadData(id){return state.dash?.loads.find(x=>x.id===id)}
function truckData(id){return state.dash?.trucks.find(x=>x.id===id)}
function quoteData(id){return state.dash?.quotes.find(x=>x.id===id)}
function formValues(form){
 const data=Object.fromEntries(new FormData(form).entries());
 for(const k in data)if(typeof data[k]==='string')data[k]=data[k].trim();
 return data;
}
function setFormBusy(form,isBusy){
 if(!form)return;
 const btn=form.querySelector('button[type=submit],.form-actions button');
 if(btn)btn.disabled=isBusy;
}
async function submitPublic(type,form){
 if(state.busy)return;state.busy=true;setFormBusy(form,true);
 try{
  const body=formValues(form);
  const result=await api(type==='truck'?'public/trucks':'public/loads',{method:'POST',body:JSON.stringify(body)});
  const target=document.querySelector(type==='truck'?'#truck-form-area':'#load-form-area');
  const reference=esc(result.reference);
  target.innerHTML=message(type==='truck'?'Truck availability submitted.':'Load requirement submitted.',
   'Your reference: <strong>'+reference+'</strong>. The V.R Logistics desk can now review it. Submission is not a confirmed booking.')+
    '<div class="form-actions"><a class="btn" href="#home" data-page="home">Back to home ↗</a><a class="btn primary" data-new-submission href="#'+(type==='truck'?'list-truck':'post-load')+'" data-page="'+(type==='truck'?'list-truck':'post-load')+'">Submit another ↗</a></div>';
  localize(target);
  toast('Reference '+result.reference+' saved.');
  await refreshBoard(true);
 }catch(e){toast(e.message);setFormBusy(form,false);}
 finally{state.busy=false;}
}
async function submitLoadApplication(form){
 if(state.busy)return;
 const body=formValues(form);
 body.loadId=form.dataset.id;
 const selected=(state.board?.loads||[]).find(l=>l.id===body.loadId);
 if(!selected){toast('This load is unavailable. Refresh the board.');return;}
 if(Number(body.feet)<Number(selected.feet)||Number(body.capacityMt)<Number(selected.weightMt)||
    (selected.bodyType!=='other'&&body.bodyType!==selected.bodyType)){
  toast('Your truck must meet the length, capacity and body type required for this load.');
  return;
 }
 if(body.availableFrom>selected.loadingDate){toast('The truck must be ready by the loading date.');return;}
 state.busy=true;setFormBusy(form,true);
 try{
  const result=await api('public/applications',{method:'POST',body:JSON.stringify(body)});
  modal('Application received',result.reference,
   message('Your truck application was sent.','Reference: <strong>'+esc(result.reference)+'</strong>. V.R Logistics will review your vehicle and contact you before any booking is confirmed.')+
   '<p class="fine" style="margin-top:16px">Please keep this reference number. You can also call the dispatch desk at <a class="call-number" href="tel:+917738103505">+91 7738103505</a>.</p>',
   '<button class="btn primary" data-action="close-modal">Back to available loads</button>',true);
  toast('Application '+result.reference+' received.');
 }catch(e){toast(e.message);setFormBusy(form,false);}
 finally{state.busy=false;}
}
async function login(form){
 if(state.busy)return;state.busy=true;setFormBusy(form,true);
 try{
  await api('admin/login',{method:'POST',body:JSON.stringify(formValues(form))});
  await refreshAdmin();toast('Broker access granted.');
 }catch(e){toast(e.message);setFormBusy(form,false);}
 finally{state.busy=false;}
}
async function updateStatus(collection,id,status){
 if(!state.dash)return;
 try{
  await api('admin/'+collection+'/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status})});
  closeModal();await refreshAdmin();
  toast('Status updated: '+status+'.');
 }catch(e){toast(e.message);}
}
async function matches(loadId){
 try{
  const result=await api('admin/matches/'+encodeURIComponent(loadId));
  modal('Truck matching','Eligible vehicles for '+loadId,matchingView(result));
 }catch(e){toast(e.message);}
}
function quoteForm(loadId=null,truckId=null){
 if(!state.dash)return;
 modal('Prepare freight quotation','Set the customer freight and trucker cost independently.',manualQuoteForm(state.dash,loadId,truckId));
}
function share(id,lang=null){
 const q=quoteData(id),l=loadData(q?.loadId),t=truckData(q?.truckId);
 if(!q||!l||!t){toast('Quotation record is unavailable.');return;}
 if(lang===null)state.quoteLang=getLanguage();
 else state.quoteLang=lang==='hi'?'hi':'en';
 modal('Share customer quotation',q.id+' · V.R Logistics',shareQuote(q,l,t,state.quoteLang));
}
async function submitQuote(form){
 if(!state.dash)return;
 const data=formValues(form);
 const load=loadData(data.loadId),truck=truckData(data.truckId);
 if(!load||!truck){toast('Select valid load and truck.');return;}
 if(Number(data.customerRate)<Number(data.truckerRate)){toast('Customer freight must be at least owner freight.');return;}
 if(Number(truck.capacityMt)<Number(load.weightMt)||Number(truck.feet)<Number(load.feet)||
  (load.bodyType!=='other'&&truck.bodyType!==load.bodyType)){toast('This truck does not meet the requested size, capacity or body type.');return;}
 if(truck.availableFrom>load.loadingDate||(truck.availableUntil&&truck.availableUntil<load.loadingDate)){
  toast('The truck is not listed as available on the loading date.');return;
 }
 if(!confirm('Save this quotation as a draft? No email or WhatsApp message will be sent automatically.'))return;
 setFormBusy(form,true);
 try{
  const res=await api('admin/quotes',{method:'POST',body:JSON.stringify(data)});
  await refreshAdmin();
  share(res.quote.id);
  toast('Quotation '+res.quote.id+' saved as a draft.');
 }catch(e){toast(e.message);setFormBusy(form,false);}
}
async function logout(){
 try{await api('admin/logout',{method:'POST',body:'{}'});}
 catch(e){toast(e.message);}
 state.dash=null;closeModal();render();toast('Signed out.');
}
document.addEventListener('click',async e=>{
 const languageButton=e.target.closest('.language-switch [data-lang]');
 if(languageButton){
  setLanguage(languageButton.dataset.lang);
  localize(document.body);
  return;
 }
 const pageLink=e.target.closest('[data-page]');
 if(pageLink && pageLink.hash===location.hash){
  e.preventDefault();
  if(pageLink.hasAttribute('data-new-submission'))render();
  document.querySelector('#nav').classList.remove('open');
  document.querySelector('#menu-toggle').setAttribute('aria-expanded','false');
  window.scrollTo({top:0,behavior:'auto'});
 }
 const btn=e.target.closest('[data-action]');
 if(!btn){
  if(e.target.matches('[data-backdrop]'))closeModal();
  return;
 }
 const action=btn.dataset.action,id=btn.dataset.id;
 if(action==='close-modal'){closeModal();return;}
 if(action==='admin-tab'){
  state.adminTab=btn.dataset.tab||'overview';render();return;
 }
 if(action==='start-trip'){
  if(!confirm('Create a trip for this accepted quotation and generate a private driver access link?'))return;
  try{
   const result=await api('admin/trips',{method:'POST',body:JSON.stringify({quoteId:id})});
   state.adminTab='trips';await refreshTrip(result.trip.id);toast('Trip created. Share the driver link privately.');
  }catch(e){toast(e.message);}
  return;
 }
 if(action==='trip-detail'){
  const trip=tripData(id);
  if(trip)modal('Manage shipment',id,tripDetail(state.dash,trip));
  return;
 }
 if(action==='trip-stage'){await doTripStatus(id,btn.dataset.status);return;}
 if(action==='trip-payment'){
  const trip=tripData(id);
  if(trip)modal('Record actual freight payment',id,paymentForm(trip,state.dash,btn.dataset.side));
  return;
 }
 if(action==='request-status'){await doRequestReview(id,btn.dataset.status);return;}
 if(action==='copy-driver-link'){
  const trip=tripData(id);
  if(trip){try{await copy(location.origin+location.pathname+'#driver/'+trip.token);}catch(e){toast('Unable to copy driver link.');}}
  return;
 }
 if(action==='upload-broker-doc'){openDocumentForm({tripId:btn.dataset.trip||''});return;}
 if(action==='download-document'){await downloadDocument(id,false);return;}
 if(action==='driver-download'){await downloadDocument(id,true);return;}
 if(action==='driver-file'){openDocumentForm({driver:true});return;}
 if(action==='driver-request'){
  const type=btn.dataset.type;
  modal(type==='halt'?'Report an en-route halt':'Request a freight payment','Submit to the V.R Logistics dispatcher.',driverRequestForm(type));
  return;
 }
 if(action==='logout'){await logout();return;}
 if(action==='export-data'){
  try{
   const backup=await api('admin/export');
   const blob=new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
   const uri=URL.createObjectURL(blob);
   const anchor=document.createElement('a');
   anchor.href=uri;anchor.download='vr-logistics-backup-'+new Date().toISOString().slice(0,10)+'.json';
   document.body.appendChild(anchor);anchor.click();anchor.remove();
   setTimeout(()=>URL.revokeObjectURL(uri),1200);
   toast('Confidential brokerage data exported. Store it securely.');
  }catch(e){toast(e.message);}
  return;
 }
 if(action==='apply-load'){
  const selected=(state.board?.loads||[]).find(l=>l.id===id);
  if(!selected){toast('This load is no longer available. Refresh the board.');return;}
  modal('Apply for available load',id+' · '+selected.origin+' → '+selected.destination,applicationForm(selected),'',false);
  return;
 }
 if(action==='application-detail'){
  const applicant=(state.dash?.applications||[]).find(a=>a.id===id);
  if(applicant)modal('Truck owner application',id,applicationDetail(state.dash,applicant));
  return;
 }
 if(action==='application-status'){
  if(!confirm('Update the application to '+btn.dataset.status+'? This does not confirm a vehicle booking.'))return;
  try{
   await api('admin/applications/'+encodeURIComponent(id)+'/status',{method:'PATCH',body:JSON.stringify({status:btn.dataset.status})});
   closeModal();state.adminTab='applications';await refreshAdmin();toast('Application status updated.');
  }catch(e){toast(e.message);}
  return;
 }
 if(action==='load-detail'){
  const l=loadData(id);if(l)modal('Customer load request',id,loadDetail(l));return;
 }
 if(action==='truck-detail'){
  const t=truckData(id);if(t)modal('Truck owner availability',id,truckDetail(t));return;
 }
 if(action==='matches'){await matches(id);return;}
 if(action==='manual-quote'){quoteForm();return;}
 if(action==='quote-load-truck'){quoteForm(btn.dataset.load,btn.dataset.truck);return;}
 if(action==='quote-submit'){
  e.preventDefault();btn.closest('form')?.requestSubmit();return;
 }
 if(action==='share-quote'){share(id);return;}
 if(action==='quote-language'){share(id,btn.dataset.lang);return;}
 if(action==='copy-quote'){
  const q=quoteData(id),l=loadData(q?.loadId);
  if(q&&l){
    try{await copy(quoteMessage(q,l,state.quoteLang));}
    catch{toast('Clipboard blocked. Use email or WhatsApp draft instead.');}
  }
  return;
 }
 if(action==='quote-status'){await updateStatus('quotes',id,'sent');return;}
 if(action==='quote-accept'){
  if(confirm('Only mark accepted once the customer agrees to the freight quotation and the truck owner confirms availability. Accepting reserves this vehicle and load.'))await updateStatus('quotes',id,'accepted');
  return;
 }
 if(action==='quote-decline'){await updateStatus('quotes',id,'declined');return;}
 if(action==='truck-status'){
  await updateStatus('trucks',id,btn.dataset.status);return;
 }
});
document.addEventListener('submit',async e=>{
 const form=e.target;
 if(!['truck-form','load-form','login-form','quote-form','driver-open-form','driver-request-form','driver-file-form','broker-file-form','trip-payment-form','load-application-form'].includes(form.id))return;
 e.preventDefault();
 if(!form.reportValidity())return;
 if(form.id==='truck-form')await submitPublic('truck',form);
 if(form.id==='load-form')await submitPublic('load',form);
 if(form.id==='load-application-form')await submitLoadApplication(form);
 if(form.id==='login-form')await login(form);
 if(form.id==='quote-form')await submitQuote(form);
 if(form.id==='driver-open-form'){
  let token=String(new FormData(form).get('token')||'').trim();
  if(token.includes('#driver/'))token=token.split('#driver/').pop();
  if(!/^[A-Za-z0-9_-]{25,60}$/.test(token))return toast('Enter a valid private trip access code.');
  location.hash='#driver/'+token;
 }
 if(form.id==='driver-request-form')await submitDriverRequest(form);
 if(form.id==='driver-file-form')await submitDocument(form,true);
 if(form.id==='broker-file-form')await submitDocument(form,false);
 if(form.id==='trip-payment-form')await submitTripPayment(form);
});
function updateTruckResults(){
 const list=selectTrucks(state.board,state.search,state.body);
 const cards=document.querySelector('#truck-cards');
 cards.innerHTML=boardCards(list);
 localize(cards);
 const count=document.querySelector('#truck-count');
 count.textContent=list.length+' truck(s) shown · Contact broker for confirmation';
 localize(count);
}
document.addEventListener('input',e=>{
 if(e.target.id==='load-search'){
  state.loadSearch=e.target.value;
  const results=selectLoads(state.board,state.loadSearch,state.loadBody);
  const node=document.querySelector('#load-results');
  if(node){node.innerHTML=loadCards(results);localize(node);}
  const count=document.querySelector('#load-count');
  if(count){count.textContent=results.length+' available load(s)';localize(count);}
 }
 if(e.target.id==='truck-search'){
  state.search=e.target.value;
  updateTruckResults();
 }
});
document.addEventListener('change',e=>{
 if(e.target.name==='vehicleClass'){
  const form=e.target.closest('form');
  const preset=VEHICLE_PRESETS.find(p=>p.id===e.target.value);
  if(form&&preset?.feet){
    const feet=form.querySelector('[name="feet"]');
    if(feet)feet.value=String(preset.feet);
    // A customer's cargo weight is different from a truck's payload rating; do not auto-fill it.
    if(form.id==='truck-form'||form.id==='load-application-form'){
      const payload=form.querySelector('[name="capacityMt"]');
      if(payload)payload.value=String(preset.capacityMt);
    }
  }
  return;
 }
 if(e.target.id==='load-body-filter'){
  state.loadBody=e.target.value;
  const results=selectLoads(state.board,state.loadSearch,state.loadBody);
  const node=document.querySelector('#load-results');
  if(node){node.innerHTML=loadCards(results);localize(node);}
  const count=document.querySelector('#load-count');
  if(count){count.textContent=results.length+' available load(s)';localize(count);}
 }
 if(e.target.id==='truck-body-filter'){
  state.body=e.target.value;updateTruckResults();
 }
});
document.querySelector('#menu-toggle').addEventListener('click',()=>{
 const nav=document.querySelector('#nav');
 nav.classList.toggle('open');
 document.querySelector('#menu-toggle').setAttribute('aria-expanded',String(nav.classList.contains('open')));
});
document.addEventListener('keydown',e=>{
 if(e.key!=='Escape')return;
 if(state.modal){closeModal();return;}
 const nav=document.querySelector('#nav');
 if(nav.classList.contains('open')){
  nav.classList.remove('open');
  const toggle=document.querySelector('#menu-toggle');
  toggle.setAttribute('aria-expanded','false');
  toggle.focus();
 }
});
window.addEventListener('hashchange',navigate);
(async()=>{
 setLanguage(getLanguage());
 localize(document.body);
 await Promise.all([getConfig(),refreshBoard(true)]);
 await navigate();
})();
