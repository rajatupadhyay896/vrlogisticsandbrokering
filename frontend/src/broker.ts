import {tripsPanel,driverRequestsPanel,documentPanel} from './operations.js';
import {esc,rupees,fmt,field,btn,pageHeader,chip,percent,inDays,BODIES,mailto,whatsapp,digitsPhone} from './lib.js';

export function loginView(config:{configured?:boolean}={}){
 const unavailable = config.configured===false;
 return pageHeader('BROKERAGE ADMINISTRATION','THE <span>BROKER DESK.</span>','One private operations desk for truck availability, customer load requests, matching and freight quotations.')+
 `<div class="container portal"><div class="surface broker-login"><div class="surface-body">
   <div class="eyebrow">AUTHORISE ACCESS</div><h2>CONTROL THE NETWORK.</h2>
   <p>Contact details, supply availability and quotation margins remain visible only after broker login.</p>
   ${unavailable?`<div class="setup-warning"><strong>Server setup required.</strong><p>The brokerage backend needs its server-side environment variables before live records can be accepted. Set <code>BROKER_ADMIN_PASSWORD</code> (12+ characters) with your hosting provider. Never place these secrets in your frontend or GitHub files.</p></div>`:`<form id="login-form"><div class="field"><label for="broker-password">Broker access password</label><input id="broker-password" name="password" type="password" autocomplete="current-password" required placeholder="Enter private broker password"></div><button class="btn primary" type="submit">Unlock broker desk ↗</button></form>`}
   <div class="divider"></div><p class="security-copy">Setu Logistics does not publish trucker or customer phone numbers on the public site. Every actual quote is reviewed by a broker before sharing.</p>
 </div></div></div>`;
}
function toolbar(tabs,active){
 return '<div class="admin-tabs">'+tabs.map(([id,label])=>'<button data-action="admin-tab" data-tab="'+id+'" class="'+(id===active?'active':'')+'">'+label+'</button>').join('')+'</div>';
}
function table(headers,rows,empty='No records in this category yet.'){
 return '<div class="table-scroller"><table><thead><tr>'+headers.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+
  (rows.length?rows.join(''):'<tr><td colspan="'+headers.length+'"><div class="empty"><strong>'+esc(empty)+'</strong></div></td></tr>')+'</tbody></table></div>';
}
const refButton=(label,action,id,extra='')=>'<button class="table-btn '+extra+'" data-action="'+action+'" data-id="'+esc(id)+'">'+label+'</button>';
function loadTable(dash){
 const rows=dash.loads.map(l=>'<tr><td><strong>'+esc(l.id)+'</strong><small>'+fmt(l.loadingDate)+'</small></td>'+
  '<td><strong>'+esc(l.origin)+' → '+esc(l.destination)+'</strong><small>'+esc(l.material)+'</small></td>'+
  '<td>'+esc(l.feet)+' ft / '+esc(l.weightMt)+' MT<small>'+esc(l.bodyType)+'</small></td>'+
  '<td><strong>'+esc(l.company||l.contactName)+'</strong><small>'+esc(l.contactName)+'</small></td>'+
  '<td>'+chip(l.status)+'</td>'+
  '<td><div class="admin-actions">'+refButton('Match trucks ↗','matches',l.id)+refButton('View request','load-detail',l.id,'ghost')+'</div></td></tr>');
 return '<section class="surface"><div class="surface-head"><div><h3>Transporter load requests</h3><p>Every submitted customer requirement, with contact details protected inside your desk.</p></div><span class="status-pill muted">'+dash.loads.length+' total</span></div>'+
  table(['Reference','Load route','Vehicle requirement','Customer','Status','Action'],rows,'No customer load requests yet.')+'</section>';
}
function truckTable(dash){
 const rows=dash.trucks.map(t=>'<tr><td><strong>'+esc(t.id)+'</strong><small>From '+fmt(t.availableFrom)+'</small></td>'+
  '<td><strong>'+esc(t.origin)+'</strong><small>Route: '+esc(t.destination||'Flexible')+'</small></td>'+
  '<td>'+esc(t.feet)+' ft / '+esc(t.capacityMt)+' MT<small>'+esc(t.bodyType)+'</small></td>'+
  '<td><strong>'+esc(t.company||t.contactName)+'</strong><small>'+esc(t.contactName)+' · '+(t.supplierType==='subbroker'?'Sub-broker':'Direct owner')+'</small></td>'+
  '<td>'+chip(t.status)+'</td>'+
  '<td><div class="admin-actions">'+refButton('Details','truck-detail',t.id,'ghost')+
  (t.status==='available'?'<button class="table-btn" data-action="truck-status" data-id="'+esc(t.id)+'" data-status="unavailable">Set unavailable</button>':'<button class="table-btn" data-action="truck-status" data-id="'+esc(t.id)+'" data-status="available">Set available</button>')+
  '</div></td></tr>');
 return '<section class="surface"><div class="surface-head"><div><h3>Truck owner capacity</h3><p>Vehicle lengths, metric tons, origin, availability dates and private contact details.</p></div><span class="status-pill muted">'+dash.trucks.length+' total</span></div>'+
  table(['Vehicle ref','Current location','Truck / payload','Owner / supplier','Status','Action'],rows,'No truck availability submitted yet.')+'</section>';
}
function quoteRows(dash){
 return dash.quotes.map(q=>{
 const l=dash.loads.find(x=>x.id===q.loadId),t=dash.trucks.find(x=>x.id===q.truckId);
 return '<tr><td><strong>'+esc(q.id)+'</strong><small>'+fmt(q.createdAt)+'</small></td>'+
  '<td><strong>'+esc(l?.company||l?.contactName||q.loadId)+'</strong><small>'+esc(l?.origin||'—')+' → '+esc(l?.destination||'—')+'</small></td>'+
  '<td><strong>'+esc(t?.company||t?.contactName||q.truckId)+'</strong><small>'+esc(t?.feet||'—')+' ft / '+esc(t?.capacityMt||'—')+' MT</small></td>'+
  '<td>'+rupees(q.customerRate)+'</td><td>'+rupees(q.truckerRate)+'</td>'+
  '<td><span class="money">'+rupees(q.customerRate-q.truckerRate)+'</span><small>'+percent(q.customerRate-q.truckerRate,q.customerRate)+'</small></td>'+
  '<td>'+chip(q.status)+'</td>'+
  '<td><div class="admin-actions">'+refButton('Share quote ↗','share-quote',q.id)+
  (q.status==='draft'?refButton('Mark sent','quote-status',q.id,'ghost'):'')+
  (q.status==='sent'?'<button class="table-btn" data-action="quote-accept" data-id="'+esc(q.id)+'">Accept</button>':'')+
  '</div></td></tr>';
 });
}
function quoteTable(dash){
 return '<section class="surface"><div class="surface-head"><div><h3>Freight quotations</h3><p>Customer sell rate, owner buy rate and gross brokerage spread are private.</p></div>'+btn('+ Prepare quote','manual-quote','','btn primary small')+'</div>'+
 table(['Quote','Transporter','Truck owner','Customer rate','Owner rate','Gross spread','Status','Action'],quoteRows(dash),'No quotations prepared yet.')+'</section>';
}
function eventsPanel(dash){
 if(!dash.events.length)return '<p class="fine">No recent activity yet.</p>';
 return '<div class="checklist">'+dash.events.slice(0,7).map(e=>'<div class="check-item"><span class="check">↗</span><div><b>'+esc(e.ref)+'</b>'+esc(e.description)+'<small style="display:block;color:#7894a0;margin-top:3px">'+fmt(e.at)+'</small></div></div>').join('')+'</div>';
}
function summaryView(dash){
 const pending=dash.loads.filter(x=>x.status==='new').length,ready=dash.trucks.filter(x=>x.status==='available').length;
 return '<div class="two-pane"><div class="surface"><div class="surface-head"><div><h3>Latest customer requests</h3><p>Start by checking matches and preparing customer rates.</p></div>'+btn('Open load desk →','admin-tab','data-tab="loads"','btn small')+'</div>'+
 table(['Load','Route','Material','State'],dash.loads.slice(0,6).map(l=>'<tr><td>'+esc(l.id)+'</td><td><strong>'+esc(l.origin)+' → '+esc(l.destination)+'</strong></td><td>'+esc(l.weightMt)+' MT · '+esc(l.material)+'</td><td>'+chip(l.status)+'</td></tr>'))+
 '</div><div class="surface"><div class="surface-head"><div><h3>Operations activity</h3><p>Recent incoming requests and actions.</p></div></div><div class="surface-body">'+eventsPanel(dash)+'</div></div></div>'+
 '<div class="section" style="padding-bottom:0"><div class="section-head"><div><div class="eyebrow">WORK QUEUE</div><h2>YOUR NEXT <span>MOVES.</span></h2></div><p>'+pending+' unquoted customer request(s) · '+ready+' trucks currently available.</p></div></div>'+
 '<div class="feature-grid"><article class="feature-card"><div class="feature-icon">▤</div><h3>Review incoming loads</h3><p>Inspect weight, vehicle length, body type, dates and origin before you quote.</p>'+btn('Open loads','admin-tab','data-tab="loads"','btn text')+'</article>'+
 '<article class="feature-card"><div class="feature-icon">▰</div><h3>Match available trucks</h3><p>Browse the truck network and compare eligible capacity. Owner details stay private.</p>'+btn('Open truck network','admin-tab','data-tab="trucks"','btn text')+'</article>'+
 '<article class="feature-card"><div class="feature-icon">₹</div><h3>Quote & follow up</h3><p>Build a freight spread, copy a quote or open email and WhatsApp drafts.</p>'+btn('View quotations','admin-tab','data-tab="quotes"','btn text')+'</article></div>';
}
export function applicationsTable(dash){
 const rows=(dash.applications||[]).map(a=>{
  const load=dash.loads.find(l=>l.id===a.loadId);
  const applicant=a.company||a.contactName;
  return '<tr><td><strong>'+esc(a.id)+'</strong><small>'+fmt(a.createdAt)+'</small></td>'+
   '<td><strong>'+esc(load?.origin||'—')+' → '+esc(load?.destination||'—')+'</strong><small>'+esc(a.loadId)+'</small></td>'+
   '<td><strong>'+esc(applicant)+'</strong><small>'+esc(a.contactName)+'</small></td>'+
   '<td>'+esc(a.feet)+' ft · '+esc(a.capacityMt)+' MT<small>'+esc(a.bodyType)+' · '+esc(a.origin)+'</small></td>'+
   '<td>'+chip(a.status)+'</td>'+
   '<td><button class="table-btn" data-action="application-detail" data-id="'+esc(a.id)+'">Review ↗</button></td></tr>';
 });
 return '<section class="surface"><div class="surface-head"><div><h3>Load applications from truck owners</h3>'+
  '<p>Review applicants privately. Shortlisting does not confirm vehicle placement or book a truck.</p></div>'+
  '<span class="status-pill">'+(dash.applications||[]).filter(a=>a.status==='new').length+' new</span></div>'+
  table(['Application','Customer route','Truck owner','Offered vehicle','Status','Review'],rows,'No truck owners have applied yet.')+
  '</section>';
}

