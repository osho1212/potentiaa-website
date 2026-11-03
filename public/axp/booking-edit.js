import {GENDERS,GENDER_LABELS,FARE_LABELS} from '/axp/pricing.js';

// Correcting a booking that is already saved. An organiser types bookings in
// at the door, so a wrong name, number, date of birth or pass has to be
// fixable without deleting the booking and losing its reference, its payments
// and whoever has already walked in on it.
//
// The server prices the corrected booking again and is the only thing that
// decides what it now costs: this file asks it twice, once with preview so the
// organiser sees what the change does to the total before agreeing to it, and
// again to save. Nothing here works a price out for itself.

const el=id=>document.getElementById(id);
const money=paise=>'₹'+Number((paise||0)/100).toLocaleString('en-IN',{maximumFractionDigits:2});
const STATUS_LABELS={confirmed:'Fully paid',booked:'Booked · balance due',pending:'Checkout open',creating:'Checkout opening',paid_review:'Payment needs review',order_uncertain:'Order needs a check',refunded:'Refunded'};
const AGE_LABELS={'20':'20 years','21plus':'21 or older'};

let open=null;

function field(text,control,helpText){
  const label=document.createElement('label');
  const span=document.createElement('span');span.textContent=text;label.append(span,control);
  if(helpText){const help=document.createElement('small');help.textContent=helpText;label.append(help);}
  return label;
}
function textBox(model,key,{type='text',max=100,required=true,placeholder=''}={}){
  const box=document.createElement('input');
  box.type=type;box.maxLength=max;box.required=required;box.autocomplete='off';box.placeholder=placeholder;
  box.value=model[key]||'';
  box.addEventListener('input',()=>{model[key]=box.value;});
  return box;
}
function dropDown(model,key,options,{required=true}={}){
  const box=document.createElement('select');box.required=required;
  for(const [value,label] of options)box.append(new Option(label,value));
  box.value=model[key]||'';
  box.addEventListener('change',()=>{model[key]=box.value;});
  return box;
}
function message(text){const line=el('edit-booking-message');line.textContent=text||'';line.hidden=!text;}

function buyerFields(buyer){
  const set=document.createElement('fieldset');set.className='manual-group';
  const legend=document.createElement('legend');legend.textContent='Booking contact';
  const grid=document.createElement('div');grid.className='field-grid';
  grid.append(
    field('Full name',textBox(buyer,'name')),
    field('Phone',textBox(buyer,'phone',{type:'tel',max:20})),
    field('Email',textBox(buyer,'email',{type:'email',max:150})),
    field('Instagram · optional',textBox(buyer,'instagram',{max:31,required:false})),
  );
  set.append(legend,grid);return set;
}

function attendeeFields(guest,index){
  const set=document.createElement('fieldset');set.className='manual-group';
  const legend=document.createElement('legend');
  legend.textContent=`Attendee ${index+1}`+(guest.bookedAs?` · ${guest.bookedAs}`:'');
  const grid=document.createElement('div');grid.className='field-grid';
  grid.append(
    field('Full name',textBox(guest,'name')),
    field('Email · optional',textBox(guest,'email',{type:'email',max:150,required:false})),
    field('Phone',textBox(guest,'phone',{type:'tel',max:20})),
    field('Instagram · optional',textBox(guest,'instagram',{max:31,required:false})),
    // A booking keeps the age bracket, not the date it came from, so there is
    // nothing to show back here. A date typed in replaces the bracket.
    field('Date of birth',textBox(guest,'dob',{type:'date',max:10,required:false}),
      `Booked as ${AGE_LABELS[guest.age]||guest.age}. Leave blank to keep that.`),
    field('Gender',dropDown(guest,'gender',[['','Choose…'],...GENDERS.map(value=>[value,GENDER_LABELS[value]])])),
    field('Pass',dropDown(guest,'pass',[['normal','Silver · 20+'],['alcohol','Gold · 21+']])),
    field('Offer',dropDown(guest,'fare',[
      ['','Automatic'],
      ['single','Single price'],
      ['couple','Couple price'],
      ['group','Group price'],
    ],{required:false}),`Charged ${money(guest.unitPaise)} as booked.`),
  );
  if(guest.checkedInAt){
    const entered=document.createElement('p');entered.className='helper';
    entered.textContent='Already entered. Correcting these details does not undo that.';
    set.append(legend,grid,entered);
  }else set.append(legend,grid);
  return set;
}

function describe(change,view){
  const {before,after}=change;
  const lines=[`Save these corrections to booking ${view.id.slice(0,8)}?`,''];
  lines.push(before.totalPaise===after.totalPaise
    ? `Total ${money(after.totalPaise)} · unchanged`
    : `Total ${money(before.totalPaise)} → ${money(after.totalPaise)}`);
  lines.push(`Already received ${money(change.paidPaise)}`);
  if(before.balancePaise!==after.balancePaise)lines.push(`Balance due ${money(before.balancePaise)} → ${money(after.balancePaise)}`);
  else if(after.balancePaise>0)lines.push(`Balance due ${money(after.balancePaise)}`);
  if(after.overpaidPaise>0)lines.push(`OVERPAID by ${money(after.overpaidPaise)} — settle it by hand; nothing is refunded here.`);
  if(before.status!==after.status)lines.push(`Status ${STATUS_LABELS[before.status]||before.status} → ${STATUS_LABELS[after.status]||after.status}`);
  if(before.priceList!==after.priceList)lines.push(`Prices ${before.priceList} → ${after.priceList}`);
  if(change.passesOutOfDate)lines.push('','The passes already emailed show the old details. Email them again after saving.');
  return lines.join('\n');
}

