const el=id=>document.getElementById(id);
const testMode=new URLSearchParams(location.search).get('mode')==='test';
let paymentReady=false,checkoutScript=null,attempt=null,polling=false,savedBooking=null,ticketFileUrl=null;
const button=el('payment-button');
const card=document.createElement('section');card.className='panel booking-confirmation';card.hidden=true;card.setAttribute('aria-label','Booking status');el('booking-form').after(card);
const heading=document.createElement('h2');heading.textContent='Your booking';const message=document.createElement('p');message.setAttribute('role','status');const tickets=document.createElement('div');tickets.className='ticket-list';
const savedDetails=document.createElement('div');
const refresh=document.createElement('button');refresh.type='button';refresh.className='secondary';refresh.textContent='Check payment status';refresh.addEventListener('click',poll);
const download=document.createElement('button');download.type='button';download.className='secondary';download.textContent='Download tickets';download.hidden=true;download.addEventListener('click',downloadTickets);
const resume=document.createElement('button');resume.type='button';resume.className='secondary';resume.textContent='Resume this checkout';resume.hidden=true;resume.addEventListener('click',async()=>{try{await loadCheckout();openGateway(await request('/api/bookings/'+attempt.id+'/checkout'));}catch(error){message.textContent=error.message;}});
const another=document.createElement('button');another.type='button';another.className='secondary';another.textContent='Start another booking';another.hidden=true;another.addEventListener('click',()=>{sessionStorage.removeItem('axp-last-booking');location.reload();});
card.append(heading,message,savedDetails,tickets,refresh,resume,download,another);
const confirmationDownload=document.createElement('button');confirmationDownload.type='button';confirmationDownload.className='secondary';confirmationDownload.textContent='Save WhatsApp confirmation image';confirmationDownload.hidden=true;card.append(confirmationDownload);
confirmationDownload.addEventListener('click',async()=>{
 confirmationDownload.disabled=true;
 try{
  const response=await fetch('/api/bookings/'+attempt.id+'/confirmation-image',{cache:'no-store',headers:{Authorization:'Bearer '+attempt.accessToken}});
  if(!response.ok){const data=await response.json();throw new Error(data.error||'Could not prepare confirmation image.');}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='aagaz-'+attempt.id+'.png';link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
  message.textContent='Your confirmation image includes the booking QR. Show it to the organiser, who can check in the people arriving from your group.';
 }catch(error){message.textContent=error.message;}finally{confirmationDownload.disabled=false;}
});
function freezeForm(){el('booking-form').inert=true;document.querySelector('.passes').inert=true;el('plus').disabled=true;el('minus').disabled=true;}
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
  if(testMode){document.querySelector('.preview').textContent='ORGANISER TEST MODE — no real money. Only test credentials are used.';el('payment-status-title').textContent=paymentReady?'Test checkout ready':'Test checkout needs setup';el('payment-status-description').textContent=paymentReady?'A successful test does not reserve a place at the live event.':'Add Test Mode API keys and confirm the event’s additional charges in organiser settings.';document.querySelector('.privacy').textContent='Organiser test mode saves test buyer and attendee details and payment references for verification. Use fictional details. No real money is taken.';}
  else if(paymentReady){document.querySelector('.preview').textContent='BOOKINGS OPEN · Named passes · Secure payment by Razorpay';el('payment-status-title').textContent='Secure payments enabled';el('payment-status-description').textContent='Your amount is calculated and checked on our server. Tickets are issued after payment is verified.';document.querySelector('.privacy').textContent='Your details are used for booking, tickets and entry checks. Payment details are entered in Razorpay checkout. Booking does not subscribe you to marketing.';}
  updateButton();
 }catch{paymentReady=false;updateButton();}
 try{const previous=JSON.parse(sessionStorage.getItem('axp-last-booking'));if(previous?.idempotencyKey&&previous.accessToken){attempt=previous;card.hidden=false;freezeForm();await poll();updateButton();}}catch{}
}
function loadCheckout(){
 if(window.Razorpay)return Promise.resolve();if(checkoutScript)return checkoutScript;
 checkoutScript=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://checkout.razorpay.com/v1/checkout.js';script.onload=resolve;script.onerror=()=>{checkoutScript=null;script.remove();reject(new Error('Razorpay checkout could not load. Check your connection.'));};document.head.append(script);});return checkoutScript;
}
function bookingInput(){
 const buyer={name:el('buyer-name').value,instagram:el('buyer-instagram').value,phone:el('buyer-phone').value,email:el('buyer-email').value};
 const attendees=[...document.querySelectorAll('.attendee')].map((_,i)=>Object.fromEntries(['name','instagram','phone','age','pass'].map(key=>[key,el(`guest-${i}-${key}`).value])));
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
 confirmationDownload.hidden=booking.status!=='confirmed';
 savedBooking=booking;renderSavedSummary(booking);
 heading.textContent=(booking.mode==='test'?'TEST · ':'')+'Booking '+booking.id;
 const labels={confirmed:'Payment verified. Your named tickets are ready to download.',pending:'Awaiting verified payment. Do not make another payment if money was deducted.',creating:'Payment order is still being prepared.',order_uncertain:'Payment order needs a support check. Contact the organiser before retrying.',paid_review:'Payment needs organiser review. No valid ticket has been issued. Contact event support.',refunded:'This payment was refunded. Its tickets are invalid.'};
 message.textContent=labels[booking.status]||'Contact event support to check this booking.';download.hidden=booking.status!=='confirmed';resume.hidden=booking.status!=='pending'||booking.expiresAt<=new Date().toISOString();another.hidden=!['confirmed','refunded'].includes(booking.status);
 if(booking.status==='pending'&&resume.hidden)message.textContent='This checkout hold has expired. Check payment status or contact event support before making another payment. No ticket has been issued.';
 if(booking.status==='confirmed'||booking.status==='refunded'||booking.status==='paid_review')polling=false;
}
function renderSavedSummary(booking){
 if(!booking.pricing||!booking.attendees)return;
 const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:booking.currency||'INR',maximumFractionDigits:2}).format(value);
 const normal=booking.attendees.filter(guest=>guest.pass==='normal').length,alcohol=booking.attendees.length-normal;
 el('normal-line').textContent=`${normal} × ${money(booking.pricing.normalPrice)}`;el('alcohol-line').textContent=`${alcohol} × ${money(booking.pricing.alcoholPrice)}`;
 el('people-line').textContent=String(booking.people);el('subtotal').textContent=money(booking.pricing.subtotal);el('extra-charge-total').textContent=money(booking.pricing.extraCharges);el('final-total').textContent=money(booking.total);
 el('confirmed-charges').hidden=false;el('charges-pending').hidden=true;button.hidden=true;el('booking-form').hidden=true;document.querySelector('.passes').hidden=true;
 const testBox=document.querySelector('.axp-test-payment-box');if(testBox)testBox.hidden=true;
 const summary=document.createElement('p');summary.textContent=`${booking.people} named ${booking.people===1?'pass':'passes'} · Total payable: ${money(booking.total)}`;
 const list=document.createElement('ul');for(const guest of booking.attendees){const row=document.createElement('li');row.textContent=guest.name+' · '+(guest.pass==='alcohol'?'Alcohol-inclusive · 21+':'Non-alcoholic');list.append(row);}savedDetails.replaceChildren(summary,list);
}
async function poll(){if(!attempt)return;try{let booking;if(attempt.id)booking=await request('/api/bookings/'+attempt.id);else{booking=await request('/api/bookings/recover',{body:{mode:attempt.mode,idempotencyKey:attempt.idempotencyKey}});attempt.id=booking.id;saveAttempt();}showBooking(booking);}catch(error){message.textContent=error.message;}}
async function startPolling(){if(polling)return;polling=true;for(let i=0;i<12&&polling;i++){await new Promise(resolve=>setTimeout(resolve,5000));await poll();}polling=false;}
async function downloadTickets(){
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
  previewTitle.textContent=`${eventName} · ${eventDate} · ${venueName}`;
  tickets.append(previewTitle);

  for(const ticket of data.tickets){
    const article=doc.createElement('article');article.className='pass-card';
    const tag=doc.createElement('span');tag.className='pass-type';
    tag.textContent=ticket.pass==='alcohol'?'Alcohol-inclusive Pass · 21+':'Classic Pass · Non-alcoholic';
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
  link.textContent='Save passes file';
  tickets.append(link);
  link.click();
  message.textContent='Your official named pass is ready! The pass file has been downloaded with your entry QR code.';
 }catch(error){message.textContent=error.message;}
}

