import {useSyncExternalStore} from 'react';
import {getLanguage} from './i18n';

const services = [
  {title:['Choose a truck','ट्रक चुनें'], body:['Compare available vehicles by route, body and payload. A review badge shows where a broker has checked a vehicle document.','रूट, बॉडी और वजन क्षमता देखकर गाड़ी चुनें। ब्रोकर ने वाहन का दस्तावेज़ जाँचा है तो लिस्टिंग पर उसका निशान दिखेगा।'],link:['Explore trucks','उपलब्ध ट्रक देखें'],href:'#find-trucks'},
  {title:['Get a freight quotation','भाड़ा पूछें'],body:['Share the pickup, destination, cargo weight and loading date. The freight desk confirms availability and sends a written rate.','माल कहाँ से उठेगा, कहाँ जाएगा, उसका वजन और लोडिंग की तारीख बताएँ। टीम उपलब्धता जाँचकर लिखित भाव भेजेगी।'],link:['Request a quote','कोटेशन माँगें'],href:'#post-load'},
  {title:['Follow a shipment','खेप की स्थिति देखें'],body:['Open your customer link to see the latest driver check-in and progress from loading to delivery.','अपने ग्राहक लिंक पर ड्राइवर की आख़िरी सूचना और लोडिंग से डिलीवरी तक की प्रगति देखें।'],link:['Open tracking','ट्रैकिंग खोलें'],href:'#track'},
  {title:['Manage trip payments','ट्रिप के भुगतान'],body:['Truck owners can request an advance or balance through their driver link. The broker records receipts and payments against the trip.','ट्रक मालिक ड्राइवर लिंक से अग्रिम या बकाया भाड़ा माँग सकते हैं। ब्रोकर हर ट्रिप का मिला और चुकाया गया पैसा दर्ज करता है।'],link:['Open driver portal','ड्राइवर पोर्टल खोलें'],href:'#driver'}
];
const questions=[
  [['Who can use Setu?','सेतु किसके लिए है?'],['Transporters can request vehicles for a shipment. Truck owners can list their capacity or apply for an open load.','ट्रांसपोर्टर माल भेजने के लिए गाड़ी माँग सकते हैं। ट्रक मालिक अपनी गाड़ी दर्ज कर सकते हैं या उपलब्ध लोड के लिए आवेदन कर सकते हैं।']],
  [['When is my booking confirmed?','मेरी बुकिंग कब पक्की होगी?'],['Submitting a load gives you a reference number. The broker checks the truck, shares the quotation and arranges placement after acceptance.','लोड दर्ज करने पर एक संदर्भ नंबर मिलता है। ब्रोकर गाड़ी जाँचकर भाव भेजता है और भाव मंज़ूर होने पर गाड़ी लगवाता है।']],
  [['How do I find a return load?','वापसी का लोड कैसे खोजूँ?'],['Open the truck-owner page and enter your route. Select Reverse route to see loads heading back, then apply with your vehicle details.','ट्रक मालिक वाले पेज पर अपना रूट भरें। वापसी के लोड देखने के लिए रूट उलटें और अपनी गाड़ी की जानकारी देकर आवेदन करें।']],
  [['When will I receive the balance?','बकाया भाड़ा कब मिलेगा?'],['Confirm the payment terms with the broker for your trip. Use your driver link to upload the delivery receipt and request the outstanding amount.','अपनी ट्रिप की भुगतान शर्तें ब्रोकर से तय करें। ड्राइवर लिंक से डिलीवरी की रसीद भेजें और बकाया भाड़ा माँगें।']],
  [['What if the truck is delayed?','गाड़ी लेट हो तो क्या करें?'],['Drivers can report a halt with their location and reason through the driver portal. Customers can check their tracking link or call dispatch with the trip reference.','ड्राइवर पोर्टल पर गाड़ी रुकने की जगह और वजह बताएँ। ग्राहक ट्रैकिंग लिंक देख सकते हैं या ट्रिप नंबर देकर डिस्पैच टीम से बात कर सकते हैं।']]
];
function subscribe(listener:()=>void){
  window.addEventListener('setu-language',listener);
  return ()=>window.removeEventListener('setu-language',listener);
}
export function HomeGuide(){
  const i=useSyncExternalStore(subscribe,getLanguage)==='hi'?1:0;
  return <div className="home-guide container" data-react-i18n="">
    <section aria-labelledby="service-title"><h2 id="service-title">{['Freight services','माल ढुलाई सेवाएँ'][i]}</h2>
      <div className="guide-grid">{services.map(s=><article key={s.href}><h3>{s.title[i]}</h3><p>{s.body[i]}</p><a href={s.href}>{s.link[i]} ↗</a></article>)}</div>
    </section>
    <section aria-labelledby="faq-title" className="home-faq"><h2 id="faq-title">{['Booking questions','बुकिंग से जुड़े सवाल'][i]}</h2>
      <div>{questions.map(([q,a])=><details key={q[0]}><summary>{q[i]}</summary><p>{a[i]}</p></details>)}</div>
    </section></div>;
}
