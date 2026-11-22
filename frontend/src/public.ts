import {BODIES,SIZES,KNOWN_MT,VEHICLE_PRESETS,esc,rupees,fmt,field,sharedContact,btn,pageHeader,faqSide,message,chip,today,inDays} from './lib.js';
import {loadCards} from './load-market.js';

export function home(board=null){
  const avail=board?.trucks?.length||0, open=board?.loads?.length||0;
  return `<div class="page">
    <section class="section"><div class="container"><div class="section-head"><div><h2>Available trucks</h2></div><a href="#find-trucks" data-page="find-trucks" class="btn light">Explore truck board ↗</a></div>
    ${boardCards((board?.trucks||[]).slice(0,3),3)}<p class="fine" style="margin-top:20px">Availability is owner-submitted and remains subject to individual verification by Setu Logistics. ${avail} visible truck listing(s); ${open} open customer requirement(s).</p></div></section>
    <section class="section load-home-section"><div class="container"><div class="section-head"><div><h2>Available loads</h2></div><a href="#find-loads" data-page="find-loads" class="btn primary">Find more loads ↗</a></div>
    ${loadCards((board?.loads||[]).slice(0,3),3)}
    <p class="fine" style="margin-top:18px">Apply using your truck details. Customer contacts remain private and booking is confirmed by the brokerage team.</p></div></section>
    </div>`;
}
export function formTruck(){
  const content=`<form id="truck-form" autocomplete="on"><div class="form-grid">
    ${sharedContact()}${field('Listing type','supplierType',{options:[['owner','Direct truck owner / fleet'],['subbroker','Transport broker / supplier']]})}<div class="form-divide"></div>
    ${field('Truck current location / origin','origin',{required:true,placeholder:'e.g. Bhiwandi, Maharashtra'})}
    ${field('Expected destination / preferred lane','destination',{placeholder:'Optional: e.g. Pune or Any destination'})}
    ${field('Vehicle category / model','vehicleClass',{options:VEHICLE_PRESETS.map(x=>[x.id,x.label]),required:true,full:true,hint:'Selecting a category suggests length and payload. Verify actual permitted capacity from RC and amend values below.'})}
    ${field('Truck body / vehicle type','bodyType',{options:BODIES,required:true})}
    ${field('Vehicle length (feet)','feet',{type:'number',required:true,min:5,max:65,step:.1,placeholder:'e.g. 32'})}
    ${field('Carrying capacity (MT)','capacityMt',{type:'number',required:true,min:.3,max:70,step:.05,placeholder:'e.g. 9'})}
    ${field('Vehicle registration number','vehicleNo',{placeholder:'Optional: MH 04 XX 0000',hint:'Visible to the brokerage team only'})}
    ${field('Available from','availableFrom',{type:'date',value:today(),required:true})}
    ${field('Available until','availableUntil',{type:'date',value:inDays(7),hint:'Keep blank if no specific end date'})}
    ${field('Notes / loading restrictions','notes',{textarea:true,full:true,placeholder:'e.g. 32 ft MXL; open truck, willing to go to Gujarat'})}
    <div class="field full" style="display:none" aria-hidden="true"><label>Website<input name="website" autocomplete="off" tabindex="-1"></label></div>
    <div class="field full checkbox-field"><input id="truck-consent" type="checkbox" name="consent" value="yes" required><label for="truck-consent">I confirm I am authorised to share this vehicle's availability and consent to Setu Logistics contacting me about freight opportunities. My direct contact details will not appear on the public truck board.</label></div>
  </div><div class="form-actions"><button class="btn primary" type="submit">Publish vehicle availability ↗</button><span class="fine">You’ll receive a submission reference on screen.</span></div></form>`;
  return pageHeader('FOR TRUCK OWNERS','LIST YOUR <span>VEHICLE.</span>','Tell us which truck is ready, where it is, and how much cargo it can carry. No account required to submit an availability request.')+
    `<div class="container portal"><div class="main-grid"><div class="surface"><div class="surface-head"><div><h2>Available truck details</h2><p>Truck owner registration · Setu Logistics network</p></div><span class="status-pill">Open for listings</span></div><div class="surface-body" id="truck-form-area">${content}</div></div>
    ${faqSide('HOW IT WORKS','Your vehicle stays under your control. We contact you before confirming any freight.',[
      ['List your capacity','Specify length in feet, metric tons, body type and current location.'],
      ['Get considered for loads','Our desk compares your availability with customer requirements.'],
      ['Agree on your rate','You decide whether to accept a proposed route and truck freight.'],
      ['No public phone numbers','Only the brokerage team receives your contact information.']
    ])}</div></div>`;
}
export function formLoad(truck?:{id:string;origin:string;destination:string;feet:number;bodyType:string;vehicleClass:string}){
 const content=`<form id="load-form" autocomplete="on"><div class="form-grid">
  ${sharedContact()}<div class="form-divide"></div>
  ${field('Loading origin','origin',{value:truck?.origin,required:true,placeholder:'e.g. Taloja, Navi Mumbai'})}
  ${field('Unloading destination','destination',{value:truck?.destination,required:true,placeholder:'e.g. Vadodara, Gujarat'})}
  ${field('Material / goods','material',{required:true,placeholder:'e.g. Steel coils, packaged FMCG'})}
  ${field('Preferred vehicle category','vehicleClass',{value:truck?.vehicleClass,options:VEHICLE_PRESETS.map(x=>[x.id,x.label]),required:true,full:true,hint:'Choose an indicative category. Length will be suggested; enter your actual cargo weight separately.'})}
  ${field('Total cargo weight (MT)','weightMt',{required:true,type:'number',min:.1,max:70,step:.1,placeholder:'e.g. 9'})}
  ${field('Required truck length (feet)','feet',{value:truck?.feet,required:true,type:'number',min:5,max:65,step:.1,placeholder:'e.g. 32'})}
  ${field('Vehicle body type','bodyType',{value:truck?.bodyType,required:true,options:BODIES})}
  ${field('Loading date','loadingDate',{required:true,type:'date',value:today()})}
  ${field('Special loading instructions','specialInstructions',{value:truck?'Truck listing '+truck.id:'',textarea:true,full:true,placeholder:'e.g. forklift required, side loading, open 32 ft MXL preferred'})}
  <div class="field full" style="display:none" aria-hidden="true"><label>Website<input name="website" autocomplete="off" tabindex="-1"></label></div>
  <div class="field full checkbox-field"><input type="checkbox" id="load-consent" name="consent" value="yes" required><label for="load-consent">I am authorised to submit this cargo requirement and consent to being contacted by the Setu Logistics brokerage team. I understand that submitted requests are not confirmed bookings.</label></div>
  </div><div class="form-actions"><button class="btn primary" type="submit">Request freight quotation ↗</button><span class="fine">No payment is taken online.</span></div></form>`;
 return pageHeader('FOR TRANSPORTERS','POST YOUR <span>LOAD.</span>','Tell us the cargo, route, preferred vehicle and loading schedule. The brokerage desk will review matching trucks and send you a quotation.')+
  `<div class="container portal"><div class="main-grid"><div class="surface"><div class="surface-head"><div><h2>Transporter load request</h2><p>Submit a vehicle placement requirement</p></div><span class="status-pill">Accepting requests</span></div><div class="surface-body" id="load-form-area">${content}</div></div>
  ${faqSide('WHAT HAPPENS NEXT?','Our brokerage team reviews the operational details before providing a price.',[
     ['Request submitted','Receive your unique reference number.'],
     ['Truck matching','We check direct owner availability and, if needed, sub-brokers.'],
     ['Written freight quote','We send you an agreed rate and its conditions via your provided contact.'],
     ['Trip coordination','After acceptance, vehicle assignment and loading are confirmed separately.']
   ])}</div></div>`;
}
export function boardCards(trucks,limit=0){
 const list=limit?trucks.slice(0,limit):trucks;
 if(!list.length)return '<div class="surface"><div class="empty"><div class="empty-icon">▰</div><strong>No public vehicles yet.</strong><p>Availability will appear here once truck owners submit their vehicles. You can still post a load for manual review.</p><a class="btn primary" data-page="list-truck" href="#list-truck" style="margin-top:18px">List a vehicle ↗</a></div></div>';
 return '<div class="listing-grid">'+list.map(t=>`<article class="listing"><div class="listing-top"><span class="listing-id">${esc(t.id)}</span>${chip(t.status)}
  ${t.documentReviewedAt?'<span class="status-pill">Vehicle document reviewed</span>':''}</div><h3>${esc(t.feet)} FT · ${esc(t.capacityMt)} MT</h3>
  <p class="listing-note">${esc(VEHICLE_PRESETS.find(p=>p.id===t.vehicleClass)?.label||'Vehicle capacity to be confirmed')}</p>
  <p class="route">${esc(t.origin)}<span>→</span>${esc(t.destination||'Flexible destination')}</p>
  <div class="listing-info"><b>${esc(t.bodyType==='closed'?'Closed / container':t.bodyType==='open'?'Open body':t.bodyType==='flatbed'?'Flatbed':'Special body')}</b><b>${esc(t.feet)} ft truck</b><b>${esc(t.capacityMt)} metric tons</b></div>
  <div class="listing-footer"><span>From ${fmt(t.availableFrom)}</span><a href="#post-load/${esc(t.id)}" data-page="post-load">Request a quote ↗</a></div></article>`).join('')+'</div>';
}
export function selectTrucks(board,query='',body='all'){
 return (board?.trucks||[]).filter(t=>(body==='all'||t.bodyType===body)&&[t.id,t.origin,t.destination,t.feet,t.capacityMt,t.bodyType,t.vehicleClass].join(' ').toLowerCase().includes(query.toLowerCase()));
}
export function findTrucks(board,query='',body='all'){
 const list=selectTrucks(board,query,body);
 return pageHeader('LIVE NETWORK AVAILABILITY','FIND AN <span>AVAILABLE TRUCK.</span>','Browse truck owners’ publicly listed availability. Contact information and vehicle registration are private to the Setu Logistics brokerage team.')+
  '<div class="container portal"><div class="surface" style="margin-bottom:22px"><div class="filter-bar"><input id="truck-search" type="search" placeholder="Search origin, destination, length, MT…" value="'+esc(query)+'" aria-label="Search vehicle availability"><select id="truck-body-filter" aria-label="Filter by truck body"><option value="all">All vehicle types</option>'+BODIES.map(([value,label])=>'<option value="'+esc(value)+'" '+(body===value?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select><span class="filter-note" id="truck-count" aria-live="polite">'+list.length+' truck(s) shown · Contact broker for confirmation</span></div></div><div id="truck-cards">'+boardCards(list)+'</div><p class="fine" style="margin-top:20px">Public availability is self-reported and may change. A listing is not a guarantee of dispatch, vehicle fitness, permit compliance or a fixed freight rate.</p></div>';
}
