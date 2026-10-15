export const DEFAULT_SETTINGS=Object.freeze({
  eventName:'Aagaz',eventDate:'2026-11-06',startTime:'15:00',endTime:'00:00',barCloseTime:'22:00',
  venueName:'Sukh Saklana Haveli: Royalty',venueLocation:'Rishikesh, Uttarakhand',
  supportPhone:'+91 9897798748',supportEmail:'',alertEmail:'',
  merchantName:'Avyanta Hotels',paymentUrl:'https://razorpay.me/@avyantahotels',
  merchantLegalName:'KGS GLOBAL PRIVATE LIMITED',merchantAddress:'B-3, Ganga Nagri, Shivalik Nagar, Haridwar-249402, Uttarakhand',
  merchantEmail:'kgsglobalpvtltd@gmail.com',merchantGstin:'05AAMCK1954E1ZL',
  normalPrice:2999,alcoholPrice:3999,normalDescription:'Entry + unlimited non-alcoholic drinks.',
  alcoholDescription:'Entry + unlimited non-alcoholic drinks + 8 alcoholic drink coupons. Exact menu and measures to be confirmed.',
  capacity:200,warningAt:150,maxPerBooking:5,
  extraPerPerson:null,extraPerBooking:null,chargesConfirmed:false,
});
export function validateSettings(input){
  if(!input||typeof input!=='object'||Array.isArray(input))throw new Error('Enter valid event settings.');
  /** @type {Record<string, any>} */
  const out={};
  const textFields={eventName:80,eventDate:10,startTime:5,endTime:5,barCloseTime:5,venueName:160,venueLocation:160,supportPhone:30,supportEmail:180,alertEmail:180,merchantName:120,merchantLegalName:160,merchantAddress:500,merchantEmail:180,merchantGstin:15,paymentUrl:500,normalDescription:500,alcoholDescription:500};
  for(const [key,max]of Object.entries(textFields)){
    const value=['merchantLegalName','merchantAddress','merchantEmail','merchantGstin'].includes(key)&&input[key]===undefined?DEFAULT_SETTINGS[key]:input[key];
    if(typeof value!=='string'||value.length>max||/[\u0000-\u001f]/.test(value))throw new Error(`Check ${key}.`);
    out[key]=value.trim();
  }
  for(const key of ['eventName','venueName','venueLocation','supportPhone','merchantName','merchantLegalName','merchantAddress','merchantEmail','normalDescription','alcoholDescription'])if(!out[key])throw new Error(`Enter ${key}.`);
  if(!/^\d{4}-\d{2}-\d{2}$/.test(out.eventDate)||Number.isNaN(Date.parse(out.eventDate+'T00:00:00Z'))||new Date(out.eventDate+'T00:00:00Z').toISOString().slice(0,10)!==out.eventDate)throw new Error('Enter a valid event date.');
  for(const key of ['startTime','endTime','barCloseTime'])if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(out[key]))throw new Error('Check event times.');
  if(!/^\+?[\d ()-]{8,30}$/.test(out.supportPhone)||out.supportPhone.replace(/\D/g,'').length>15)throw new Error('Check the support phone number.');
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
  if(typeof input.chargesConfirmed!=='boolean')throw new Error('Check whether final charges are confirmed.');out.chargesConfirmed=input.chargesConfirmed;
  if(out.chargesConfirmed&&(out.extraPerPerson===null||out.extraPerBooking===null))throw new Error('Set both charges, including an explicit zero if none, before confirming them.');
  return out;
}
