import {PASS_LABELS,FARE_LABELS} from './pricing.js';
const el=id=>document.getElementById(id);
const testMode=new URLSearchParams(location.search).get('mode')==='test';
let paymentReady=false,checkoutScript=null,attempt=null,polling=false,savedBooking=null,ticketFileUrl=null,emailDispatched=false;
const button=el('payment-button');
const card=document.createElement('section');card.className='panel booking-confirmation';card.hidden=true;card.setAttribute('aria-label','Booking status');el('booking-form').after(card);
const heading=document.createElement('h2');heading.textContent='Your booking';const message=document.createElement('p');message.setAttribute('role','status');const tickets=document.createElement('div');tickets.className='ticket-list';
const savedDetails=document.createElement('div');
const emailStatus=document.createElement('div');emailStatus.className='email-confirmation-status';emailStatus.hidden=true;
const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Check payment status';refresh.addEventListener('click',poll);
// The reference guests see everywhere, emails included: the id's first eight characters.
const bookingRef=id=>String(id||'').slice(0,8).toUpperCase();
// Each pass's QR saves as its own image; this one file holds them all, to print.
const download=document.createElement('button');download.type='button';download.className='secondary';download.textContent='Download all passes (printable)';download.hidden=true;download.addEventListener('click',()=>renderTickets(true));
const resendEmailBtn=document.createElement('button');resendEmailBtn.type='button';resendEmailBtn.className='secondary';resendEmailBtn.textContent='Resend passes to email';resendEmailBtn.hidden=true;
resendEmailBtn.addEventListener('click',async()=>{if(!savedBooking)return;resendEmailBtn.disabled=true;resendEmailBtn.textContent='Sending passes…';await sendConfirmationEmail(savedBooking,true);resendEmailBtn.disabled=false;resendEmailBtn.textContent='Resend passes to email';});
const resume=document.createElement('button');resume.type='button';resume.className='secondary';resume.textContent='Resume this checkout';resume.hidden=true;resume.addEventListener('click',async()=>{try{await loadCheckout();openGateway(await request('/api/bookings/'+attempt.id+'/checkout'));}catch(error){message.textContent=error.message;}});
// A pre-booking with only its deposit paid: what is due, and the button to pay
// it. The page stays usable for as long as a balance is due, with no end date.
const balanceBox=document.createElement('div');balanceBox.className='balance-due';balanceBox.id='balance';balanceBox.hidden=true;
const balanceText=document.createElement('p');const payBalance=document.createElement('button');payBalance.type='button';payBalance.className='primary pay-balance';
balanceBox.append(balanceText,payBalance);
payBalance.addEventListener('click',async()=>{
 if(!attempt?.id)return;payBalance.disabled=true;
 try{await loadCheckout();const data=await request('/api/bookings/'+attempt.id+'/balance',{body:{}});openRazorpay(data.checkout,'Verifying your balance payment. Keep this page open…');}
 catch(error){message.textContent=error.message;}finally{payBalance.disabled=false;}
});
const passLabel=guest=>`${PASS_LABELS[guest.pass]||'Silver'}${guest.pass==='alcohol'?' · 21+':''}${guest.fare&&guest.fare!=='single'?' · '+FARE_LABELS[guest.fare]:''}`;
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
card.append(heading,message,savedDetails,balanceBox,emailStatus,tickets,refresh,resume,download,resendEmailBtn,another,confirmationMap);
function freezeForm(){el('booking-form').inert=true;const nav=document.querySelector('.axp-steps');if(nav)nav.inert=true;el('plus').disabled=true;el('minus').disabled=true;}
function updateButton(){
 button.disabled=!paymentReady||el('review-booking-button').disabled||!!attempt;
 button.classList.toggle('primary',!button.disabled);
 const prebook=document.querySelector('input[name="booking-plan"]:checked')?.value==='prebook';
 button.textContent=paymentReady?(testMode?(prebook?'Start test deposit payment':'Start test payment'):(prebook?'Pay deposit with Razorpay':'Pay with Razorpay')):'Razorpay payment unavailable';
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
// The server sends every pass email, QR included, once per booking. This
// screen asks it whether that has happened, which also covers a booking the
// webhook confirmed while this tab was closed, and Resend asks for one more.
async function sendConfirmationEmail(booking,isResend=false){
 if(!booking?.id||(!isResend&&emailDispatched))return;
 const failed='Your passes could not be emailed just now. Try Resend in a minute, or download them below.';
 try{
  const response=await fetch('/api/bookings/'+encodeURIComponent(booking.id)+'/send-passes',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({resend:isResend})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok){showEmailStatus(data.error||failed,false);return;}
  emailDispatched=true;
  const list=(data.recipients||[]).join(', ');
  if(data.success&&list)showEmailStatus(`${isResend?'Sent again to':'Your passes were emailed to'} ${list}. If they are not in your inbox, check spam or promotions.`,true);
  else showEmailStatus(failed,false);
 }catch{showEmailStatus(failed,false);}
}
function showEmailStatus(text,ok){
 emailStatus.textContent=text;emailStatus.classList.toggle('is-error',!ok);
 emailStatus.hidden=false;resendEmailBtn.hidden=false;
}
function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();if(checkoutScript)return checkoutScript;
 checkoutScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{checkoutScript=null;script.remove();reject(new Error('Razorpay checkout could not load. Check your connection.'));};document.head.append(script);});return checkoutScript;
}
function bookingInput(){
 const buyer={name:el('buyer-name').value,instagram:el('buyer-instagram').value,phone:el('buyer-phone').value,email:el('buyer-email').value};
 const attendees=[...document.querySelectorAll('.attendee')].map((_,i)=>Object.fromEntries(['name','email','instagram','phone','dob','gender','pass'].map(key=>[key,el(`guest-${i}-${key}`).value])));
 const plan=document.querySelector('input[name="booking-plan"]:checked')?.value==='prebook'?'prebook':'full';
 return {buyer,attendees,plan,terms:el('booking-terms').checked,mode:testMode?'test':'live',accessToken:attempt.accessToken,idempotencyKey:attempt.idempotencyKey};
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
  resume.hidden=false;
  const rupees=value=>'₹'+Number(value).toLocaleString('en-IN');
  const amounts=booking.plan==='prebook'?`Deposit now: ${rupees(booking.payNow)}. Balance later: ${rupees(booking.total-booking.payNow)}.`:`Total payable: ${rupees(booking.total)}.`;
  message.textContent=`${testMode?'TEST · ':''}Booking ref ${bookingRef(booking.id)}. ${amounts} Your checkout hold lasts until ${new Date(booking.expiresAt).toLocaleTimeString('en-IN',{timeZone:'Asia/Kolkata'})} IST.`;
  openRazorpay(booking.checkout,'Verifying your payment. Keep this page open…');
}
function openRazorpay(options,verifying){
  const checkout=new window.Razorpay({key:options.key,amount:options.amount,currency:options.currency,name:options.name,description:options.description,order_id:options.orderId,prefill:{name:options.prefill.name,email:options.prefill.email,contact:options.prefill.phone},theme:{color:'#294f3c'},handler:async response=>{
   message.textContent=verifying;
   try{showBooking(await request('/api/bookings/'+attempt.id+'/verify',{body:response}));if(['confirmed','booked'].includes(savedBooking?.status))return;startPolling();}catch(error){message.textContent=error.message+' Do not pay again; use Check payment status or contact support.';refresh.hidden=false;}
  },modal:{ondismiss:()=>{message.textContent='Checkout closed. Use Check payment status before paying again.';refresh.hidden=false;}}});
  checkout.on('payment.failed',()=>{message.textContent='The payment was not completed. Check payment status before retrying; contact support if money was deducted.';refresh.hidden=false;});checkout.open();
}
function showBooking(booking){
 savedBooking=booking;renderSavedSummary(booking);
 // The reference is read out to support, so it is set in the plain body face.
 const ref=document.createElement('span');ref.className='booking-ref';ref.textContent=bookingRef(booking.id);
 heading.replaceChildren((booking.mode==='test'?'TEST · ':'')+'Booking ref ',ref);
 const labels={confirmed:'Paid in full. Your named passes are ready below.',booked:'Booked. Your deposit is received. Entry is by QR pass only, and you get your QR passes once you pay the balance below.',pending:'Awaiting verified payment. Do not make another payment if money was deducted.',creating:'Payment order is still being prepared.',order_uncertain:'Payment order needs a support check. Contact the organiser before retrying.',paid_review:'Payment needs organiser review. No valid ticket has been issued. Contact event support.',refunded:'This payment was refunded. Its tickets are invalid.'};
 message.textContent=labels[booking.status]||'Contact event support to check this booking.';refresh.hidden=['confirmed','refunded','booked'].includes(booking.status);confirmationMap.hidden=booking.status!=='confirmed';download.hidden=booking.status!=='confirmed';resume.hidden=booking.status!=='pending'||booking.expiresAt<=new Date().toISOString();another.hidden=!['confirmed','refunded','booked'].includes(booking.status);
 balanceBox.hidden=booking.status!=='booked';
 if(booking.status==='booked'){
  const rupees=value=>'₹'+Number(value||0).toLocaleString('en-IN');
  balanceText.textContent=`Paid so far: ${rupees(booking.paid)} of ${rupees(booking.total)}. Balance due: ${rupees(booking.balanceDue)}. Pay it here by UPI whenever you like, or in cash at the venue. Entry is by QR pass only: your QR passes are emailed as soon as the booking is paid in full. Paying at the venue? Our team records it and issues your passes before you enter.`;
  payBalance.textContent=`Pay balance ${rupees(booking.balanceDue)}`;
  try{sessionStorage.removeItem('axp-booking-draft');}catch{}
 }
 if(booking.status==='confirmed'){
  emailStatus.textContent='Sending your passes to your email…';emailStatus.classList.remove('is-error');
  emailStatus.hidden=false;
  resendEmailBtn.hidden=false;
  renderTickets(false);
  syncConfirmationMap();
  try{sessionStorage.removeItem('axp-booking-draft');}catch{}
  sendConfirmationEmail(booking);
 }
 if(booking.status==='pending'&&resume.hidden)message.textContent='This checkout hold has expired. Check payment status or contact event support before making another payment. No ticket has been issued.';
 if(['confirmed','refunded','paid_review','booked'].includes(booking.status))polling=false;
}
function renderSavedSummary(booking){
 if(!booking.attendees)return;
 const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:booking.currency||'INR',minimumFractionDigits:value%1?2:0,maximumFractionDigits:2}).format(value);
 button.hidden=true;el('booking-form').hidden=true;const stepsNav=document.querySelector('.axp-steps');if(stepsNav)stepsNav.hidden=true;
 // The step nav and its "Step 1 of 5" caption describe the form, which is gone.
 document.body.classList.add('has-booking');
 const testBox=document.querySelector('.axp-test-payment-box');if(testBox)testBox.hidden=true;
 const summary=document.createElement('p');
 summary.textContent=`${booking.people} named ${booking.people===1?'pass':'passes'} · Total: ${money(booking.total)}`+(booking.plan==='prebook'?` · Paid: ${money(booking.paid||0)} · Balance due: ${money(booking.balanceDue||0)}`:'');
 const list=document.createElement('ul');
 for(const guest of booking.attendees){const row=document.createElement('li');row.textContent=guest.name+(guest.email?` (${guest.email})`:'')+' · '+passLabel(guest)+(typeof guest.unitPaise==='number'?' · '+money(guest.unitPaise/100):'');list.append(row);}
 savedDetails.replaceChildren(summary,list);
}
// A saved attempt the server no longer knows (expired, purged, or a bad
// ?booking= link) must not strand the guest behind a dead card and a frozen
// form: forget it and hand the form back.
function releaseStaleAttempt(){
 attempt=null;polling=false;
 try{sessionStorage.removeItem('axp-last-booking');}catch{}
 card.hidden=true;document.body.classList.remove('has-booking');
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
    tag.textContent=(ticket.pass==='alcohol'?'Gold Pass · 21+':'Silver Pass')+(ticket.fare&&ticket.fare!=='single'?' · '+FARE_LABELS[ticket.fare]:'');
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
    // Guests show the QR from their phone at the gate, so each one saves as an
    // image. The PNG comes from the server, same origin, so the name sticks.
    const entry=ticket.entryCode||ticket.code;
    if(entry){
     const save=document.createElement('a');save.className='qr-save-link';
     save.href='/api/axp/pass-qr?code='+encodeURIComponent(entry);
     save.download=`aagaz-pass-${String(ticket.name||'guest').trim().toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')||'guest'}.png`;
     save.textContent='Save QR image';
     preview.append(save);
    }
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
  link.download=`aagaz-passes-${bookingRef(data.bookingId)}.html`;
  // The visible button is "Download all passes"; this link only carries the file.
  link.hidden=true;
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
