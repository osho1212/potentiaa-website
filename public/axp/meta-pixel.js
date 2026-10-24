// The Meta Pixel on the AXP Social pages: what visitors from the ads do next,
// so Meta can report and optimise for enquiries and bookings. The page's
// route handler writes the pixel id into <meta name="meta-pixel-id"> only when
// META_PIXEL_ID is set; without it nothing loads and track() does nothing.
//
// Purchase and Lead carry an event id, so a server copy (Meta's Conversions
// API) can be added later without Meta counting either twice.
const pixelId=document.querySelector('meta[name="meta-pixel-id"]')?.content||'';

if(pixelId&&!window.fbq){
 // Meta's standard loader, unchanged except that it runs from this file:
 // the pages' security policy allows no inline scripts.
 !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments);};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s);}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');
 window.fbq('init',pixelId);
 window.fbq('track','PageView');
 // A tap on the phone number or WhatsApp is an enquiry too.
 document.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href^="tel:"],a[href*="wa.me/"],a[href*="api.whatsapp.com"]');
  if(link)track('Contact',{content_name:link.href.startsWith('tel:')?'Phone':'WhatsApp'});
 },{capture:true});
}

/** Sends one standard event. eventId lets Meta drop a duplicate of the same event. */
export function track(name,data={},eventId){
 if(!pixelId||!window.fbq)return;
 try{window.fbq('track',name,data,eventId?{eventID:eventId}:undefined);}catch{}
}
