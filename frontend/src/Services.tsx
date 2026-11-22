import {useState,useEffect,useSyncExternalStore} from 'react';
import {getLanguage,t} from './i18n';
import {api} from './lib';

const subscribe=(callback:()=>void)=>{window.addEventListener('setu-language',callback);return ()=>window.removeEventListener('setu-language',callback);};
function useWords(){
  const lang=useSyncExternalStore(subscribe,getLanguage);
  return (en:string,hi:string)=>lang==='hi'?hi:en;
}
type Listing={id:string;origin:string;destination:string;capacityMt?:number;weightMt?:number;documentReviewedAt?:string};
type Board={loads:Listing[];trucks:Listing[]};
export function Services({owner,board}:{owner:boolean;board:Board|null}){
  const w=useWords(), [from,setFrom]=useState(''),[to,setTo]=useState('');
  const matches=(value:string,query:string)=>(value||'').toLowerCase().includes(query.trim().toLowerCase());
  const rows=(owner?board?.loads:board?.trucks)?.filter(row=>matches(row.origin,from)&&matches(row.destination,to));
  return <section className="service-desk container" data-react-i18n="">
    <header><h1>{owner?w('For truck owners','ट्रक मालिकों के लिए'):w('For transporters','ट्रांसपोर्टरों के लिए')}</h1>
    <p>{owner?w('Find freight for your next leg, agree the rate with the broker and send delivery paperwork from the road.','अगले सफर के लिए लोड खोजें, ब्रोकर से भाड़ा तय करें और रास्ते से डिलीवरी की रसीद भेजें।'):w('Find capacity for a dispatch. Share your loading date and vehicle requirement so the freight desk can confirm placement and price.','माल भेजने के लिए ट्रक खोजें। लोडिंग की तारीख और गाड़ी की ज़रूरत बताएँ ताकि ब्रोकर उपलब्धता और भाड़ा तय कर सके।')}</p>
    <div className="inline-actions"><a className="btn primary" href={owner?'#list-truck':'#post-load'}>{owner?w('List your truck','अपना ट्रक दर्ज करें'):w('Request a truck','ट्रक माँगें')}</a>
    <a className="btn" href={owner?'#driver':'#track'}>{owner?w('Open driver portal','ड्राइवर पोर्टल खोलें'):w('Track a shipment','खेप की स्थिति देखें')}</a></div></header>
    <section className="surface surface-body"><h2>{owner?w('Find a load by route','रूट के हिसाब से लोड खोजें'):w('Find a truck by route','रूट के हिसाब से ट्रक खोजें')}</h2>
    <div className="route-inputs"><label>{w('From','कहाँ से')}<input value={from} onChange={e=>setFrom(e.target.value)}/></label>
    <button className="btn" onClick={()=>{setFrom(to);setTo(from);}}>{w('Reverse route','रूट उलटें')}</button>
    <label>{w('To','कहाँ तक')}<input value={to} onChange={e=>setTo(e.target.value)}/></label></div>
    <p role="status">{rows?w('Matches','मिलान')+' · '+rows.length:w('Availability is temporarily unavailable. Contact dispatch.','अभी सूची उपलब्ध नहीं है। डिस्पैच टीम से संपर्क करें।')}</p>
    {rows?.length===0&&<p>{owner?w('Try another route or list your truck so dispatch can follow up.','दूसरा रूट आज़माएँ या अपना ट्रक दर्ज करें ताकि डिस्पैच टीम संपर्क कर सके।'):w('Try another route or request a truck from dispatch.','दूसरा रूट आज़माएँ या डिस्पैच टीम से ट्रक माँगें।')}</p>}
    {rows?.map(row=><article className="lane-result" key={row.id}><div><strong>{row.origin} → {row.destination||w('Flexible destination','कोई भी गंतव्य')}</strong><p>{row.id} · {row.weightMt??row.capacityMt} MT {row.documentReviewedAt?' · '+w('Vehicle document reviewed','वाहन दस्तावेज़ जाँचा गया'):''}</p></div>
    {owner?<button className="btn small" data-action="apply-load" data-id={row.id}>{w('Apply for load','लोड के लिए आवेदन करें')}</button>:<a className="btn small" href={'#post-load/'+row.id}>{w('Request a quotation','भाड़ा पूछें')}</a>}</article>)}</section>
    <details><summary>{w('How is the freight rate confirmed?','भाड़ा कैसे तय होता है?')}</summary><p>{w('The broker checks the vehicle and loading requirement, then shares a quotation for acceptance before creating the trip.','ब्रोकर गाड़ी और लोड की ज़रूरत जाँचकर भाव भेजता है। भाव मंज़ूर होने के बाद ट्रिप बनती है।')}</p></details>
    <details><summary>{w('What happens after dispatch?','गाड़ी निकलने के बाद क्या होता है?')}</summary><p>{w('The driver can send a location update, upload proof of delivery and request payment. Customers can view milestones using their tracking link.','ड्राइवर अपनी लोकेशन भेज सकता है, डिलीवरी की रसीद अपलोड कर सकता है और भुगतान माँग सकता है। ग्राहक अपने लिंक से खेप की स्थिति देख सकते हैं।')}</p></details>
    <a href="tel:+917738103505">{w('Call dispatch','डिस्पैच टीम से बात करें')} · +91 7738103505</a></section>;
}
const stages={assigned:'Vehicle assigned',loaded:'Loaded',in_transit:'On the way',delivered:'Unloaded',pod_submitted:'POD submitted',pod_accepted:'POD accepted',closed:'Closed'};
type Snapshot={id:string;origin:string;destination:string;status:string;checkIn?:{location:string;at:string};milestones:{at:string;status:string}[]};
export function Tracking({token}:{token:string}){
  const w=useWords(),[input,setInput]=useState(''),[invalid,setInvalid]=useState(false),[retry,setRetry]=useState(0);
  const [trip,setTrip]=useState<Snapshot|null>(null),[error,setError]=useState(false);
  useEffect(()=>{let active=true;setTrip(null);setError(false);
    if(token)api('public/tracking/'+encodeURIComponent(token)).then(data=>{if(active)setTrip(data);}).catch(()=>{if(active)setError(true);});
    return ()=>{active=false;};},[token,retry]);
  const date=(at:string)=>new Date(at).toLocaleString(getLanguage()==='hi'?'hi-IN':'en-IN',{timeZone:'Asia/Kolkata',dateStyle:'medium',timeStyle:'short'});
  return <section className="service-desk container" data-react-i18n=""><header><h1>{w('Track a shipment','खेप की स्थिति देखें')}</h1><p>{w('Use the customer link shared by your broker. Times are shown in India Standard Time.','अपने ब्रोकर का भेजा हुआ ग्राहक लिंक इस्तेमाल करें। समय भारतीय मानक समय में है।')}</p></header>
  <form className="tracking-entry" onSubmit={e=>{e.preventDefault();const code=input.trim().split('#track/').pop()||'';if(!/^[A-Za-z0-9_-]{25,60}$/.test(code)){setInvalid(true);return;}setInvalid(false);location.hash='track/'+code;}}>
  <label>{w('Customer link or code','ग्राहक लिंक या कोड')}<input required value={input} onChange={e=>setInput(e.target.value)}/></label><button className="btn primary">{w('View shipment','स्थिति देखें')}</button></form>
  {invalid&&<p role="alert">{w('Enter a valid customer tracking code.','सही ग्राहक ट्रैकिंग कोड दर्ज करें।')}</p>}
  {token&&<div aria-live="polite" className="surface surface-body">{trip?<><h2>{trip.origin} → {trip.destination}</h2><p>{trip.id} · {t(stages[trip.status]||trip.status)}</p><h3>{w('Last driver check-in','ड्राइवर की आख़िरी सूचना')}</h3><p>{trip.checkIn?trip.checkIn.location+' · '+date(trip.checkIn.at):w('Awaiting the first location update.','पहली लोकेशन की प्रतीक्षा है।')}</p>
  <h3>{w('Shipment milestones','खेप की प्रगति')}</h3><ol>{trip.milestones.map((m,i)=><li key={i}>{t(stages[m.status]||m.status)} · {date(m.at)}</li>)}</ol></>:<p>{error?w('Tracking unavailable. Check the link with dispatch or retry.','जानकारी उपलब्ध नहीं है। लिंक जाँचें या दोबारा कोशिश करें।'):w('Loading shipment…','जानकारी लोड हो रही है…')}</p>}
  {(trip||error)&&<button className="btn" onClick={()=>setRetry(n=>n+1)}>{w('Refresh status','स्थिति फिर से देखें')}</button>}</div>}</section>;
}
