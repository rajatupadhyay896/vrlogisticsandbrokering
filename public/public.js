import {BODIES,SIZES,KNOWN_MT,VEHICLE_PRESETS,esc,rupees,fmt,field,sharedContact,btn,pageHeader,faqSide,message,chip,today,inDays} from './lib.js';
import {loadCards} from './load-market.js';

function art(){
return `<div class="hero-illustration" aria-label="Illustration of a heavy freight truck on a highway" role="img">
  <span class="hero-stamp">ROADS CONNECT BUSINESS</span>
  <svg viewBox="0 0 610 410" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <defs>
      <linearGradient id="night" x1="0" x2="0" y1="0" y2="1"><stop stop-color="#1c3b43"/><stop offset="1" stop-color="#13232c"/></linearGradient>
      <linearGradient id="truckCab" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#d8f899"/><stop offset=".57" stop-color="#bde958"/><stop offset="1" stop-color="#80b446"/></linearGradient>
      <linearGradient id="trailer" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#43555b"/><stop offset="1" stop-color="#1d313b"/></linearGradient>
      <linearGradient id="road" x1="0" x2="1"><stop stop-color="#243b43"/><stop offset="1" stop-color="#0d1c27"/></linearGradient>
    </defs>
    <circle cx="448" cy="133" r="117" fill="#244942" opacity=".48"/>
    <circle cx="448" cy="133" r="83" fill="#1f4640" opacity=".42"/>
    <path d="M0 272 120 236 190 254 267 227 352 249 425 209 500 252 610 222V342H0Z" fill="#19323b" opacity=".68"/>
    <g stroke="#4c7275" opacity=".28" fill="none"><path d="M30 290V241H81V290M92 292V209H129V290M144 292V228H164V290M453 280V198H484V281M501 282V211H535V284M551 282V222H572V285"/></g>
    <path d="M4 341 608 341 610 380H0Z" fill="url(#road)"/>
    <path d="M0 380H610M13 364H112M168 364H282M350 364H464M533 364H600" stroke="#a9c170" stroke-width="3" stroke-dasharray="50 32" opacity=".64"/>
    <ellipse cx="306" cy="341" rx="251" ry="15" fill="#000" opacity=".4"/>
    <g>
      <path d="M72 135H391V311H72Z" fill="url(#trailer)" stroke="#698080" stroke-width="4"/>
      <path d="M80 145H376V288H80Z" fill="#304851"/>
      <path d="M84 150V285M110 150V285M137 150V285M164 150V285M191 150V285M218 150V285M245 150V285M272 150V285M299 150V285M326 150V285M353 150V285" stroke="#536d70" stroke-width="2" opacity=".62"/>
      <rect x="94" y="169" width="156" height="44" rx="3" fill="#172832"/>
      <text x="106" y="197" fill="#d9f396" font-family="Arial,sans-serif" font-weight="900" letter-spacing="3.8" font-size="27">V.R</text>
      <text x="184" y="194" fill="#d7e3e4" font-family="Arial,sans-serif" font-weight="bold" letter-spacing="1" font-size="11">LOGISTICS</text>
      <text x="106" y="227" fill="#aabcbf" font-family="Arial,sans-serif" letter-spacing="2.1" font-size="7.5">FREIGHT. CONNECTED.</text>
      <path d="M71 297H390V315H72Z" fill="#607173"/>
      <path d="M389 228H449L477 260V313H389Z" fill="url(#truckCab)" stroke="#f0fca3" stroke-width="3"/>
      <path d="M391 231H439L463 261H392Z" fill="#1d444a"/>
      <path d="M399 239H438L451 255H399Z" fill="#3b7378"/>
      <path d="M460 268H489L516 293V318H470L467 305H389V272H450Z" fill="url(#truckCab)" stroke="#e7f38d" stroke-width="2"/>
      <path d="M490 279 504 296H477V279Z" fill="#2c5053"/>
      <rect x="468" y="297" width="35" height="13" rx="3" fill="#263d40"/>
      <path d="M501 317H519V326H475" fill="none" stroke="#4e6c68" stroke-width="6"/>
      <rect x="506" y="305" width="15" height="12" rx="2" fill="#d8f8ba"/>
      <rect x="386" y="311" width="140" height="17" rx="2" fill="#25383e"/>
      <rect x="72" y="308" width="316" height="20" rx="2" fill="#344951"/>
      <path d="M101 328H460" stroke="#8faaa7" stroke-width="3"/>
      <circle cx="142" cy="329" r="28" fill="#101b22" stroke="#6d8886" stroke-width="5"/><circle cx="142" cy="329" r="13" fill="#718f90"/><circle cx="142" cy="329" r="5" fill="#d6e4d5"/>
      <circle cx="207" cy="329" r="28" fill="#101b22" stroke="#6d8886" stroke-width="5"/><circle cx="207" cy="329" r="13" fill="#718f90"/><circle cx="207" cy="329" r="5" fill="#d6e4d5"/>
      <circle cx="434" cy="329" r="28" fill="#101b22" stroke="#6d8886" stroke-width="5"/><circle cx="434" cy="329" r="13" fill="#718f90"/><circle cx="434" cy="329" r="5" fill="#d6e4d5"/>
      <path d="M100 307V289M106 307V289M447 287H458" stroke="#a8c2be" stroke-width="2"/>
    </g>
  </svg><span class="hero-note">CAPACITY CONNECTED <strong>24/7 REQUESTS</strong></span></div>`;
}
export function home(board=null){
  const avail=board?.trucks?.length||0, open=board?.loads?.length||0;
  return `<div class="page">
    <section class="hero"><div class="hero-inner"><div>
      <div class="eyebrow">THE SMARTER FREIGHT CONNECTION</div>
      <h1>RIGHT TRUCK.<br>RIGHT LOAD.<br><em>RIGHT ON TIME.</em></h1>
      <p>Find a load for your truck or request a vehicle for your shipment. Our freight desk arranges the match and quotation.</p>
      <div class="hero-actions"><a class="btn primary" href="#find-loads" data-page="find-loads">Find a load <span>↗</span></a><a class="btn light" href="#post-load" data-page="post-load">Request a truck <span>→</span></a><a class="btn light" href="#list-truck" data-page="list-truck">List your vehicle <span>→</span></a></div>
      <p class="fine" style="margin-top:22px;color:#839aa3">20 ft · 32 ft SXL / MXL · 6–35+ MT · Open and closed-body trucks</p>
    </div>${art()}</div></section>
    <div class="ticker"><div class="ticker-inner"><span>TRUCK AVAILABILITY</span><span>REAL LOAD REQUESTS</span><span>BROKER-MANAGED QUOTES</span><span>POD TO SETTLEMENT</span></div></div>
    <section class="section"><div class="container">
      <div class="section-head"><div><div class="eyebrow">HOW THE NETWORK WORKS</div><h2>ONE NETWORK. <span>TWO SIDES.</span></h2></div><p>Transporters submit demand. Truck owners share capacity. Our brokerage team manages the match, confirmation and communication.</p></div>
      <div class="feature-grid">
        <article class="feature-card" data-number="01"><div class="feature-icon">▤</div><h3>Post the requirement</h3><p>Origin, destination, material, loading date, truck length, body type and metric-ton capacity.</p><a class="btn text" data-page="post-load" href="#post-load">For transporters →</a></article>
        <article class="feature-card" data-number="02"><div class="feature-icon">▰</div><h3>Declare availability</h3><p>Truck owners list available feet, payload capacity, preferred location and ready dates.</p><a class="btn text" data-page="list-truck" href="#list-truck">For truck owners →</a></article>
        <article class="feature-card" data-number="03"><div class="feature-icon">↗</div><h3>Get a quotation</h3><p>V.R Logistics reviews suitable trucks and shares freight quotations by email, phone or WhatsApp.</p><a class="btn text" data-page="find-trucks" href="#find-trucks">See availability →</a></article>
      </div></div></section>
    <section class="band"><div class="container band-inner"><div><div class="eyebrow">KEEP YOUR FREIGHT MOVING</div><h2>HAVE MATERIAL TO DISPATCH?</h2><p>Give us the route and vehicle specifications. We’ll review matching availability and contact you with a quote.</p></div><a href="#post-load" data-page="post-load" class="btn primary">Post a load requirement ↗</a></div></section>
    <section class="section"><div class="container"><div class="section-head"><div><div class="eyebrow">PUBLIC AVAILABILITY</div><h2>TRUCKS <span>READY TO MOVE.</span></h2></div><a href="#find-trucks" data-page="find-trucks" class="btn light">Explore truck board ↗</a></div>
    ${boardCards((board?.trucks||[]).slice(0,3),3)}<p class="fine" style="margin-top:20px">Availability is owner-submitted and remains subject to individual verification by V.R Logistics. ${avail} visible truck listing(s); ${open} open customer requirement(s).</p></div></section>
    <section class="section load-home-section"><div class="container"><div class="section-head"><div><div class="eyebrow">FOR TRUCK OWNERS</div><h2>AVAILABLE <span>LOADS TO CARRY.</span></h2></div><a href="#find-loads" data-page="find-loads" class="btn primary">Find more loads ↗</a></div>
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
    <div class="field full checkbox-field"><input id="truck-consent" type="checkbox" name="consent" value="yes" required><label for="truck-consent">I confirm I am authorised to share this vehicle's availability and consent to V.R Logistics contacting me about freight opportunities. My direct contact details will not appear on the public truck board.</label></div>
  </div><div class="form-actions"><button class="btn primary" type="submit">Publish vehicle availability ↗</button><span class="fine">You’ll receive a submission reference on screen.</span></div></form>`;
  return pageHeader('FOR TRUCK OWNERS','LIST YOUR <span>VEHICLE.</span>','Tell us which truck is ready, where it is, and how much cargo it can carry. No account required to submit an availability request.')+
    `<div class="container portal"><div class="main-grid"><div class="surface"><div class="surface-head"><div><h2>Available truck details</h2><p>Truck owner registration · V.R Logistics network</p></div><span class="status-pill">Open for listings</span></div><div class="surface-body" id="truck-form-area">${content}</div></div>
    ${faqSide('HOW IT WORKS','Your vehicle stays under your control. We contact you before confirming any freight.',[
      ['List your capacity','Specify length in feet, metric tons, body type and current location.'],
      ['Get considered for loads','Our desk compares your availability with customer requirements.'],
      ['Agree on your rate','You decide whether to accept a proposed route and truck freight.'],
      ['No public phone numbers','Only the brokerage team receives your contact information.']
    ])}</div></div>`;
}
export function formLoad(){
 const content=`<form id="load-form" autocomplete="on"><div class="form-grid">
  ${sharedContact()}<div class="form-divide"></div>
  ${field('Loading origin','origin',{required:true,placeholder:'e.g. Taloja, Navi Mumbai'})}
  ${field('Unloading destination','destination',{required:true,placeholder:'e.g. Vadodara, Gujarat'})}
  ${field('Material / goods','material',{required:true,placeholder:'e.g. Steel coils, packaged FMCG'})}
  ${field('Preferred vehicle category','vehicleClass',{options:VEHICLE_PRESETS.map(x=>[x.id,x.label]),required:true,full:true,hint:'Choose an indicative category. Length will be suggested; enter your actual cargo weight separately.'})}
  ${field('Total cargo weight (MT)','weightMt',{required:true,type:'number',min:.1,max:70,step:.1,placeholder:'e.g. 9'})}
  ${field('Required truck length (feet)','feet',{required:true,type:'number',min:5,max:65,step:.1,placeholder:'e.g. 32'})}
  ${field('Vehicle body type','bodyType',{required:true,options:BODIES})}
  ${field('Loading date','loadingDate',{required:true,type:'date',value:today()})}
  ${field('Special loading instructions','specialInstructions',{textarea:true,full:true,placeholder:'e.g. forklift required, side loading, open 32 ft MXL preferred'})}
  <div class="field full" style="display:none" aria-hidden="true"><label>Website<input name="website" autocomplete="off" tabindex="-1"></label></div>
  <div class="field full checkbox-field"><input type="checkbox" id="load-consent" name="consent" value="yes" required><label for="load-consent">I am authorised to submit this cargo requirement and consent to being contacted by the V.R Logistics brokerage team. I understand that submitted requests are not confirmed bookings.</label></div>
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
 return '<div class="listing-grid">'+list.map(t=>`<article class="listing"><div class="listing-top"><span class="listing-id">${esc(t.id)}</span>${chip(t.status)}</div>
  <h3>${esc(t.feet)} FT · ${esc(t.capacityMt)} MT</h3>
  <p class="listing-note">${esc(VEHICLE_PRESETS.find(p=>p.id===t.vehicleClass)?.label||'Vehicle capacity to be confirmed')}</p>
  <p class="route">${esc(t.origin)}<span>→</span>${esc(t.destination||'Flexible destination')}</p>
  <div class="listing-info"><b>${esc(t.bodyType==='closed'?'Closed / container':t.bodyType==='open'?'Open body':t.bodyType==='flatbed'?'Flatbed':'Special body')}</b><b>${esc(t.feet)} ft truck</b><b>${esc(t.capacityMt)} metric tons</b></div>
  <div class="listing-footer"><span>From ${fmt(t.availableFrom)}</span><a href="#post-load" data-page="post-load">Request a quote ↗</a></div></article>`).join('')+'</div>';
}
export function selectTrucks(board,query='',body='all'){
 return (board?.trucks||[]).filter(t=>(body==='all'||t.bodyType===body)&&[t.id,t.origin,t.destination,t.feet,t.capacityMt,t.bodyType,t.vehicleClass].join(' ').toLowerCase().includes(query.toLowerCase()));
}
export function findTrucks(board,query='',body='all'){
 const list=selectTrucks(board,query,body);
 return pageHeader('LIVE NETWORK AVAILABILITY','FIND AN <span>AVAILABLE TRUCK.</span>','Browse truck owners’ publicly listed availability. Contact information and vehicle registration are private to the V.R Logistics brokerage team.')+
  '<div class="container portal"><div class="surface" style="margin-bottom:22px"><div class="filter-bar"><input id="truck-search" type="search" placeholder="Search origin, destination, length, MT…" value="'+esc(query)+'" aria-label="Search vehicle availability"><select id="truck-body-filter" aria-label="Filter by truck body"><option value="all">All vehicle types</option>'+BODIES.map(([value,label])=>'<option value="'+esc(value)+'" '+(body===value?'selected':'')+'>'+esc(label)+'</option>').join('')+'</select><span class="filter-note" id="truck-count" aria-live="polite">'+list.length+' truck(s) shown · Contact broker for confirmation</span></div></div><div id="truck-cards">'+boardCards(list)+'</div><p class="fine" style="margin-top:20px">Public availability is self-reported and may change. A listing is not a guarantee of dispatch, vehicle fitness, permit compliance or a fixed freight rate.</p></div>';
}
