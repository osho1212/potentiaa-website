const el=id=>document.getElementById(id);
let currentUser=null,pendingRemoval=null,returnFocus=null;
const time=value=>new Intl.DateTimeFormat('en-IN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kolkata'}).format(new Date(value))+' IST';
const actions={owner_created:'Owner account linked',admin_added:'Added admin',admin_removed:'Removed admin',admin_signed_in:'Admin signed in for the first time',settings_updated:'Saved event settings'};
async function request(method='GET',data){
 const response=await fetch('/api/admin/team',{method,cache:'no-store',...(data?{headers:{'Content-Type':'application/json'},body:JSON.stringify(data)}:{})});
 const body=await response.json();if(!response.ok){const error=new Error(body.error||'Could not update team access.');error.status=response.status;throw error;}return body;
}
function showMembers(members){
 el('team-members').replaceChildren();el('team-count').textContent=`${members.length} team ${members.length===1?'member':'members'}`;
 for(const member of members){
  const row=document.createElement('li');row.className='team-member';row.dataset.memberId=member.id;
  const detail=document.createElement('div');const email=document.createElement('strong');email.textContent=member.email;detail.append(email);
  const status=document.createElement('span');status.className='team-detail';status.textContent=`${member.role==='owner'?'Owner':'Admin'} · ${member.status==='pending'?'Ready for first sign-in':'Active'}${member.id===currentUser.memberId?' · You':''}`;detail.append(status);row.append(detail);
  if(member.role==='owner'||member.id===currentUser.memberId){const label=document.createElement('span');label.className='team-protected';label.textContent=member.role==='owner'?'Protected owner':'Your account';row.append(label);}
  else{const remove=document.createElement('button');remove.type='button';remove.className='secondary team-remove';remove.textContent='Remove access';remove.setAttribute('aria-label',`Remove admin access for ${member.email}`);remove.addEventListener('click',()=>{pendingRemoval=member;returnFocus=remove;el('remove-admin-email').textContent=member.email;el('remove-admin-dialog').showModal();});row.append(remove);}
  el('team-members').append(row);
 }
}
function showHistory(history){
 el('team-history').replaceChildren();
 if(!history.length){const p=document.createElement('p');p.textContent='Team changes will appear here.';el('team-history').append(p);return;}
 for(const event of history.slice(0,20)){
  const item=document.createElement('li');const heading=document.createElement('strong');heading.textContent=(actions[event.action]||event.action)+(event.targetEmail?` · ${event.targetEmail}`:'');item.append(heading);
  const detail=document.createElement('span');detail.textContent=`${event.actorEmail} · ${time(event.occurredAt)}`;item.append(detail);
  if(event.action==='settings_updated'&&event.details.changedFields?.length){const changes=document.createElement('span');changes.textContent='Changed: '+event.details.changedFields.map(key=>key.replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase()).join(', ');item.append(changes);}
  el('team-history').append(item);
 }
}
async function loadTeam(){
 try{const data=await request();currentUser=data.currentUser;showMembers(data.members);showHistory(data.history);el('team-panel').hidden=false;el('current-organiser').textContent=`Signed in as ${currentUser.email} · ${currentUser.role==='owner'?'Owner':'Admin'}`;el('current-organiser').hidden=false;return true;}
 catch(error){if(error.status===403){el('team-panel').hidden=true;el('current-organiser').hidden=true;}else{el('team-panel').hidden=false;el('team-message').textContent=error.message;}return false;}
}
el('add-admin-form').addEventListener('submit',async event=>{
 event.preventDefault();el('add-admin-button').disabled=true;el('team-message').textContent='Adding admin…';
 try{const result=await request('POST',{email:el('new-admin-email').value});el('new-admin-email').value='';await loadTeam();el('team-message').textContent=`${result.added.email} now has admin access. Share this organiser link; they must sign in with that email.`;}
 catch(error){el('team-message').textContent=error.message;if(error.status===403)window.dispatchEvent(new Event('organiser-access-changed'));}
 finally{el('add-admin-button').disabled=false;}
});
function closeRemoval(){el('remove-admin-dialog').close();pendingRemoval=null;returnFocus?.focus();}
el('cancel-admin-removal').addEventListener('click',closeRemoval);
el('remove-admin-dialog').addEventListener('cancel',()=>{pendingRemoval=null;});
el('confirm-admin-removal').addEventListener('click',async()=>{
 if(!pendingRemoval)return;const target=pendingRemoval;el('confirm-admin-removal').disabled=true;
 try{await request('DELETE',{memberId:target.id});closeRemoval();await loadTeam();el('team-message').textContent=`Admin access removed for ${target.email}.`;}
 catch(error){closeRemoval();el('team-message').textContent=error.message;if(error.status===403)window.dispatchEvent(new Event('organiser-access-changed'));}
 finally{el('confirm-admin-removal').disabled=false;}
});
el('reload-team').addEventListener('click',()=>{el('team-message').textContent='';loadTeam();});
window.addEventListener('organiser-settings-saved',loadTeam);
window.addEventListener('organiser-access-changed',()=>{el('team-panel').hidden=true;el('current-organiser').hidden=true;});
loadTeam();
