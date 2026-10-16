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
    const passes=state.length,amount=total.total!==null?total.total:total.subtotal;
    document.querySelectorAll('.step-total').forEach(node=>{node.textContent=`${passes} ${passes===1?'pass':'passes'} \u00b7 ${money(amount)}`;});
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
      const dob=document.createElement('input');dob.type='date';dob.id=`guest-${index}-dob`;dob.name=`attendees[${index}][dob]`;dob.required=true;dob.value=guest.dob;{const day=String(settings.eventDate||'');if(/^\d{4}-\d{2}-\d{2}$/.test(day)){const y=Number(day.slice(0,4)),md=day.slice(4);dob.max=(y-20)+md;dob.min=(y-100)+md;}}
      dobLabel.append(dob,describeField(dob,`Attendee ${index+1}: date of birth`));grid.append(dobLabel);
      const passLabel=requiredLabel('Pass type');const pass=document.createElement('select');pass.id=`guest-${index}-pass`;pass.name=`attendees[${index}][pass]`;pass.required=true;
      pass.append(new Option(`Silver \u00b7 ${money(settings.normalPrice)} base`,'normal'),new Option(`Gold \u00b7 ${money(settings.alcoholPrice)} base \u00b7 21+`,'alcohol'));pass.value=guest.pass;pass.options[1].disabled=ageBracket(guest.dob)!=='21plus';
      dob.addEventListener('input',()=>{guest.dob=dob.value;const bracket=ageBracket(dob.value);guest.age=bracket||'';if(bracket!=='21plus'&&guest.pass==='alcohol'){guest.pass='normal';pass.value='normal';}pass.options[1].disabled=bracket!=='21plus';summary();});
      pass.addEventListener('change',()=>{guest.pass=pass.value;summary();});passLabel.append(pass,describeField(pass,`Attendee ${index+1}: pass type`));grid.append(passLabel);section.append(grid);el('attendees').append(section);
    });summary();refreshReadiness();
  }
  el('plus').addEventListener('click',()=>{if(state.length<settings.maxPerBooking){state.push({name:'',email:'',instagram:'',phone:'',dob:'',age:'',pass:'normal'});render();saveDraft();}});
  el('minus').addEventListener('click',()=>{if(state.length>1){state.pop();render();saveDraft();}});
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
    if(!el('review-edit-contact')){
      const edit=(id,text,step)=>{const button=document.createElement('button');button.type='button';button.id=id;button.className='review-edit';button.textContent=text;button.addEventListener('click',()=>showStep(step));return button;};
      el('review-buyer').after(edit('review-edit-contact','Edit contact details',1));
      el('review-guests').after(edit('review-edit-guests','Edit attendees',2));
    }
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

  // A refresh, a dropped connection or an accidental swipe should not cost a
  // guest everything they typed. The draft lives in sessionStorage, so it is
  // scoped to this tab and gone when the tab closes; it is cleared once the
  // booking is confirmed. Terms acceptance is deliberately not saved.
  function restoreDraft(){
    try{
      const draft=JSON.parse(sessionStorage.getItem('axp-booking-draft')||'null');
      if(!draft||draft.v!==1)return 0;
      for(const key of ['name','email','instagram','phone'])if(typeof draft.buyer?.[key]==='string')el('buyer-'+key).value=draft.buyer[key];
      if(Array.isArray(draft.attendees)&&draft.attendees.length){
        const blank={name:'',email:'',instagram:'',phone:'',dob:'',age:'',pass:'normal'};
        state.splice(0,state.length,...draft.attendees.slice(0,5).map(guest=>({...blank,...guest})));
        state.forEach(guest=>{guest.age=ageBracket(guest.dob)||'';if(guest.pass==='alcohol'&&guest.age!=='21plus')guest.pass='normal';});
      }
      mirrorBuyer=draft.mirrorBuyer!==false;
      return Number.isInteger(draft.step)?draft.step:0;
    }catch{return 0;}
  }
  function saveDraft(){
    try{
      sessionStorage.setItem('axp-booking-draft',JSON.stringify({
        v:1,step:stepIndex,mirrorBuyer,
        buyer:Object.fromEntries(['name','email','instagram','phone'].map(key=>[key,el('buyer-'+key).value])),
        attendees:state,
      }));
    }catch{}
  }
  // A live countdown to the doors opening; it hides itself once they have.
  let countdownTimer=null;
  function startCountdown(){
    const box=el('event-countdown'),units=el('event-countdown-units');
    if(!box||!units)return;
    const start=new Date(`${settings.eventDate}T${settings.startTime||'00:00'}:00+05:30`);
    if(Number.isNaN(start.getTime())){box.hidden=true;return;}
    const parts=[['days',86400],['hrs',3600],['min',60],['sec',1]];
    if(!units.childElementCount){
      for(const [name] of parts){
        const cell=document.createElement('span');cell.className='cd-unit';
        const num=document.createElement('strong');num.className='cd-num';
        const caption=document.createElement('small');caption.textContent=name;
        cell.append(num,caption);units.append(cell);
      }
    }
    const tick=()=>{
      let left=Math.floor((start.getTime()-Date.now())/1000);
      if(left<=0){box.hidden=true;clearInterval(countdownTimer);return;}
      box.hidden=false;
      parts.forEach(([,size],i)=>{
        const value=Math.floor(left/size);left-=value*size;
        const num=units.children[i].firstChild,text=String(value).padStart(i?2:1,'0');
        if(num.textContent!==text){num.textContent=text;num.classList.remove('cd-tick');void num.offsetWidth;num.classList.add('cd-tick');}
      });
    };
    clearInterval(countdownTimer);tick();countdownTimer=setInterval(tick,1000);
  }
  // Each "What's on" item gets a small line icon chosen from its wording, so
  // organisers can still edit the list freely in settings.
  const HIGHLIGHT_ICONS=[
    [/network|connect|meet/i,'<circle cx="9" cy="8" r="3"/><circle cx="16.5" cy="9" r="2.4"/><path d="M3.5 19c.6-3.2 3-5 5.5-5s4.9 1.8 5.5 5"/><path d="M14.6 14.2c2.5-.3 4.7 1.3 5.3 4.3"/>'],
    [/pop.?up|stall|shop|market|business/i,'<path d="M5 8h14l-1 12H6L5 8Z"/><path d="M9 8V6.5a3 3 0 0 1 6 0V8"/>'],
    [/poker|chess|card|game/i,'<rect x="4" y="5" width="10" height="14" rx="1.6" transform="rotate(-8 9 12)"/><rect x="10" y="5" width="10" height="14" rx="1.6" transform="rotate(8 15 12)"/>'],
    [/stage|mic|perform|open/i,'<rect x="9" y="3.5" width="6" height="10" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v3.5M9 20.5h6"/>'],
    [/dj|music|band|song/i,'<path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/>'],
    [/food|drink|dine|bar|mocktail|eat/i,'<path d="M4 17h16M6 17a6 6 0 0 1 12 0M12 9V7.5M10.5 7.5h3"/>'],
    [/firework|spark|light|diwali/i,'<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>'],
  ];
  const SVG_NS='http://www.w3.org/2000/svg';
  function highlightItem(text){
    const item=document.createElement('li');
    const match=HIGHLIGHT_ICONS.find(([pattern])=>pattern.test(text));
    const svg=document.createElementNS(SVG_NS,'svg');
    svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','highlight-icon');
    // The markup is a fixed string from the table above, never from settings.
    const shape=new DOMParser().parseFromString(`<svg xmlns="${SVG_NS}">${match?match[1]:'<circle cx="12" cy="12" r="3"/>'}</svg>`,'image/svg+xml').documentElement;
    for(const child of [...shape.childNodes])svg.append(document.importNode(child,true));
    const label=document.createElement('span');label.textContent=text;
    item.append(svg,label);
    return item;
  }
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
      el('event-venue').textContent=settings.venueName;
      const mapQuery=(settings.venueMapQuery||'').trim();
      const directions=settings.venueMapsUrl||(mapQuery?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`:'');
      el('venue-directions').href=directions||'#';el('venue-directions').hidden=!directions;
      el('event-description').textContent=settings.eventDescription||'';
      startCountdown();
      el('about-event').hidden=!(settings.eventDescription||'').trim();
      el('event-subtitle').textContent=settings.eventSubtitle||'';
      el('event-subtitle').hidden=!(settings.eventSubtitle||'').trim();
      el('event-tagline').textContent=settings.eventTagline||'';
      el('event-tagline').hidden=!(settings.eventTagline||'').trim();
      const highlights=(settings.eventHighlights||'').split(',').map(part=>part.trim()).filter(Boolean);
      el('event-highlights').replaceChildren(...highlights.map(highlightItem));
      el('what-is-on').hidden=highlights.length===0;
      const handle=(settings.instagramHandle||'').trim().replace(/^@/,'');
      el('instagram-link').hidden=!handle;
      if(handle){el('instagram-link').textContent='@'+handle+' \u2197';el('instagram-link').href='https://instagram.com/'+encodeURIComponent(handle);}
      document.documentElement.dataset.mapEmbed=mapQuery?`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=15&hl=en&output=embed`:'';
      window.dispatchEvent(new Event('axp-settings-loaded'));
      el('footer-copyright').textContent=`© ${new Date().getFullYear()} Potentiaa. All rights reserved.`;
      applyBrand('potentiaa',settings.potentiaaLogo,settings.potentiaaPhone);
      applyBrand('avyanta',settings.avyantaLogo,settings.avyantaPhone);
      el('pass-limit-hint').textContent=`Entry is for guests aged 20 and over. Choose up to ${settings.maxPerBooking} passes per booking; mixing pass types is welcome.`;
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
  const restoredStep=restoreDraft();
  render();loadSettings();
  for(const eventName of ['input','change'])el('booking-form').addEventListener(eventName,()=>saveDraft());

  // One panel at a time. Moving forward validates the step you are leaving, so
  // a guest cannot carry an empty required field into the next screen; moving
  // back is always free. refreshReadiness still judges the whole form, which is
  // what gates the final review button.
  const steps=['event-info-step','your-details','your-guests','booking-review','payment-step'];
  // The forward button says where it goes, not just "Next". The review step
  // moves on with its own "Continue to payment" button instead.
  const nextLabels=['Book your passes','Continue to attendees','Review booking',null,null];
  let stepIndex=0;
  function stepPanels(){return steps.map(id=>el(id)).filter(Boolean);}
  function stepLabel(index){const nav=document.querySelector('.axp-steps');return (nav?.children[index*2]?.textContent||'').trim().replace(/^\d+\s*/,'');}
  function showStep(index,{push=true,focus=true}={}){
    const previous=stepIndex;
    stepIndex=Math.max(0,Math.min(steps.length-1,index));
    steps.forEach((id,n)=>{const panel=el(id);if(panel)panel.hidden=n!==stepIndex;});
    document.querySelectorAll('.axp-steps a').forEach((link,n)=>{
      link.classList.toggle('is-current',n===stepIndex);
      link.classList.toggle('is-done',n<stepIndex);
      if(n===stepIndex)link.setAttribute('aria-current','step');else link.removeAttribute('aria-current');
    });
    for(const panel of stepPanels()){
      const back=panel.querySelector('.step-back'),next=panel.querySelector('.step-next');
      if(back)back.hidden=stepIndex===0;
      if(next)next.hidden=stepIndex===steps.length-1||steps[stepIndex]==='booking-review';
    }
    document.querySelectorAll('.step-block-note').forEach(note=>{note.textContent='';});
    const entering=el(steps[stepIndex]);
    if(entering){entering.classList.remove('is-entering');void entering.offsetWidth;entering.classList.add('is-entering');}
    if(steps[stepIndex]==='booking-review')renderReview();
    // Five labelled steps do not fit a phone, so there the nav shrinks to
    // numbers and this caption carries the wording.
    const stepsNav=document.querySelector('.axp-steps');
    if(stepsNav){
      let caption=document.querySelector('.step-caption');
      if(!caption){caption=document.createElement('p');caption.className='step-caption';caption.setAttribute('aria-live','polite');stepsNav.after(caption);}
      const label=stepLabel(stepIndex);
      caption.textContent=`Step ${stepIndex+1} of ${steps.length}${label?' · '+label:''}`;
    }
    // Each step is a history entry, so a phone's back button steps back through
    // the form instead of leaving the page and losing everything typed.
    if(push&&stepIndex!==previous){try{history.pushState({axpStep:stepIndex},'',`#step-${stepIndex+1}`);}catch{}}
    saveDraft();
    if(focus&&stepIndex!==previous&&entering){
      // Keyboard and screen-reader users land on the new step's heading, not on
      // a button that has just been hidden.
      const heading=entering.querySelector('.section-top h2');
      if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
      const nav=document.querySelector('.axp-steps');
      if(nav){const top=nav.getBoundingClientRect().top;if(top<0||top>innerHeight*.6)nav.scrollIntoView({block:'start',behavior:'smooth'});}
    }
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
  function stepSilentlyValid(index){
    const panel=el(steps[index]);
    return !panel||[...panel.querySelectorAll('input,select')].every(field=>!fieldError(field));
  }
  // When a step will not let you through, take you to the first thing that is
  // wrong and say so beside the buttons, rather than failing silently.
  function explainBlocked(index){
    const panel=el(steps[index]);
    const field=panel&&[...panel.querySelectorAll('input,select')].find(f=>fieldError(f));
    if(!field){showMissingFields();return;}
    field.focus({preventScroll:true});
    field.scrollIntoView({block:'center',behavior:'smooth'});
    let note=panel.querySelector('.step-block-note');
    if(!note){note=document.createElement('p');note.className='step-block-note';note.setAttribute('role','alert');panel.querySelector('.step-nav')?.before(note);}
    note.textContent='A few details need attention before you continue. They are marked above.';
  }
  function goForward(){if(stepValid(stepIndex))showStep(stepIndex+1);else explainBlocked(stepIndex);}
  for(const panel of stepPanels()){
    const back=panel.querySelector('.step-back'),next=panel.querySelector('.step-next');
    if(back)back.addEventListener('click',()=>showStep(stepIndex-1));
    if(next){
      const label=nextLabels[steps.indexOf(panel.id)];
      if(label){next.textContent=label+' ';const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='→';next.append(arrow);}
      next.addEventListener('click',goForward);
    }
  }
  // A small running total beside the buttons while passes are being chosen.
  for(const id of ['your-details','your-guests']){
    const nav=el(id)?.querySelector('.step-nav');
    if(nav&&!nav.querySelector('.step-total')){const total=document.createElement('span');total.className='step-total';total.setAttribute('aria-live','polite');nav.prepend(total);}
  }
  summary();
  document.querySelectorAll('.axp-steps a').forEach((link,n)=>link.addEventListener('click',event=>{
    event.preventDefault();
    if(n<=stepIndex){showStep(n);return;}
    // Jumping ahead still has to pass every step in between.
    for(let i=stepIndex;i<n;i++){if(!stepValid(i)){showStep(i);explainBlocked(i);return;}}
    showStep(n);
  }));
  window.addEventListener('popstate',event=>{
    const target=event.state&&Number.isInteger(event.state.axpStep)?event.state.axpStep:null;
    if(target===null)return;
    if(target>stepIndex){
      for(let i=stepIndex;i<target;i++){
        if(!stepValid(i)){showStep(i,{push:false});try{history.replaceState({axpStep:i},'',`#step-${i+1}`);}catch{}explainBlocked(i);return;}
      }
    }
    showStep(target,{push:false});
  });
  el('hero-cta')?.addEventListener('click',event=>{event.preventDefault();showStep(1);});
  try{history.replaceState({axpStep:0},'',location.pathname+location.search);}catch{}
  showStep(0,{push:false,focus:false});
  // Come back to where the guest left off, but never past a step that is no
  // longer complete. Terms are not saved, so this stops at review at the latest.
  if(restoredStep>0){
    let reach=0;
    while(reach<restoredStep&&reach<steps.length-1&&stepSilentlyValid(reach))reach++;
    if(reach>0)showStep(reach,{focus:false});
  }
}
