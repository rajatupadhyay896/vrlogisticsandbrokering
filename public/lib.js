import {t} from './i18n.js';
export const API = '/api/freight/';
export const BODIES = [
  ['open','Open truck'],['closed','Closed body / container'],
  ['flatbed','Flatbed / trailer'],['other','Other / special']
];
export const SIZES = [14,17,19,20,22,24,28,30,32,34,40,45];

// Indicative market categories only. Real usable payload must be verified against RC/permit and vehicle configuration.
export const VEHICLE_PRESETS = [{"id":"custom","label":"Other / enter dimensions manually","feet":null,"capacityMt":null},{"id":"ace","label":"Tata Ace / mini truck (7 ft, ~0.75 MT)","feet":7,"capacityMt":0.75},{"id":"mini","label":"Mini pickup / compact goods carrier (8 ft, ~1 MT)","feet":8,"capacityMt":1},{"id":"dost","label":"Ashok Leyland Dost / Tata Intra (9 ft, ~1.5 MT)","feet":9,"capacityMt":1.5},{"id":"bolero","label":"Bolero / pickup goods vehicle (9 ft, ~1.5 MT)","feet":9,"capacityMt":1.5},{"id":"ten-ft","label":"10 ft LCV (~2 MT)","feet":10,"capacityMt":2},{"id":"fourteen-ft","label":"14 ft truck (~4 MT)","feet":14,"capacityMt":4},{"id":"seventeen-ft","label":"17 ft truck (~5 MT)","feet":17,"capacityMt":5},{"id":"nineteen-ft","label":"19 ft truck (~7 MT)","feet":19,"capacityMt":7},{"id":"twenty-ft","label":"20 ft truck (~8 MT)","feet":20,"capacityMt":8},{"id":"twenty-two-ft","label":"22 ft truck (~10 MT)","feet":22,"capacityMt":10},{"id":"twenty-four-ft","label":"24 ft truck (~10 MT)","feet":24,"capacityMt":10},{"id":"twenty-eight-ft","label":"28 ft truck (~12 MT)","feet":28,"capacityMt":12},{"id":"thirty-ft","label":"30 ft truck (~15 MT)","feet":30,"capacityMt":15},{"id":"sxl","label":"32 ft SXL / single axle (capacity varies)","feet":32,"capacityMt":7},{"id":"mxl","label":"32 ft MXL / multi axle (~15 MT)","feet":32,"capacityMt":15},{"id":"mxl18","label":"32 ft MXL / heavy (~18 MT)","feet":32,"capacityMt":18}];
export const KNOWN_MT = [6,7,9,10,12,15,16,18,20,21,25,28,30,35];
export const statusNames={
  available:'Available',unavailable:'Unavailable',booked:'Booked',
  new:'New request',quoted:'Quote prepared',closed:'Closed',
  draft:'Draft',sent:'Sent / shared',accepted:'Accepted',declined:'Declined',
  contacted:'Contacted',shortlisted:'Shortlisted',rejected:'Rejected'
};
export const esc = v => String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const rupees = v => '₹'+Number(v||0).toLocaleString('en-IN',{maximumFractionDigits:0});
export const fmt = v => {
  if(!v)return '—';
  const d=new Date(String(v).slice(0,10)+'T12:00:00');
  return Number.isNaN(+d)?'—':d.toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'});
};
export const today=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
export const inDays = n => {const d=new Date();d.setDate(d.getDate()+n);return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-')};
export const onlyNumbers = v => String(v??'').replace(/\D/g,'');
export const percent=(n,d)=>d?((n/d)*100).toFixed(1)+'%':'—';
export const chip=(status)=>'<span class="status-pill '+(['available','accepted','booked'].includes(status)?'':(['new','draft','unavailable'].includes(status)?'muted':(['declined','closed','rejected'].includes(status)?'red':'gold')))+'">'+esc(statusNames[status]||status)+'</span>';
export const field=(label,name,opts={})=>{
  const required=opts.required?'<span class="req">*</span>':'';
  const attrib=opts.required?'required':'';
  const value=opts.value??'';
  let control;
  if(opts.options){
    control='<select name="'+esc(name)+'" id="'+esc(name)+'" '+attrib+'>'+opts.options.map(([v,l])=>'<option value="'+esc(v)+'" '+(String(value)===String(v)?'selected':'')+'>'+esc(l)+'</option>').join('')+'</select>';
  }else if(opts.textarea){
    control='<textarea name="'+esc(name)+'" id="'+esc(name)+'" placeholder="'+esc(opts.placeholder||'')+'" '+attrib+'>'+esc(value)+'</textarea>';
  }else{
    control='<input type="'+esc(opts.type||'text')+'" name="'+esc(name)+'" id="'+esc(name)+'" '+attrib+' value="'+esc(value)+'" placeholder="'+esc(opts.placeholder||'')+'" '+(opts.min!==undefined?'min="'+esc(opts.min)+'"':'')+' '+(opts.max!==undefined?'max="'+esc(opts.max)+'"':'')+' '+(opts.step?'step="'+esc(opts.step)+'"':'')+' '+(opts.autocomplete?'autocomplete="'+esc(opts.autocomplete)+'"':'')+'>';
  }
  return '<div class="field '+(opts.full?'full':'')+'"><label for="'+esc(name)+'">'+label+' '+required+'</label>'+control+(opts.hint?'<small>'+esc(opts.hint)+'</small>':'')+'</div>';
};
export const sharedContact=()=>[
  field('Business / fleet name','company',{placeholder:'Enter company or fleet name'}),
  field('Contact person','contactName',{required:true,placeholder:'Full name'}),
  field('Phone / WhatsApp','phone',{required:true,type:'tel',placeholder:'10–15 digits',autocomplete:'tel'}),
  field('Email address','email',{type:'email',placeholder:'you@company.com',autocomplete:'email',hint:'Optional; used for email quotations'})
].join('');
export const btn=(label,action,attrs='',kind='btn')=>'<button class="'+kind+'" data-action="'+action+'" '+attrs+'>'+label+'</button>';
export const pageHeader=(tag,title,description)=>
  '<section class="page-heading"><div class="container"><div class="eyebrow">'+tag+'</div><h1>'+title+'</h1><p>'+description+'</p></div></section>';
export const message=(title,details,bad=false)=>'<div class="message '+(bad?'error':'')+'"><strong>'+title+'</strong><p>'+details+'</p></div>';
export function toast(text){
  const node=document.querySelector('#toast');node.textContent=t(text);node.classList.add('visible');
  clearTimeout(toast.timer);toast.timer=setTimeout(()=>node.classList.remove('visible'),4200);
}
export async function api(path,options={}){
  let result;
  try{
    result=await fetch(API+path,{credentials:'same-origin',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers},...options});
  }catch{
    throw Error(t('Cannot connect to the V.R Logistics server. Check deployment and internet access.'));
  }
  let payload;
  try{payload=await result.json()}catch{throw Error(t('Server returned an unexpected response.'));}
  if(!result.ok)throw Error(t(payload.error||'Request failed.'));
  return payload;
}
export const faqSide=(title,description,items)=>'<aside class="surface"><div class="info-side"><h3>'+title+'</h3><p>'+description+'</p><div class="checklist">'+items.map(([t,d])=>'<div class="check-item"><span class="check">✓</span><div><b>'+t+'</b>'+d+'</div></div>').join('')+'</div><div class="divider"></div><div class="safety-note">V.R Logistics confirms rates and truck placements individually. Submitting information does not guarantee a booking or create a binding quotation.</div></div></aside>';
export const digitsPhone=v=>{const p=onlyNumbers(v).slice(0,15);return p.length===10?'91'+p:p;};
export const whatsapp = (phone,text) => 'https://wa.me/'+digitsPhone(phone)+'?text='+encodeURIComponent(text);
export const mailto = (email,subject,text) => 'mailto:'+encodeURIComponent(email)+'?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(text);
export const copy=async content=>{await navigator.clipboard.writeText(content);toast('Copied to clipboard.')};
