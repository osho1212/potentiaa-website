import {DEFAULT_SETTINGS} from './settings-model.js';
import {quoteBooking,unitPrice,GENDERS,GENDER_LABELS,FARE_LABELS,PASS_LABELS} from './pricing.js';
if(typeof document!=='undefined'){
  const state=[{name:'',email:'',instagram:'',phone:'',dob:'',age:'',gender:'',pass:'normal'}];
  let settings={...DEFAULT_SETTINGS};
  let settingsLoaded=false,showAllErrors=false;
  // Where the early bird stands, as the server last reported it. The server
  // decides again when the booking is made; this only drives what is shown.
  let earlyBird=null,plan='full',earlyTimer=null;
  // Step 1's choices: one pass for the whole booking (or a mix, chosen per
  // person), and whether the booker is one of the guests. A booker who is
  // coming is attendee 1, so their details are typed once.
  let passChoice='',bookingForOthers=false;
  // Attendee cards open one at a time; the rest show a line each.
  let openCard=0;
  // The phone's sticky bar, made once the steps exist (see updateBar).
  let bar=null;
  function earlyBirdAvailable(count=state.length){return !!(earlyBird&&earlyBird.open&&count<=earlyBird.left&&(!earlyBird.endsAt||Date.now()<=Date.parse(earlyBird.endsAt)));}
  function currentQuote(forPlan=plan){return quoteBooking(state,settings,{plan:forPlan,earlyBird:earlyBirdAvailable()});}
  const passLabel=(pass,fare)=>`${PASS_LABELS[pass]||'Silver'}${pass==='alcohol'?' · 21+':''}${fare&&fare!=='single'?' · '+FARE_LABELS[fare]:''}`;
  const touched=new Set();
  const el=id=>document.getElementById(id);
  const money=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',minimumFractionDigits:n%1?2:0,maximumFractionDigits:2}).format(n);
  const dateLabel=()=>new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(settings.eventDate+'T00:00:00Z'));
  const instagram=v=>/^@?[A-Za-z0-9._]{1,30}$/.test(v.trim());
  const phone=v=>/^\+?[0-9 ()-]{8,20}$/.test(v.trim())&&v.replace(/\D/g,'').length>=8&&v.replace(/\D/g,'').length<=15;
  const DIAL='+91 ';
  const CONTACT_KEYS=['name','email','instagram','phone'];
  // A booker who is coming is attendee 1: the booking contact follows their card.
  function syncContactFromFirst(){
    if(bookingForOthers)return;
    for(const key of CONTACT_KEYS)el('buyer-'+key).value=state[0]?.[key]||'';
  }
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
  // One pass per person: two attendees may not share a phone number or email.
  // Mirrors lib/axp/contact-guard.ts, which also checks other bookings.
  const phoneKey=value=>{const d=String(value||'').replace(/\D/g,'');return d.length<=3?'':d.length>10?d.slice(-10):d;};
  const emailKey=value=>{const v=String(value||'').trim().toLowerCase(),at=v.lastIndexOf('@');if(at<1)return '';const domain=v.slice(at+1);let local=v.slice(0,at);if(domain==='gmail.com'||domain==='googlemail.com'){local=local.split('+')[0].replace(/\./g,'');return local+'@gmail.com';}return local+'@'+domain;};
  // Attendee 1's pass goes to the booking email when their own is left blank.
  const contactOf=(i,property)=>property==='email'&&i===0?(state[0]?.email||el('buyer-email').value):state[i]?.[property];
  function sharedContactError(field){
    const match=field.id.match(/^guest-(\d+)-(phone|email)$/);
    if(!match)return '';
    const index=Number(match[1]),property=match[2],key=property==='phone'?phoneKey:emailKey,own=key(contactOf(index,property));
    if(!own)return '';
    for(let i=0;i<index;i++){
      if(key(contactOf(i,property))!==own)continue;
      return property==='phone'?`Attendee ${i+1} already uses this phone number. Each person needs their own.`:`Attendee ${i+1} already uses this email address. Use a different one, or leave it blank.`;
    }
    return '';
  }
  function fieldError(field){
    field.setCustomValidity('');
    let message='';
    const empty=field.id.endsWith('-phone')?phoneEmpty(field.value):!String(field.value||'').trim();
    // A required radio group is one field, judged on its first option.
    if(field.type==='radio'){
      const group=[...document.querySelectorAll(`input[type="radio"][name="${field.name}"]`)];
      if(field.required&&group[0]===field&&!group.some(option=>option.checked))message='Please choose a pass.';
    }
    else if(field.type==='checkbox'){if(field.required&&!field.checked)message='Please acknowledge the attendee details and terms.';}
    else if(empty){if(field.required)message=field.tagName==='SELECT'?'Please choose an option.':'Please fill in this required field.';}
    else if(field.id.endsWith('-instagram')&&!instagram(field.value))message='Enter a valid Instagram username, such as @yourusername.';
    else if(field.id.endsWith('-phone')&&!phone(field.value))message='Enter a valid phone number with country code.';
    else if(field.id.endsWith('-dob')&&!ageBracket(field.value))message=`Attendees must be 20 or older on ${dateLabel()}.`;
    else if(field.type==='email'&&field.validity.typeMismatch)message='Enter a valid email address, such as name@example.com.';
    // Until a date of birth is in, its own field says so; Gold waits for it.
    else if(field.id.endsWith('-pass')&&field.value==='alcohol'&&(el(field.id.replace(/-pass$/,'-dob'))||{}).value&&ageBracket((el(field.id.replace(/-pass$/,'-dob'))||{}).value)!=='21plus')message='Gold passes need age 21 or over on the event date.';
    else if(sharedContactError(field))message=sharedContactError(field);
    else if(!field.validity.valid)message=field.validationMessage;
    field.setCustomValidity(message);return message;
  }
  // The fields a guest must fill, in every step, whichever is on screen. Left
  // out: contact fields hidden because the booker is coming (attendee 1 fills
  // them) and a pass picker hidden because the booking has one pass.
  const liveFields=root=>[...root.querySelectorAll('input,select')].filter(field=>!field.closest('[hidden]:not(.step-panel)'));
  function refreshReadiness(){
    const missing=[];
    for(const field of liveFields(el('booking-form'))){
      const message=fieldError(field),show=!!message&&(showAllErrors||touched.has(field.id));
      const error=el(field.id+'-error');if(error){error.textContent=show?message:'';error.hidden=!show;}
      if(show)field.setAttribute('aria-invalid','true');else field.removeAttribute('aria-invalid');
      if(message)missing.push({field,message});
    }
    const ready=settingsLoaded&&missing.length===0;
    // payment.js reads this before it will open checkout.
    el('booking-form').dataset.ready=ready?'1':'0';
    // With everything else filled in, the box is the one thing left: say so.
    const onlyTerms=missing.length===1&&missing[0].field.id==='booking-terms';
    el('form-readiness').textContent=onlyTerms?'Tick the box above to agree to the terms and continue.':missing.length?`Complete or correct ${missing.length} required ${missing.length===1?'detail':'details'} to continue.`:settingsLoaded?'All details are in. Choose how to pay below.':'Waiting for event settings before you can continue.';
    el('payment-form-state').textContent=missing.length?'Complete all required fields and acknowledge the terms before continuing to payment.':'Required details complete. Payments are still unavailable in this preview.';
    el('check-required-fields').hidden=missing.length===0||onlyTerms;
    el('validation-summary').hidden=!showAllErrors||missing.length===0;
    el('missing-fields').replaceChildren();
    if(showAllErrors)for(const {field,message} of missing){
      const item=document.createElement('li'),link=document.createElement('a');link.href='#'+field.id;link.textContent=`${field.dataset.fieldLabel}: ${message}`;
      link.addEventListener('click',event=>{event.preventDefault();revealField(field);});item.append(link);el('missing-fields').append(item);
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
  // One line per kind of pass charged, such as "Gold · 21+ · Couple  2 × ₹3,250".
  function priceLines(lines){
    const groups=new Map();
    for(const item of lines){const key=`${item.pass}|${item.fare}|${item.unitPaise}`;const group=groups.get(key)||{pass:item.pass,fare:item.fare,unit:item.unitPaise/100,count:0};group.count++;groups.set(key,group);}
    return [...groups.values()].map(group=>summaryLine(passLabel(group.pass,group.fare),`${group.count} × ${money(group.unit)}`));
  }
  function summaryLine(label,value,id){const row=document.createElement('p'),name=document.createElement('span'),amount=document.createElement('strong');name.textContent=label;amount.textContent=value;if(id)amount.id=id;row.append(name,amount);return row;}
  function renderPlanChoice(){
    const box=el('plan-choice');if(!box)return;
    box.hidden=!settings.prebookEnabled;
    if(!settings.prebookEnabled)plan='full';
    for(const option of box.querySelectorAll('input[name="booking-plan"]'))option.checked=option.value===plan;
    // A deposit brings a booking confirmation, not passes; say so at the top of the step.
    const note=el('ticket-delivery-note');
    if(note)note.textContent=plan==='prebook'
      ?'After your deposit we email you a booking confirmation. Your named QR passes, one for each guest, are emailed once the booking is paid in full. Entry is by QR pass only.'
      :'Your named passes are emailed to you, with a scannable QR for each guest, as soon as payment is verified. You can download them here too.';
    const full=currentQuote('full'),pre=currentQuote('prebook');
    if(full.totalPaise!==null){
      el('plan-full-amount').textContent=money(full.totalPaise/100);
      el('plan-full-note').textContent=`${full.priceList==='early'?'Early-bird prices. ':''}Your QR passes are emailed as soon as you pay.`;
    }
    if(pre.totalPaise!==null){
      el('plan-prebook-amount').textContent=`${money(pre.payNowPaise/100)} now`;
      el('plan-prebook-note').textContent=`${money(settings.depositPerPerson)} a person now, ${money(pre.balancePaise/100)} later by UPI or in cash at the venue. Regular prices. Entry is by QR pass only, and your QR passes are issued once the booking is paid in full.`;
    }
  }
  function summary(){
    const q=currentQuote();
    el('guest-count').value=String(q.people);
    const lines=document.querySelector('.payment-summary .summary-lines');
    if(lines)lines.replaceChildren(...priceLines(q.lines),summaryLine('Total people',String(q.people),'people-line'));
    el('subtotal').textContent=money(q.subtotalPaise/100);
    if(el('subtotal').previousElementSibling)el('subtotal').previousElementSibling.textContent='Passes';
    el('minus').disabled=state.length===1;el('plus').disabled=state.length>=settings.maxPerBooking;
    el('confirmed-charges').hidden=q.totalPaise===null;
    if(q.totalPaise!==null){
      el('extra-charge-total').textContent=money(q.extrasPaise/100);el('extra-charge-total').parentElement.hidden=q.extrasPaise===0;
      el('final-total').textContent=money(q.totalPaise/100);
      let extra=el('plan-lines');
      if(!extra){extra=document.createElement('div');extra.id='plan-lines';extra.className='plan-lines';el('confirmed-charges').append(extra);}
      const rows=[];
      if(q.savingPaise>0)rows.push(summaryLine(q.priceList==='early'?'Your saving, with early-bird prices':'Your saving',money(q.savingPaise/100)));
      if(q.plan==='prebook')rows.push(summaryLine('Pay now',money(q.payNowPaise/100)),summaryLine('Balance later, by UPI or cash',money(q.balancePaise/100)));
      extra.replaceChildren(...rows);
    }
    el('charges-pending').hidden=q.totalPaise!==null;
    renderPlanChoice();
    const passes=state.length,amount=q.totalPaise!==null?q.totalPaise/100:q.subtotalPaise/100;
    // Genders are entered on the attendee step, so before it the total can only
    // be a starting price: what this many people pay at the lowest prices.
    const lowest=bestCase(passChoice==='alcohol'?'alcohol':'normal',passes);
    const count=`${passes} ${passes===1?'pass':'passes'}`;
    document.querySelectorAll('.step-total').forEach(node=>{
      node.textContent=node.closest('#your-details')&&lowest.totalPaise!==null?`${count} · from ${money(lowest.totalPaise/100)}`:`${count} · ${money(amount)}`;
    });
    renderEarlyBird();
    renderOffers();
    renderPassChoice();
    updateBar();
  }
  function updateBar(){
    if(!bar)return;
    const panel=el(steps[stepIndex]),nav=document.querySelector('.axp-steps');
    const own=steps[stepIndex]==='payment-step'?el('payment-button'):panel?.querySelector('.step-nav');
    const onScreen=node=>{if(!node)return false;const box=node.getBoundingClientRect();return box.top<innerHeight&&box.bottom>0;};
    const reached=!!nav&&nav.getBoundingClientRect().top<innerHeight;
    bar.hidden=document.body.classList.contains('has-booking')||!panel||panel.hidden||!reached||onScreen(own);
    document.body.classList.toggle('has-booking-bar',!bar.hidden);
    if(bar.hidden)return;
    const q=currentQuote(),count=`${state.length} ${state.length===1?'pass':'passes'}`;
    if(steps[stepIndex]==='payment-step'&&q.totalPaise!==null){
      const now=q.plan==='prebook'?q.payNowPaise:q.totalPaise;
      barTotal.textContent=q.plan==='prebook'?`${money(now/100)} now · ${money(q.balancePaise/100)} later`:`${count} · ${money(now/100)}`;
      barAction.textContent=q.plan==='prebook'?`Pay deposit ${money(now/100)}`:`Pay ${money(now/100)}`;
    }else{
      barTotal.textContent=el(`${steps[stepIndex]}`)?.querySelector('.step-total')?.textContent||count;
      barAction.textContent=stepIndex===0?'Continue':'Review & pay';
    }
  }
  // Step 1's prices for this many people, before anyone's details are in:
  // `plainCase` with no couple, `bestCase` with every pair a couple.
  const crowd=(pass,count,paired)=>Array.from({length:count},(_,i)=>({pass,gender:paired?(i%2?'man':'woman'):''}));
  const bestCase=(pass,count)=>quoteBooking(crowd(pass,count,true),settings,{plan:'full',earlyBird:earlyBirdAvailable(count)});
  const plainCase=(pass,count)=>quoteBooking(crowd(pass,count,false),settings,{plan:'full',earlyBird:earlyBirdAvailable(count)});
  function renderPassChoice(){
    const box=el('pass-choice');if(!box)return;
    // Ticked before settings arrive, so a restored draft resumes past step 1.
    for(const option of box.querySelectorAll('input[name="booking-pass"]'))option.checked=option.value===passChoice;
    if(!settingsLoaded)return;
    const count=state.length,list=earlyBirdAvailable(count)?'early':'regular';
    for(const pass of ['normal','alcohol']){
      const note=el(`pass-choice-${pass}-note`),amount=el(`pass-choice-${pass}-amount`);
      if(note)note.textContent=`${list==='early'?'Early bird: ':''}${money(unitPrice(settings,list,pass,'single'))} each, or ${money(unitPrice(settings,list,pass,'group'))} each for couples and groups of 4+.`;
      const best=bestCase(pass,count),plain=plainCase(pass,count);
      if(amount)amount.textContent=best.totalPaise===null?'':`${best.totalPaise<plain.totalPaise?'from ':''}${money(best.totalPaise/100)}`;
    }
    const quote=el('pass-choice-quote');if(!quote)return;
    const people=`${count} ${count===1?'person':'people'}`;
    if(passChoice==='mix'){quote.textContent=`Prices follow each person's pass. You choose them on the next step.`;return;}
    if(passChoice!=='normal'&&passChoice!=='alcohol'){quote.textContent='';return;}
    const tier=tierName(passChoice),best=bestCase(passChoice,count),plain=plainCase(passChoice,count);
    if(best.totalPaise===null){quote.textContent='';return;}
    const early=best.priceList==='early'?' Early-bird prices, for bookings paid in full.':'';
    if(count>=4)quote.textContent=`${people} on ${tier} pay the group price: ${money(best.totalPaise/100)} in all, ${money(best.lines[0].unitPaise/100)} each.${early}`;
    else if(best.totalPaise<plain.totalPaise)quote.textContent=`${people} on ${tier}: ${money(plain.totalPaise/100)}, or ${money(best.totalPaise/100)} with the couple price for two guests of different genders.${early}`;
    else quote.textContent=`${people} on ${tier}: ${money(plain.totalPaise/100)}.${early}`;
  }
  // The pass cards in step 1 show today's single price and the couple and
  // group price beside it.
  function passCardPrices(){
    const list=earlyBirdAvailable()?'early':'regular';
    for(const [pass,id] of [['normal','normal-price'],['alcohol','alcohol-price']]){
      const node=el(id);if(!node)continue;
      node.textContent=money(unitPrice(settings,list,pass,'single'));
      const small=node.parentElement&&node.parentElement.querySelector('small');
      if(small)small.textContent=`${list==='early'?'early bird · ':''}per person · couples and groups of 4+ ${money(unitPrice(settings,list,pass,'group'))} each`;
    }
  }
  // While the early bird is open: how long is left. It
  // refreshes every minute, so prices switch back as soon as it ends.
  function renderEarlyBird(){
    const hint=el('pass-limit-hint');if(!hint)return;
    let banner=el('early-bird-banner');
    if(!banner){banner=document.createElement('p');banner.id='early-bird-banner';banner.className='early-bird-banner';banner.setAttribute('role','status');hint.after(banner);}
    const ends=earlyBird&&earlyBird.endsAt?Date.parse(earlyBird.endsAt):NaN;
    const open=!!(earlyBird&&earlyBird.open&&ends>Date.now());
    banner.hidden=!open;
    if(!open){clearInterval(earlyTimer);earlyTimer=null;return;}
    const left=ends-Date.now(),days=Math.floor(left/864e5),hours=Math.floor(left%864e5/36e5),minutes=Math.floor(left%36e5/6e4);
    banner.textContent=`Early-bird prices end in ${days>0?`${days}d ${hours}h`:`${hours}h ${minutes}m`}. For bookings paid in full; pre-bookings pay regular prices.`;
    if(!earlyTimer)earlyTimer=setInterval(()=>{summary();passCardPrices();},60000);
  }
  // ---------- Offers ----------
  // Lead with offers below the hero. Later steps explain what is applied
  // and what one more guest would change. All prices use server settings.
  const tierName=pass=>pass==='alcohol'?'Gold':'Silver';
  const offerPriceList=()=>earlyBirdAvailable(1)?'early':'regular';
  function earlyEndLabel(){return earlyBird&&earlyBird.endsAt?new Intl.DateTimeFormat('en-IN',{day:'numeric',month:'short',timeZone:'Asia/Kolkata'}).format(new Date(earlyBird.endsAt)):'';}
  function joinWords(words){return words.length<2?words.join(''):`${words.slice(0,-1).join(', ')} and ${words.at(-1)}`;}
  function appliedOffer(q){
    if(q.totalPaise===null||q.savingPaise<=0)return '';
    const parts=[];
    if(q.priceList==='early')parts.push('early-bird prices');
    if(q.lines.some(line=>line.fare==='couple'))parts.push('the couple price');
    if(q.lines.some(line=>line.fare==='group'))parts.push('the group price');
    const words=joinWords(parts);
    return words?`${words[0].toUpperCase()}${words.slice(1)} applied: you save ${money(q.savingPaise/100)}.`:'';
  }
  // One suggestion at a time, Gold first: what one or two more people on the
  // same pass would change, priced exactly as the booking would be.
  const firstName=name=>String(name||'').trim().split(/\s+/)[0]||'';
  function upsell(){
    const q=currentQuote();
    if(q.totalPaise===null)return null;
    const room=settings.maxPerBooking-state.length;
    const priceWith=extra=>quoteBooking([...state,...extra],settings,{plan,earlyBird:earlyBirdAvailable(state.length+extra.length)});
    // A couple split across passes pays single prices: the couple price needs
    // both on the same pass. Offer to move the Silver guest up to Gold when
    // they are old enough for it; a downgrade is never suggested.
    for(const i of state.keys()){
      if(state[i].pass!=='alcohol'||!state[i].gender||q.lines[i].fare!=='single')continue;
      for(const j of state.keys()){
        const guest=state[j];
        if(guest.pass!=='normal'||!guest.gender||guest.gender===state[i].gender||q.lines[j].fare!=='single'||ageBracket(guest.dob)!=='21plus')continue;
        const after=quoteBooking(state.map((g,k)=>k===j?{...g,pass:'alcohol'}:g),settings,{plan,earlyBird:earlyBirdAvailable()});
        if(after.lines[i].fare!=='couple'||after.totalPaise===null)continue;
        const who=firstName(guest.name)||`attendee ${j+1}`,more=after.totalPaise-q.totalPaise;
        return {pass:'alcohol',move:j,action:`Move ${who} to Gold`,text:`Put ${who} on Gold too and you both get the couple price of ${money(after.lines[i].unitPaise/100)} each${more>0?`, for ${money(more/100)} more in total`:more<0?`, saving ${money(-more/100)}`:''}.`};
      }
    }
    for(const pass of ['alcohol','normal']){
      const idx=[];state.forEach((guest,i)=>{if(guest.pass===pass)idx.push(i);});
      const tier=tierName(pass);
      if(idx.length===3&&room>=1){
        const each=priceWith([{pass,gender:''}]).lines[idx[0]].unitPaise;
        const saving=idx.reduce((sum,i)=>sum+q.lines[i].unitPaise,0)-3*each;
        if(saving>0)return {pass,action:'Add a guest',text:`Add one more ${tier} guest and all four pay the group price of ${money(each/100)} each, saving the three of you ${money(saving/100)}.`};
      }
      if(idx.length===2&&room>=2&&state[idx[0]].gender&&state[idx[1]].gender&&q.lines[idx[0]].fare==='single'){
        const each=priceWith([{pass,gender:''},{pass,gender:''}]).lines[idx[0]].unitPaise;
        if(each<q.lines[idx[0]].unitPaise)return {pass,action:'Add a guest',text:`Two more on ${tier} make a group of 4, and everyone on ${tier} pays ${money(each/100)} each instead of ${money(q.lines[idx[0]].unitPaise/100)}.`};
      }
      // Their partner may already be in the booking on the other pass.
      const partnerHere=idx.length===1&&state.some((g,k)=>k!==idx[0]&&q.lines[k].fare==='single'&&g.gender&&state[idx[0]].gender&&g.gender!==state[idx[0]].gender);
      if(idx.length===1&&room>=1&&!partnerHere){
        const partner=state[idx[0]].gender==='woman'?'man':'woman';
        const each=priceWith([{pass,gender:partner}]).lines[idx[0]].unitPaise,single=q.lines[idx[0]].unitPaise;
        if(each<single)return {pass,action:'Add a partner',text:`Coming with a partner? Two people of different genders on ${tier} pay ${money(each/100)} each instead of ${money(single/100)}.`};
      }
    }
    return null;
  }
  function addGuest(pass){
    if(state.length>=settings.maxPerBooking)return;
    state.push({name:'',email:'',instagram:'',phone:'',dob:'',age:'',gender:'',pass});
    openCard=state.length-1;render();saveDraft();
    setTimeout(()=>el(`guest-${state.length-1}-name`)?.focus(),60);
  }
  function offerBox(id,anchor,where){
    let box=el(id);
    if(!box&&anchor){box=document.createElement('div');box.id=id;box.className='offer-hint';box.setAttribute('aria-live','polite');anchor[where](box);}
    return box;
  }
  // A hint either adds a guest or moves one to another pass.
  function applyHint(hint,{toAttendees=false}={}){
    if(Number.isInteger(hint.move)&&state[hint.move]){
      state[hint.move].pass=hint.pass;render();saveDraft();
      if(steps[stepIndex]==='payment-step')renderReview();
      return;
    }
    addGuest(hint.pass);
    if(toAttendees)showStep(steps.indexOf('your-guests'));
  }
  function fillOfferBox(box,lines,hint,onAction){
    if(!box)return;
    const rows=lines.filter(Boolean).map(text=>{const row=document.createElement('p');row.textContent=text;return row;});
    if(hint){
      const row=document.createElement('p');row.textContent=hint.text+' ';
      const action=document.createElement('button');action.type='button';action.className='offer-action';action.textContent=hint.action;
      action.addEventListener('click',()=>onAction(hint));row.append(action);rows.push(row);
    }
    box.replaceChildren(...rows);box.hidden=rows.length===0;
  }
  function offerCard({kind,title,amount,unit,detail,terms,status}){
    const item=document.createElement('li');item.className=`booking-offer booking-offer-${kind}`;
    const name=document.createElement('h3');name.textContent=title;
    const price=document.createElement('p');price.className='booking-offer-price';
    const value=document.createElement('strong');value.textContent=amount;
    const basis=document.createElement('span');basis.textContent=unit;price.append(value,basis);
    const description=document.createElement('p');description.className='booking-offer-detail';description.textContent=detail;
    const conditions=document.createElement('p');conditions.className='booking-offer-terms';conditions.textContent=terms;
    item.append(name,price,description,conditions);
    if(status){const badge=document.createElement('p');badge.className='booking-offer-status';badge.textContent=status;item.prepend(badge);}
    return item;
  }
  function renderOffers(){
    if(settingsLoaded){
      // The event page: three clear attraction points directly below the hero.
      const list=offerPriceList();
      const ways=el('offer-list');
      if(ways){
        const rows=[];
        if(list==='early')rows.push({
          kind:'early',title:'Early-bird passes',
          amount:`From ${money(Math.min(unitPrice(settings,'early','normal','single'),unitPrice(settings,'early','alcohol','single')))}`,unit:'per person',
          detail:`Silver ${money(unitPrice(settings,'early','normal','single'))} / Gold ${money(unitPrice(settings,'early','alcohol','single'))}. Book before ${earlyEndLabel()}.`,
          terms:'Pay in full to get early-bird prices. Available while the early-bird allocation lasts.',
          status:`Until ${earlyEndLabel()}`
        });
        rows.push({
          kind:'together',title:'Couple & group offers',status:'Better together',
          amount:`From ${money(Math.min(unitPrice(settings,list,'normal','group'),unitPrice(settings,list,'alcohol','group')))}`,unit:'per person',
          detail:`Come together for less. Silver ${money(unitPrice(settings,list,'normal','group'))} / Gold ${money(unitPrice(settings,list,'alcohol','group'))} each.`,
          terms:'Couples: two guests of different genders. Groups: 4+ guests. Same pass type required.'+(list==='early'?' Early-bird rates require full payment.':'')
        });
        if(settings.prebookEnabled)rows.push({
          kind:'prebook',title:'Pre-book your passes',status:'Reserve with a deposit',
          amount:`${money(settings.depositPerPerson)} now`,unit:'per person',
          detail:'Reserve your places now. Pay the balance later by UPI or in cash at the venue.',
          terms:'Regular pass prices apply. Deposit is non-refundable. QR passes are issued after full payment.'
        });
        ways.replaceChildren(...rows.map(offerCard));
        if(el('offer-list-wrap'))el('offer-list-wrap').hidden=false;
      }
    }
    // Attendees and review: what is applied, and what one more guest would change.
    const q=currentQuote(),applied=appliedOffer(q),hint=upsell();
    const goAdd=h=>applyHint(h,{toAttendees:true});
    fillOfferBox(offerBox('guests-offer',el('your-guests')?.querySelector('.step-nav'),'before'),[applied],hint,h=>applyHint(h));
    fillOfferBox(offerBox('review-offer',el('review-total')?.closest('.subtotal'),'after'),[applied],hint,goAdd);
    // Payment: what paying in full keeps while the early bird is open.
    const full=currentQuote('full'),pre=currentQuote('prebook');
    let compare='';
    if(settings.prebookEnabled&&full.priceList==='early'&&full.totalPaise!==null&&pre.totalPaise!==null&&pre.totalPaise>full.totalPaise){
      compare=`${plan==='prebook'?'Paying in full now':'Paying in full'} keeps early-bird prices: ${money((pre.totalPaise-full.totalPaise)/100)} less than pre-booking.`;
    }
    fillOfferBox(offerBox('payment-offer',el('plan-choice'),'after'),[compare],hint,goAdd);
  }
  function input(labelText,property,index,{type='text',placeholder='',maxLength=100,required=true}={}){
    const label=required?requiredLabel(labelText):optionalLabel(labelText);
    const field=document.createElement('input');field.id=`guest-${index}-${property}`;field.name=`attendees[${index}][${property}]`;field.type=type;field.required=required;field.maxLength=maxLength;field.placeholder=placeholder;
    if(property==='phone'&&!state[index].phone)state[index].phone=DIAL;
    field.value=state[index][property];
    field.addEventListener('input',()=>{state[index][property]=field.value;if(index===0&&CONTACT_KEYS.includes(property))syncContactFromFirst();});label.append(field,describeField(field,`Attendee ${index+1}: ${labelText.toLowerCase()}`));return label;
  }
  // ---------- Attendee cards ----------
  // One card is open at a time. A finished card folds to a line, such as
  // "Asha Verma · Gold · 21+ · Woman", so a group of five is not a page of
  // thirty-five fields. Folded fields stay in the form and are still checked.
  const cardFields=index=>[...(el(`guest-${index}-card`)?.querySelectorAll('input,select')||[])].filter(field=>!field.closest('label[hidden]'));
  const cardComplete=index=>cardFields(index).every(field=>!fieldError(field));
  function firstIncomplete(after=-1){
    for(let step=1;step<=state.length;step++){const i=(after+step)%state.length;if(!cardComplete(i))return i;}
    return -1;
  }
  function cardLine(index){
    const guest=state[index],name=guest.name.trim();
    if(!name)return 'Details needed';
    return [name,passLabel(guest.pass),GENDER_LABELS[guest.gender]].filter(Boolean).join(' · ');
  }
  function applyCards(){
    state.forEach((guest,index)=>{
      const card=el(`guest-${index}-card`);if(!card)return;
      const open=index===openCard,complete=cardComplete(index);
      card.classList.toggle('is-collapsed',!open);
      card.classList.toggle('is-complete',!open&&complete);
      card.querySelector('.attendee-line').textContent=open?'':cardLine(index);
      const edit=card.querySelector('.attendee-edit');edit.hidden=open;edit.textContent=complete?'Edit':'Add details';
      const others=state.some((g,k)=>k!==index&&!cardComplete(k));
      card.querySelector('.attendee-done').textContent=others?'Next guest →':'Done';
    });
  }
  function openCardAt(index,{focus=true}={}){
    openCard=index;applyCards();
    if(focus){const card=el(`guest-${index}-card`);card?.scrollIntoView({block:'start',behavior:'smooth'});el(`guest-${index}-name`)?.focus({preventScroll:true});}
  }
  // "Done" checks only this card, then opens the next one still to fill in.
  function finishCard(index){
    const fields=cardFields(index);
    fields.forEach(field=>touched.add(field.id));
    refreshReadiness();
    const wrong=fields.find(field=>fieldError(field));
    if(wrong){wrong.focus({preventScroll:true});wrong.scrollIntoView({block:'center',behavior:'smooth'});return;}
    const next=firstIncomplete(index);
    if(next<0){openCard=-1;applyCards();return;}
    openCardAt(next);
  }
  // A Gold booking keeps one pass for everyone, except a guest under 21, who
  // can only hold Silver; their card says so and shows the pass it gave them.
  const showsOwnPass=guest=>!passChoice||passChoice==='mix'||guest.pass!==passChoice;
  function render(){
    el('attendees').replaceChildren();
    if(openCard>=state.length)openCard=state.length-1;
    state.forEach((guest,index)=>{
      const section=document.createElement('section');section.className='attendee';section.id=`guest-${index}-card`;section.dataset.index=String(index);section.setAttribute('aria-labelledby',`guest-${index}-title`);
      const head=document.createElement('div');head.className='attendee-head';
      const title=document.createElement('h3');title.id=`guest-${index}-title`;title.textContent=index===0&&!bookingForOthers?'You':`Attendee ${index+1}`;
      const line=document.createElement('p');line.className='attendee-line';
      const edit=document.createElement('button');edit.type='button';edit.className='text-button attendee-edit';edit.addEventListener('click',()=>openCardAt(index));
      head.append(title,line,edit);section.append(head);
      if(index===0&&!bookingForOthers){const note=document.createElement('p');note.className='helper attendee-note';note.textContent='You are the booking contact: the payment receipt and every pass come to you.';section.append(note);}
      const grid=document.createElement('div');grid.className='field-grid';
      grid.append(
        input('Full name','name',index,{placeholder:'Aarav Sharma'}),
        input('Email address','email',index,{type:'email',placeholder:'aarav@example.com',maxLength:100}),
        input('Phone number','phone',index,{type:'tel',placeholder:'+91 98765 43210',maxLength:20}),
        input('Instagram username','instagram',index,{placeholder:'@username',maxLength:31,required:false})
      );
      const dobLabel=requiredLabel('Date of birth');
      const dob=document.createElement('input');dob.type='date';dob.id=`guest-${index}-dob`;dob.name=`attendees[${index}][dob]`;dob.required=true;dob.value=guest.dob;{const day=String(settings.eventDate||'');if(/^\d{4}-\d{2}-\d{2}$/.test(day)){const y=Number(day.slice(0,4)),md=day.slice(4);dob.max=(y-20)+md;dob.min=(y-100)+md;}}
      dobLabel.append(dob,describeField(dob,`Attendee ${index+1}: date of birth`));grid.append(dobLabel);
      // Gender decides couple pricing, and the gate checks it against photo ID.
      const genderLabel=requiredLabel('Gender');const gender=document.createElement('select');gender.id=`guest-${index}-gender`;gender.name=`attendees[${index}][gender]`;gender.required=true;
      gender.append(new Option('Choose…',''),...GENDERS.map(value=>new Option(GENDER_LABELS[value],value)));gender.value=guest.gender||'';
      gender.addEventListener('change',()=>{guest.gender=gender.value;summary();});
      genderLabel.append(gender,describeField(gender,`Attendee ${index+1}: gender`));grid.append(genderLabel);
      const passLabel=requiredLabel('Pass type');const pass=document.createElement('select');pass.id=`guest-${index}-pass`;pass.name=`attendees[${index}][pass]`;pass.required=true;
      pass.append(new Option('Silver','normal'),new Option('Gold · 21+','alcohol'));pass.value=guest.pass;pass.options[1].disabled=ageBracket(guest.dob)!=='21plus';
      const passNote=document.createElement('small');passNote.className='helper pass-note';
      const passShown=()=>{passLabel.hidden=!showsOwnPass(guest);passNote.textContent=passChoice==='alcohol'&&guest.pass!=='alcohol'?'Gold needs age 21 or over on the event date, so this guest has a Silver pass.':'';passNote.hidden=!passNote.textContent;};
      dob.addEventListener('input',()=>{guest.dob=dob.value;const bracket=ageBracket(dob.value);guest.age=bracket||'';if(bracket!=='21plus'&&guest.pass==='alcohol'){guest.pass='normal';pass.value='normal';}else if(bracket==='21plus'&&passChoice==='alcohol'&&guest.pass!=='alcohol'){guest.pass='alcohol';pass.value='alcohol';}pass.options[1].disabled=bracket!=='21plus';passShown();summary();});
      pass.addEventListener('change',()=>{guest.pass=pass.value;passShown();summary();});passLabel.append(pass,describeField(pass,`Attendee ${index+1}: pass type`));grid.append(passLabel,passNote);passShown();
      const done=document.createElement('button');done.type='button';done.className='secondary attendee-done';done.addEventListener('click',()=>finishCard(index));
      section.append(grid,done);el('attendees').append(section);
    });
    syncContactFromFirst();summary();refreshReadiness();applyCards();
  }
  // A new guest starts on the booking's pass.
  const startingPass=()=>passChoice==='alcohol'||passChoice==='normal'?passChoice:'normal';
  el('plus').addEventListener('click',()=>{if(state.length<settings.maxPerBooking){state.push({name:'',email:'',instagram:'',phone:'',dob:'',age:'',gender:'',pass:startingPass()});render();saveDraft();}});
  el('minus').addEventListener('click',()=>{if(state.length>1){state.pop();render();saveDraft();}});
  // One pass for everyone, or a mix chosen per person. A guest already known
  // to be under 21 stays on Silver whatever the booking's pass.
  el('pass-choice')?.addEventListener('change',event=>{
    if(event.target.name!=='booking-pass')return;
    passChoice=event.target.value;
    if(passChoice!=='mix')state.forEach(guest=>{guest.pass=passChoice==='alcohol'&&guest.dob&&ageBracket(guest.dob)!=='21plus'?'normal':passChoice;});
    touched.add('booking-pass-normal');render();saveDraft();
  });
  // Booking for others: the contact gets their own fields, and attendee 1 is
  // just a guest. Contact details copied from attendee 1 are cleared, so the
  // booker types their own.
  el('booking-for-others')?.addEventListener('change',event=>{
    bookingForOthers=event.target.checked;
    el('booking-contact').hidden=!bookingForOthers;
    if(bookingForOthers){for(const key of CONTACT_KEYS){const field=el('buyer-'+key);if(field.value===(state[0]?.[key]||''))field.value=key==='phone'?DIAL:'';}}
    render();saveDraft();
  });
  el('plan-choice')?.addEventListener('change',event=>{
    if(event.target.name!=='booking-plan')return;
    plan=event.target.value==='prebook'?'prebook':'full';summary();
    window.dispatchEvent(new Event('booking-readiness-updated'));
    if(plan==='prebook')showPrebookNotice();
  });
  // Early-bird prices are for bookings paid in full, so a guest who picks
  // pre-booking while they apply is told what it costs them, with a way back.
  function showPrebookNotice(){
    const dialog=el('prebook-notice');if(!dialog||dialog.open)return;
    const full=currentQuote('full'),pre=currentQuote('prebook');
    if(full.priceList!=='early')return;
    let text=`Early-bird prices are not available on pre-bookings. They apply only when you pay in full. A pre-booking with a ${money(settings.depositPerPerson)} deposit per person pays regular prices.`;
    if(full.totalPaise!==null&&pre.totalPaise!==null&&pre.totalPaise>full.totalPaise)text+=` Your total would be ${money(pre.totalPaise/100)} instead of ${money(full.totalPaise/100)}, ${money((pre.totalPaise-full.totalPaise)/100)} more.`;
    el('prebook-notice-text').textContent=text;
    dialog.showModal();
  }
  el('prebook-notice-full')?.addEventListener('click',()=>{
    const option=el('plan-choice').querySelector('input[name="booking-plan"][value="full"]');
    option.checked=true;option.dispatchEvent(new Event('change',{bubbles:true}));
    el('prebook-notice').close();option.focus();
  });
  el('prebook-notice-continue')?.addEventListener('click',()=>el('prebook-notice').close());
  if(!el('buyer-phone').value.trim())el('buyer-phone').value=DIAL;
  // The review step shows everything that was entered, so it is rebuilt every
  // time the step opens rather than only when a button is pressed.
  function detailLine(label,value){return value&&String(value).trim()?`${label}: ${String(value).trim()}`:'';}
  function renderReview(){
    const q=currentQuote();
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
      pass.textContent=`${passLabel(guest.pass,q.lines[i].fare)} · ${money(q.lines[i].unitPaise/100)}`;
      const extra=document.createElement('span');
      extra.textContent=[
        detailLine('Date of birth',guest.dob),
        detailLine('Gender',GENDER_LABELS[guest.gender]),
        detailLine('Email',guest.email),
        detailLine('Phone',guest.phone),
        detailLine('Instagram',guest.instagram),
      ].filter(Boolean).join('  \u00b7  ');
      row.append(name,pass);if(extra.textContent)row.append(extra);
      return row;
    }));
    if(el('review-total'))el('review-total').textContent=money((q.totalPaise??q.subtotalPaise)/100);
    if(!el('review-edit-guests')){
      const edit=(id,text,step)=>{const button=document.createElement('button');button.type='button';button.id=id;button.className='review-edit';button.textContent=text;button.addEventListener('click',()=>showStep(step));return button;};
      const row=document.createElement('p');row.className='review-edits';
      row.append(edit('review-edit-guests','Edit attendees',1),edit('review-edit-passes','Change passes',0));
      el('review-guests').after(row);
    }
    el('review-notice').textContent=(q.totalPaise===null?'Final charges are pending. ':'')+'Nothing is booked and no payment is taken until you pay below.';
  }
  // Enter in a field moves the booking on, never posts the form.
  el('booking-form').addEventListener('submit',event=>{
    event.preventDefault();el('form-message').textContent='';
    if(stepIndex<steps.length-1)goForward();
  });
  for(const eventName of ['input','change'])el('booking-form').addEventListener(eventName,refreshReadiness);
  el('booking-form').addEventListener('focusout',event=>{if(event.target.matches('[required]')){touched.add(event.target.id);refreshReadiness();}});
  // Leaving an empty field shows its error, which pushes the buttons below it
  // down between press and release, so the click would land on nothing. These
  // buttons keep focus where it is when pressed; their click checks the step.
  document.addEventListener('mousedown',event=>{if(event.target.closest('.step-next,.attendee-done,.booking-bar-action'))event.preventDefault();});
  el('check-required-fields').addEventListener('click',showMissingFields);

  // A refresh, a dropped connection or an accidental swipe should not cost a
  // guest everything they typed. The draft lives in sessionStorage, so it is
  // scoped to this tab and gone when the tab closes; it is cleared once the
  // booking is confirmed. Terms acceptance is deliberately not saved.
  function restoreDraft(){
    try{
      const draft=JSON.parse(sessionStorage.getItem('axp-booking-draft')||'null');
      // Version 1 drafts come from the five-step form: their details are kept,
      // but their step numbers mean something else, so they start at step 1.
      if(!draft||(draft.v!==1&&draft.v!==2))return 0;
      for(const key of CONTACT_KEYS)if(typeof draft.buyer?.[key]==='string')el('buyer-'+key).value=draft.buyer[key];
      if(Array.isArray(draft.attendees)&&draft.attendees.length){
        const blank={name:'',email:'',instagram:'',phone:'',dob:'',age:'',gender:'',pass:'normal'};
        state.splice(0,state.length,...draft.attendees.slice(0,10).map(guest=>({...blank,...guest})));
        state.forEach(guest=>{guest.age=ageBracket(guest.dob)||'';if(guest.pass==='alcohol'&&guest.dob&&guest.age!=='21plus')guest.pass='normal';});
      }
      if(draft.v===1)return 0;
      passChoice=['normal','alcohol','mix'].includes(draft.passChoice)?draft.passChoice:'';
      bookingForOthers=draft.bookingForOthers===true;
      el('booking-for-others').checked=bookingForOthers;el('booking-contact').hidden=!bookingForOthers;
      return Number.isInteger(draft.step)?draft.step:0;
    }catch{return 0;}
  }
  function saveDraft(){
    try{
      sessionStorage.setItem('axp-booking-draft',JSON.stringify({
        v:2,step:stepIndex,passChoice,bookingForOthers,
        buyer:Object.fromEntries(CONTACT_KEYS.map(key=>[key,el('buyer-'+key).value])),
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
    [/\bart\b|gallery|paint|exhibit/i,'<path d="M12 3.5c-4.7 0-8.5 3.4-8.5 7.9 0 4.6 3.8 8.1 8.5 8.1 1 0 1.7-.7 1.7-1.6 0-.4-.2-.8-.4-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9c2.3 0 4.1-1.8 4.1-4.1 0-3.9-3.8-6.5-8.5-6.5Z"/><circle cx="7.8" cy="11.2" r="1.2"/><circle cx="10.2" cy="7.6" r="1.2"/><circle cx="14.6" cy="7.8" r="1.2"/>'],
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
      const response=await fetch('/api/public-settings'+(new URLSearchParams(location.search).get('mode')==='test'?'?mode=test':''),{cache:'no-store'});if(!response.ok)throw new Error('Could not load event settings.');
      const data=await response.json();settings={...DEFAULT_SETTINGS,...data.settings};earlyBird=data.earlyBird||null;
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
      el('pass-limit-hint').textContent=`Entry is for guests aged 20 and over. Choose up to ${settings.maxPerBooking} passes per booking; mixing pass types is welcome. Couples, and groups of 4 or more on the same pass, pay less each.`;
      el('normal-benefits').textContent=settings.normalDescription;el('alcohol-benefits').textContent=settings.alcoholDescription;
      passCardPrices();
      el('summary-name').textContent=settings.eventName;el('summary-date').textContent=`${dateLabel()} · ${time(settings.startTime)}`;el('summary-venue').textContent=settings.venueName;
      el('support-phone').textContent=settings.supportPhone;el('support-phone').href='tel:'+settings.supportPhone.replace(/[^+\d]/g,'');
      el('support-email').hidden=!settings.supportEmail;if(settings.supportEmail){el('support-email').textContent=settings.supportEmail;el('support-email').href='mailto:'+settings.supportEmail;}
      el('merchant-name').textContent=settings.merchantName;
      el('bar-rule').textContent=`Gold passes are for attendees aged 21 or over. Last service is at ${time(settings.barCloseTime)}.`;
      if(el('prebook-rule'))el('prebook-rule').hidden=!settings.prebookEnabled;
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
  // Passes, attendees, then review and pay on one screen. The event itself is
  // part of the page above the form, not a step.
  const steps=['your-details','your-guests','payment-step'];
  // The forward button says where it goes, not just "Next".
  const nextLabels=['Continue to attendees','Review & pay',null];
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
      if(next)next.hidden=stepIndex===steps.length-1;
    }
    document.querySelectorAll('.step-block-note').forEach(note=>{note.textContent='';});
    const entering=el(steps[stepIndex]);
    if(entering){entering.classList.remove('is-entering');void entering.offsetWidth;entering.classList.add('is-entering');}
    if(steps[stepIndex]==='payment-step')renderReview();
    // The attendee step opens on the first card still to fill in.
    if(steps[stepIndex]==='your-guests'&&stepIndex!==previous){openCard=firstIncomplete();applyCards();}
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
    saveDraft();updateBar();
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
    for(const field of liveFields(panel)){
      touched.add(field.id);
      if(fieldError(field))ok=false;
    }
    refreshReadiness();
    return ok;
  }
  function stepSilentlyValid(index){
    const panel=el(steps[index]);
    return !panel||liveFields(panel).every(field=>!fieldError(field));
  }
  // When a step will not let you through, take you to the first thing that is
  // wrong and say so beside the buttons, rather than failing silently.
  function explainBlocked(index){
    const panel=el(steps[index]);
    const field=panel&&liveFields(panel).find(f=>fieldError(f));
    if(!field){showMissingFields();return;}
    // A folded attendee card opens to show what it is missing.
    const card=field.closest('.attendee');
    if(card&&card.classList.contains('is-collapsed')){openCard=Number(card.dataset.index);applyCards();}
    field.focus({preventScroll:true});
    field.scrollIntoView({block:'center',behavior:'smooth'});
    let note=panel.querySelector('.step-block-note');
    if(!note){note=document.createElement('p');note.className='step-block-note';note.setAttribute('role','alert');panel.querySelector('.step-nav')?.before(note);}
    note.textContent='A few details need attention before you continue. They are marked above.';
  }
  function goForward(){if(stepValid(stepIndex))showStep(stepIndex+1);else explainBlocked(stepIndex);}
  // A "details need attention" note goes as soon as its step is complete.
  for(const eventName of ['input','change'])el('booking-form').addEventListener(eventName,()=>{
    const note=el(steps[stepIndex])?.querySelector('.step-block-note');
    if(note&&note.textContent&&stepSilentlyValid(stepIndex))note.textContent='';
  });
  // From the list of missing details: go to the step and card holding the
  // field, then to the field itself.
  function revealField(field){
    const panel=field.closest('.step-panel'),index=panel?steps.indexOf(panel.id):-1;
    if(index>=0&&index!==stepIndex)showStep(index,{focus:false});
    const card=field.closest('.attendee');
    if(card&&card.classList.contains('is-collapsed')){openCard=Number(card.dataset.index);applyCards();}
    field.scrollIntoView({block:'center',behavior:'smooth'});field.focus({preventScroll:true});
  }
  for(const panel of stepPanels()){
    const back=panel.querySelector('.step-back'),next=panel.querySelector('.step-next');
    if(back)back.addEventListener('click',()=>showStep(stepIndex-1));
    if(next){
      const label=nextLabels[steps.indexOf(panel.id)];
      if(label){next.textContent=label+' ';const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');arrow.textContent='→';next.append(arrow);}
      next.addEventListener('click',goForward);
    }
  }
  // On a phone the step's own buttons sit at the end of a long form, so a bar
  // at the foot of the screen carries the total and the next action. It hides
  // while those buttons are on screen, and before the guest reaches the steps.
  bar=document.createElement('div');bar.className='booking-bar';bar.hidden=true;
  const barTotal=document.createElement('span');barTotal.className='booking-bar-total';barTotal.setAttribute('aria-live','polite');
  const barAction=document.createElement('button');barAction.type='button';barAction.className='primary booking-bar-action';
  bar.append(barTotal,barAction);document.body.append(bar);
  barAction.addEventListener('click',()=>{
    if(steps[stepIndex]!=='payment-step'){goForward();return;}
    if(el('booking-form').dataset.ready!=='1'){const first=liveFields(el('booking-form')).find(field=>fieldError(field));showMissingFields();if(first)revealField(first);return;}
    const pay=el('payment-button');
    if(pay.disabled){pay.scrollIntoView({block:'center',behavior:'smooth'});return;}
    pay.click();
  });
  let barFrame=0;
  for(const eventName of ['scroll','resize'])window.addEventListener(eventName,()=>{if(!barFrame)barFrame=requestAnimationFrame(()=>{barFrame=0;updateBar();});},{passive:true});
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
  // The hero's button, and the one closing the event section, start booking.
  for(const start of [el('hero-cta'),...document.querySelectorAll('[data-start-booking]')]){
    start?.addEventListener('click',event=>{event.preventDefault();showStep(0,{focus:false});document.querySelector('.axp-steps')?.scrollIntoView({block:'start',behavior:'smooth'});});
  }
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
