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
  const doc=document.implementation.createHTMLDocument('Aagaz tickets');doc.documentElement.lang='en';
  const style=doc.createElement('style');style.textContent='body{font:16px Arial;max-width:800px;margin:30px auto;padding:20px}article{border:1px solid #bbb;padding:24px;margin:20px 0;break-inside:avoid}img{width:220px;height:220px}code{font-size:10px;overflow-wrap:anywhere}';doc.head.append(style);
  const title=doc.createElement('h1');title.textContent=(data.mode==='test'?'TEST — NOT VALID FOR EVENT ENTRY · ':'')+data.event.eventName;doc.body.append(title);
  const previewTitle=document.createElement('p');previewTitle.textContent=title.textContent;tickets.append(previewTitle);
  const details=doc.createElement('p');details.textContent=`${data.event.eventDate} · ${data.event.startTime} IST · ${data.event.venueName} · Booking ${data.bookingId}. Named passes; ID required at the venue.`;doc.body.append(details);
  for(const ticket of data.tickets){const article=doc.createElement('article'),name=doc.createElement('h2'),pass=doc.createElement('p'),image=doc.createElement('img'),code=doc.createElement('code');name.textContent=ticket.name;pass.textContent=ticket.pass==='alcohol'?'Alcohol-inclusive · 21+':'Non-alcoholic';image.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(ticket.svg);image.alt='Entry QR for '+ticket.name;code.textContent=ticket.code;article.append(name,pass,image,doc.createElement('br'),code);doc.body.append(article);const preview=document.importNode(article,true);preview.className='ticket-preview';preview.setAttribute('aria-label','Ticket for '+ticket.name);tickets.append(preview);}
  if(ticketFileUrl)URL.revokeObjectURL(ticketFileUrl);
  const blob=new Blob(['<!doctype html>'+doc.documentElement.outerHTML],{type:'text/html;charset=utf-8'}),link=document.createElement('a');ticketFileUrl=URL.createObjectURL(blob);link.href=ticketFileUrl;link.download=`aagaz-${data.bookingId}-tickets.html`;link.textContent='Save tickets file';tickets.append(link);link.click();message.textContent='Your named tickets are shown below. If the download did not start, use Save tickets file. Keep your QRs private; the saved file can be printed or saved as PDF.';
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
