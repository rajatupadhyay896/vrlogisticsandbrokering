import {BODIES,VEHICLE_PRESETS,esc,field,sharedContact,fmt,today,pageHeader,chip} from './lib.js';

const bodyName={open:'Open body / खुली बॉडी',closed:'Closed / container',flatbed:'Flatbed / trailer',other:'Other / special'};
const bodyOptions=[['all','All body types'],...BODIES];

export function selectLoads(board,query='',body='all'){
  const term=String(query).trim().toLowerCase();
  return (board?.loads||[]).filter(l=>
    (body==='all'||l.bodyType===body) &&
    (!term||[l.id,l.origin,l.destination,l.material,l.feet,l.weightMt,l.vehicleClass].join(' ').toLowerCase().includes(term))
  ).sort((a,b)=>String(a.loadingDate).localeCompare(String(b.loadingDate)));
}

export function loadCards(loads,limit=0){
  const items=limit?loads.slice(0,limit):loads;
  if(!items.length)return '<div class="surface"><div class="empty"><span class="empty-icon">▤</span><strong>No loads listed at the moment</strong><p>New transport requirements will appear here. You can still list your vehicle so V.R Logistics can reach you.</p><a href="#list-truck" class="btn primary" data-page="list-truck">List your vehicle ↗</a></div></div>';
  return '<div class="listing-grid load-market-grid">'+items.map(l=>`<article class="listing load-card">
    <div class="listing-top"><span class="listing-id">${esc(l.id)}</span><span class="status-pill">Open for applications</span></div>
    <div class="load-card-lane"><span>${esc(l.origin)}</span><span class="lane-arrow" aria-hidden="true">→</span><span>${esc(l.destination)}</span></div>
    <p class="load-material">${esc(l.material)}</p>
    <div class="listing-info"><b>${esc(l.feet)} ft required</b><b>${esc(l.weightMt)} MT cargo</b><b>${esc(bodyName[l.bodyType]||l.bodyType)}</b></div>
    <div class="listing-footer"><span>Loading ${fmt(l.loadingDate)}</span><button type="button" class="btn primary small" data-action="apply-load" data-id="${esc(l.id)}">Apply for load ↗</button></div>
    <p class="listing-note">Booking and freight rate are confirmed by the broker. Customer contact details are private.</p>
  </article>`).join('')+'</div>';
}

export function findLoads(board,query='',body='all'){
  const loads=selectLoads(board,query,body);
  return pageHeader('FOR TRUCK OWNERS','FIND A <span>LOAD.</span>','Browse current customer freight requirements and apply with your available vehicle. V.R Logistics reviews applications before confirming a trip.')+
    '<div class="container portal"><div class="surface" style="margin-bottom:20px"><div class="filter-bar mobile-load-filters">'+
    '<label class="market-search"><span>Search loads by location, material or size</span><input type="search" id="load-search" placeholder="e.g. Mumbai, Pune, steel, 32 ft" value="'+esc(query)+'" autocomplete="off" aria-label="Search available freight loads"></label>'+
    '<label class="market-filter"><span>Vehicle body</span><select id="load-body-filter" aria-label="Filter loads by vehicle body">'+bodyOptions.map(([v,t])=>'<option value="'+esc(v)+'" '+(v===body?'selected':'')+'>'+esc(t)+'</option>').join('')+'</select></label>'+
    '<div class="filter-note" id="load-count" aria-live="polite">'+loads.length+' available load(s)</div></div></div>'+
    '<div id="load-results">'+loadCards(loads)+'</div>'+
    '<p class="fine" style="margin-top:23px">Loads are customer-submitted. Availability, routing, freight rate and vehicle suitability must be confirmed by V.R Logistics before dispatch.</p></div>';
}

export function applicationForm(load){
  const body=load.bodyType;
  return '<div class="application-load-summary"><strong>'+esc(load.origin)+' → '+esc(load.destination)+'</strong>'+
     '<span>'+esc(load.material)+' · '+esc(load.weightMt)+' MT · '+esc(load.feet)+' ft · '+esc(bodyName[body]||body)+' · '+fmt(load.loadingDate)+'</span></div>'+
   '<form id="load-application-form" data-id="'+esc(load.id)+'" autocomplete="on"><div class="form-grid">'+
    sharedContact()+
    field('Your vehicle category','vehicleClass',{options:VEHICLE_PRESETS.map(p=>[p.id,p.label]),required:true,full:true,
      hint:'Choose a suggested vehicle type, then check the actual length and carrying capacity.'})+
    field('Your truck location','origin',{required:true,placeholder:'Where is the truck now?'})+
    field('Available from','availableFrom',{required:true,type:'date',value:today()})+
    field('Vehicle length (feet)','feet',{required:true,type:'number',min:5,max:65,step:.1,placeholder:'e.g. 32'})+
    field('Payload capacity (MT)','capacityMt',{required:true,type:'number',min:.3,max:70,step:.05,placeholder:'e.g. 18'})+
    field('Body type (open / closed)','bodyType',{required:true,options:BODIES,value:body})+
    field('Vehicle registration (optional)','vehicleNo',{placeholder:'e.g. MH 04 XX 1234'})+
    field('Message to broker (optional)','notes',{textarea:true,full:true,placeholder:'Mention availability, special conditions or a preferred freight rate.'})+
    '<div class="field full" style="display:none" aria-hidden="true"><label>Website<input name="website" tabindex="-1" autocomplete="off"></label></div>'+
    '<div class="field full checkbox-field"><input type="checkbox" id="application-consent" name="consent" value="yes" required><label for="application-consent">I am authorised to offer this vehicle. I agree that V.R Logistics may contact me about this load. My phone number will not be shown publicly.</label></div>'+
   '</div><p class="fine">Submitting an application does not reserve the load or confirm any freight payment. V.R Logistics will contact you after reviewing your details.</p>'+
   '<div class="form-actions"><button class="btn primary" type="submit">Send application ↗</button></div></form>';
}