async function send(body){
  const response=await fetch('/api/admin/bookings/'+encodeURIComponent(open.id),{
    method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),
  });
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw new Error(data.error||'The booking could not be changed.');
  return data;
}
function payload(preview){
  return {
    preview,
    priceList:el('edit-price-list').value,
    buyer:{name:open.buyer.name,phone:open.buyer.phone,email:open.buyer.email,instagram:open.buyer.instagram},
    attendees:open.people.map(guest=>({
      id:guest.id,name:guest.name,email:guest.email,phone:guest.phone,instagram:guest.instagram,
      dob:guest.dob,pass:guest.pass,gender:guest.gender,fare:guest.fare,
    })),
  };
}

/**
 * Open the editor on one booking. onSaved is called with a line for the
 * dashboard's own message once the change is saved.
 */
export async function openBookingEditor(bookingId,{onSaved}={}){
  const dialog=el('edit-booking');
  if(!dialog)return;
  message('');el('edit-booking-fields').replaceChildren();
  el('edit-booking-intro').textContent='Loading the booking…';
  el('edit-booking-save').disabled=true;
  if(!dialog.open)dialog.showModal();
  try{
    const response=await fetch('/api/admin/bookings/'+encodeURIComponent(bookingId),{cache:'no-store'});
    const view=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(view.error||'The booking could not be loaded.');
    open={
      id:view.id,
      onSaved,
      buyer:{...view.buyer},
      people:(view.attendees||[]).map(guest=>({
        id:guest.id,name:guest.name||'',email:guest.email||'',phone:guest.phone||'',instagram:guest.instagram||'',
        dob:'',age:guest.age,pass:guest.pass,gender:guest.gender||'',
        // The fare each person was charged is kept as it is, so correcting a
        // phone number never quietly reprices the booking. "Automatic" hands
        // them back to the couple and group rules.
        fare:guest.fare||'',unitPaise:guest.unitPaise,
        checkedInAt:guest.checkedInAt,
        bookedAs:[guest.pass==='alcohol'?'Gold':'Silver',guest.fare?FARE_LABELS[guest.fare]:''].filter(Boolean).join(' · '),
      })),
    };
    el('edit-booking-intro').textContent=`Booking ${view.id.slice(0,8)} · ${view.people} ${view.people===1?'person':'people'} · ${STATUS_LABELS[view.status]||view.status} · Total ${money(view.total*100)}, received ${money(view.paid*100)}${view.balanceDue>0?`, ${money(view.balanceDue*100)} due`:''}. People cannot be added or removed here.`;
    const list=document.createElement('div');
    list.append(buyerFields(open.buyer),...open.people.map(attendeeFields));
    el('edit-booking-fields').append(list);
    // "Keep" is what the booking was charged on; the others are for a booking
    // put on the wrong price list when it was entered.
    el('edit-price-list').replaceChildren(
      new Option(`Keep the ${view.priceList==='early'?'early-bird':'regular'} prices it was booked on`,'keep'),
      new Option('Early bird','early'),
      new Option('Regular','regular'),
    );
    el('edit-price-list').value='keep';
    el('edit-booking-save').disabled=false;
  }catch(error){
    el('edit-booking-intro').textContent='';
    message(error.message);
  }
}

el('edit-booking-close')?.addEventListener('click',()=>{el('edit-booking').close();});
el('edit-booking-form')?.addEventListener('submit',async event=>{
  event.preventDefault();
  if(!open)return;
  const form=el('edit-booking-form');
  if(!form.checkValidity()){form.reportValidity();return;}
  const save=el('edit-booking-save');
  save.disabled=true;message('Costing the change…');
  try{
    // Priced by the server first, so the organiser agrees to the real figures
    // and not to an arithmetic this page did itself.
    const preview=await send(payload(true));
    message('');
    if(!window.confirm(describe(preview.change,preview))){save.disabled=false;return;}
    message('Saving…');
    const saved=await send(payload(false));
    el('edit-booking').close();
    const note=saved.change.passesOutOfDate?' The emailed passes are now out of date — use Email passes to send them again.':'';
    open.onSaved?.(`Booking ${saved.id.slice(0,8)} updated · Total ${money(saved.change.after.totalPaise)}${saved.change.after.balancePaise>0?` · ${money(saved.change.after.balancePaise)} still due`:''}${saved.change.after.overpaidPaise>0?` · overpaid by ${money(saved.change.after.overpaidPaise)}`:''}.${note}`);
    open=null;
  }catch(error){message(error.message);}
  finally{save.disabled=false;}
});