export function applicationDetail(dash,a){
 const load=dash.loads.find(x=>x.id===a.loadId);
 const phone=digitsPhone(a.phone);
 const title='Setu Logistics application '+a.id+' for '+a.loadId;
 const note='Hello '+a.contactName+', Setu Logistics regarding your truck application '+a.id+' for '+(load?.origin||'')+' to '+(load?.destination||'')+'.';
 return '<p class="fine">Applicant details are visible only to the broker. Verify the vehicle and available rate before confirming.</p>'+
  details([['Application',a.id],['Customer load',a.loadId],['Pickup → destination',(load?.origin||'—')+' → '+(load?.destination||'—')],
   ['Supplier',a.company||a.contactName],['Contact person',a.contactName],['Phone',a.phone],['Email',a.email||'—'],
   ['Truck location',a.origin],['Vehicle length',a.feet+' ft'],['Available payload',a.capacityMt+' MT'],
   ['Body type',a.bodyType],['Vehicle number',a.vehicleNo||'Not supplied'],
   ['Available date',fmt(a.availableFrom)],['Review status',a.status]])+
  (a.notes?'<div class="safety-note" style="margin-top:14px">'+esc(a.notes)+'</div>':'')+
  '<div class="form-actions"><a class="btn small" href="tel:+'+esc(phone)+'">Call applicant ☎</a>'+
  '<a class="btn small" href="'+esc(whatsapp(a.phone,note))+'" target="_blank" rel="noopener noreferrer">WhatsApp ↗</a>'+
  (a.email?'<a class="btn small" href="'+esc(mailto(a.email,title,note))+'">Email ↗</a>':'')+'</div>'+
  '<div class="divider"></div><h3>Review application</h3><div class="form-actions">'+
  btn('Mark contacted','application-status','data-id="'+esc(a.id)+'" data-status="contacted"','btn small')+
  btn('Shortlist truck','application-status','data-id="'+esc(a.id)+'" data-status="shortlisted"','btn primary small')+
  btn('Reject','application-status','data-id="'+esc(a.id)+'" data-status="rejected"','btn danger small')+
  '</div><p class="fine">This is an expression of interest. Final freight rate, permits, documents and placement still require broker confirmation.</p>';
}