function initTest1RsButton(){
 const testBtn=el('test-1rs-button');
 const testState=el('test-1rs-state');
 if(!testBtn)return;

 function updateTestButton(){
  const name=el('buyer-name')?.value.trim();
  const phone=el('buyer-phone')?.value.trim();
  const email=el('buyer-email')?.value.trim();
  const hasName=name&&name.length>=2;
  const hasPhone=phone&&phone.replace(/\D/g,'').length>=8;
  const hasEmail=email&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if(attempt){
   testBtn.disabled=true;
   if(testState)testState.textContent='An existing booking is being processed below.';
  }else if(hasName&&hasPhone&&hasEmail){
   testBtn.disabled=false;
   if(testState)testState.textContent='Ready! Click to test ₹1.00 payment with live Razorpay.';
  }else{
   testBtn.disabled=true;
   const missing=[];
   if(!hasName)missing.push('name');
   if(!hasPhone)missing.push('phone');
   if(!hasEmail)missing.push('email');
   if(testState)testState.textContent='Enter your '+missing.join(', ')+' in Section 02 to enable ₹1 test.';
  }
 }

 window.addEventListener('booking-readiness-updated',updateTestButton);
 for(const id of ['buyer-name','buyer-phone','buyer-email']){
  const input=el(id);
  if(input){
   input.addEventListener('input',updateTestButton);
   input.addEventListener('change',updateTestButton);
  }
 }
 updateTestButton();

 testBtn.addEventListener('click',async()=>{
  const name=el('buyer-name')?.value.trim();
  const phone=el('buyer-phone')?.value.trim();
  const email=el('buyer-email')?.value.trim();
  const instagram=el('buyer-instagram')?.value.trim()||'@test';

  if(!name||!phone||!email){
   updateTestButton();
   el('buyer-name')?.focus();
   return;
  }

  testBtn.disabled=true;
  if(testState)testState.textContent='Creating live ₹1.00 Razorpay order…';
  card.hidden=false;
  message.textContent='Creating your ₹1.00 live payment order…';
  card.scrollIntoView({behavior:'smooth',block:'start'});

  try{
   await loadCheckout();
   const res=await fetch('/api/payments/test-order',{
    method:'POST',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({buyer:{name,phone,email,instagram}})
   });
   const data=await res.json();
   if(!res.ok){
    throw new Error(data.error||'Could not create ₹1 test order.');
   }

   attempt={
    id:data.id,
    accessToken:data.id,
    idempotencyKey:'live:test-1rs-'+data.id,
    mode:'live'
   };
   saveAttempt();
   freezeForm();

   const options=data.checkout;
   resume.hidden=false;
   message.textContent=`₹1.00 Live Test Order created. Total payable: ₹1.00. Opening Razorpay…`;

   const checkout=new window.Razorpay({
    key:options.key,
    amount:options.amount,
    currency:options.currency,
    name:options.name,
    description:options.description,
    order_id:options.orderId,
    prefill:{
     name:options.prefill.name,
     email:options.prefill.email,
     contact:options.prefill.phone
    },
    theme:{color:'#294f3c'},
    handler:async response=>{
     message.textContent='Verifying your ₹1.00 payment with Razorpay…';
     try{
      const verifyRes=await fetch('/api/bookings/'+data.id+'/verify',{
       method:'POST',
       headers:{'Content-Type':'application/json'},
       body:JSON.stringify(response)
      });
      const verifiedData=await verifyRes.json();
      if(!verifyRes.ok){
       throw new Error(verifiedData.error||'Payment signature could not be verified.');
      }
      showBooking(verifiedData);
      message.textContent=`✅ Live payment of ₹1.00 verified! Payment ID: ${response.razorpay_payment_id}. Live Razorpay payments are working!`;
     }catch(err){
      message.textContent=err.message+' Payment was received by Razorpay.';
     }
    },
    modal:{
     ondismiss:()=>{
      message.textContent='Checkout closed. Click "Check payment status" or retry ₹1 test.';
      testBtn.disabled=false;
      updateTestButton();
     }
    }
   });

   checkout.on('payment.failed',()=>{
    message.textContent='The payment was not completed in Razorpay.';
    testBtn.disabled=false;
    updateTestButton();
   });

   checkout.open();
  }catch(err){
   message.textContent=err.message;
   if(testState)testState.textContent=err.message;
   testBtn.disabled=false;
   updateTestButton();
  }
 });
}

loadConfig();
initTest1RsButton();
