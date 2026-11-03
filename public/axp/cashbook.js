// The cashbook on the organiser dashboard: every payment taken by hand, in
// cash or by UPI, one row per payment. The server decides what belongs here
// (/api/admin/cashbook); this file only draws it and filters what is drawn.

const el=id=>document.getElementById(id);
const money=value=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const when=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'';
const STATUS_LABELS={confirmed:'Fully paid',booked:'Balance due',pending:'Checkout open',creating:'Checkout opening',paid_review:'Needs review',order_uncertain:'Needs a check',refunded:'Refunded'};
let entries=[],openBookings=[];

const mode=()=>el('dashboard-mode')?.value==='test'?'test':'live';
// A cell of stacked lines: the first is the row's answer, the rest its detail.
function cell(lines,className){
  const td=document.createElement('td');if(className)td.className=className;
  for(const line of lines.filter(Boolean)){const div=document.createElement('div');div.textContent=line;td.append(div);}
  return td;
}
function draw(){
  const query=el('cashbook-search').value.trim().toLowerCase();
  const shown=query
    ? entries.filter(entry=>[entry.note,entry.buyer_name,entry.buyer_phone,entry.booking_ref,entry.method_label,entry.kind_label]
        .some(value=>String(value||'').toLowerCase().includes(query)))
    : entries;
  el('cashbook-rows').replaceChildren(...shown.map(entry=>{
    const row=document.createElement('tr');
    row.append(
      cell([when(entry.at),entry.entered_as]),
      cell([money(entry.amount),entry.method_label]),
      cell([entry.kind_label,'Booking '+entry.booking_ref,STATUS_LABELS[entry.booking_status]||entry.booking_status]),
      cell([entry.buyer_name,entry.buyer_phone,entry.people?`${entry.people} ${entry.people===1?'person':'people'}`:'']),
      // Older entries predate the note being required, and say so rather than
      // leaving a blank that reads like a note nobody wrote down.
      cell([entry.note||'No note recorded'],entry.note?'':'cashbook-unnoted'),
    );
    return row;
  }));
  el('cashbook-count').textContent=entries.length
    ?`Showing ${shown.length} of ${entries.length} ${entries.length===1?'entry':'entries'}.`
    :'';
}
// The bookings that still owe something, so the next instalment on one can be
// taken here instead of hunting for its row in the guest list. The server
// decides which bookings these are and prices the payment; this only draws
// them and sends what the organiser typed.
function drawOpenBookings(){
  const picker=el('cashbook-booking');
  const chosen=picker.value;
  picker.replaceChildren(...openBookings.map(booking=>new Option(
    `${booking.buyer_name||'No name'} · ${booking.ref} · ${money(booking.balance_due)} due`,
    booking.id,
  )));
  const form=el('cashbook-entry');
  if(!openBookings.length){
    form.hidden=true;
    return;
  }
  form.hidden=false;
  picker.value=openBookings.some(booking=>booking.id===chosen)?chosen:openBookings[0].id;
  fillAmount();
}
/** The whole balance is what is usually taken, so it is filled in by default. */
function fillAmount(){
  const booking=openBookings.find(item=>item.id===el('cashbook-booking').value);
  const amount=el('cashbook-amount');
  amount.max=booking?String(booking.balance_due):'';
  amount.value=booking?String(booking.balance_due):'';
}

async function load(){
  const current=mode();
  el('cashbook-export').href=`/api/admin/cashbook?export=csv&mode=${current}`;
  el('cashbook-state').textContent='Loading the cashbook…';
  try{
    const response=await fetch(`/api/admin/cashbook?mode=${current}`,{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'The cashbook could not be loaded.');
    entries=data.entries||[];
    openBookings=data.openBookings||[];
    drawOpenBookings();
    el('cashbook-totals').replaceChildren(...[
      ['Cash taken',money(data.totals.cash)],
      ['UPI taken',money(data.totals.upi)],
      ['Taken by hand',money(data.totals.total)],
      ['Entries',data.totals.entries],
    ].map(([label,value])=>{
      const box=document.createElement('div'),strong=document.createElement('strong'),span=document.createElement('span');
      strong.textContent=value;span.textContent=label;box.append(strong,span);return box;
    }));
    el('cashbook-state').textContent=entries.length
      ?(data.totals.unnoted?`${data.totals.unnoted} ${data.totals.unnoted===1?'entry was':'entries were'} recorded before notes were required.`:'')
      :'Nothing has been taken by hand yet. Bookings and balances recorded here will appear as they are saved.';
    draw();
  }catch(error){
    entries=[];openBookings=[];drawOpenBookings();
    el('cashbook-rows').replaceChildren();el('cashbook-count').textContent='';
    el('cashbook-state').textContent=error.message;
  }
}
el('cashbook-booking').addEventListener('change',fillAmount);
el('cashbook-entry').addEventListener('submit',async event=>{
  event.preventDefault();
  const form=el('cashbook-entry');
  if(!form.checkValidity()){form.reportValidity();return;}
  const booking=openBookings.find(item=>item.id===el('cashbook-booking').value);
  if(!booking){el('cashbook-entry-result').textContent='Choose a booking with a balance due.';return;}
  const amount=Number(el('cashbook-amount').value);
  const method=el('cashbook-method').value==='upi'?'upi':'cash';
  const note=el('cashbook-note').value.trim();
  if(!note){el('cashbook-entry-result').textContent='Add a cashbook note: the UPI reference, or who took the cash.';el('cashbook-note').focus();return;}
  if(!(amount>0)||amount>booking.balance_due){
    el('cashbook-entry-result').textContent=`Enter an amount between ₹1 and the ${money(booking.balance_due)} due.`;
    el('cashbook-amount').focus();return;
  }
  const settles=amount>=booking.balance_due;
  if(!window.confirm(`Record ${money(amount)} received by ${method==='upi'?'UPI':'cash'} for ${booking.buyer_name} (${booking.ref})?`+
    (settles?' The booking becomes fully paid and its QR passes are emailed.':` ${money(booking.balance_due-amount)} stays due.`)))return;
  const save=el('cashbook-save');save.disabled=true;el('cashbook-entry-result').textContent='Recording…';
  try{
    const response=await fetch('/api/admin/bookings/'+encodeURIComponent(booking.id)+'/payment',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({method,note,amount}),
    });
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'The payment could not be recorded.');
    const sent=data.emailDelivery?.recipients?.length?` Passes emailed to ${data.emailDelivery.recipients.join(', ')}.`:'';
    el('cashbook-note').value='';
    await load();
    // The guest list shows the same booking, so it follows this payment too.
    el('refresh-dashboard')?.click();
    el('cashbook-entry-result').textContent=data.status==='confirmed'
      ?`${money(amount)} recorded for ${booking.buyer_name}. Fully paid.${sent}`
      :`${money(amount)} recorded for ${booking.buyer_name}. ${money(data.balanceDue)} still due.`;
  }catch(error){el('cashbook-entry-result').textContent=error.message;}
  finally{save.disabled=false;}
});
el('cashbook-search').addEventListener('input',draw);
el('cashbook-refresh').addEventListener('click',load);
el('dashboard-mode')?.addEventListener('change',load);
// The dashboard's own Refresh reloads the booking list; the cashbook is drawn
// from the same bookings, so it follows.
el('refresh-dashboard')?.addEventListener('click',load);
load();
