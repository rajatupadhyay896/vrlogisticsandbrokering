import {esc,rupees,fmt,field,btn,digitsPhone,whatsapp,mailto,pageHeader} from './lib.js';

const STEPS=['assigned','loaded','in_transit','delivered','pod_submitted','pod_accepted','closed'];
const labels={assigned:'Vehicle assigned',loaded:'Loaded',in_transit:'On the way',delivered:'Unloaded',pod_submitted:'POD submitted',pod_accepted:'POD accepted',closed:'Closed'};
const TYPES=[['pod','POD / delivery receipt'],['loading','Loading photo / evidence'],['unloading','Unloading photo / evidence'],['vehicle','Vehicle documents / RC'],['clearance','Permit / clearance'],['other','Other trip document']];
const chipStatus=(s)=>'<span class="status-pill '+(s==='pending'?'gold':s==='rejected'?'red':s==='closed'?'muted':'')+'">'+esc(labels[s]||s)+'</span>';
const contact=(phone)=>phone?'<a class="call-number" href="tel:+'+esc(digitsPhone(phone))+'">+'+esc(digitsPhone(phone))+' ☎</a>':'—';
const detail=(name,value)=>'<div class="detail-box"><small>'+esc(name)+'</small><strong>'+value+'</strong></div>';
const table=(headers,rows)=>'<div class="table-scroller"><table><thead><tr>'+headers.map(x=>'<th>'+esc(x)+'</th>').join('')+'</tr></thead><tbody>'+(rows.length?rows.join(''):'<tr><td colspan="'+headers.length+'"><div class="empty">No records yet.</div></td></tr>')+'</tbody></table></div>';
export function tripsPanel(dash){
 const tripRows=(dash.trips||[]).map(trip=>{
  const q=dash.quotes.find(x=>x.id===trip.quoteId),l=dash.loads.find(x=>x.id===trip.loadId);
  return '<tr><td><strong>'+esc(trip.id)+'</strong><small>'+esc(trip.vehicleNo||'Vehicle no. pending')+'</small></td>'+
   '<td><strong>'+esc(l?.origin||'—')+' → '+esc(l?.destination||'—')+'</strong><small>'+esc(l?.material||'—')+'</small></td>'+
   '<td>'+chipStatus(trip.status)+'</td><td>'+rupees(trip.customerReceived)+'<small>Customer received</small></td><td>'+
   rupees(trip.truckerPaid)+'<small>Owner paid</small></td><td><button class="table-btn" data-action="trip-detail" data-id="'+esc(trip.id)+'">Manage trip ↗</button></td></tr>';
 });
 const accepted=dash.quotes.filter(q=>q.status==='accepted'&&!dash.trips.some(t=>t.quoteId===q.id));
 return '<section class="surface"><div class="surface-head"><div><h3>Active shipment operations</h3><p>Track loading, transit, unloading, POD, settlement and driver reports.</p></div><span class="status-pill">'+dash.trips.length+' trips</span></div>'+
 (accepted.length?'<div class="surface-body" style="padding-bottom:10px"><h3 class="surface-subhead">Accepted quotations awaiting trip creation</h3><div class="inline-actions">'+accepted.map(q=>btn('Start trip from '+esc(q.id),'start-trip','data-id="'+esc(q.id)+'"','btn primary small')).join('')+'</div></div>':'')+
 table(['Trip / Vehicle','Route / Cargo','Stage','Receipts','Payments','Actions'],tripRows)+'</section>';
}
export function driverRequestsPanel(dash){
 const rows=(dash.requests||[]).map(r=>{
  const trip=dash.trips.find(x=>x.id===r.tripId);
  return '<tr><td><strong>'+esc(r.id)+'</strong><small>'+fmt(r.createdAt)+'</small></td>'+
   '<td>'+esc(trip?.id||r.tripId)+'</td><td><strong>'+(r.type==='halt'?'En-route halt':'Payment request')+'</strong><small>'+
   (r.type==='payment'?rupees(r.amount):esc(r.location))+'</small></td>'+
   '<td>'+esc(r.reason||r.notes||'—')+'</td><td>'+chipStatus(r.status)+'</td>'+
   '<td><div class="admin-actions">'+(r.status==='pending'?btn('Approve','request-status','data-id="'+esc(r.id)+'" data-status="approved"','btn small')+btn('Reject','request-status','data-id="'+esc(r.id)+'" data-status="rejected"','btn small danger'):'')+
   (r.status==='approved'?btn('Resolve','request-status','data-id="'+esc(r.id)+'" data-status="resolved"','btn small'):'')+'</div></td></tr>';
 });
 return '<section class="surface"><div class="surface-head"><div><h3>Driver requests</h3><p>Review advances and en-route stops. Approval does not transfer funds.</p></div><span class="status-pill muted">'+(dash.requests||[]).filter(x=>x.status==='pending').length+' pending</span></div>'+
 table(['Request','Trip','Type','Description','Review status','Action'],rows)+'</section>';
}
export function documentPanel(dash){
 const docs=(dash.documents||[]).map(doc=>{
  const trip=dash.trips.find(x=>x.id===doc.tripId),truck=dash.trucks.find(x=>x.id===doc.truckId);
  return '<tr><td><strong>'+esc(doc.name)+'</strong><small>'+esc(doc.kind)+' · '+Math.ceil(doc.size/1024)+' KB</small></td>'+
   '<td>'+esc(trip?.id||truck?.id||'—')+'</td><td>'+esc(doc.submittedBy||'—')+'</td><td>'+fmt(doc.createdAt)+'</td>'+
   '<td><button class="table-btn" data-action="download-document" data-id="'+esc(doc.id)+'">Download securely ↓</button></td></tr>';
 });
 return '<section class="surface"><div class="surface-head"><div><h3>Private document vault</h3><p>Vehicle records, permits, loading evidence and POD files — never published publicly.</p></div>'+
 btn('+ Add document','upload-broker-doc','','btn primary small')+'</div>'+
 table(['Document / Category','Linked trip or truck','Uploaded by','Date','File'],docs)+
 '<p class="fine" style="padding:0 20px 18px">Accepted types: JPEG, PNG, WebP and PDF · up to 3 MB per file. Uploaded documents require manual verification.</p></section>';
}
export function tripDetail(dash,trip){
 const l=dash.loads.find(x=>x.id===trip.loadId),t=dash.trucks.find(x=>x.id===trip.truckId),q=dash.quotes.find(x=>x.id===trip.quoteId);
 const next=STEPS[STEPS.indexOf(trip.status)+1];
 const docs=(dash.documents||[]).filter(x=>x.tripId===trip.id);
 const req=(dash.requests||[]).filter(x=>x.tripId===trip.id);
 const driverLink=location.origin+location.pathname+'#driver/'+trip.token;
 const phone=t?.phone||'',customerPhone=l?.phone||'';
 const head='<p class="fine">Private broker view. Only share the driver link with the assigned driver or truck owner.</p>'+
  '<div class="detail-grid">'+
  detail('Route',esc(l?.origin||'—')+' → '+esc(l?.destination||'—'))+
  detail('Vehicle',esc(trip.vehicleNo||t?.vehicleNo||'—'))+
  detail('Current stage',esc(labels[trip.status]||trip.status))+
  detail('Trucker contact',contact(phone))+
  detail('Customer contact',contact(customerPhone))+
  detail('V.R Logistics',contact('917738103505'))+
  detail('Customer freight',rupees(q?.customerRate||0))+
  detail('Owner freight',rupees(q?.truckerRate||0))+
  detail('Gross spread',rupees((q?.customerRate||0)-(q?.truckerRate||0)))+
  detail('Customer received',rupees(trip.customerReceived))+
  detail('Trucker paid',rupees(trip.truckerPaid))+
  detail('Customer / trucker due',rupees(Math.max(0,(q?.customerRate||0)-trip.customerReceived))+' / '+rupees(Math.max(0,(q?.truckerRate||0)-trip.truckerPaid)))+
  '</div>';
 const driver='<div class="divider"></div><h3 class="surface-subhead">Private driver link</h3>'+
 '<p class="fine">Send this link to the truck owner. It lets them upload POD and vehicle documents, report a halt or request a payment. It does not show your purchase and sale rates.</p>'+
 '<div class="inline-actions">'+
 btn('Copy driver link','copy-driver-link','data-id="'+esc(trip.id)+'"','btn primary small')+
 (phone?'<a class="btn small" href="'+esc(whatsapp(phone,'V.R Logistics trip '+trip.id+' — submit updates, halts, payment requests and POD here: '+driverLink))+'" target="_blank" rel="noopener noreferrer">WhatsApp driver link ↗</a>':'')+
 '</div><div class="info-strip" style="margin-top:12px;overflow-wrap:anywhere">'+esc(driverLink)+'</div>';
 const actions='<div class="divider"></div><h3 class="surface-subhead">Trip management</h3><div class="inline-actions">'+
 (next?btn('Next: '+labels[next],'trip-stage','data-id="'+esc(trip.id)+'" data-status="'+esc(next)+'"','btn primary small'):'<span class="status-pill">Trip closed</span>')+
 btn('Record customer receipt','trip-payment','data-id="'+esc(trip.id)+'" data-side="customer"','btn small')+
 btn('Record trucker payment','trip-payment','data-id="'+esc(trip.id)+'" data-side="trucker"','btn small')+
 btn('Upload document','upload-broker-doc','data-trip="'+esc(trip.id)+'"','btn small')+'</div>'+
 '<p class="fine">POD must be uploaded before it can be submitted; only mark POD accepted after customer confirmation. Closing requires customer and trucker ledgers to be settled.</p>';
 const evidence='<div class="divider"></div><h3 class="surface-subhead">Trip documents ('+docs.length+')</h3>'+
 (docs.length?docs.map(d=>'<div class="document-row"><span>'+esc(d.kind)+' · '+esc(d.name)+'</span><button class="table-btn" data-action="download-document" data-id="'+esc(d.id)+'">Download</button></div>').join(''):'<p class="fine">No evidence yet.</p>')+
 '<h3 class="surface-subhead" style="margin-top:20px">Driver reports ('+req.length+')</h3>'+
 (req.length?req.map(r=>'<p class="fine"><strong>'+esc(r.type==='halt'?'Halt':'Payment')+'</strong> · '+esc(r.id)+' · '+esc(r.status)+' · '+esc(r.type==='payment'?rupees(r.amount):r.location)+' '+esc(r.reason||r.notes||'')+'</p>').join(''):'<p class="fine">No driver reports yet.</p>');
 return head+driver+actions+evidence;
}
export function paymentForm(trip,dash,side){
 const q=dash.quotes.find(x=>x.id===trip.quoteId);
 const max=Math.max(0,side==='customer'?(q?.customerRate||0)-trip.customerReceived:(q?.truckerRate||0)-trip.truckerPaid);
 return '<form id="trip-payment-form" data-trip="'+esc(trip.id)+'" data-side="'+esc(side)+'"><div class="form-grid">'+
 field('Amount received / paid (₹)','amount',{type:'number',min:1,step:1,required:true,placeholder:'Balance: '+rupees(max)})+
 field('UTR / bank reference','reference',{placeholder:'Optional payment reference'})+
 '</div><p class="fine">Outstanding amount: <strong>'+rupees(max)+'</strong>. Record this only after checking the actual bank receipt/payment. It does not initiate a transfer.</p>'+
 '<div class="form-actions"><button class="btn primary" type="submit" '+(max<=0?'disabled':'')+'>Record payment</button></div></form>';
}
export function fileForm(dash,{tripId='',truckId='',driver=false}={}){
 const options=driver?[]:[...(dash?.trips||[]).map(x=>['trip:'+x.id,'Trip '+x.id]),...(dash?.trucks||[]).map(x=>['truck:'+x.id,'Truck '+x.id])];
 const value=tripId?'trip:'+tripId:truckId?'truck:'+truckId:(options[0]?.[0]||'');
 const chosen=driver?'':field('Attach to trip or truck','record',{options,value,required:true,full:true});
 return '<form id="'+(driver?'driver-file-form':'broker-file-form')+'"><div class="form-grid">'+chosen+
 field('Document category','kind',{options:TYPES,required:true,full:true})+
 '<div class="field full"><label for="document-file">Choose image or PDF (max 3 MB)</label><input type="file" name="file" id="document-file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" required><small>Keep the image readable. Mobile camera photos may need compression.</small></div></div>'+
 '<p class="fine">Files are stored privately on the server and can be downloaded by the broker. A document upload is not verification of its validity.</p>'+
 '<div class="form-actions"><button class="btn primary" type="submit">Upload document ↗</button></div></form>';
}
export function driverEntry(){
 return pageHeader('TRUCKER TRIP ACCESS','DRIVER <span>UPDATES.</span>','Use the private link given by V.R Logistics to report halts, request payments and upload delivery documents.')+
 '<div class="container portal"><div class="surface" style="max-width:650px;margin:auto"><div class="surface-body">'+
 '<h2>Open your trip</h2><p class="fine">Enter your private trip code or use the link sent by the broker. Please do not share this access link publicly.</p>'+
 '<form id="driver-open-form"><div class="field"><label>Private trip access code</label><input name="token" required placeholder="Paste your trip code"></div><div class="form-actions"><button class="btn primary" type="submit">Open trip ↗</button></div></form>'+
 '<div class="divider"></div><p class="fine">Need assistance? Call <a class="call-number" href="tel:+917738103505">+91 7738103505</a>.</p></div></div></div>';
}
export function driverView(data,token){
 if(data?.error)return pageHeader('TRUCKER TRIP ACCESS','TRIP <span>NOT FOUND.</span>','Please check the private link or contact our dispatch team.')+
  '<div class="container portal"><div class="message error"><strong>Invalid or expired link</strong><p>'+esc(data.error)+'</p><a class="call-number" href="tel:+917738103505">Call +91 7738103505</a></div></div>';
 if(!data?.trip)return driverEntry();
 const t=data.trip,requests=data.requests||[],docs=data.documents||[];
 return pageHeader('DRIVER OPERATIONS','YOUR TRIP <span>'+esc(t.id)+'</span>','Submit updates while your vehicle is on the road. For emergencies, call the company immediately.')+
 '<div class="container portal"><div class="stat-strip">'+
 '<div class="stat"><small>Current status</small><strong style="font-size:22px">'+esc(labels[t.status]||t.status)+'</strong></div>'+
 '<div class="stat"><small>From</small><strong style="font-size:22px">'+esc(t.origin)+'</strong></div>'+
 '<div class="stat"><small>To</small><strong style="font-size:22px">'+esc(t.destination)+'</strong></div>'+
 '<div class="stat"><small>Loading date</small><strong style="font-size:22px">'+fmt(t.loadingDate)+'</strong></div></div>'+
 '<div class="two-pane"><div class="surface"><div class="surface-head"><div><h3>Submit a driver update</h3><p>Updates reach the V.R Logistics broker desk.</p></div></div>'+
 '<div class="surface-body"><div class="feature-grid driver-actions">'+
 '<article class="feature-card"><div class="feature-icon">₹</div><h3>Payment request</h3><p>Request an advance or balance payment from the brokerage team.</p>'+btn('Request payment','driver-request','data-type="payment"','btn primary small')+'</article>'+
 '<article class="feature-card"><div class="feature-icon">⛟</div><h3>En-route halt</h3><p>Report a stoppage, breakdown, traffic delay or other issue with your location.</p>'+btn('Report halt','driver-request','data-type="halt"','btn primary small')+'</article>'+
 '<article class="feature-card"><div class="feature-icon">▧</div><h3>Upload documents</h3><p>Send POD, clearance permits, vehicle documents or loading/unloading photos.</p>'+btn('Upload evidence','driver-file','','btn primary small')+'</article></div>'+
 '<div class="divider"></div><p class="fine"><strong>Emergency or urgent dispatch?</strong> <a class="call-number" href="tel:+917738103505">Call +91 7738103505</a>. This portal does not automatically send money or call anyone.</p></div></div>'+
 '<aside class="surface"><div class="surface-body"><h3>Trip details</h3><div class="checklist">'+
 '<div class="check-item"><span class="check">✓</span><div><b>Material</b>'+esc(t.material||'—')+'</div></div>'+
 '<div class="check-item"><span class="check">✓</span><div><b>Weight</b>'+esc(t.weightMt)+' MT</div></div>'+
 '<div class="check-item"><span class="check">✓</span><div><b>Vehicle</b>'+esc(t.vehicleNo||'—')+'</div></div>'+
 '<div class="check-item"><span class="check">✓</span><div><b>Transport customer</b>'+esc(t.customer||'—')+'</div></div></div>'+
 '<div class="divider"></div><h3>Requests ('+requests.length+')</h3>'+
 (requests.length?requests.map(r=>'<p class="fine">'+esc(r.type==='halt'?'Halt':'Payment')+' · '+esc(r.status)+' · '+fmt(r.createdAt)+'</p>').join(''):'<p class="fine">No requests submitted.</p>')+
 '<h3>Documents ('+docs.length+')</h3>'+
 (docs.length?docs.map(d=>'<div class="document-row">'+esc(d.kind)+' · '+esc(d.name)+
 '<button class="table-btn" data-action="driver-download" data-id="'+esc(d.id)+'">Download</button></div>').join(''):'<p class="fine">No files uploaded.</p>')+
 '</div></aside></div></div>';
}
export function driverRequestForm(type){
 const halt=type==='halt';
 return '<form id="driver-request-form" data-type="'+esc(type)+'"><div class="form-grid">'+
 (halt?field('Current location','location',{required:true,full:true,placeholder:'Highway, landmark, nearest town or GPS location'})+
 field('Reason for halt','reason',{textarea:true,required:true,full:true,placeholder:'Breakdown, rest stop, traffic, tyre issue etc.'})+
 field('Estimated resume time','estimatedResumeAt',{full:true,placeholder:'e.g. Today, 6 PM'}):
 field('Payment amount requested (₹)','amount',{type:'number',min:1,step:1,required:true,full:true,placeholder:'e.g. 12000'}))+
 field('Additional information','notes',{textarea:true,full:true,placeholder:'Optional notes for dispatcher'})+
 '</div><p class="fine">'+(halt?'This alerts the broker to the halt; it is not a roadside-assistance dispatch. For emergencies, call the company.':
 'This creates a payment request for review. It does not transfer money.')+'</p>'+
 '<div class="form-actions"><button class="btn primary" type="submit">Submit request ↗</button></div></form>';
}
