import {DEFAULT_SETTINGS} from './settings-model.js';
export function calculateBooking(attendees,settings=DEFAULT_SETTINGS) {
  if (!Array.isArray(attendees) || attendees.length<1 || attendees.length>Math.min(settings.maxPerBooking,5)) throw new Error(`Choose between 1 and ${Math.min(settings.maxPerBooking,5)} attendees.`);
  let normal=0,alcohol=0;
  for(const guest of attendees){
    if(!['normal','alcohol'].includes(guest.pass))throw new Error('Choose a valid pass type.');
    if(guest.pass==='alcohol' && guest.age!=='21plus')throw new Error('Gold passes require age 21 or over.');
    if(guest.pass==='normal')normal++;else alcohol++;
  }
  const subtotalPaise=normal*Math.round(settings.normalPrice*100)+alcohol*Math.round(settings.alcoholPrice*100);
  const extrasPaise=settings.chargesConfirmed&&settings.extraPerPerson!==null&&settings.extraPerBooking!==null?attendees.length*Math.round(settings.extraPerPerson*100)+Math.round(settings.extraPerBooking*100):null;
  return {normal,alcohol,people:attendees.length,subtotal:subtotalPaise/100,extraCharges:extrasPaise===null?null:extrasPaise/100,total:extrasPaise===null?null:(subtotalPaise+extrasPaise)/100};
}
if(typeof document!=='undefined'){
  const state=[{name:'',email:'',instagram:'',phone:'',dob:'',age:'',pass:'normal'}];
  let settings={...DEFAULT_SETTINGS};
  let settingsLoaded=false,showAllErrors=false;
  const touched=new Set();
  const el=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);
  const dateLabel=()=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(settings.eventDate+'T00:00:00Z'));
  const instagram=v=>/^@?[A-Za-z0-9._]{1,30}$/.test(v.trim());
  const phone=v=>/^\+?[0-9 ()-]{8,20}$/.test(v.trim())&&v.replace(/\D/g,'').length>=8&&v.replace(/\D/g,'').length<=15;
  let mirrorBuyer=true;
  const DIAL='+91 ';
  // A field holding nothing but the dial code is empty as far as the guest is
  // concerned, so an untouched optional number must not block the step.
  const phoneEmpty=v=>{const d=String(v||'').replace(/\D/g,'');return d===''||d.length<=3;};
  // Mirrors ageBracketFromDob on the server: the bracket as it will stand on
  // the night. Entry is 20+, so anything younger is not a valid attendee.
  const ageBracket=dob=>{
    if(!/^\d{4}-\d{2}-\d{2}$/.test(dob||''))return null;
    const born=new Date(dob+'T00:00:00Z'),day=new Date(settings.eventDate+'T00:00:00Z');
    if(Number.isNaN(born.getTime())||Number.isNaN(day.getTime()))return null;
    let years=day.getUTCFullYear()-born.getUTCFullYear();
    const months=day.getUTCMonth()-born.getUTCMonth();
    if(months<0||(months===0&&day.getUTCDate()<born.getUTCDate()))years-=1;
    if(years<20||years>120)return null;
    return years>=21?'21plus':'20';
  };
  function fieldError(field){
    field.setCustomValidity('');
    let message='';
    const empty=field.id.endsWith('-phone')?phoneEmpty(field.value):!String(field.value||'').trim();
    if(field.type==='checkbox'){if(!field.checked)message='Please acknowledge the attendee details and terms.';}
    else if(empty){if(field.required)message=field.tagName==='SELECT'?'Please choose an option.':'Please fill in this required field.';}
    else if(field.id.endsWith('-instagram')&&!instagram(field.value))message='Enter a valid Instagram username, such as @yourusername.';
    else if(field.id.endsWith('-phone')&&!phone(field.value))message='Enter a valid phone number with country code.';
    else if(field.id.endsWith('-dob')&&!ageBracket(field.value))message=`Attendees must be 20 or older on ${dateLabel()}.`;
    else if(field.type==='email'&&field.validity.typeMismatch)message='Enter a valid email address, such as name@example.com.';
    else if(field.id.endsWith('-pass')&&field.value==='alcohol'&&ageBracket((el(field.id.replace(/-pass$/,'-dob'))||{}).value)!=='21plus')message='Gold passes need age 21 or over on the event date.';
    else if(!field.validity.valid)message=field.validationMessage;
    field.setCustomValidity(message);return message;
  }
  function refreshReadiness(){
    const missing=[];
    for(const field of el('booking-form').querySelectorAll('input,select')){
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
  function optionalLabel(text){
    const label=document.createElement('label'),caption=document.createElement('span');caption.textContent=text+' ';
    const hint=document.createElement('span');hint.className='optional-marker';hint.textContent='(optional)';caption.append(hint);label.append(caption);return label;
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
  function input(labelText,property,index,{type='text',placeholder='',maxLength=100,required=true}={}){
    const label=required?requiredLabel(labelText):optionalLabel(labelText);
    const field=document.createElement('input');field.id=`guest-${index}-${property}`;field.name=`attendees[${index}][${property}]`;field.type=type;field.required=required;field.maxLength=maxLength;field.placeholder=placeholder;
    if(property==='phone'&&!state[index].phone)state[index].phone=DIAL;
    field.value=state[index][property];
    field.addEventListener('input',()=>{state[index][property]=field.value;if(index===0)mirrorBuyer=false;});label.append(field,describeField(field,`Attendee ${index+1}: ${labelText.toLowerCase()}`));return label;
  }
  function render(){
    el('attendees').replaceChildren();
    state.forEach((guest,index)=>{
      const section=document.createElement('section');section.className='attendee';section.setAttribute('aria-labelledby',`guest-${index}-title`);
      const title=document.createElement('h3');title.id=`guest-${index}-title`;title.textContent=`Attendee ${index+1}`;section.append(title);
      const grid=document.createElement('div');grid.className='field-grid';
      grid.append(
        input('Full name','name',index,{placeholder:'Aarav Sharma'}),
        input('Email address','email',index,{type:'email',placeholder:'aarav@example.com',maxLength:100,required:false}),
        input('Instagram username','instagram',index,{placeholder:'@username',maxLength:31,required:false}),
        input('Phone number','phone',index,{type:'tel',placeholder:'+91 98765 43210',maxLength:20,required:false})
      );
      const dobLabel=requiredLabel('Date of birth');
      const dob=document.createElement('input');dob.type='date';dob.id=`guest-${index}-dob`;dob.name=`attendees[${index}][dob]`;dob.required=true;dob.value=guest.dob;
      dobLabel.append(dob,describeField(dob,`Attendee ${index+1}: date of birth`));grid.append(dobLabel);
      const passLabel=requiredLabel('Pass type');const pass=document.createElement('select');pass.id=`guest-${index}-pass`;pass.name=`attendees[${index}][pass]`;pass.required=true;
      pass.append(new Option(`Silver \u00b7 ${money(settings.normalPrice)} base`,'normal'),new Option(`Gold \u00b7 ${money(settings.alcoholPrice)} base \u00b7 21+`,'alcohol'));pass.value=guest.pass;pass.options[1].disabled=ageBracket(guest.dob)!=='21plus';
      dob.addEventListener('input',()=>{guest.dob=dob.value;const bracket=ageBracket(dob.value);guest.age=bracket||'';if(bracket!=='21plus'&&guest.pass==='alcohol'){guest.pass='normal';pass.value='normal';}pass.options[1].disabled=bracket!=='21plus';summary();});
      pass.addEventListener('change',()=>{guest.pass=pass.value;summary();});passLabel.append(pass,describeField(pass,`Attendee ${index+1}: pass type`));grid.append(passLabel);section.append(grid);el('attendees').append(section);
    });summary();refreshReadiness();
  }
  el('plus').addEventListener('click',()=>{if(state.length<settings.maxPerBooking){state.push({name:'',email:'',instagram:'',phone:'',dob:'',age:'',pass:'normal'});render();}});
  el('minus').addEventListener('click',()=>{if(state.length>1){state.pop();render();}});
  function copyBuyerToFirst(){for(const key of ['name','email','instagram','phone'])state[0][key]=el('buyer-'+key).value;render();}
  el('copy-buyer').addEventListener('click',()=>{mirrorBuyer=true;copyBuyerToFirst();});
  // A lone attendee is almost always the buyer, so their details follow the
  // booking contact until someone edits the attendee fields directly.
  function syncBuyerToAttendee(){
    if(!mirrorBuyer||state.length!==1)return;
    for(const key of ['name','email','instagram','phone']){
      const value=el('buyer-'+key).value;state[0][key]=value;
      const field=el(`guest-0-${key}`);if(field&&field.value!==value)field.value=value;
    }
    summary();
  }
  for(const key of ['name','email','instagram','phone'])el('buyer-'+key).addEventListener('input',syncBuyerToAttendee);
  if(!el('buyer-phone').value.trim())el('buyer-phone').value=DIAL;
  // The review step shows everything that was entered, so it is rebuilt every
  // time the step opens rather than only when a button is pressed.
  function detailLine(label,value){return value&&String(value).trim()?`${label}: ${String(value).trim()}`:'';}
  function renderReview(){
    const total=calculateBooking(state,settings);
    el('review-buyer').textContent=[
      detailLine('Booking contact',el('buyer-name').value),
      detailLine('Email',el('buyer-email').value),
      detailLine('Phone',el('buyer-phone').value),
      detailLine('Instagram',el('buyer-instagram').value),
    ].filter(Boolean).join('  \u00b7  ');
    el('review-guests').replaceChildren(...state.map((guest,i)=>{
      const row=document.createElement('div');row.className='review-person';
      const name=document.createElement('strong');
      name.textContent=`${i+1}. ${guest.name.trim()||'Attendee '+(i+1)}`;
      const pass=document.createElement('span');
      pass.textContent=guest.pass==='alcohol'
        ?`Gold pass \u00b7 ${money(settings.alcoholPrice)} base \u00b7 21+`
        :`Silver pass \u00b7 ${money(settings.normalPrice)} base`;
      const extra=document.createElement('span');
      extra.textContent=[
        detailLine('Date of birth',guest.dob),
        detailLine('Email',guest.email),
        detailLine('Phone',guest.phone),
        detailLine('Instagram',guest.instagram),
      ].filter(Boolean).join('  \u00b7  ');
      row.append(name,pass);if(extra.textContent)row.append(extra);
      return row;
    }));
    el('review-total').textContent=money(total.subtotal);
    el('review-notice').textContent=(total.total===null?'Final charges are pending.':`Additional charges: ${money(total.extraCharges)}. Total payable: ${money(total.total)}.`)+' No booking has been saved, no places have been reserved, and no payment has been taken.';
  }
  el('booking-form').addEventListener('submit',event=>{
    event.preventDefault();el('form-message').textContent='';
    if(!showMissingFields())return;
    renderReview();showStep(4);
  });
  for(const eventName of ['input','change'])el('booking-form').addEventListener(eventName,refreshReadiness);
  el('booking-form').addEventListener('focusout',event=>{if(event.target.matches('[required]')){touched.add(event.target.id);refreshReadiness();}});
  el('check-required-fields').addEventListener('click',showMissingFields);

  function applyBrand(key,logo,phone){
    const img=el(key+'-logo'),link=el(key+'-phone');
    if(img){img.hidden=!logo;if(logo)img.src=logo;}
    if(link){link.hidden=!phone;if(phone){link.textContent=phone;link.href='tel:'+phone.replace(/[^+\d]/g,'');}}
  }
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
      const mapQuery=(settings.venueMapQuery||'').trim();
      const directions=settings.venueMapsUrl||(mapQuery?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`:'');
      el('venue-directions').href=directions||'#';el('venue-directions').hidden=!directions;
      el('event-description').textContent=settings.eventDescription||'';
      el('about-event').hidden=!(settings.eventDescription||'').trim();
      el('event-subtitle').textContent=settings.eventSubtitle||'';
      el('event-subtitle').hidden=!(settings.eventSubtitle||'').trim();
      el('event-tagline').textContent=settings.eventTagline||'';
      el('event-tagline').hidden=!(settings.eventTagline||'').trim();
      const highlights=(settings.eventHighlights||'').split(',').map(part=>part.trim()).filter(Boolean);
      el('event-highlights').replaceChildren(...highlights.map(text=>{const item=document.createElement('li');item.textContent=text;return item;}));
      el('what-is-on').hidden=highlights.length===0;
      const handle=(settings.instagramHandle||'').trim().replace(/^@/,'');
      el('instagram-link').hidden=!handle;
      if(handle){el('instagram-link').textContent='@'+handle+' \u2197';el('instagram-link').href='https://instagram.com/'+encodeURIComponent(handle);}
      document.documentElement.dataset.mapEmbed=mapQuery?`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&hl=en&output=embed`:'';
      window.dispatchEvent(new Event('axp-settings-loaded'));
      el('footer-copyright').textContent=`© ${new Date().getFullYear()} ${settings.merchantName}. All rights reserved.`;
      applyBrand('potentiaa',settings.potentiaaLogo,settings.potentiaaPhone);
      applyBrand('avyanta',settings.avyantaLogo,settings.avyantaPhone);
      el('event-rules').textContent=`Entry 20+ · Gold passes 21+ · Last service ${time(settings.barCloseTime)} · Maximum ${settings.maxPerBooking} passes per booking`;
      el('pass-limit-hint').textContent=`Choose up to ${settings.maxPerBooking} passes. Mixing pass types is welcome.`;
      el('normal-benefits').textContent=settings.normalDescription;el('alcohol-benefits').textContent=settings.alcoholDescription;
      el('normal-price').textContent=money(settings.normalPrice);el('alcohol-price').textContent=money(settings.alcoholPrice);
      el('summary-name').textContent=settings.eventName;el('summary-date').textContent=`${dateLabel()} · ${time(settings.startTime)}`;el('summary-venue').textContent=settings.venueName;
      el('support-phone').textContent=settings.supportPhone;el('support-phone').href='tel:'+settings.supportPhone.replace(/[^+\d]/g,'');
      el('support-email').hidden=!settings.supportEmail;if(settings.supportEmail){el('support-email').textContent=settings.supportEmail;el('support-email').href='mailto:'+settings.supportEmail;}
      el('merchant-name').textContent=settings.merchantName;
      el('bar-rule').textContent=`Gold passes are for attendees aged 21 or over. Last service is at ${time(settings.barCloseTime)}.`;
      settingsLoaded=true;el('settings-load-state').hidden=true;render();
    }catch{settingsLoaded=false;el('settings-load-state').textContent='Event settings could not be loaded. Please reload before reviewing a booking.';refreshReadiness();}
  }
  render();loadSettings();

  // One panel at a time. Moving forward validates the step you are leaving, so
  // a guest cannot carry an empty required field into the next screen; moving
  // back is always free. refreshReadiness still judges the whole form, which is
  // what gates the final review button.
  const steps=['event-info-step','your-details','your-guests','booking-review','payment-step'];
  let stepIndex=0;
  function stepPanels(){return steps.map(id=>el(id)).filter(Boolean);}
  function showStep(index){
    stepIndex=Math.max(0,Math.min(steps.length-1,index));
    steps.forEach((id,n)=>{const panel=el(id);if(panel)panel.hidden=n!==stepIndex;});
    document.querySelectorAll('.axp-steps a').forEach((link,n)=>{
      link.classList.toggle('is-current',n===stepIndex);
      link.classList.toggle('is-done',n<stepIndex);
    });
    for(const panel of stepPanels()){
      const back=panel.querySelector('.step-back'),next=panel.querySelector('.step-next');
      if(back)back.hidden=stepIndex===0;
      if(next)next.hidden=stepIndex===steps.length-1;
    }
    const entering=el(steps[stepIndex]);
    if(entering){entering.classList.remove('is-entering');void entering.offsetWidth;entering.classList.add('is-entering');}
    if(steps[stepIndex]==='booking-review')renderReview();
    // Five labelled steps do not fit a phone, so there the nav shrinks to
    // numbers and this caption carries the wording.
    const stepsNav=document.querySelector('.axp-steps');
    if(stepsNav){
      let caption=document.querySelector('.step-caption');
      if(!caption){caption=document.createElement('p');caption.className='step-caption';stepsNav.after(caption);}
      const label=(stepsNav.children[stepIndex*2]?.textContent||'').trim().replace(/^\d+\s*/,'');
      caption.textContent=`Step ${stepIndex+1} of ${steps.length}${label?' · '+label:''}`;
    }
    const nav=document.querySelector('.axp-steps');
    if(nav&&nav.getBoundingClientRect().top<0)nav.scrollIntoView({block:'start',behavior:'smooth'});
  }
  function stepValid(index){
    const panel=el(steps[index]);
    if(!panel)return true;
    let ok=true;
    for(const field of panel.querySelectorAll('input,select')){
      touched.add(field.id);
      if(fieldError(field))ok=false;
    }
    refreshReadiness();
    return ok;
  }
  for(const panel of stepPanels()){
    const back=panel.querySelector('.step-back'),next=panel.querySelector('.step-next');
    if(back)back.addEventListener('click',()=>showStep(stepIndex-1));
    if(next)next.addEventListener('click',()=>{if(stepValid(stepIndex))showStep(stepIndex+1);else showMissingFields();});
  }
  document.querySelectorAll('.axp-steps a').forEach((link,n)=>link.addEventListener('click',event=>{
    event.preventDefault();
    if(n<=stepIndex||stepValid(stepIndex))showStep(n);else showMissingFields();
  }));
  showStep(0);
}
