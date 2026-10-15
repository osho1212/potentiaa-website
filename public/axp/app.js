import {DEFAULT_SETTINGS} from './settings-model.js';
export function calculateBooking(attendees,settings=DEFAULT_SETTINGS) {
  if (!Array.isArray(attendees) || attendees.length<1 || attendees.length>Math.min(settings.maxPerBooking,5)) throw new Error(`Choose between 1 and ${Math.min(settings.maxPerBooking,5)} attendees.`);
  let normal=0,alcohol=0;
  for(const guest of attendees){
    if(!['normal','alcohol'].includes(guest.pass))throw new Error('Choose a valid pass type.');
    if(guest.pass==='alcohol' && guest.age!=='21plus')throw new Error('Alcohol-inclusive passes require age 21 or over.');
    if(guest.pass==='normal')normal++;else alcohol++;
  }
  const subtotalPaise=normal*Math.round(settings.normalPrice*100)+alcohol*Math.round(settings.alcoholPrice*100);
  const extrasPaise=settings.chargesConfirmed&&settings.extraPerPerson!==null&&settings.extraPerBooking!==null?attendees.length*Math.round(settings.extraPerPerson*100)+Math.round(settings.extraPerBooking*100):null;
  return {normal,alcohol,people:attendees.length,subtotal:subtotalPaise/100,extraCharges:extrasPaise===null?null:extrasPaise/100,total:extrasPaise===null?null:(subtotalPaise+extrasPaise)/100};
}
if(typeof document!=='undefined'){
  const state=[{name:'',instagram:'',phone:'',age:'',pass:'normal'}];
  let settings={...DEFAULT_SETTINGS};
  let settingsLoaded=false,showAllErrors=false;
  const touched=new Set();
  const el=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);
  const dateLabel=()=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(settings.eventDate+'T00:00:00Z'));
  const instagram=v=>/^@?[A-Za-z0-9._]{1,30}$/.test(v.trim());
  const phone=v=>/^\+?[0-9 ()-]{8,20}$/.test(v.trim())&&v.replace(/\D/g,'').length>=8&&v.replace(/\D/g,'').length<=15;
  function fieldError(field){
    field.setCustomValidity('');
    let message='';
    if(field.type==='checkbox'){if(!field.checked)message='Please acknowledge the attendee details and terms.';}
    else if(!field.value.trim())message=field.tagName==='SELECT'?'Please choose an option.':'Please fill in this required field.';
    else if(field.id.endsWith('-instagram')&&!instagram(field.value))message='Enter a valid Instagram username, such as @yourusername.';
    else if(field.id.endsWith('-phone')&&!phone(field.value))message='Enter a valid phone number with country code.';
    else if(field.type==='email'&&field.validity.typeMismatch)message='Enter a valid email address, such as name@example.com.';
    else if(field.id.endsWith('-pass')&&field.value==='alcohol'&&el(field.id.replace(/-pass$/,'-age')).value!=='21plus')message='Alcohol-inclusive passes require age 21 or over.';
    else if(!field.validity.valid)message=field.validationMessage;
    field.setCustomValidity(message);return message;
  }
  function refreshReadiness(){
    const missing=[];
    for(const field of el('booking-form').querySelectorAll('[required]')){
      const message=fieldError(field),show=!!message&&(showAllErrors||touched.has(field.id));
      const error=el(field.id+'-error');if(error){error.textContent=show?message:'';error.hidden=!show;}
      if(show)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
      if(message)missing.push({field,message});
    }
    const ready=settingsLoaded&&missing.length===0;
    el('review-booking-button').disabled=!ready;
    el('form-readiness').textContent=missing.length?`Complete or correct ${missing.length} required ${missing.length===1?'detail':'details'} to continue.`:settingsLoaded?'Required details complete. You can review your booking.':'Waiting for event settings before you can continue.';
    el('payment-form-state').textContent=missing.length?'Complete all required fields and acknowledge the terms before continuing to payment.':'Required details complete. Payments are still unavailable in this preview.';
    el('check-required-fields').hidden=missing.length===0;
    el('validation-summary').hidden=!showAllErrors||missing.length===0;
    el('missing-fields').replaceChildren();
    if(showAllErrors)for(const {field,message} of missing){
      const item=document.createElement('li'),link=document.createElement('a');link.href='#'+field.id;link.textContent=`${field.dataset.fieldLabel}: ${message}`;
      link.addEventListener('click',event=>{event.preventDefault();field.focus();});item.append(link);el('missing-fields').append(item);
    }
    window.dispatchEvent(new Event('booking-readiness-updated'));return ready;
  }
  function showMissingFields(){showAllErrors=true;const ready=refreshReadiness();if(!el('validation-summary').hidden)el('validation-summary').focus();return ready;}
  function requiredLabel(text){
    const label=document.createElement('label'),caption=document.createElement('span');caption.textContent=text+' ';
    const star=document.createElement('span');star.className='required-marker';star.setAttribute('aria-hidden','true');star.textContent='*';caption.append(star);label.append(caption);return label;
  }
  function describeField(field,label){
    field.dataset.fieldLabel=label;field.setAttribute('aria-describedby',field.id+'-error');
    const error=document.createElement('small');error.id=field.id+'-error';error.className='field-error';error.hidden=true;return error;
  }
  function summary(){
    const total=calculateBooking(state,settings);
    el('guest-count').value=String(total.people);el('people-line').textContent=String(total.people);
    el('normal-line').textContent=`${total.normal} × ${money(settings.normalPrice)}`;
    el('alcohol-line').textContent=`${total.alcohol} × ${money(settings.alcoholPrice)}`;
    el('subtotal').textContent=money(total.subtotal);
    el('minus').disabled=state.length===1;el('plus').disabled=state.length>=settings.maxPerBooking;
    el('confirmed-charges').hidden=total.total===null;
    if(total.total!==null){el('extra-charge-total').textContent=money(total.extraCharges);el('final-total').textContent=money(total.total);}
    el('charges-pending').hidden=total.total!==null;
  }
  function input(labelText,property,index,{type='text',placeholder='',maxLength=100}={}){
    const label=requiredLabel(labelText);
    const field=document.createElement('input');field.id=`guest-${index}-${property}`;field.name=`attendees[${index}][${property}]`;field.type=type;field.value=state[index][property];field.required=true;field.maxLength=maxLength;field.placeholder=placeholder;
    field.addEventListener('input',()=>{state[index][property]=field.value;});label.append(field,describeField(field,`Attendee ${index+1}: ${labelText.toLowerCase()}`));return label;
  }
  function render(){
    el('attendees').replaceChildren();
    state.forEach((guest,index)=>{
      const section=document.createElement('section');section.className='attendee';section.setAttribute('aria-labelledby',`guest-${index}-title`);
      const title=document.createElement('h3');title.id=`guest-${index}-title`;title.textContent=`Attendee ${index+1}`;section.append(title);
      const grid=document.createElement('div');grid.className='field-grid';
      grid.append(input('Full name','name',index),input('Instagram username','instagram',index,{placeholder:'@username',maxLength:31}),input('Phone number','phone',index,{type:'tel',placeholder:'+91',maxLength:20}));
      const ageLabel=requiredLabel(`Age on ${dateLabel()}`);
      const age=document.createElement('select');age.id=`guest-${index}-age`;age.name=`attendees[${index}][age]`;age.required=true;
      for(const [value,text] of [['','Select age group'],['20','20 years'],['21plus','21 years or older']]){const option=new Option(text,value);age.append(option);}age.value=guest.age;
      ageLabel.append(age,describeField(age,`Attendee ${index+1}: age group`));grid.append(ageLabel);
      const passLabel=requiredLabel('Pass type');const pass=document.createElement('select');pass.id=`guest-${index}-pass`;pass.name=`attendees[${index}][pass]`;pass.required=true;
      pass.append(new Option(`Non-alcoholic · ${money(settings.normalPrice)} base`,'normal'),new Option(`Alcohol-inclusive · ${money(settings.alcoholPrice)} base`,'alcohol'));pass.value=guest.pass;pass.options[1].disabled=guest.age!=='21plus';
      age.addEventListener('change',()=>{guest.age=age.value;if(guest.age!=='21plus'){guest.pass='normal';pass.value='normal';}pass.options[1].disabled=guest.age!=='21plus';summary();});
      pass.addEventListener('change',()=>{guest.pass=pass.value;summary();});passLabel.append(pass,describeField(pass,`Attendee ${index+1}: pass type`));grid.append(passLabel);section.append(grid);el('attendees').append(section);
    });summary();refreshReadiness();
  }
  el('plus').addEventListener('click',()=>{if(state.length<settings.maxPerBooking){state.push({name:'',instagram:'',phone:'',age:'',pass:'normal'});render();}});
  el('minus').addEventListener('click',()=>{if(state.length>1){state.pop();render();}});
  el('copy-buyer').addEventListener('click',()=>{state[0].name=el('buyer-name').value;state[0].instagram=el('buyer-instagram').value;state[0].phone=el('buyer-phone').value;render();});
  el('booking-form').addEventListener('submit',event=>{
    event.preventDefault();el('form-message').textContent='';
    if(!showMissingFields())return;
    const total=calculateBooking(state,settings);el('review-buyer').textContent=`Booking contact: ${el('buyer-name').value.trim()} · ${el('buyer-email').value.trim()}`;
    el('review-guests').replaceChildren();state.forEach((guest,i)=>{const row=document.createElement('div');row.className='review-person';row.textContent=`${i+1}. ${guest.name.trim()}`;const pass=document.createElement('span');pass.textContent=guest.pass==='normal'?`Non-alcoholic pass · ${money(settings.normalPrice)} base`:`Alcohol-inclusive pass · ${money(settings.alcoholPrice)} base · 21+`;row.append(pass);el('review-guests').append(row);});
    el('review-total').textContent=money(total.subtotal);el('review').showModal();
    el('review-notice').textContent=(total.total===null?'Final charges are pending.':`Additional charges: ${money(total.extraCharges)}. Total payable: ${money(total.total)}.`)+' No booking has been saved, no places have been reserved, and no payment has been taken.';
  });
  for(const eventName of ['input','change'])el('booking-form').addEventListener(eventName,refreshReadiness);
  el('booking-form').addEventListener('focusout',event=>{if(event.target.matches('[required]')){touched.add(event.target.id);refreshReadiness();}});
  el('check-required-fields').addEventListener('click',showMissingFields);
  for(const id of ['close-review','back-to-form'])el(id).addEventListener('click',()=>el('review').close());
  async function loadSettings(){
    try{
      const response=await fetch('/api/public-settings',{cache:'no-store'});if(!response.ok)throw new Error('Could not load event settings.');
      const data=await response.json();settings={...DEFAULT_SETTINGS,...data.settings};
      el('event-title').firstChild.textContent=settings.eventName;
      el('event-kicker').textContent=`THE FIRST CHAPTER / ${dateLabel().toUpperCase()}`;
      el('event-date').textContent=new Intl.DateTimeFormat('en-IN',{weekday:'long',day:'numeric',month:'long',timeZone:'UTC'}).format(new Date(settings.eventDate+'T00:00:00Z'));
      const time=t=>new Intl.DateTimeFormat('en-IN',{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'UTC'}).format(new Date('2000-01-01T'+t+':00Z'));
      el('event-times').textContent=`${time(settings.startTime)}–${settings.endTime==='00:00'?'midnight':time(settings.endTime)} · IST`;
      el('event-venue').textContent=settings.venueName;el('event-location').textContent=settings.venueLocation;
      el('event-rules').textContent=`Entry 20+ · Alcohol-inclusive passes 21+ · Bar closes at ${time(settings.barCloseTime)} · Maximum ${settings.maxPerBooking} passes per booking`;
      el('pass-limit-hint').textContent=`Choose up to ${settings.maxPerBooking} passes. Mixing pass types is welcome.`;
      el('normal-benefits').textContent=settings.normalDescription;el('alcohol-benefits').textContent=settings.alcoholDescription;
      el('normal-price').textContent=money(settings.normalPrice);el('alcohol-price').textContent=money(settings.alcoholPrice);
      el('summary-name').textContent=settings.eventName;el('summary-date').textContent=`${dateLabel()} · ${time(settings.startTime)}`;el('summary-venue').textContent=settings.venueName;
      el('support-phone').textContent=settings.supportPhone;el('support-phone').href='tel:'+settings.supportPhone.replace(/[^+\d]/g,'');
      el('support-email').hidden=!settings.supportEmail;if(settings.supportEmail){el('support-email').textContent=settings.supportEmail;el('support-email').href='mailto:'+settings.supportEmail;}
      el('merchant-name').textContent=settings.merchantName;
      el('bar-rule').textContent=`Alcohol-inclusive passes are for attendees aged 21 or over. The bar closes at ${time(settings.barCloseTime)}.`;
      settingsLoaded=true;el('settings-load-state').hidden=true;render();
    }catch{settingsLoaded=false;el('settings-load-state').textContent='Event settings could not be loaded. Please reload before reviewing a booking.';refreshReadiness();}
  }
  render();loadSettings();
}
