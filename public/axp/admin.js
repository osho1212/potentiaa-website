const el=id=>document.getElementById(id);
let revision=0;
const sections=[
 ['Event details',[['eventName','Event name'],['eventDate','Event date','date'],['startTime','Start time · IST','time'],['endTime','End time · IST (00:00 = following midnight)','time'],['barCloseTime','Last service · IST','time'],['eventSubtitle','Event subtitle · under the title'],['eventTagline','Event tagline'],['eventDescription','Event description · shown under the hero','textarea'],['eventHighlights','What’s on · comma separated','textarea'],['instagramHandle','Instagram handle · e.g. @axpsocial'],['venueName','Venue name'],['venueLocation','Venue location'],['venueMapQuery','Map pin · "lat,lng" or a place search'],['venueMapsUrl','Google Maps share link · optional','url']]],
 ['Contacts',[['supportPhone','Public support phone','tel'],['supportEmail','Public support email · optional','email'],['alertEmail','Private capacity-alert email · optional','email']]],
 ['Organiser brands',[['potentiaaPhone','POTENTIAA phone · optional','tel'],['potentiaaLogo','POTENTIAA logo path · e.g. /axp/potentiaa-logo.png'],['avyantaPhone','AVYANTA phone · optional','tel'],['avyantaLogo','AVYANTA logo path · e.g. /axp/avyanta-logo.png']]],
 ['Passes and prices',[['normalPrice','Silver single · ₹','number'],['alcoholPrice','Gold single · ₹','number'],['normalGroupPrice','Silver couple or group, each · ₹','number'],['alcoholGroupPrice','Gold couple or group, each · ₹','number'],['normalDescription','Silver pass benefits','textarea'],['alcoholDescription','Gold pass benefits','textarea'],['extraPerPerson','Additional charge per person · ₹ (blank = unconfirmed)','number'],['extraPerBooking','Additional charge per booking · ₹ (blank = unconfirmed)','number']]],
 ['Early bird · full payment only',[['earlyBirdEnabled','Early bird is on','checkbox'],['earlyBirdEndDate','Ends on','date'],['earlyBirdEndTime','Ends at · IST','time'],['earlyBirdCap','Early-bird passes available','number'],['earlyNormalPrice','Silver single · ₹','number'],['earlyAlcoholPrice','Gold single · ₹','number'],['earlyNormalGroupPrice','Silver couple or group, each · ₹','number'],['earlyAlcoholGroupPrice','Gold couple or group, each · ₹','number']]],
 ['Pre-booking',[['prebookEnabled','Guests can pre-book with a deposit','checkbox'],['depositPerPerson','Deposit per person · ₹ (non-refundable)','number'],['remindersEnabled','Email balance reminders to pre-bookings','checkbox'],['reminderDates','Reminder dates · YYYY-MM-DD, comma separated · sent about 9 am IST']]],
 ['Booking limits',[['capacity','Approved event capacity · people','number'],['warningAt','Early warning · confirmed people','number'],['maxPerBooking','Maximum passes per booking · 1–10','number']]],
 ['Collecting merchant',[['merchantName','Authorised collecting merchant name'],['merchantLegalName','Registered business name'],['merchantAddress','Registered business address','textarea'],['merchantEmail','Public merchant contact email','email'],['merchantGstin','Merchant GSTIN · optional'],['paymentUrl','Razorpay payment page URL','url']]],
];
const numeric=new Set(['normalPrice','alcoholPrice','normalGroupPrice','alcoholGroupPrice','earlyNormalPrice','earlyAlcoholPrice','earlyNormalGroupPrice','earlyAlcoholGroupPrice','depositPerPerson','earlyBirdCap','extraPerPerson','extraPerBooking','capacity','warningAt','maxPerBooking']);
const checkboxes=new Set(['earlyBirdEnabled','prebookEnabled','remindersEnabled']);
function buildForm(){
 for(const [title,fields]of sections){const panel=document.createElement('section');panel.className='panel';const heading=document.createElement('h2');heading.textContent=title;panel.append(heading);const grid=document.createElement('div');grid.className='field-grid';
  for(const [key,labelText,type='text']of fields){const label=document.createElement('label');label.textContent=labelText;const field=document.createElement(type==='textarea'?'textarea':'input');field.id=key;field.name=key;if(type!=='textarea')field.type=type;else field.rows=3;
   if(type==='number'){field.min='0';field.step=['capacity','warningAt','maxPerBooking','earlyBirdCap'].includes(key)?'1':'0.01';}if(key==='maxPerBooking')field.max='10';
   if(type==='checkbox'){label.classList.add('check');label.prepend(field);grid.append(label);continue;}
   field.required=!['reminderDates','supportEmail','alertEmail','merchantGstin','extraPerPerson','extraPerBooking','eventSubtitle','eventTagline','eventDescription','eventHighlights','instagramHandle','venueMapQuery','venueMapsUrl','potentiaaPhone','potentiaaLogo','avyantaPhone','avyantaLogo'].includes(key);label.append(field);grid.append(label);
  }panel.append(grid);el('setting-sections').append(panel);
 }
}
async function load(){
 el('save-message').textContent='';el('access-panel').hidden=false;
 try{const response=await fetch('/api/admin/settings',{cache:'no-store'});const data=await response.json();
  if(!response.ok){el('settings-form').hidden=true;el('access-message').textContent=data.error||'Could not load settings.';el('admin-signin').hidden=response.status!==403;window.dispatchEvent(new Event('organiser-access-changed'));return;}
  revision=data.revision;for(const [,fields]of sections)for(const [key]of fields){if(checkboxes.has(key))el(key).checked=!!data.settings[key];else el(key).value=data.settings[key]??'';}
  el('chargesConfirmed').checked=data.settings.chargesConfirmed;el('merchant-open').href=data.settings.paymentUrl;
  el('whatsappEnabled').checked=!!data.settings.whatsappEnabled;
  el('whatsapp-status').textContent=data.whatsappConfigured?'Meta credentials are present on this deployment. Ticking the box starts sending passes on the next paid booking.':'No Meta credentials on this deployment yet. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN and redeploy; until then paid bookings fall back to email only.';
  el('settings-form').hidden=false;el('access-panel').hidden=true;el('save-message').textContent=data.updatedAt?`Last saved ${new Date(data.updatedAt).toLocaleString()}.`:'Your initial settings are loaded. Save to keep them in the site’s settings store.';
 }catch{el('access-message').textContent='Could not load settings. Please reload the page.';}
}
el('settings-form').addEventListener('submit',async event=>{
 event.preventDefault();const settings={};for(const [,fields]of sections)for(const [key]of fields){if(checkboxes.has(key)){settings[key]=el(key).checked;continue;}const v=el(key).value;settings[key]=numeric.has(key)?(v===''?null:Number(v)):v;}
 settings.chargesConfirmed=el('chargesConfirmed').checked;settings.whatsappEnabled=el('whatsappEnabled').checked;el('save-settings').disabled=true;el('save-message').textContent='Saving…';
 try{const response=await fetch('/api/admin/settings',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({settings,revision})});const data=await response.json();if(!response.ok){if(response.status===403){window.dispatchEvent(new Event('organiser-access-changed'));el('settings-form').hidden=true;el('access-panel').hidden=false;el('access-message').textContent=data.error;el('admin-signin').hidden=false;}throw new Error(data.error||'Could not save settings.');}revision=data.revision;el('merchant-open').href=data.settings.paymentUrl;el('save-message').textContent='Saved for the whole site. Open the booking form to see your changes.';window.dispatchEvent(new Event('organiser-settings-saved'));}
 catch(e){el('save-message').textContent=e.message||'Could not save settings.';}finally{el('save-settings').disabled=false;}
});
el('reload-settings').addEventListener('click',load);buildForm();load();
window.addEventListener('organiser-access-changed',()=>{el('settings-form').hidden=true;el('access-panel').hidden=false;el('access-message').textContent='Your organiser access has changed. Sign in with an authorised account.';el('admin-signin').hidden=false;});
// Signing out lives here rather than in an onclick attribute: the page sets
// script-src 'self', so an inline handler never runs.
el('lock-signout')?.addEventListener('click',async()=>{el('lock-signout').disabled=true;try{await fetch('/api/axp/admin/auth',{method:'DELETE'});}finally{location.reload();}});
