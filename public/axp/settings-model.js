export const DEFAULT_SETTINGS=Object.freeze({
  eventName:'Aagaz',eventDate:'2026-11-06',startTime:'15:00',endTime:'00:00',barCloseTime:'22:00',
  eventSubtitle:'A private Diwali sundowner',eventTagline:'Where connections become celebrations.',
  eventHighlights:'Networking, Curated business pop-ups, Poker & chess, Open stage, DJ & music, Food & drinks, Fireworks finale',instagramHandle:'@axpsocial',
  eventDescription:'Aagaz is the first gathering of AxP Social: an afternoon at a restored Himalayan haveli that unfolds into an evening. A small and considered guest list, food and drink through the day, music as the light goes, and the kind of conversation that only happens when a room is the right size. Every pass is named, and the number of them is limited.',
  venueName:'Sukh Saklana Haveli: Royalty',venueLocation:'Rishikesh, Uttarakhand',
  venueMapQuery:'30.205913,78.233515',venueMapsUrl:'https://maps.app.goo.gl/6jjs4SCLQUx6tTKt6',
  supportPhone:'+91 9897798748',supportEmail:'',alertEmail:'',
  potentiaaPhone:'+91 82678 39736',potentiaaLogo:'/axp/potentiaa-logo.png',
  avyantaPhone:'+91 9897798748',avyantaLogo:'/axp/avyanta-logo.png',whatsappEnabled:false,
  merchantName:'Potentiaa',paymentUrl:'https://razorpay.me/@avyantahotels',
  merchantLegalName:'Potentiaa',merchantAddress:'Building No. 23, Shikhupur, Devpura, Haridwar, Uttarakhand 249401',
  merchantEmail:'contact@potentiaa.com',merchantGstin:'',
  normalPrice:2999,alcoholPrice:3999,normalDescription:'Entry, with soft drinks and mocktails through the evening.',
  alcoholDescription:'Entry, soft drinks and mocktails through the evening, plus 8 drink coupons. Exact menu and measures to be confirmed.',
  capacity:200,warningAt:150,maxPerBooking:5,
  extraPerPerson:null,extraPerBooking:null,chargesConfirmed:false,
});
const OPTIONAL_WITH_DEFAULTS=['eventSubtitle','eventTagline','eventDescription','eventHighlights','instagramHandle','merchantLegalName','merchantAddress','merchantEmail','merchantGstin','venueMapQuery','venueMapsUrl','potentiaaPhone','potentiaaLogo','avyantaPhone','avyantaLogo'];
export function buildMapEmbedUrl(query){
  const q=(query||'').trim();
  if(!q)return '';
  return `https://maps.google.com/maps?q=${encodeURIComponent(q)}&z=15&hl=en&output=embed`;
}
export function validateSettings(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Enter valid event settings.');
  /** @type {Record<string, any>} */
  const out={};
  const textFields={eventName:80,eventDate:10,startTime:5,endTime:5,barCloseTime:5,eventSubtitle:120,eventTagline:160,eventDescription:900,eventHighlights:400,instagramHandle:40,venueName:160,venueLocation:160,venueMapQuery:200,venueMapsUrl:500,supportPhone:30,supportEmail:180,alertEmail:180,potentiaaPhone:30,potentiaaLogo:300,avyantaPhone:30,avyantaLogo:300,merchantName:120,merchantLegalName:160,merchantAddress:500,merchantEmail:180,merchantGstin:15,paymentUrl:500,normalDescription:500,alcoholDescription:500};
  for(const [key,max]of Object.entries(textFields)){
    const value=OPTIONAL_WITH_DEFAULTS.includes(key)&&input[key]===undefined?DEFAULT_SETTINGS[key]:input[key];
    if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error(`Check ${key}.`);
    out[key]=value.trim();
  }
  for(const key of ['eventName','venueName','venueLocation','supportPhone','merchantName','merchantLegalName','merchantAddress','merchantEmail','normalDescription','alcoholDescription'])if(!out[key])throw new Error(`Enter ${key}.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.eventDate)||Number.isNaN(Date.parse(out.eventDate+'T00:00:00Z'))||new Date(out.eventDate+'T00:00:00Z').toISOString().slice(0,10)!==out.eventDate)throw new Error('Enter a valid event date.');
  for(const key of ['startTime','endTime','barCloseTime'])if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(out[key]))throw new Error('Check event times.');
  if(!/^\+?[\d ()-]{8,30}$/.test(out.supportPhone)||out.supportPhone.replace(/\D/g,'').length>15)throw new Error('Check the support phone number.');
  for(const key of ['potentiaaPhone','avyantaPhone']){const v=out[key];if(v&&(!/^\+?[\d ()-]{8,30}$/.test(v)||v.replace(/\D/g,'').length>15))throw new Error('Check the POTENTIAA and AVYANTA phone numbers.');}
  for(const key of ['potentiaaLogo','avyantaLogo']){const v=out[key];if(v&&!/^\/[\w\-./]+\.(?:png|jpg|jpeg|webp|svg)$/i.test(v))throw new Error('Each logo must be a site path such as /axp/potentiaa-logo.png.');}
  if(out.venueMapsUrl){let m;try{m=new URL(out.venueMapsUrl);}catch{throw new Error('Enter a valid Google Maps link.');}
    if(m.protocol!=='https:'||!['maps.app.goo.gl','goo.gl','maps.google.com','www.google.com','google.com'].includes(m.hostname))throw new Error('Use an HTTPS Google Maps link.');
    out.venueMapsUrl=m.href;}
  for(const key of ['supportEmail','alertEmail','merchantEmail'])if(out[key]&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(out[key]))throw new Error('Check email addresses.');
  out.merchantGstin=out.merchantGstin.toUpperCase();if(out.merchantGstin&&!/^[0-9A-Z]{15}$/.test(out.merchantGstin))throw new Error('Enter a 15-character GSTIN.');
  let url;try{url=new URL(out.paymentUrl);}catch{throw new Error('Enter a valid Razorpay URL.');}
  if(url.protocol!=='https:'||!['razorpay.me','pages.razorpay.com','rzp.io','rzp.io.in'].includes(url.hostname)||url.username||url.password)throw new Error('Use an HTTPS Razorpay payment URL.');
  out.paymentUrl=url.href;
  for(const key of ['normalPrice','alcoholPrice','extraPerPerson','extraPerBooking']){
    const value=input[key];if((key==='extraPerPerson'||key==='extraPerBooking')&&value===null){out[key]=null;continue;}
    if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>1000000||Math.abs(value*100-Math.round(value*100))>0.00001)throw new Error('Prices and charges must be valid rupee amounts with up to two decimals.');
    if((key==='normalPrice'||key==='alcoholPrice')&&value===0)throw new Error('Pass prices must be greater than zero.');out[key]=value;
  }
  for(const [key,max]of [['capacity',10000],['warningAt',10000],['maxPerBooking',5]]){const v=input[key];if(!Number.isInteger(v)||v<1||v>max)throw new Error(`Check ${key}.`);out[key]=v;}
  if(out.warningAt>out.capacity)throw new Error('Early warning cannot exceed capacity.');
  out.whatsappEnabled=typeof input.whatsappEnabled==='boolean'?input.whatsappEnabled:DEFAULT_SETTINGS.whatsappEnabled;
  if(typeof input.chargesConfirmed!=='boolean')throw new Error('Check whether final charges are confirmed.');out.chargesConfirmed=input.chargesConfirmed;
  if(out.chargesConfirmed&&(out.extraPerPerson===null||out.extraPerBooking===null))throw new Error('Set both charges, including an explicit zero if none, before confirming them.');
  return out;
}