export function brokerView(dash,tab='overview'){
 const s=dash.summary;
 const stat=(label,val,note)=>'<div class="stat"><small>'+label+'</small><strong>'+val+'</strong><span class="hint">'+note+'</span></div>';
 const panel=tab==='applications'?applicationsTable(dash):tab==='loads'?loadTable(dash):tab==='trucks'?truckTable(dash):tab==='quotes'?quoteTable(dash):tab==='trips'?tripsPanel(dash):tab==='requests'?driverRequestsPanel(dash):tab==='documents'?documentPanel(dash):summaryView(dash);
 return pageHeader('PRIVATE BROKER CONTROL CENTER','SETU <span>OPERATIONS.</span>','Your incoming customer demand, owner fleet availability, matches and quotations—under one private login.')+
  '<div class="container admin-dashboard"><div class="admin-heading"><div><h2>Broker command center</h2><p>Private live workspace · Rates and contacts never appear on the public truck board.</p></div>'+btn('Export records ↓','export-data','','btn small')+btn('Sign out ↗','logout','','btn small')+'</div>'+
  '<div class="stat-strip">'+stat('Pending customer loads',s.openLoads,'New or quoted')+stat('Available trucks',s.availableTrucks,'Ready to match')+
  stat('Quotations in progress',s.activeQuotes,'Draft / sent')+stat('Accepted gross spread',rupees(s.expectedSpread),'Before operating costs')+'</div>'+
  toolbar([['overview','Overview'],['loads','Customer requests'],['applications','Load applications ('+(s.pendingApplications||0)+')'],['trucks','Truck availability'],['quotes','Quotations'],['trips','Live trips'],['requests','Driver requests'],['documents','Documents']],tab)+panel+'</div>';
}
const details=(items)=>'<div class="detail-grid">'+items.map(([label,value])=>'<div class="detail-box"><small>'+label+'</small><strong>'+
 (label==='Phone'&&value?'<a class="call-number" href="tel:+'+esc(digitsPhone(value))+'">+'+esc(digitsPhone(value))+' ☎</a>':esc(value??'—'))+
 '</strong></div>').join('')+'</div>';
