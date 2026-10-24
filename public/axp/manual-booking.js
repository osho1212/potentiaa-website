import {quoteBooking,GENDERS,GENDER_LABELS,PASS_LABELS,FARE_LABELS,GROUP_SIZE} from '/axp/pricing.js';

// "Add a booking" on the organiser dashboard: a guest paying cash or UPI
// outside Razorpay. The server checks and prices the booking again exactly
// as it does an online one; this page only shows the price as it is typed.

const el=id=>document.getElementById(id);
const money=value=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:2}).format(value);
let settings=null,earlyBird=null,people=[];
// fare: '' leaves the couple and group rules to decide, as an online booking
// does. Setting one is how an organiser gives the lower price to a pair the
// rules miss: a same-gender couple, or two or three people taking the group
// rate. The server is told the same thing and prices it the same way.
const blank=()=>({name:'',email:'',phone:'+91 ',dob:'',gender:'',pass:'normal',fare:''});
const fareOverrides=()=>people.map(person=>person.fare||null);

function field(labelText,input){const label=document.createElement('label');label.textContent=labelText;label.append(input);return label;}
function textInput(person,key,{type='text',max=100,required=true}={}){
  const input=document.createElement('input');input.type=type;input.maxLength=max;input.required=required;input.autocomplete='off';input.value=person[key];
  input.addEventListener('input',()=>{person[key]=input.value;});return input;
}
function select(person,key,options,{required=true}={}){
  const input=document.createElement('select');input.required=required;
  for(const [value,label] of options)input.append(new Option(label,value));
  input.value=person[key];input.addEventListener('change',()=>{person[key]=input.value;renderQuote();});return input;
}
function renderPeople(){
  const count=Math.max(1,Math.min(Number(el('m-count').value)||1,settings?.maxPerBooking||10));
  while(people.length<count)people.push(blank());
  people.length=count;
  el('m-attendees').replaceChildren(...people.map((person,i)=>{
    const box=document.createElement('fieldset');box.className='manual-group';
    const legend=document.createElement('legend');legend.textContent=`Attendee ${i+1}`;
    const grid=document.createElement('div');grid.className='field-grid';
    const dob=textInput(person,'dob',{type:'date',max:10});
    grid.append(
      field('Full name',textInput(person,'name')),
      // A guest's email is optional: every pass also goes to the booking contact.
      field('Email (optional)',textInput(person,'email',{type:'email',max:150,required:false})),
      field('Phone',textInput(person,'phone',{type:'tel',max:20})),
      field('Date of birth',dob),
      field('Gender',select(person,'gender',[['','Choose…'],...GENDERS.map(value=>[value,GENDER_LABELS[value]])])),
      field('Pass',select(person,'pass',[['normal','Silver · 20+'],['alcohol','Gold · 21+']])),
      field('Offer',select(person,'fare',[
        ['','Automatic'],
        ['single','Single price'],
        ['couple','Couple price'],
        ['group','Group price'],
      ],{required:false})),
    );
    box.append(legend,grid);return box;
  }));
  renderQuote();
}
function earlyBirdFor(count){
  const choice=el('m-price-list').value;
  if(choice==='early')return true;
  if(choice==='regular')return false;
  return !!(earlyBird&&earlyBird.open&&count<=earlyBird.left);
}
function renderQuote(){
  if(!settings)return;
  const plan=el('m-plan').value==='prebook'?'prebook':'full';
  const q=quoteBooking(people,settings,{plan,earlyBird:earlyBirdFor(people.length),fareOverrides:fareOverrides()});
  const box=el('m-quote');box.replaceChildren();
  if(q.totalPaise===null){box.textContent='Final charges are not confirmed in organiser settings.';return;}
  const lines=document.createElement('ul');
  people.forEach((person,i)=>{const item=document.createElement('li');item.textContent=`${person.name||'Attendee '+(i+1)} · ${PASS_LABELS[person.pass]} · ${FARE_LABELS[q.lines[i].fare]}${person.fare?' (set by you)':''} · ${money(q.lines[i].unitPaise/100)}`;lines.append(item);});
  const total=document.createElement('p');
  total.textContent=`${q.priceList==='early'?'Early-bird prices':'Regular prices'} · Total ${money(q.totalPaise/100)} · Received now ${money(q.payNowPaise/100)}`+(plan==='prebook'?` · Balance due later ${money(q.balancePaise/100)}`:'');
  const note=document.createElement('p');note.className='helper';
  // Gender only decides a fare below a group, and only for an attendee whose
  // fare is still automatic. Above that, or once every fare is set by hand,
  // saying so would be noise.
  const genderDecides=people.length<GROUP_SIZE&&people.some(person=>!person.gender&&!person.fare);
  note.textContent=genderDecides?'Choose each person’s gender, or set an Offer by hand: couple prices depend on it.':(earlyBird&&!earlyBird.open&&el('m-price-list').value==='auto'?'The early bird is closed, so regular prices apply.':'');
  box.append(lines,total,note);
}
async function loadSettings(){
  try{
    const mode=el('dashboard-mode')?.value==='test'?'test':'live';
    const [own,pub]=await Promise.all([
      fetch('/api/admin/settings',{cache:'no-store'}).then(r=>r.ok?r.json():Promise.reject(new Error('Organiser settings could not be loaded.'))),
      fetch('/api/public-settings'+(mode==='test'?'?mode=test':''),{cache:'no-store'}).then(r=>r.ok?r.json():{}),
    ]);
    settings=own.settings;earlyBird=pub.earlyBird||null;
    el('m-count').max=String(settings.maxPerBooking||10);
    renderPeople();
  }catch(error){el('m-result').textContent=error.message;}
}
el('m-count').addEventListener('input',renderPeople);
for(const id of ['m-plan','m-price-list'])el(id).addEventListener('change',renderQuote);
el('m-copy-contact').addEventListener('click',()=>{
  const first=people[0];if(!first)return;
  first.name=el('m-buyer-name').value;first.email=el('m-buyer-email').value;first.phone=el('m-buyer-phone').value;renderPeople();
});
el('dashboard-mode')?.addEventListener('change',loadSettings);
el('manual-form').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=el('manual-form');
  if(!form.checkValidity()){form.reportValidity();return;}
  const mode=el('dashboard-mode')?.value==='test'?'test':'live';
  const plan=el('m-plan').value==='prebook'?'prebook':'full';
  const method=el('m-method').value==='upi'?'upi':'cash';
  const q=quoteBooking(people,settings,{plan,earlyBird:earlyBirdFor(people.length),fareOverrides:fareOverrides()});
  const received=q.payNowPaise===null?'':money(q.payNowPaise/100);
  if(!window.confirm(`${mode==='test'?'TEST booking. ':''}Record ${received} received by ${method==='upi'?'UPI':'cash'} for ${people.length} ${people.length===1?'person':'people'}?${plan==='prebook'?' The rest stays due.':' QR passes will be emailed.'}`))return;
  el('m-submit').disabled=true;el('m-result').textContent='Saving…';
  try{
    const response=await fetch('/api/admin/bookings/manual',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      mode,plan,method,priceList:el('m-price-list').value,note:el('m-note').value,
      fareOverrides:fareOverrides(),
      buyer:{name:el('m-buyer-name').value,phone:el('m-buyer-phone').value,email:el('m-buyer-email').value,instagram:el('m-buyer-instagram').value},
      attendees:people.map(({fare,...person})=>({...person,instagram:''})),
    })});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'The booking could not be saved.');
    const sent=data.emailDelivery?.recipients?.length?` Passes emailed to ${data.emailDelivery.recipients.join(', ')}.`:'';
    el('m-result').textContent=data.status==='confirmed'
      ?`Saved: booking ${data.id.slice(0,8)} · Fully paid · ${money(data.total)}.${sent}`
      :`Saved: booking ${data.id.slice(0,8)} · Booked · ${money(data.paid)} received, ${money(data.balanceDue)} due. Record the balance under Attendees when it is paid.`;
    form.reset();el('m-buyer-phone').value='+91 ';people=[];renderPeople();
    el('refresh-dashboard')?.click();
  }catch(error){el('m-result').textContent=error.message;}
  finally{el('m-submit').disabled=false;}
});
loadSettings();
