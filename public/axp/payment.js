const el=id=>document.getElementById(id);
const testMode=new URLSearchParams(location.search).get('mode')==='test';
let paymentReady=false,checkoutScript=null,attempt=null,polling=false,savedBooking=null,ticketFileUrl=null,emailjsConfig=null,emailDispatched=false;
const button=el('payment-button');
const card=document.createElement('section');card.className='panel booking-confirmation';card.hidden=true;card.setAttribute('aria-label','Booking status');el('booking-form').after(card);
const heading=document.createElement('h2');heading.textContent='Your booking';const message=document.createElement('p');message.setAttribute('role','status');const tickets=document.createElement('div');tickets.className='ticket-list';
const savedDetails=document.createElement('div');
const emailStatus=document.createElement('div');emailStatus.className='email-confirmation-status';emailStatus.hidden=true;
const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Check payment status';refresh.addEventListener('click',poll);
const download=document.createElement('button');download.type='button';download.className='primary';download.textContent='Download passes (.html)';download.hidden=true;download.addEventListener('click',()=>renderTickets(true));
const resendEmailBtn=document.createElement('button');resendEmailBtn.type='button';resendEmailBtn.className='secondary';resendEmailBtn.textContent='Resend passes to email';resendEmailBtn.hidden=true;
resendEmailBtn.addEventListener('click',async()=>{if(!savedBooking)return;resendEmailBtn.disabled=true;resendEmailBtn.textContent='Sending passes…';await sendConfirmationEmail(savedBooking,true);resendEmailBtn.disabled=false;resendEmailBtn.textContent='Resend passes to email';});
const resume=document.createElement('button');resume.type='button';resume.className='secondary';resume.textContent='Resume this checkout';resume.hidden=true;resume.addEventListener('click',async()=>{try{await loadCheckout();openGateway(await request('/api/bookings/'+attempt.id+'/checkout'));}catch(error){message.textContent=error.message;}});
const another=document.createElement('button');another.type='button';another.className='secondary';another.textContent='Start another booking';another.hidden=true;another.addEventListener('click',()=>{sessionStorage.removeItem('axp-last-booking');location.reload();});
const confirmationMap=document.createElement('section');confirmationMap.className='confirmation-map';confirmationMap.hidden=true;
const confirmationMapTitle=document.createElement('p');confirmationMapTitle.className='confirmation-map-title';confirmationMapTitle.textContent='Getting there';
const confirmationMapFrame=document.createElement('div');confirmationMapFrame.className='map-frame map-frame-small';
const confirmationMapIframe=document.createElement('iframe');confirmationMapIframe.title='Map showing the venue location';confirmationMapIframe.loading='lazy';confirmationMapIframe.referrerPolicy='no-referrer-when-downgrade';
const confirmationMapLink=document.createElement('a');confirmationMapLink.className='venue-link';confirmationMapLink.target='_blank';confirmationMapLink.rel='noopener noreferrer';confirmationMapLink.textContent='Open in Google Maps ↗';
confirmationMapFrame.append(confirmationMapIframe);confirmationMap.append(confirmationMapTitle,confirmationMapFrame,confirmationMapLink);
// The venue map belongs after the pass, not before it: it matters on the day,
// not when the booking lands. app.js owns the settings fetch and publishes the
// embed url, which can arrive after a saved booking has already rendered.
function syncConfirmationMap(){
 const embed=document.documentElement.dataset.mapEmbed||'';
 const link=document.getElementById('venue-directions');
 const href=link&&!link.hidden?link.href:'';
 if(embed&&confirmationMapIframe.getAttribute('src')!==embed)confirmationMapIframe.src=embed;
 confirmationMapFrame.hidden=!embed;
 confirmationMapLink.href=href||'#';confirmationMapLink.hidden=!href;
 confirmationMap.hidden=!embed&&!href;
}
window.addEventListener('axp-settings-loaded',()=>{if(savedBooking&&savedBooking.status==='confirmed')syncConfirmationMap();});
card.append(heading,message,savedDetails,emailStatus,tickets,refresh,resume,download,resendEmailBtn,another,confirmationMap);
function freezeForm(){el('booking-form').inert=true;const nav=document.querySelector('.axp-steps');if(nav)nav.inert=true;el('plus').disabled=true;el('minus').disabled=true;}
function updateButton(){
 button.disabled=!paymentReady||el('review-booking-button').disabled||!!attempt;
 button.classList.toggle('primary',!button.disabled);button.textContent=paymentReady?(testMode?'Start test payment':'Pay with Razorpay'):'Razorpay payment unavailable';
 if(attempt)el('payment-form-state').textContent='An existing booking is being checked. Use its payment status controls below.';
 else if(!el('review-booking-button').disabled)el('payment-form-state').textContent=paymentReady?'Required details complete. Check the booking summary before opening checkout.':'Required details complete. Payments are still unavailable in this preview.';
 if(savedBooking)renderSavedSummary(savedBooking);
}
window.addEventListener('booking-readiness-updated',updateButton);
function saveAttempt(){try{sessionStorage.setItem('axp-last-booking',JSON.stringify(attempt));}catch{}}
async function request(path,{body,auth=true}={}){
 const response=await fetch(path,{method:body?'POST':'GET',cache:'no-store',headers:{...(body?{'Content-Type':'application/json'}:{}),...(auth&&attempt?.accessToken?{Authorization:'Bearer '+attempt.accessToken}:{})},...(body?{body:JSON.stringify(body)}:{})});
 const data=await response.json();if(!response.ok){const error=new Error(data.error||'Could not check this booking.');error.status=response.status;throw error;}return data;
}
async function loadConfig(){
 try{
  const config=await request(testMode?'/api/admin/payment-setup':'/api/payment-config',{auth:false});paymentReady=testMode?config.testReady:config.salesOpen;
  if(config.emailjs)emailjsConfig=config.emailjs;
  if(testMode){document.querySelector('.preview').textContent='ORGANISER TEST MODE — no real money. Only test credentials are used.';el('payment-status-title').textContent=paymentReady?'Test checkout ready':'Test checkout needs setup';el('payment-status-description').textContent=paymentReady?'A successful test does not reserve a place at the live event.':'Add Test Mode API keys and confirm the event’s additional charges in organiser settings.';document.querySelector('.privacy').textContent='Organiser test mode saves test buyer and attendee details and payment references for verification. Use fictional details. No real money is taken.';}
  else if(paymentReady){document.querySelector('.preview').textContent='BOOKINGS OPEN · Named passes · Secure payment by Razorpay';el('payment-status-title').textContent='Secure payments enabled';el('payment-status-description').textContent='Your amount is calculated and checked on our server. Tickets are issued after payment is verified.';document.querySelector('.privacy').textContent='Your details are used for booking, tickets and entry checks. Payment details are entered in Razorpay checkout. Booking does not subscribe you to marketing.';}
  updateButton();
 }catch{paymentReady=false;updateButton();}
 const urlParams=new URLSearchParams(window.location.search);
 const urlBookingId=urlParams.get('booking')||urlParams.get('booking_id');
 if(urlBookingId){
  attempt={id:urlBookingId,accessToken:urlBookingId,idempotencyKey:'url:'+urlBookingId,mode:testMode?'test':'live',fromUrl:true};
  saveAttempt();card.hidden=false;freezeForm();await poll();updateButton();
  setTimeout(()=>card.scrollIntoView({behavior:'smooth',block:'start'}),200);
 }else{
  try{const previous=JSON.parse(sessionStorage.getItem('axp-last-booking'));if(previous?.idempotencyKey&&previous.accessToken){attempt=previous;card.hidden=false;freezeForm();await poll();updateButton();}}catch{}
 }
}
async function sendConfirmationEmail(booking,isResend=false){
 if(!booking||(!isResend&&emailDispatched))return;
 const buyerName=booking.buyer?.name||el('buyer-name')?.value?.trim()||'Guest';
 const buyerEmail=(booking.buyer?.email||el('buyer-email')?.value?.trim()||'').toLowerCase();
 if(!buyerEmail)return;
 const cfg=emailjsConfig||{serviceId:'service_59d1ylv',templateId:'template_x1xmkvu',publicKey:'wUJPfRnz1y09Ms68T'};
 if(!cfg.serviceId||!cfg.templateId||!cfg.publicKey)return;
 const attendeesList=(booking.attendees&&booking.attendees.length>0)
  ? booking.attendees.map((a,i)=>`${i+1}. ${a.name} — ${a.pass==='alcohol'?'Gold Pass · 21+':'Silver Pass'}${a.instagram?' ('+a.instagram+')':''}`).join('\n')
  : `1. ${buyerName} — Silver Pass`;
 const amount=typeof booking.total==='number'?`₹${booking.total.toLocaleString('en-IN')}`:(booking.amountPaise?`₹${(booking.amountPaise/100).toLocaleString('en-IN')}`:'₹1.00');
 const passLink=window.location.origin+'/axp-social?booking='+encodeURIComponent(booking.id||'')+'#passes';

 const recipients=[{
  name:buyerName,
  email:buyerEmail,
  isBuyer:true,
  count:String(booking.people||(booking.attendees?booking.attendees.length:1)),
  amount:amount,
  list:attendeesList
 }];

 if(Array.isArray(booking.attendees)){
  for(const guest of booking.attendees){
   const guestEmail=(guest.email||'').trim().toLowerCase();
   if(guestEmail&&guestEmail!==buyerEmail&&!recipients.some(r=>r.email.toLowerCase()===guestEmail)){
    recipients.push({
     name:guest.name||'Guest',
     email:guest.email.trim(),
     isBuyer:false,
     count:'1 (Personal Pass)',
     amount:'Paid by '+buyerName,
     list:`• ${guest.name} — ${guest.pass==='alcohol'?'Gold Pass · 21+':'Silver Pass'}${guest.instagram?' ('+guest.instagram+')':''}\n(Booked in group order by ${buyerName})`
    });
   }
  }
 }

 const sentEmails=[];
 for(const r of recipients){
  try{
   const res=await fetch('https://api.emailjs.com/api/v1.0/email/send',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({
     service_id:cfg.serviceId,
     template_id:cfg.templateId,
     user_id:cfg.publicKey,
     template_params:{
      to_name:r.name,
      to_email:r.email,
      booking_id:booking.id,
      booking_id_short:booking.id?booking.id.slice(0,8):'AAGAZ',
      guest_count:r.count,
      amount_paid:r.amount,
      attendees_list:r.list,
      pass_link:passLink,
     }
    })
   });
   if(res.ok){
    sentEmails.push(r.email);
   }else{
    console.warn('EmailJS response status for',r.email,res.status,await res.text());
   }
  }catch(err){
   console.warn('EmailJS error for',r.email,err);
  }
 }

 if(sentEmails.length>0){
  emailDispatched=true;
  emailStatus.textContent=`✉️ Passes and order confirmation email sent to: ${sentEmails.join(', ')}. Check inbox or spam folder.`;
  emailStatus.hidden=false;
  resendEmailBtn.hidden=false;
 }
}
function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();if(checkoutScript)return checkoutScript;
 checkoutScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{checkoutScript=null;script.remove();reject(new Error('Razorpay checkout could not load. Check your connection.'));};document.head.append(script);});return checkoutScript;
}
function bookingInput(){
 const buyer={name:el('buyer-name').value,instagram:el('buyer-instagram').value,phone:el('buyer-phone').value,email:el('buyer-email').value};
 const attendees=[...document.querySelectorAll('.attendee')].map((_,i)=>Object.fromEntries(['name','email','instagram','phone','dob','pass'].map(key=>[key,el(`guest-${i}-${key}`).value])));
 return {buyer,attendees,terms:el('booking-terms').checked,mode:testMode?'test':'live',accessToken:attempt.accessToken,idempotencyKey:attempt.idempotencyKey};
}
button.addEventListener('click',async()=>{
 if(!paymentReady)return;
 el('check-required-fields').click();if(el('review-booking-button').disabled)return;
 attempt={accessToken:[...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join(''),idempotencyKey:crypto.randomUUID(),mode:testMode?'test':'live'};updateButton();
 card.hidden=false;message.textContent='Checking availability and creating your payment order…';card.scrollIntoView({behavior:'smooth',block:'start'});
 let orderRequested=false;
 try{
  await loadCheckout();saveAttempt();orderRequested=true;const booking=await request('/api/bookings',{body:bookingInput(),auth:false});attempt.id=booking.id;saveAttempt();freezeForm();openGateway(booking);
 }catch(error){message.textContent=error.message;if(orderRequested&&![400,403,409,413,415,429].includes(error.status)){freezeForm();message.textContent+=' Use Check payment status before retrying. No ticket has been issued.';}else{attempt=null;try{sessionStorage.removeItem('axp-last-booking');}catch{}updateButton();}}
});
function openGateway(booking){
  if(booking.pricing){savedBooking=booking;renderSavedSummary(booking);}
  const options=booking.checkout;resume.hidden=false;message.textContent=`${testMode?'TEST · ':''}Booking ${booking.id}. Total payable: ₹${booking.total.toLocaleString('en-IN')}. Your checkout hold lasts until ${new Date(booking.expiresAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})} IST.`;
  const checkout=new window.Razorpay({key:options.key,amount:options.amount,currency:options.currency,name:options.name,description:options.description,order_id:options.orderId,prefill:{name:options.prefill.name,email:options.prefill.email,contact:options.prefill.phone},theme:{color:'#294f3c'},handler:async response=>{
   message.textContent='Verifying your payment. Keep this page open…';
   try{showBooking(await request('/api/bookings/'+attempt.id+'/verify',{body:response}));if(!download.hidden)return;startPolling();}catch(error){message.textContent=error.message+' Do not pay again; use Check payment status or contact support.';}
  },modal:{ondismiss:()=>{message.textContent='Checkout closed. Use Check payment status before starting another booking.';}}});
  checkout.on('payment.failed',()=>{message.textContent='The payment was not completed. Check payment status before retrying; contact support if money was deducted.';});checkout.open();
}
function showBooking(booking){
 savedBooking=booking;renderSavedSummary(booking);
 heading.textContent=(booking.mode==='test'?'TEST · ':'')+'Booking '+booking.id;
 const labels={confirmed:'Payment verified. Your named passes are ready below.',pending:'Awaiting verified payment. Do not make another payment if money was deducted.',creating:'Payment order is still being prepared.',order_uncertain:'Payment order needs a support check. Contact the organiser before retrying.',paid_review:'Payment needs organiser review. No valid ticket has been issued. Contact event support.',refunded:'This payment was refunded. Its tickets are invalid.'};
 message.textContent=labels[booking.status]||'Contact event support to check this booking.';refresh.hidden=['confirmed','refunded'].includes(booking.status);confirmationMap.hidden=booking.status!=='confirmed';download.hidden=booking.status!=='confirmed';resume.hidden=booking.status!=='pending'||booking.expiresAt<=new Date().toISOString();another.hidden=!['confirmed','refunded'].includes(booking.status);
 if(booking.status==='confirmed'){
  const emails=[];
  if(booking.buyer?.email)emails.push(booking.buyer.email.toLowerCase());
  if(Array.isArray(booking.attendees)){
   for(const a of booking.attendees){
    if(a.email&&!emails.includes(a.email.toLowerCase())){
     emails.push(a.email.toLowerCase());
    }
   }
  }
  const emailList=emails.length>0?emails.join(', '):(booking.buyer?.email||'your registered email');
  emailStatus.innerHTML=`<strong>✉️ Passes & order confirmation emailed to:</strong> ${emailList}.<br><span style="display:inline-block;margin-top:4px;font-size:12px;opacity:0.9;">⚠️ If you don't see it in your Primary inbox, please check your <strong>Spam / Junk</strong> or <strong>Promotions</strong> folder.</span>`;
  emailStatus.hidden=false;
  resendEmailBtn.hidden=false;
  renderTickets(false);
  syncConfirmationMap();
  try{sessionStorage.removeItem('axp-booking-draft');}catch{}
  sendConfirmationEmail(booking);
 }
 if(booking.status==='pending'&&resume.hidden)message.textContent='This checkout hold has expired. Check payment status or contact event support before making another payment. No ticket has been issued.';
 if(booking.status==='confirmed'||booking.status==='refunded'||booking.status==='paid_review')polling=false;
}
function renderSavedSummary(booking){
 if(!booking.pricing||!booking.attendees)return;
 const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:booking.currency||'INR',maximumFractionDigits:2}).format(value);
 const normal=booking.attendees.filter(guest=>guest.pass==='normal').length,alcohol=booking.attendees.length-normal;
 el('normal-line').textContent=`${normal} × ${money(booking.pricing.normalPrice)}`;el('alcohol-line').textContent=`${alcohol} × ${money(booking.pricing.alcoholPrice)}`;
 el('people-line').textContent=String(booking.people);el('subtotal').textContent=money(booking.pricing.subtotal);el('extra-charge-total').textContent=money(booking.pricing.extraCharges);el('final-total').textContent=money(booking.total);
 el('confirmed-charges').hidden=false;el('charges-pending').hidden=true;button.hidden=true;el('booking-form').hidden=true;const stepsNav=document.querySelector('.axp-steps');if(stepsNav)stepsNav.hidden=true;
 const testBox=document.querySelector('.axp-test-payment-box');if(testBox)testBox.hidden=true;
 const summary=document.createElement('p');summary.textContent=`${booking.people} named ${booking.people===1?'pass':'passes'} · Total payable: ${money(booking.total)}`;
 const list=document.createElement('ul');for(const guest of booking.attendees){const row=document.createElement('li');row.textContent=guest.name+(guest.email?` (${guest.email})`:'')+' · '+(guest.pass==='alcohol'?'Gold · 21+':'Silver');list.append(row);}savedDetails.replaceChildren(summary,list);
}
// A saved attempt the server no longer knows (expired, purged, or a bad
// ?booking= link) must not strand the guest behind a dead card and a frozen
// form: forget it and hand the form back.
function releaseStaleAttempt(){
 attempt=null;polling=false;
 try{sessionStorage.removeItem('axp-last-booking');}catch{}
 card.hidden=true;
 el('booking-form').inert=false;
 const nav=document.querySelector('.axp-steps');if(nav)nav.inert=false;
 el('plus').disabled=false;el('minus').disabled=document.querySelectorAll('.attendee').length<=1;
 updateButton();
}
async function poll(){if(!attempt)return;try{let booking;if(attempt.id)booking=await request('/api/bookings/'+attempt.id);else{booking=await request('/api/bookings/recover',{body:{mode:attempt.mode,idempotencyKey:attempt.idempotencyKey}});attempt.id=booking.id;saveAttempt();}showBooking(booking);}catch(error){if(error.status===404){releaseStaleAttempt();return;}message.textContent=error.message;}}
async function startPolling(){if(polling)return;polling=true;for(let i=0;i<12&&polling;i++){await new Promise(resolve=>setTimeout(resolve,5000));await poll();}polling=false;}
async function renderTickets(triggerDownload=false){
 if(!attempt?.id)return;
 try{
  const data=await request('/api/bookings/'+attempt.id+'/tickets');tickets.replaceChildren();
  const eventName=data.event?.eventName||'Aagaz · AxP Social';
  const eventDate=data.event?.eventDate||'6 November 2026';
  const startTime=data.event?.startTime||'3 pm';
  const venueName=data.event?.venueName||'Sukh Saklana Haveli: Royalty, Rishikesh';

  const doc=document.implementation.createHTMLDocument('Aagaz passes · '+data.bookingId);
  doc.documentElement.lang='en';
  const style=doc.createElement('style');
  style.textContent=`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0c120e; color: #f4ede2; padding: 40px 20px; line-height: 1.5; }
    .ticket-container { max-width: 680px; margin: 0 auto; }
    header.ticket-header { text-align: center; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 1px solid rgba(197, 160, 89, 0.3); }
    .brand { font-size: 13px; font-weight: 700; letter-spacing: 3px; color: #c5a059; text-transform: uppercase; margin-bottom: 8px; }
    h1 { font-family: "Times New Roman", Times, Georgia, serif; font-size: 38px; font-weight: 400; color: #fdfbf7; margin-bottom: 10px; letter-spacing: 1px; }
    .event-meta { font-size: 14px; color: #b8c4bc; line-height: 1.6; }
    article.pass-card { background: #15221b; border: 1px solid #c5a059; border-radius: 14px; padding: 28px; margin: 24px 0; display: flex; flex-direction: column; align-items: center; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); page-break-inside: avoid; }
    .pass-type { display: inline-block; font-size: 11px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; color: #c5a059; background: rgba(197, 160, 89, 0.12); padding: 5px 14px; border-radius: 20px; margin-bottom: 14px; }
    h2.guest-name { font-size: 26px; font-weight: 600; color: #fff; margin-bottom: 18px; }
    .qr-wrap { background: #ffffff; padding: 14px; border-radius: 12px; margin-bottom: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
    .qr-wrap img { width: 220px; height: 220px; display: block; image-rendering: pixelated; }
    code.pass-code { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 10px; color: #8a9a8f; background: rgba(0,0,0,0.4); padding: 6px 12px; border-radius: 6px; word-break: break-all; max-width: 100%; display: block; }
    .notice { font-size: 12px; color: #8a9a8f; text-align: center; margin-top: 30px; line-height: 1.6; }
    @media print {
      body { background: #fff; color: #000; padding: 0; }
      article.pass-card { border: 2px solid #222; background: #fff; color: #000; box-shadow: none; }
      h1, h2.guest-name { color: #000; }
      .brand, .pass-type { color: #333; }
      .event-meta, .notice, code.pass-code { color: #555; }
    }
  `;
  doc.head.append(style);

  const container=doc.createElement('div');container.className='ticket-container';
  const header=doc.createElement('header');header.className='ticket-header';
  const brand=doc.createElement('p');brand.className='brand';brand.textContent='AxP Social · Official Event Pass';
  const title=doc.createElement('h1');title.textContent=(data.mode==='test'?'[TEST PASS] ':'')+eventName;
  const details=doc.createElement('p');details.className='event-meta';
  details.textContent=`${eventDate} · ${startTime} IST · ${venueName} · Booking #${data.bookingId.slice(0, 8)}`;
  header.append(brand,title,details);
  container.append(header);

  const previewTitle=document.createElement('p');
  previewTitle.className='ticket-list-title';
  previewTitle.textContent=`Official Entry Passes (${data.tickets.length})`;
  tickets.append(previewTitle);

  for(const ticket of data.tickets){
    const article=doc.createElement('article');article.className='pass-card';
    const tag=doc.createElement('span');tag.className='pass-type';
    tag.textContent=ticket.pass==='alcohol'?'Gold Pass · 21+':'Silver Pass';
    const name=doc.createElement('h2');name.className='guest-name';name.textContent=ticket.name;
    const qrWrap=doc.createElement('div');qrWrap.className='qr-wrap';
    const image=doc.createElement('img');
    const qrSrc=ticket.qrDataUrl||(ticket.svg?'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ticket.svg):'');
    image.src=qrSrc;
    image.alt='Entry QR for '+ticket.name;
    qrWrap.append(image);

    const code=doc.createElement('code');code.className='pass-code';
    code.textContent=ticket.code||ticket.entryCode||'';
    article.append(tag,name,qrWrap,code);
    container.append(article);

    const preview=document.importNode(article,true);
    preview.className='ticket-preview';
    preview.setAttribute('aria-label','Ticket for '+ticket.name);
    tickets.append(preview);
  }

  const notice=doc.createElement('p');notice.className='notice';
  notice.textContent='Named passes are non-transferable. Please present this QR code along with original photo ID at the venue gate for check-in.';
  container.append(notice);
  doc.body.append(container);

  if(ticketFileUrl)URL.revokeObjectURL(ticketFileUrl);
  const blob=new Blob(['<!doctype html>\n'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'});
  const link=document.createElement('a');
  ticketFileUrl=URL.createObjectURL(blob);
  link.href=ticketFileUrl;
  link.download=`axp-pass-${data.bookingId}.html`;
  link.textContent='Save passes file (.html)';
  link.className='secondary';
  link.className='ticket-download-link';
  tickets.append(link);

  if(triggerDownload){
   link.click();
   message.textContent='Your official pass file has been downloaded with all entry QR codes.';
  }
 }catch(error){
  console.warn('Could not load tickets:',error);
 }
}


loadConfig();