const contactActions=(phone,email,subject,note)=>'<div class="inline-actions" style="margin-top:18px">'+
 (email?'<a class="btn small" href="'+esc(mailto(email,subject,note))+'">Email contact ↗</a>':'')+
 (phone?'<a class="btn small" target="_blank" rel="noopener noreferrer" href="'+esc(whatsapp(phone,note))+'">WhatsApp ↗</a>':'')+
 (phone?'<a class="btn small" href="tel:+'+esc(digitsPhone(phone))+'">Call ☎</a>':'')+'</div>';
export function loadDetail(l){
 const note='Hello '+l.contactName+', regarding your Setu Logistics load request '+l.id+' ('+l.origin+' to '+l.destination+').';
 return '<p class="fine">Customer details are private. Contact them only for an operationally relevant quote or booking follow-up.</p>'+
 details([['Reference',l.id],['Company',l.company||'Not provided'],['Contact person',l.contactName],
  ['Phone',l.phone],['Email',l.email||'Not provided'],['Origin',l.origin],['Destination',l.destination],
  ['Material',l.material],['Weight',l.weightMt+' MT'],['Truck required',l.feet+' ft · '+l.bodyType],
  ['Loading date',fmt(l.loadingDate)],['Request status',l.status]])+
 (l.specialInstructions?'<div class="safety-note" style="margin-top:17px">'+esc(l.specialInstructions)+'</div>':'')+
 contactActions(l.phone,l.email,'Your freight request · '+l.id,note);
}
export function truckDetail(t){
 const note='Hello '+t.contactName+', Setu Logistics checking availability of your '+t.feet+' ft / '+t.capacityMt+' MT truck ('+t.id+').';
 return '<p class="fine">The following information is only visible to the broker. Verify owner, vehicle documents and insurance before dispatch.</p>'+
 details([['Truck listing',t.id],['Owner / fleet',t.company||'Not provided'],['Contact person',t.contactName],
  ['Phone',t.phone],['Email',t.email||'Not provided'],['Current location',t.origin],['Preferred destination',t.destination||'Flexible'],
  ['Truck body',t.bodyType],['Feet',t.feet],['Capacity',t.capacityMt+' MT'],
  ['Registration',t.vehicleNo||'Not supplied'],['Available from',fmt(t.availableFrom)],
  ['Until',fmt(t.availableUntil)],['Status',t.status]])+
 (t.notes?'<div class="safety-note" style="margin-top:17px">'+esc(t.notes)+'</div>':'')+
 contactActions(t.phone,t.email,'Truck availability · '+t.id,note);
}
export function matchingView(result){
 const l=result.load,matches=result.matches;
 const top='<p class="fine"><strong style="color:var(--text)">'+esc(l.origin)+' → '+esc(l.destination)+'</strong> · '+esc(l.material)+' · '+l.feet+' ft · '+l.weightMt+' MT · '+fmt(l.loadingDate)+'</p>';
 if(!matches.length)return top+'<div class="empty"><strong>No matching trucks yet.</strong><p>There is no currently available truck of the required body, length, capacity and date in the network. Contact another supplier or review owner listings.</p></div>';
 return top+'<p class="fine">Matches are ranked using capacity, availability window and location. Verify the physical pickup route and actual truck availability before committing.</p>'+
 '<div class="checklist">'+matches.map(t=>'<div class="check-item" style="align-items:center;justify-content:space-between;border:1px solid #314651;border-radius:8px;padding:12px"><div>'+
 '<b>'+esc(t.company||t.contactName)+'</b>'+esc(t.origin)+' → '+esc(t.destination||'Any')+' · '+esc(t.feet)+' ft · '+esc(t.capacityMt)+' MT · '+esc(t.bodyType)+
 '<small style="display:block;color:#7fa5a5">Match score: '+t.matchScore+' · '+esc(t.id)+'</small></div>'+
 btn('Prepare quote','quote-load-truck','data-load="'+esc(l.id)+'" data-truck="'+esc(t.id)+'"','btn primary small')+'</div>').join('')+'</div>';
}
export function manualQuoteForm(dash,loadId,truckId){
 const loads=dash.loads.filter(l=>l.status!=='closed').map(l=>[l.id,l.id+' — '+l.origin+' → '+l.destination+' ('+l.weightMt+' MT)']);
 const trucks=dash.trucks.filter(t=>t.status==='available').map(t=>[t.id,t.id+' — '+t.company+' · '+t.feet+' ft / '+t.capacityMt+' MT']);
 if(!loads.length||!trucks.length)return '<div class="empty"><strong>Quotation needs both sides.</strong><p>Add an available truck and a customer load request first.</p></div>';
 return '<form id="quote-form"><div class="form-grid">'+
 field('Customer load','loadId',{options:loads,required:true,value:loadId||loads[0][0]})+
 field('Owner vehicle','truckId',{options:trucks,required:true,value:truckId||trucks[0][0]})+
 field('Customer quoted freight (₹)','customerRate',{required:true,type:'number',min:1,step:1,placeholder:'e.g. 45000'})+
 field('Trucker agreed freight (₹)','truckerRate',{required:true,type:'number',min:1,step:1,placeholder:'e.g. 42000'})+
 field('Quote valid until','validUntil',{required:true,type:'date',value:inDays(3)})+
 field('Freight terms / inclusions','terms',{textarea:true,full:true,placeholder:'Loading/unloading charges, detention, tolls, 90% advance, balance on POD etc.'})+
 field('Optional remarks','notes',{textarea:true,full:true,placeholder:'Any special conditions and customer notes'})+
 '</div><div class="safety-note" style="margin-top:16px">Customer freight minus trucker freight is your <strong>gross booking spread</strong>, not your net profit. The customer quote does not disclose the truck owner’s purchase rate. A draft is not automatically emailed.</div>'+
 '<div class="form-actions">'+btn('Save quotation draft ↗','quote-submit','','btn primary')+'</div></form>';
}
export function quoteMessage(q,l,lang='en'){
 const rate=Number(q.customerRate).toLocaleString('en-IN');
 if(lang==='hi')return [
  'SETU LOGISTICS — माल ढुलाई का कोटेशन '+q.id,
  'लोड नंबर: '+l.id,
  'लोडिंग की जगह: '+l.origin,
  'अनलोडिंग की जगह: '+l.destination,
  'माल: '+l.material,
  'चाहिए ट्रक: '+l.feet+' फीट / '+l.weightMt+' मीट्रिक टन ('+({open:'ओपन बॉडी',closed:'बंद बॉडी',flatbed:'फ्लैटबेड',other:'विशेष'}[l.bodyType]||l.bodyType)+')',
  'लोडिंग की तारीख: '+l.loadingDate,
  'माल ढुलाई का भाड़ा: ₹'+rate,
  'कोटेशन मान्य तारीख: '+q.validUntil,
  'भाड़े की शर्तें: '+(q.terms||'बात करके तय होंगी'),
  'अतिरिक्त जानकारी: '+(q.notes||'—'),
  'ट्रक की उपलब्धता, अंतिम पुष्टि और लिखित सहमति के बाद ही बुकिंग पक्की होगी।',
  'Setu Logistics'
 ].join('\n');
 return [
  'SETU LOGISTICS — FREIGHT QUOTATION '+q.id,
  'Load ref: '+l.id,
  'Origin: '+l.origin,
  'Destination: '+l.destination,
  'Material: '+l.material,
  'Truck requirement: '+l.feet+' ft / '+l.weightMt+' MT ('+l.bodyType+')',
  'Loading date: '+l.loadingDate,
  'Freight quote: INR '+rate,
  'Valid until: '+q.validUntil,
  'Freight terms: '+(q.terms||'To be agreed in writing'),
  'Remarks: '+(q.notes||'—'),
  'Subject to truck availability, final confirmation and written agreement.',
  'Setu Logistics'
 ].join('\n');
}
export function shareQuote(q,l,t,quoteLang='en'){
 const message=quoteMessage(q,l,quoteLang);
 return '<div class="small-row"><div><span class="hint">CUSTOMER</span><br><strong>'+esc(l.company||l.contactName)+'</strong><br><small>'+esc(l.email||'No email recorded')+' · <a class="call-number" href="tel:+'+esc(digitsPhone(l.phone))+'">+'+esc(digitsPhone(l.phone))+'</a></small></div>'+chip(q.status)+'</div>'+
 '<div class="divider"></div><div class="small-row"><strong>Quotation language / कोटेशन की भाषा</strong><div class="inline-actions">'+
 '<button class="btn small '+(quoteLang==='en'?'primary':'')+'" data-action="quote-language" data-id="'+esc(q.id)+'" data-lang="en">English</button>'+
 '<button class="btn small '+(quoteLang==='hi'?'primary':'')+'" data-action="quote-language" data-id="'+esc(q.id)+'" data-lang="hi">हिंदी</button>'+
 '</div></div><div class="quote-preview" style="margin-top:12px">'+esc(message)+'</div>'+
 '<div class="form-actions">'+
 btn('Copy quotation','copy-quote','data-id="'+esc(q.id)+'"','btn')+
 (l.email?'<a class="btn primary" href="'+esc(mailto(l.email,(quoteLang==='hi'?'माल ढुलाई का कोटेशन ':'Freight quotation ')+q.id+' | Setu Logistics',message))+'">Open email draft ↗</a>':'')+
 '<a class="btn primary" target="_blank" rel="noopener noreferrer" href="'+esc(whatsapp(l.phone,message))+'">Open WhatsApp draft ↗</a>'+
 '<a class="btn small" href="tel:+'+esc(digitsPhone(l.phone))+'">Call customer ☎</a></div>'+
 '<p class="fine" style="margin-top:13px">These actions open drafts or copy text. They do <strong>not</strong> send any message automatically. Mark as sent only after you actually share the quote. Truck owner buy-rate is deliberately excluded.</p>'+
 (q.status==='draft'?'<div class="form-actions">'+btn('Mark as shared','quote-status','data-id="'+esc(q.id)+'"','btn light')+'</div>':'')+
 (q.status==='sent'?'<div class="form-actions">'+btn('Customer accepted — confirm placement','quote-accept','data-id="'+esc(q.id)+'"','btn primary')+btn('Customer declined','quote-decline','data-id="'+esc(q.id)+'"','btn danger')+'</div>':'');
}
