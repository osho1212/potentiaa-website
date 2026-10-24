// The cashbook on the organiser dashboard: every payment taken by hand, in
// cash or by UPI, one row per payment. The server decides what belongs here
// (/api/admin/cashbook); this file only draws it and filters what is drawn.

const el=id=>document.getElementById(id);
const money=value=>'₹'+Number(value||0).toLocaleString('en-IN',{minimumFractionDigits:0,maximumFractionDigits:2});
const when=value=>value?new Date(value).toLocaleString('en-IN',{timeZone:'Asia/Kolkata'})+' IST':'';
const STATUS_LABELS={confirmed:'Fully paid',booked:'Balance due',pending:'Checkout open',creating:'Checkout opening',paid_review:'Needs review',order_uncertain:'Needs a check',refunded:'Refunded'};
let entries=[];

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
async function load(){
  const current=mode();
  el('cashbook-export').href=`/api/admin/cashbook?export=csv&mode=${current}`;
  el('cashbook-state').textContent='Loading the cashbook…';
  try{
    const response=await fetch(`/api/admin/cashbook?mode=${current}`,{cache:'no-store'});
    const data=await response.json();
    if(!response.ok)throw new Error(data.error||'The cashbook could not be loaded.');
    entries=data.entries||[];
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
    entries=[];el('cashbook-rows').replaceChildren();el('cashbook-count').textContent='';
    el('cashbook-state').textContent=error.message;
  }
}
el('cashbook-search').addEventListener('input',draw);
el('cashbook-refresh').addEventListener('click',load);
el('dashboard-mode')?.addEventListener('change',load);
// The dashboard's own Refresh reloads the booking list; the cashbook is drawn
// from the same bookings, so it follows.
el('refresh-dashboard')?.addEventListener('click',load);
load();
