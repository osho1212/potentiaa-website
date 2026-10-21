import jsQR from '/axp/jsqr.js';
import {FARE_LABELS,GENDER_LABELS} from '/axp/pricing.js';

const el=id=>document.getElementById(id);
let entries=[],inspected=null,stream=null,scanning=false,inspectionVersion=0,cameraVersion=0,loading=null;
const time=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Not checked in';
const passName=value=>value==='alcohol'?'Gold · 21+':'Silver';
// "Gold · 21+ · Couple · Woman" at the gate: the fare and gender a couple's
// photo IDs are checked against.
const gateLabel=guest=>[passName(guest.pass),guest.fare&&guest.fare!=='single'?FARE_LABELS[guest.fare]:'',GENDER_LABELS[guest.gender]||''].filter(Boolean).join(' · ');
const rupees=value=>'₹'+Number(value||0).toLocaleString('en-IN');
const STATUS_LABELS={confirmed:'Fully paid',booked:'Booked · balance due',pending:'Checkout open',creating:'Checkout opening',paid_review:'Payment needs review',order_uncertain:'Order needs a check',refunded:'Refunded'};
// whatsapp_status is per attendee: 'sent' when their number is in the delivery
// receipt, 'failed' when it is not, 'not_applicable' when the booking carries no
// receipt at all — delivery was off (or the booking never got paid).
function whatsappCell(item){
  if(item.whatsapp_status==='sent')return{cls:'wa-sent',lines:['Pass sent',item.whatsapp_detail?'+'+item.whatsapp_detail:'']};
  if(item.whatsapp_status==='failed')return{cls:'wa-failed',lines:['Not delivered',item.whatsapp_detail||'']};
  return{cls:'wa-off',lines:['Not applicable',item.status==='confirmed'?'WhatsApp delivery was off':'Booking not confirmed']};
}
function stop(){cameraVersion++;scanning=false;stream?.getTracks().forEach(track=>track.stop());stream=null;el('scanner-video').hidden=true;el('stop-camera').hidden=true;}
function clearInspection(){inspectionVersion++;inspected=null;el('checkin-roster').replaceChildren();el('confirm-checkin').hidden=true;el('checkin-result').textContent='';}
async function request(url,body){
  const response=await fetch(url,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json();
  if(!response.ok){if(response.status===403&&url.startsWith('/api/admin/bookings')){stop();clearInspection();el('dashboard-content').hidden=true;el('dashboard-signin').hidden=false;}throw new Error(data.error||'Could not load organiser data.');}
  return data;
}
function rows(){
  const query=el('booking-search').value.toLowerCase();el('booking-rows').replaceChildren();
  const filtered=entries.filter(e=>[e.name,e.email,e.instagram,e.buyer_name,e.buyer_email,e.id,e.gateway_payment].join(' ').toLowerCase().includes(query));
  const imageBookings=new Set(),balanceBookings=new Set(),deleteBookings=new Set();
  for(const item of filtered){
    const row=document.createElement('tr'),whatsapp=whatsappCell(item);
    const pass=[passName(item.pass_type),item.fare&&item.fare!=='Single'?item.fare:'',typeof item.price==='number'?rupees(item.price):''].filter(Boolean).join(' · ');
    const payment=[item.id,STATUS_LABELS[item.status]||item.status,`Total ${rupees(item.total)} · Paid ${rupees(item.paid)}`,item.balance_due>0?`Balance due ${rupees(item.balance_due)}`:'',item.status==='booked'&&item.reminded?`Reminded: ${item.reminded}`:'',[item.source==='manual'?'Manual':'Online',item.payment_methods].filter(Boolean).join(' · '),item.gateway_payment||''];
    for(const lines of [[item.name,pass],payment,[item.buyer_name,item.buyer_email,item.buyer_phone],[item.email||'No email',item.instagram,item.phone,[item.age_group==='20'?'20 years':'21+',item.gender].filter(Boolean).join(' · ')],whatsapp.lines,[time(item.checked_in_at)]]){
      const cell=document.createElement('td');for(const line of lines.filter(Boolean)){const div=document.createElement('div');div.textContent=line;cell.append(div);}row.append(cell);
    }
    row.children[4].className=whatsapp.cls;
    if(item.status==='confirmed'&&!imageBookings.has(item.id)){
      imageBookings.add(item.id);
      const emailBtn=document.createElement('button');emailBtn.type='button';emailBtn.className='secondary confirmation-download';emailBtn.textContent='Email passes';
      emailBtn.addEventListener('click',async()=>{emailBtn.disabled=true;emailBtn.textContent='Sending email…';try{
        // The server sends it, with each guest's QR, exactly as at checkout. This
        // used to call EmailJS from here, which the page's connect-src blocked.
        const response=await fetch('/api/bookings/'+encodeURIComponent(item.id)+'/send-passes',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({resend:true})});
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||'The passes could not be emailed.');
        el('dashboard-message').textContent=data.success?`Passes emailed to: ${(data.recipients||[]).join(', ')}.`:'The passes could not be emailed. Check the EmailJS settings and try again.';
      }catch(err){el('dashboard-message').textContent='Email error: '+err.message;}finally{emailBtn.disabled=false;emailBtn.textContent='Email passes';}});row.children[1].append(emailBtn);
    }
    if(item.status==='booked'&&!balanceBookings.has(item.id)){
      balanceBookings.add(item.id);
      const wrap=document.createElement('div');wrap.className='record-balance';
      const method=document.createElement('select');method.append(new Option('Cash','cash'),new Option('UPI','upi'));method.setAttribute('aria-label','How the balance was paid');
      const record=document.createElement('button');record.type='button';record.className='secondary';record.textContent=`Record ${rupees(item.balance_due)} received`;
      record.addEventListener('click',async()=>{
        if(!window.confirm(`Record ${rupees(item.balance_due)} received by ${method.value==='upi'?'UPI':'cash'} for ${item.buyer_name}? The booking becomes fully paid and its QR passes are emailed.`))return;
        record.disabled=true;
        try{
          const response=await fetch('/api/admin/bookings/'+encodeURIComponent(item.id)+'/payment',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method:method.value})});
          const data=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(data.error||'The payment could not be recorded.');
          const sent=data.emailDelivery?.recipients?.length?` to ${data.emailDelivery.recipients.join(', ')}`:'';
          // After the refresh, which rewrites this line with the mode notice.
          await load();
          el('dashboard-message').textContent=data.status==='confirmed'?`Balance recorded for ${item.buyer_name}. Fully paid; QR passes emailed${sent}.`:`Payment recorded for ${item.buyer_name}. ${rupees(data.balanceDue)} still due.`;
        }catch(err){el('dashboard-message').textContent='Payment error: '+err.message;record.disabled=false;}
      });
      wrap.append(method,record);row.children[1].append(wrap);
    }

    // Actions column (Check-in / Reset entry + Delete booking)
    const actionsCell=document.createElement('td');actionsCell.className='action-cell';
    const actionGroup=document.createElement('div');actionGroup.className='action-group';
    const isEntered=!!(item.checked_in||item.checked_in_at);
    const checkinBtn=document.createElement('button');checkinBtn.type='button';
    checkinBtn.className=isEntered?'btn-action btn-checkin-reset':'btn-action btn-checkin-toggle';
    checkinBtn.textContent=isEntered?'Reset entry':'Check in';
    checkinBtn.title=isEntered?`Reset entry check-in for ${item.name}`:`Mark ${item.name} as checked in`;
    checkinBtn.addEventListener('click',async()=>{
      const action=isEntered?'reset':'checkin';
      const promptMsg=isEntered
        ?`Reset entry for ${item.name} (${item.buyer_name})? They will be marked as not entered.`
        :`Manually check in ${item.name} (${item.buyer_name}) without scanning QR?`;
      if(!window.confirm(promptMsg))return;
      checkinBtn.disabled=true;checkinBtn.textContent='Updating…';
      try{
        const response=await fetch('/api/admin/bookings/'+encodeURIComponent(item.id)+'/check-in',{
          method:'POST',
          headers:{'Content-Type':'application/json'},
          body:JSON.stringify({attendeeId:item.attendee_id,action}),
        });
        const data=await response.json().catch(()=>({}));
        if(!response.ok)throw new Error(data.error||'Failed to update entry status.');
        el('dashboard-message').textContent=data.message||`Entry updated for ${item.name}.`;
        await load();
      }catch(err){
        el('dashboard-message').textContent='Entry toggle error: '+err.message;
        checkinBtn.disabled=false;checkinBtn.textContent=isEntered?'Reset entry':'Check in';
      }
    });
    actionGroup.append(checkinBtn);

    if(!deleteBookings.has(item.id)){
      deleteBookings.add(item.id);
      const deleteBtn=document.createElement('button');deleteBtn.type='button';
      deleteBtn.className='btn-action btn-delete-booking';
      deleteBtn.textContent='Delete booking';
      deleteBtn.title=`Permanently delete booking for ${item.buyer_name}`;
      deleteBtn.addEventListener('click',async()=>{
        const shortId=(item.id||'').slice(0,8);
        const confirmMsg=`⚠️ Delete booking ${shortId} for ${item.buyer_name}?\n\nThis will permanently remove the booking, all ${item.guest_count||1} attendee records, and payment records from Firestore.\n\nClick OK to confirm deletion.`;
        if(!window.confirm(confirmMsg))return;
        deleteBtn.disabled=true;deleteBtn.textContent='Deleting…';
        try{
          const response=await fetch('/api/admin/bookings/'+encodeURIComponent(item.id),{
            method:'DELETE',
          });
          const data=await response.json().catch(()=>({}));
          if(!response.ok)throw new Error(data.error||'The booking could not be deleted.');
          el('dashboard-message').textContent=`Booking ${shortId} (${item.buyer_name}) deleted.`;
          await load();
        }catch(err){
          el('dashboard-message').textContent='Delete error: '+err.message;
          deleteBtn.disabled=false;deleteBtn.textContent='Delete booking';
        }
      });
      actionGroup.append(deleteBtn);
    }
    actionsCell.append(actionGroup);
    row.append(actionsCell);

    el('booking-rows').append(row);
  }
  el('booking-row-count').textContent=`Showing ${filtered.length} of ${entries.length} attendee rows (latest 2,000 maximum).`;
}
function saveFile(blob,name){const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=name;link.click();setTimeout(()=>URL.revokeObjectURL(url),60000);}
async function load(){
  if(loading)return loading;
  const mode=el('dashboard-mode').value;
  loading=(async()=>{try{
    const data=await request('/api/admin/bookings?mode='+mode);if(mode!==el('dashboard-mode').value)return;
    entries=data.entries;el('dashboard-content').hidden=false;el('dashboard-signin').hidden=true;
    el('dashboard-message').textContent=mode==='test'?'TEST bookings — not valid for live event entry.':'Live event bookings';
    el('export-bookings').href='/api/admin/bookings?export=csv&mode='+mode;el('booking-totals').replaceChildren();
    for(const [label,value] of [['Fully paid attendees',data.attendance.confirmed],['Entered',data.attendance.checked_in],['Still to arrive',data.attendance.remaining],['Booked, balance due',data.totals.booked_with_balance??0],['Places held in checkout',data.totals.held],['Received',rupees((data.totals.collected||0)/100)],['Balance outstanding',rupees((data.totals.outstanding||0)/100)],['Payments needing review',data.totals.needs_review]]){
      const item=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;item.append(strong,span);el('booking-totals').append(item);
    }
    el('attendance-summary').textContent=`${data.attendance.checked_in} entered · ${data.attendance.remaining} still to arrive · ${data.attendance.confirmed} confirmed${mode==='test'?' · TEST ONLY':''}`;
    el('booking-notices').replaceChildren();for(const notice of data.notices){const item=document.createElement('li');item.textContent=notice.message+' · '+time(notice.created_at)+' · Email: '+notice.delivery_status;el('booking-notices').append(item);}rows();
  }catch(error){el('dashboard-message').textContent=error.message;}finally{loading=null;}})();return loading;
}
// A couple on the couple price whose genders do not match their photo IDs
// pays the difference to the single price before entry; staff record it here.
function coupleCheck(bookingId,names,attendeeId,difference){
  const box=document.createElement('div');box.className='couple-check';
  const text=document.createElement('p');
  text.textContent=`${names.join(' and ')} ${names.length>1?'are':'is'} on the couple price. If their genders do not match their photo IDs, they pay ${rupees(difference)} more before entry.`;
  const method=document.createElement('select');method.append(new Option('Cash','cash'),new Option('UPI','upi'));method.setAttribute('aria-label','How the difference was paid');
  const record=document.createElement('button');record.type='button';record.className='secondary';record.textContent=`Record ${rupees(difference)} difference`;
  record.addEventListener('click',async()=>{
    if(!window.confirm(`Record ${rupees(difference)} received by ${method.value==='upi'?'UPI':'cash'}? ${names.join(' and ')} move to the single price.`))return;
    record.disabled=true;
    try{
      const response=await fetch('/api/admin/bookings/'+encodeURIComponent(bookingId)+'/couple-difference',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({attendeeId,method:method.value})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(data.error||'The difference could not be recorded.');
      await inspect();
      el('checkin-result').textContent=`${rupees(data.recorded)} recorded. ${names.join(' and ')} are now on the single price. Confirm their entry when ready.`;
      load();
    }catch(err){el('checkin-result').textContent=err.message;record.disabled=false;}
  });
  const actions=document.createElement('div');actions.className='couple-check-actions';actions.append(method,record);
  box.append(text,actions);return box;
}
function showBooking(data){
  el('checkin-roster').replaceChildren();
  for(const guest of data.attendees){
    const label=document.createElement('label');label.className='checkin-person';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=guest.id;checkbox.disabled=!!guest.checkedInAt;
    checkbox.setAttribute('aria-label','Admit '+guest.name);const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=guest.name;
    detail.textContent=gateLabel(guest)+' · '+(guest.checkedInAt?'Already entered: '+time(guest.checkedInAt):'Not entered');text.append(name,detail);label.append(checkbox,text);el('checkin-roster').append(label);
  }
  const seen=new Set();
  for(const guest of data.attendees){
    if(guest.fare!=='couple'||!(guest.coupleDifference>0)||seen.has(guest.id))continue;
    const partner=data.attendees.find(other=>other.id===guest.partnerId);
    seen.add(guest.id);if(partner)seen.add(partner.id);
    el('checkin-roster').append(coupleCheck(data.bookingId,[guest.name,partner?.name].filter(Boolean),guest.id,guest.coupleDifference));
  }
  el('checkin-result').textContent=`${data.mode==='test'?'TEST — not valid for live entry. ':''}${data.buyerName} · ${data.people} ${data.people===1?'guest':'guests'} · ${data.checkedIn} entered. Select only the people arriving and check their photo ID.`;
  el('confirm-checkin').textContent='Confirm selected entries';el('confirm-checkin').hidden=data.checkedIn===data.people;
}
async function inspect(){
  clearInspection();const version=inspectionVersion,code=el('ticket-code').value.trim(),mode=el('dashboard-mode').value;
  el('inspect-ticket').disabled=true;el('checkin-result').textContent='Checking QR…';
  try{
    const data=await request('/api/admin/check-in',{code,mode});if(version!==inspectionVersion)return;
    inspected={code,mode,kind:data.kind};
    if(data.kind==='booking')showBooking(data);
    else{
      el('checkin-result').textContent=`${data.mode==='test'?'TEST — not valid for live entry. ':''}${data.name} · ${gateLabel(data)} · ${data.checkedInAt?'Already checked in: '+time(data.checkedInAt):'Valid pass. Check photo ID before confirming entry.'}`;
      el('confirm-checkin').textContent='Confirm attendee entry';el('confirm-checkin').hidden=!!data.checkedInAt;
      if(data.fare==='couple'&&data.coupleDifference>0)el('checkin-roster').append(coupleCheck(data.bookingId,[data.name,data.partnerName].filter(Boolean),data.attendeeId,data.coupleDifference));
    }
  }catch(error){if(version===inspectionVersion)el('checkin-result').textContent=error.message;}finally{el('inspect-ticket').disabled=false;}
}
// Stall applications are enquiries rather than bookings, so they load on their
// own and a failure here must not take the guest list down with it.
async function loadStalls(){
  try{
    const response=await fetch('/api/admin/stalls',{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'Stall enquiries could not be loaded.');
    const rows=Array.isArray(data.enquiries)?data.enquiries:[];
    el('stall-state').textContent=rows.length?`${rows.length} stall ${rows.length===1?'enquiry':'enquiries'}.`:'No stall enquiries yet.';
    el('stall-rows').replaceChildren(...rows.map(item=>{
      const row=document.createElement('tr');
      for(const lines of [[item.businessName],[item.contactName,item.phone,item.email||'No email'],[item.offering,item.notes||''],[time(item.createdAt)]]){
        const cell=document.createElement('td');
        for(const line of lines.filter(Boolean)){const div=document.createElement('div');div.textContent=line;cell.append(div);}
        row.append(cell);
      }
      return row;
    }));
  }catch(error){el('stall-state').textContent=error.message||'Stall enquiries could not be loaded.';}
}
el('refresh-dashboard').addEventListener('click',()=>{load();loadStalls();});
el('send-reminders')?.addEventListener('click',async()=>{
  const mode=el('dashboard-mode').value,button=el('send-reminders');
  if(!window.confirm(`Email a balance reminder to every ${mode==='test'?'TEST ':''}booking with a balance due? Anyone already reminded today is skipped.`))return;
  button.disabled=true;
  try{
    const data=await request('/api/admin/reminders',{mode});
    await load();
    el('dashboard-message').textContent=`Balance reminders: ${data.sent} sent${data.failed?`, ${data.failed} not sent (${data.errors[0]||'check the email settings'})`:''}${data.skipped?`, ${data.skipped} already reminded today`:''}.`;
  }catch(error){el('dashboard-message').textContent='Reminder error: '+error.message;}
  finally{button.disabled=false;}
});
// Signing out lives here rather than in an onclick attribute: the page sets
// script-src 'self', so an inline handler never runs.
el('lock-signout')?.addEventListener('click',async()=>{el('lock-signout').disabled=true;try{await fetch('/api/axp/admin/auth',{method:'DELETE'});}finally{location.reload();}});
el('dashboard-mode').addEventListener('change',async()=>{stop();clearInspection();if(loading)await loading;await load();});
el('booking-search').addEventListener('input',rows);
el('inspect-ticket').addEventListener('click',inspect);el('ticket-code').addEventListener('input',clearInspection);
el('confirm-checkin').addEventListener('click',async()=>{
  if(!inspected||inspected.code!==el('ticket-code').value.trim()||inspected.mode!==el('dashboard-mode').value)return;
  const current=inspected,version=inspectionVersion;
  const attendeeIds=[...el('checkin-roster').querySelectorAll('input:checked:not(:disabled)')].map(input=>input.value);
  if(current.kind==='booking'&&!attendeeIds.length){el('checkin-result').textContent='Select at least one person arriving from this booking.';return;}
  el('confirm-checkin').disabled=true;
  try{
    const data=await request('/api/admin/check-in',{code:current.code,mode:current.mode,confirm:true,attendeeIds});if(version!==inspectionVersion)return;
    if(data.kind==='booking'){showBooking(data);el('checkin-result').textContent=`${data.mode==='test'?'TEST · ':''}${data.admitted} ${data.admitted===1?'person':'people'} entered now. ${data.checkedIn} of ${data.people} entered for ${data.buyerName}. ${data.admitted===0?'Selected attendees were already entered.':'Remaining guests can use the same QR when they arrive.'}`;}
    else{el('checkin-result').textContent=(data.mode==='test'?'TEST · ':'')+data.name+' · '+(data.alreadyCheckedIn?'Already checked in':'Entry confirmed')+' · '+time(data.checkedInAt);el('confirm-checkin').hidden=true;}
    await load();
  }catch(error){if(version===inspectionVersion)el('checkin-result').textContent=error.message;}finally{el('confirm-checkin').disabled=false;}
});
const canvas=document.createElement('canvas'),context=canvas.getContext('2d',{willReadFrequently:true});
function decode(source,width,height){
  if(!width||!height)return null;const scale=Math.min(1,1600/Math.max(width,height));canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);context.drawImage(source,0,0,canvas.width,canvas.height);
  const pixels=context.getImageData(0,0,canvas.width,canvas.height);
  const scanner=(typeof jsQR==='function')?jsQR:(typeof window!=='undefined'&&typeof window.jsQR==='function')?window.jsQR:null;
  if(!scanner){console.warn('QR scanner not ready');return null;}
  return scanner(pixels.data,pixels.width,pixels.height,{inversionAttempts:'dontInvert'})?.data;
}
async function scanned(code){stop();el('ticket-code').value=code;await inspect();}
el('stop-camera').addEventListener('click',stop);window.addEventListener('pagehide',stop);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
el('scan-ticket').addEventListener('click',async()=>{
  try{
    stop();clearInspection();if(!navigator.mediaDevices?.getUserMedia)throw new Error('Camera access needs HTTPS and a supported browser. You can upload the QR image instead.');
    const version=cameraVersion,newStream=await navigator.mediaDevices.getUserMedia({video:{facingMode:{ideal:'environment'}},audio:false});
    if(version!==cameraVersion){newStream.getTracks().forEach(track=>track.stop());return;}stream=newStream;
    const video=el('scanner-video');video.srcObject=stream;video.hidden=false;el('stop-camera').hidden=false;await video.play();scanning=true;el('checkin-result').textContent='Point the camera at the QR on the confirmation image.';
    if(version!==cameraVersion)return;
    while(scanning&&version===cameraVersion){const code=decode(video,video.videoWidth,video.videoHeight);if(code){await scanned(code);break;}await new Promise(resolve=>setTimeout(resolve,180));}
  }catch(error){stop();el('checkin-result').textContent=error.name==='NotAllowedError'?'Camera permission was not granted. Allow camera access or upload the QR image.':error.message;}
});
el('qr-image').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;stop();clearInspection();
  try{
    if(file.size>15*1024*1024)throw new Error('Choose an image smaller than 15 MB.');
    const bitmap=await createImageBitmap(file);let code;try{code=decode(bitmap,bitmap.width,bitmap.height);}finally{bitmap.close();}
    if(!code)throw new Error('No readable QR was found. Upload the full confirmation image or try the camera.');await scanned(code);
  }catch(error){el('checkin-result').textContent=error.message;}finally{event.target.value='';}
});
setInterval(()=>{if(!document.hidden&&!el('dashboard-content').hidden)load();},15000);
load();loadStalls();
