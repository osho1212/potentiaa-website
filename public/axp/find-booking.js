// "Find my booking": the reference from a confirmation, and the email or phone
// the booking was made with, open that booking's page again.
const el=id=>document.getElementById(id);
const dialog=el('find-booking');
if(dialog){
  const message=el('find-booking-message'),submit=el('find-booking-submit');
  const say=text=>{message.textContent=text;message.hidden=!text;};
  document.addEventListener('click',event=>{
    const opener=event.target.closest('[data-find-booking]');if(!opener)return;
    event.preventDefault();say('');dialog.showModal();el('find-ref').focus();
  });
  el('find-booking-close').addEventListener('click',()=>dialog.close());
  el('find-booking-form').addEventListener('submit',async event=>{
    event.preventDefault();
    const ref=el('find-ref').value.trim(),contact=el('find-contact').value.trim();
    if(!ref||!contact){say('Enter your booking reference and the email or phone you booked with.');return;}
    submit.disabled=true;submit.textContent='Finding…';say('');
    const test=new URLSearchParams(location.search).get('mode')==='test';
    try{
      const response=await fetch('/api/bookings/find',{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json'},body:JSON.stringify({ref,contact,mode:test?'test':'live'})});
      const data=await response.json().catch(()=>({}));
      if(!response.ok||!data.id){say(data.error||'That did not work. Try again in a moment.');return;}
      // A checkout started earlier in this tab must not take over the page.
      try{sessionStorage.removeItem('axp-last-booking');}catch{}
      location.href=`/axp-social?booking=${encodeURIComponent(data.id)}${test?'&mode=test':''}`;
    }catch{say('That did not work. Check your connection and try again.');}
    finally{submit.disabled=false;submit.textContent='Find booking';}
  });
}
