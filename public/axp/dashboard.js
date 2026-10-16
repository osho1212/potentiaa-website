import jsQR from '/axp/jsqr.js';

const el=id=>document.getElementById(id);
let entries=[],inspected=null,stream=null,scanning=false,inspectionVersion=0,cameraVersion=0,loading=null;
const time=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'Not checked in';
const passName=value=>value==='alcohol'?'Alcohol-inclusive · 21+':'Non-alcoholic';
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
  const imageBookings=new Set();
  for(const item of filtered){
    const row=document.createElement('tr'),whatsapp=whatsappCell(item);
    for(const lines of [[item.name,passName(item.pass_type)],[item.id,item.status,`₹${item.total.toLocaleString('en-IN')}`,item.gateway_payment||'No captured payment'],[item.buyer_name,item.buyer_email,item.buyer_phone],[item.email||'No email',item.instagram,item.phone,item.age_group==='20'?'20 years':'21+'],whatsapp.lines,[time(item.checked_in_at)]]){
      const cell=document.createElement('td');for(const line of lines.filter(Boolean)){const div=document.createElement('div');div.textContent=line;cell.append(div);}row.append(cell);
    }
    row.children[4].className=whatsapp.cls;
    if(item.status==='confirmed'&&!imageBookings.has(item.id)){
      imageBookings.add(item.id);
      const emailBtn=document.createElement('button');emailBtn.type='button';emailBtn.className='secondary confirmation-download';emailBtn.textContent='Email passes';
      emailBtn.addEventListener('click',async()=>{emailBtn.disabled=true;emailBtn.textContent='Sending email…';try{
        const bookingAttendees=entries.filter(e=>e.id===item.id);
        const distinctEmails=new Map();
        distinctEmails.set(item.buyer_email.toLowerCase(),{name:item.buyer_name,email:item.buyer_email,isBuyer:true});
        for(const att of bookingAttendees){
          if(att.email&&!distinctEmails.has(att.email.toLowerCase())){
            distinctEmails.set(att.email.toLowerCase(),{name:att.name,email:att.email,isBuyer:false});
          }
        }
        const listText=bookingAttendees.map((a,i)=>`${i+1}. ${a.name} — ${passName(a.pass_type)}`).join('\n');
        for(const target of distinctEmails.values()){
          await fetch('https://api.emailjs.com/api/v1.0/email/send',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({service_id:'service_59d1ylv',template_id:'template_x1xmkvu',user_id:'wUJPfRnz1y09Ms68T',template_params:{to_name:target.name,to_email:target.email,booking_id:item.id,booking_id_short:item.id.slice(0,8),guest_count:target.isBuyer?String(bookingAttendees.length):'1 (Personal Pass)',amount_paid:target.isBuyer?`₹${item.total.toLocaleString('en-IN')}`:'Paid by '+item.buyer_name,attendees_list:listText,pass_link:window.location.origin+'/axp-social?booking='+encodeURIComponent(item.id)+'#passes'}})});
        }
        el('dashboard-message').textContent=`✉️ Passes emailed to: ${[...distinctEmails.keys()].join(', ')}.`;
      }catch(err){el('dashboard-message').textContent='Email error: '+err.message;}finally{emailBtn.disabled=false;emailBtn.textContent='Email passes';}});row.children[1].append(emailBtn);
    }
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
    for(const [label,value] of [['Confirmed attendees',data.attendance.confirmed],['Entered',data.attendance.checked_in],['Still to arrive',data.attendance.remaining],['Places held',data.totals.held],['Confirmed booking value','₹'+(data.totals.collected/100).toLocaleString('en-IN')],['Payments needing review',data.totals.needs_review]]){
      const item=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');strong.textContent=value;span.textContent=label;item.append(strong,span);el('booking-totals').append(item);
    }
    el('attendance-summary').textContent=`${data.attendance.checked_in} entered · ${data.attendance.remaining} still to arrive · ${data.attendance.confirmed} confirmed${mode==='test'?' · TEST ONLY':''}`;
    el('booking-notices').replaceChildren();for(const notice of data.notices){const item=document.createElement('li');item.textContent=notice.message+' · '+time(notice.created_at)+' · Email: '+notice.delivery_status;el('booking-notices').append(item);}rows();
  }catch(error){el('dashboard-message').textContent=error.message;}finally{loading=null;}})();return loading;
}
function showBooking(data){
  el('checkin-roster').replaceChildren();
  for(const guest of data.attendees){
    const label=document.createElement('label');label.className='checkin-person';
    const checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.value=guest.id;checkbox.disabled=!!guest.checkedInAt;
    checkbox.setAttribute('aria-label','Admit '+guest.name);const text=document.createElement('span'),name=document.createElement('strong'),detail=document.createElement('small');name.textContent=guest.name;
    detail.textContent=passName(guest.pass)+' · '+(guest.checkedInAt?'Already entered: '+time(guest.checkedInAt):'Not entered');text.append(name,detail);label.append(checkbox,text);el('checkin-roster').append(label);
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
      el('checkin-result').textContent=`${data.mode==='test'?'TEST — not valid for live entry. ':''}${data.name} · ${passName(data.pass)} · ${data.checkedInAt?'Already checked in: '+time(data.checkedInAt):'Valid pass. Check photo ID before confirming entry.'}`;
      el('confirm-checkin').textContent='Confirm attendee entry';el('confirm-checkin').hidden=!!data.checkedInAt;
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
