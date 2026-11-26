/* Car Rental System */
new MutationObserver(()=>{for(const c of document.querySelectorAll('.stack td:not([data-l])')){let i=0,p=c;while(p=p.previousElementSibling)i+=p.colSpan;c.dataset.l=c.closest('table').rows[0].cells[i]?.textContent||''}}).observe(document,{childList:true,subtree:true});
{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const peso=n=>'₱'+Math.round(Number(n)||0).toLocaleString('en-PH');
const TYPES=['Sedan','Hatchback','SUV','MPV / Van','Pickup'];
const EXTRAS=[{id:'driver',label:'With a driver',perDay:1500},{id:'seat',label:'Child car seat',perDay:200},{id:'xdriver',label:'Additional driver on the contract',perDay:300}];
const DELIVERY=500;
const ST={pending:'Waiting for approval',approved:'Approved',active:'Picked up',completed:'Returned',rejected:'Not approved',cancelled:'Cancelled'};
const STS={pending:'Pending',approved:'Approved',active:'Picked up',completed:'Returned',rejected:'Rejected',cancelled:'Cancelled'};
const LIVE=['pending','approved','active'];
const S={db:null,user:null,assets:null,uid:null,admin:false,editor:false,session:null,adminCfg:null,cfgLoaded:false,bReady:false,canWrite:true,ready:false,cars:[],gallery:[],bdocs:[],blocks:[],chats:[],replies:[],thread:null,draft:'',local:false,adm:{status:'all',q:''},f:{type:'',trans:''},editing:null,newImg:null,dropImg:false,booking:null,step:1};

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const toLocal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parse=s=>s?new Date(s):null;
const days=(a,b)=>{const ms=parse(b)-parse(a);return ms>0?Math.max(1,Math.ceil(ms/864e5-1/24)):0};
const fmt=s=>{const d=parse(s);return d&&!isNaN(d)?d.toLocaleString('en-PH',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—'};
const fmtD=s=>{const d=parse(s);return d&&!isNaN(d)?d.toLocaleDateString('en-PH',{month:'short',day:'numeric'}):'—'};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const uid=()=>Math.random().toString(36).slice(2,10);
const ref=()=>'CR-'+Date.now().toString(36).slice(-4).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
const carById=id=>S.cars.find(c=>c.id===id);
const imgUrl=id=>{if(!id)return'';if(String(id).startsWith('img-')){if(MEMIMG[id])return MEMIMG[id];try{return localStorage.getItem('cr-'+id)||''}catch(e){return''}}return'/_blob/'+encodeURIComponent(id)};
const carTitle=c=>c?`${c.brand||''} ${c.name||''}`.trim():'Removed car';
function toast(m){const t=$('#toast');t.textContent=m;t.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove('on'),2800)}
const Qs={};function serial(k,fn){const p=(Qs[k]||Promise.resolve()).then(()=>fn());Qs[k]=p.catch(()=>{});return p}
function ask(msg,yes='Yes'){return new Promise(r=>{const d=$('#dAsk');$('#askMsg').textContent=msg;$('#askYes').textContent=yes;const done=v=>{d.close();$('#askYes').onclick=$('#askNo').onclick=null;r(v)};$('#askYes').onclick=()=>done(true);$('#askNo').onclick=()=>done(false);d.showModal()})}
const icon=(id,t)=>`<li><svg class="ic" aria-hidden="true"><use href="#i-${id}"/></svg>${esc(t)}</li>`;

function carSvg(c){
  const col=/^#[0-9a-f]{6}$/i.test(c?.color||'')?c.color:'#8a8f99';
  const tall=['SUV','MPV / Van','Pickup'].includes(c?.type);
  const body=tall?'M18 110 L22 88 Q26 78 44 76 L92 72 L116 42 Q122 36 134 36 L238 36 Q252 36 258 46 L276 74 L296 80 Q306 84 306 96 L308 110 Q308 120 298 120 L28 120 Q18 120 18 110Z':'M20 112 L26 94 Q32 84 52 82 L96 78 L126 56 Q136 50 150 50 L204 50 Q218 50 230 60 L256 80 L292 86 Q304 88 306 100 L308 112 Q308 120 300 120 L28 120 Q20 120 20 112Z';
  const win=tall?'M122 70 L138 44 L188 44 L188 70Z M196 44 L244 44 Q250 44 254 52 L266 70 L196 70Z':'M104 78 L132 58 L174 58 L174 78Z M182 58 L208 58 Q218 58 226 64 L244 78 L182 78Z';
  const g='g'+uid();
  return `<svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${esc(carTitle(c))}"><defs><linearGradient id="${g}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--surf)"/><stop offset="1" stop-color="var(--surf2)"/></linearGradient><linearGradient id="${g}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".35"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient></defs><rect width="320" height="180" fill="url(#${g}s)"/><rect y="132" width="320" height="48" fill="#000" opacity=".05"/><g transform="translate(0,14)"><ellipse cx="164" cy="132" rx="150" ry="8" fill="#000" opacity=".2"/><path d="${body}" fill="${col}"/><path d="${body}" fill="url(#${g}b)"/><path d="${win}" fill="#1d2430" opacity=".88"/><path d="M28 104 H300" stroke="#000" stroke-opacity=".18" stroke-width="2"/><rect x="292" y="92" width="12" height="6" rx="2" fill="#ffe9a8"/><rect x="20" y="96" width="9" height="6" rx="2" fill="#e5484d"/>${[88,244].map(x=>`<circle cx="${x}" cy="120" r="21" fill="#16181d"/><circle cx="${x}" cy="120" r="10" fill="#c9ccd3"/><circle cx="${x}" cy="120" r="4" fill="#5d6068"/>`).join('')}</g></svg>`;
}
const carPic=c=>c?.imageId?`<img src="${esc(imgUrl(c.imageId))}" alt="${esc(carTitle(c))}" loading="lazy">`:carSvg(c);

async function shrink(file){
  try{const bmp=await createImageBitmap(file);const mx=S.local?1000:1600;const s=Math.min(1,mx/Math.max(bmp.width,bmp.height));if(s===1&&file.size<(S.local?3e5:1.5e6))return file;
    const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*s);cv.height=Math.round(bmp.height*s);cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
    return await new Promise(r=>cv.toBlob(b=>r(b||file),'image/jpeg',.86));}catch(e){return file}
}

/* ---------- availability ---------- */
const allBlocks=()=>S.blocks.flatMap(d=>(d.items||[]).map(b=>({...b,owner:d.id})));
function clashes(carId,start,end,ignore){
  if(!start||!end)return[];
  return allBlocks().filter(b=>b.carId===carId&&b.id!==ignore&&LIVE.includes(b.status)&&b.start<end&&start<b.end);
}
const allBookings=()=>S.bdocs.flatMap(d=>(d.items||[]).map(b=>({...b,owner:d.id})));

/* ---------- sessions ---------- */
const norm=s=>String(s||'').trim().replace(/\s+/g,' ').toLowerCase();
const last4=p=>String(p||'').replace(/\D/g,'').slice(-4);
const ownItems=()=>S.bdocs.find(x=>x.id===S.uid)?.items||[];
const isMine=b=>S.session?.role==='customer'&&norm(b.name)===S.session.key&&last4(b.phone)===S.session.pass;
function myItems(){return ownItems().filter(isMine)}
async function hash(s){try{const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}catch(e){return'p:'+s}}
const DEF_ADMIN={user:'admin1',pass:'admin123'};
async function adminOk(user,pass){
  if(!S.editor)return false;
  const cfg=S.adminCfg;
  if(cfg?.user&&cfg?.hash)return norm(cfg.user)===norm(user)&&cfg.hash===await hash('cr-admin:'+pass);
  return norm(user)===DEF_ADMIN.user&&pass===DEF_ADMIN.pass;
}
async function tryLogin(name,pass){
  if(await adminOk(name,pass))return{role:'admin',name:S.adminCfg?.user||DEF_ADMIN.user,key:norm(name),pass};
  if(!/^\d{4}$/.test(pass))return null;
  const m=ownItems().find(b=>norm(b.name)===norm(name)&&last4(b.phone)===pass);
  return m?{role:'customer',name:m.name,key:norm(name),pass}:null;
}
function startSession(s){S.session=s;try{sessionStorage.setItem('cr-session',JSON.stringify({name:s.name,pass:s.pass}))}catch(e){}}
function endSession(){S.session=null;try{sessionStorage.removeItem('cr-session')}catch(e){}}

/* ---------- routing ---------- */
const CUST=[['fleet','Cars'],['my-bookings','My bookings'],['messages','Messages']];
const ADM=[['bookings','Rentals'],['customers','Customers'],['messages','Messages'],['cars','Fleet'],['photos','Renter photos'],['fleet','Customer view']];
const GUEST=[['fleet','Cars'],['login','Log in']];
function navItems(){return S.session?.role==='admin'?ADM:S.session?CUST:GUEST}
function route(){
  const items=navItems();let h=location.hash.slice(1);
  if(!items.some(i=>i[0]===h))h=items[0][0];
  S.admin=S.session?.role==='admin';
  $('#role').textContent=!S.db?'Offline preview':S.session?(S.admin?'Admin: ':'Hi, ')+S.session.name:'';
  $('#logout').classList.toggle('hide',!S.session);
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hide',v.id!=='v-'+h));
  const pend=allBookings().filter(b=>b.status==='pending').length;
  const unread=S.session?unreadCount():0;
  $('#nav').innerHTML=items.map(([k,l])=>{const n=k==='bookings'&&S.admin?pend:k==='messages'?unread:0;return `<a href="#${k}" ${k===h?'aria-current="page"':''}>${esc(l)}${n?`<span class="count" aria-label="${n} new">${n}</span>`:''}</a>`}).join('');
  if(S.view!==h)scrollTo(0,0);
  S.view=h;render();
}
addEventListener('hashchange',route);

/* ---------- ticket ---------- */
function setRange(a,b){$('#fStart').value=toLocal(a);$('#fEnd').value=toLocal(b);ticket();renderFleet()}
function ticket(){
  const s=$('#fStart').value,e=$('#fEnd').value,n=days(s,e);
  const dd=v=>{const d=parse(v);return d&&!isNaN(d)?[d.toLocaleDateString('en-PH',{weekday:'short',month:'short',day:'numeric'}),d.toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})]:['—','']};
  const[a,at]=dd(s),[b,bt]=dd(e);$('#tStart').textContent=a;$('#tStartT').textContent=at;$('#tEnd').textContent=b;$('#tEndT').textContent=bt;
  const t=$('#tDays');if(t.textContent!==String(n)){t.textContent=n;t.classList.add('bump');setTimeout(()=>t.classList.remove('bump'),250)}
  $('#tDaysL').textContent=n===1?'day':'days';
}
document.querySelector('.quick').addEventListener('click',e=>{
  const q=e.target.closest('[data-q]')?.dataset.q;if(!q)return;
  const a=new Date();a.setDate(a.getDate()+1);a.setHours(9,0,0,0);
  if(q==='wk'){const t=new Date();t.setHours(9,0,0,0);const add=((6-t.getDay())+7)%7||7;t.setDate(t.getDate()+(t.getDay()===6?7:add));const end=new Date(t);end.setDate(end.getDate()+2);setRange(t,end);return}
  const b=new Date(a);b.setDate(b.getDate()+(+q));setRange(a,b);
});

/* ---------- render: fleet ---------- */
function filters(){return{start:$('#fStart').value,end:$('#fEnd').value,type:S.f.type,trans:S.f.trans,q:$('#fQ').value.trim().toLowerCase(),free:$('#fFree').checked}}
function renderChips(){
  const vis=S.cars.filter(c=>S.admin||c.status!=='hidden');
  $('#typeChips').innerHTML=[['','All cars'],...TYPES.filter(t=>vis.some(c=>c.type===t)).map(t=>[t,t])].map(([k,l])=>`<button type="button" class="chip" data-ty="${esc(k)}" aria-pressed="${S.f.type===k}">${esc(l)}</button>`).join('');
  document.querySelectorAll('#transSeg [data-tr]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tr===S.f.trans)));
}
function renderFleet(){
  renderChips();
  const f=filters();const dateOk=f.start&&f.end&&f.end>f.start;const n=dateOk?days(f.start,f.end):0;
  const base=S.cars.filter(c=>S.admin||c.status!=='hidden').filter(c=>(!f.type||c.type===f.type)&&(!f.trans||c.trans===f.trans)&&(!f.q||[c.brand,c.name,c.plate,c.type].join(' ').toLowerCase().includes(f.q)))
    .map(c=>({c,busy:dateOk?clashes(c.id,f.start,f.end).length>0:false})).map(x=>({...x,ok:x.c.status==='available'&&!x.busy}));
  const cars=base.filter(x=>!f.free||x.ok).sort((a,b)=>(b.ok-a.ok)||(a.c.rate-b.c.rate));
  const g=$('#fleetGrid');
  const freeN=base.filter(x=>x.ok).length;
  $('#countLine').innerHTML=S.ready&&S.cars.length?(dateOk?`<b>${plural(freeN,'car')}</b> free for ${plural(n,'day')}, ${esc(fmt(f.start))} to ${esc(fmt(f.end))}`:'<b>Set your dates</b> to see which cars are free')+(f.free&&base.length>freeN?`. <a href="#" id="showAll">Also show ${plural(base.length-freeN,'unavailable car')}</a>`:''):'';
  if(!S.ready){g.innerHTML='<div class="empty">Loading cars…</div>';return}
  if(!cars.length){g.innerHTML=`<div class="empty" style="grid-column:1/-1">${S.cars.length?`<b>No cars match</b><span>Try other dates, or clear the filters.</span><button class="btn" id="clearF">Clear filters</button>`:S.admin?`<b>No cars yet</b><a class="btn go" href="#cars">Add your first car</a>`:'<b>No cars are listed yet</b><span>Check back soon.</span>'}</div>`;return}
  g.innerHTML=cars.map(({c,busy,ok})=>{
    const flag=c.status!=='available'?`<span class="pill s-${esc(c.status)} flag">${c.status==='hidden'?'Hidden from customers':'Under maintenance'}</span>`:busy?'<span class="pill s-bad flag">Booked on your dates</span>':dateOk?'<span class="pill s-ok flag">Free on your dates</span>':'';
    const can=ok&&S.canWrite&&dateOk;
    const why=!ok?(busy?'Someone has booked it on these dates. Try other dates.':'Not available right now.'):!dateOk?'Pick your dates first.':!S.canWrite?'Booking needs Contributor access.':'';
    return `<article class="car${ok?'':' off'}"><div class="ph">${carPic(c)}${flag}</div><div class="body">
      <div class="title"><div><h3>${esc(carTitle(c))}</h3><div class="small">${esc(c.year||'')} ${esc(c.type||'')}</div></div><div class="price"><b>${esc(peso(c.rate))}</b><span>per day</span></div></div>
      <ul class="specs">${icon('seat',(c.seats||'?')+' seats')}${icon('gear',c.trans||'')}${icon('fuel',c.fuel||'')}${c.plate?`<li><span class="plate">${esc(c.plate)}</span></li>`:''}</ul>
      ${c.desc?`<p class="desc">${esc(c.desc)}</p>`:''}
      <div class="foot">${ok&&dateOk?`<div class="tot"><span>${plural(n,'day')}</span><b>${esc(peso(n*c.rate))}</b></div>`:''}${why&&!can?`<p class="${ok?'small':'why'}">${esc(why)}</p>`:''}
      <div class="acts">${S.admin?`<button class="btn" data-edit="${esc(c.id)}">Edit</button>`:''}<button class="btn go" data-rent="${esc(c.id)}" ${can?'':'disabled'}>Rent this car</button></div></div>
    </div></article>`}).join('');
}
function renderStrip(){
  const s=$('#strip');const g=[...S.gallery].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  s.innerHTML=g.length?g.map(p=>`<figure><img src="${esc(imgUrl(p.imageId))}" alt="${esc(p.caption||'Renter photo')}" loading="lazy">${p.caption||p.date?`<figcaption>${p.caption?`<b>${esc(p.caption)}</b>`:''}${p.date?esc(fmtD(p.date)):''}</figcaption>`:''}</figure>`).join(''):`<div class="empty" style="flex:1">${S.admin?'<b>No renter photos yet</b><a class="btn go" href="#photos">Upload photos</a>':'Photos of our renters will appear here.'}</div>`;
  $('#stripNav').classList.toggle('hide',g.length<2);
}

/* ---------- render: my bookings ---------- */
const ORDER=['pending','approved','active','completed'];
function renderMine(){
  const el=$('#mineList');const list=[...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(!list.length){el.innerHTML=`<div class="empty"><b>No bookings yet</b><a class="btn go" href="#fleet">Choose a car</a></div>`;return}
  const now=toLocal(new Date());
  el.innerHTML=list.map(b=>{const c=carById(b.carId);const canCancel=['pending','approved'].includes(b.status)&&b.start>now;const i=ORDER.indexOf(b.status);
    return `<article class="bk"><div class="ph">${carPic(c||{name:b.carName})}</div><div class="info">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><h3>${esc(b.carName||carTitle(c))}</h3><span class="pill s-${esc(b.status)}">${esc(ST[b.status]||b.status)}</span></div>
      <div>${esc(fmt(b.start))} to ${esc(fmt(b.end))}</div>
      <div class="small">${plural(+b.days||0,'day')} · <b style="color:var(--ink)">${esc(peso(b.total))}</b> · ${b.pickup==='delivery'?'Delivered to your address':'Pick up at the office'} · Ref <span class="plate">${esc(b.ref)}</span></div>
      ${i>=0?`<ol class="track" aria-label="Booking progress">${['Requested','Approved','Picked up','Returned'].map((l,k)=>`<li class="${k<=i?'done':''}">${l}</li>`).join('')}</ol>`:''}
      ${b.adminNote?`<p class="note" style="margin-top:6px"><b>Comment from the office:</b> ${esc(b.adminNote)}</p>`:''}
    </div><div class="acts"><button class="btn sm" data-askbk="${esc(b.ref)}">Ask about this booking</button>${canCancel?`<button class="btn sm danger" data-cancel="${esc(b.id)}">Cancel booking</button>`:''}</div></article>`}).join('');
}

/* ---------- render: admin ---------- */
function renderAdmin(){
  const all=allBookings();const now=toLocal(new Date());const ym=now.slice(0,7);
  const pendL=all.filter(b=>b.status==='pending').sort((a,b)=>String(a.start).localeCompare(String(b.start)));
  const out=all.filter(b=>b.status==='active').length;
  const busyNow=new Set(all.filter(b=>LIVE.includes(b.status)&&b.start<=now&&now<b.end).map(b=>b.carId));
  const avail=S.cars.filter(c=>c.status==='available'&&!busyNow.has(c.id)).length;
  const rev=all.filter(b=>['approved','active','completed'].includes(b.status)&&(b.start||'').slice(0,7)===ym).reduce((s,b)=>s+(+b.total||0),0);
  const wk=toLocal(new Date(Date.now()+7*864e5));
  const up=all.filter(b=>b.status==='approved'&&b.start>=now&&b.start<=wk).length;
  $('#stats').innerHTML=[[pendL.length,'waiting for your answer',pendL.length>0],[up,'pickups in the next 7 days'],[out,'cars out with renters'],[`${avail} of ${S.cars.filter(c=>c.status!=='hidden').length}`,'cars free right now'],[peso(rev),'booked this month']]
    .map(([v,l,h])=>`<div class="stat${h?' hot':''}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
  $('#pendBox').classList.toggle('hide',!pendL.length);
  $('#pendT').textContent=`Waiting for your answer (${pendL.length})`;
  $('#pendList').innerHTML=pendL.map(b=>{const cl=clashes(b.carId,b.start,b.end,b.id).filter(x=>x.status!=='pending').length;
    return `<div class="prow"><div><b>${esc(b.name)}</b> <span class="small nw">${esc(b.phone)}</span><div class="small">Ref ${esc(b.ref)}</div></div><div>${esc(b.carName)}<div class="small">${esc(fmtD(b.start))} to ${esc(fmtD(b.end))}, ${plural(+b.days||0,'day')}, <b style="color:var(--ink)">${esc(peso(b.total))}</b></div>${cl?'<div class="err">Overlaps an approved booking</div>':''}</div><div class="acts"><button class="btn sm" data-open="${esc(b.owner)}|${esc(b.id)}">Details</button><button class="btn sm danger" data-quick="rejected|${esc(b.owner)}|${esc(b.id)}">Reject</button><button class="btn sm okb" data-quick="approved|${esc(b.owner)}|${esc(b.id)}">Approve</button></div></div>`}).join('');
  const counts={all:all.length};all.forEach(b=>counts[b.status]=(counts[b.status]||0)+1);
  $('#stChips').innerHTML=[['all','All'],...Object.entries(STS)].filter(([k])=>k==='all'||counts[k]).map(([k,l])=>`<button class="chip" data-st="${k}" aria-pressed="${S.adm.status===k}">${esc(l)} ${counts[k]||0}</button>`).join('');
  const q=S.adm.q.toLowerCase();
  const rows=all.filter(b=>S.adm.status==='all'||b.status===S.adm.status).filter(b=>!q||[b.ref,b.name,b.phone,b.email,b.carName,carById(b.carId)?.plate].join(' ').toLowerCase().includes(q))
    .sort((a,b)=>String(b.start).localeCompare(String(a.start)));
  $('#bkTable tbody').innerHTML=rows.map(b=>`<tr class="click" data-bk="${esc(b.owner)}|${esc(b.id)}" tabindex="0"><td class="nw"><b>${esc(b.ref)}</b></td><td>${esc(b.name)}<div class="small nw">${esc(b.phone)}</div></td><td>${esc(b.carName)}<div class="small">${esc(carById(b.carId)?.plate||'')}</div></td><td class="nw">${esc(fmtD(b.start))} to ${esc(fmtD(b.end))}<div class="small">${plural(+b.days||0,'day')}</div></td><td class="num">${esc(peso(b.total))}</td><td><span class="pill s-${esc(b.status)}">${esc(STS[b.status]||b.status)}</span></td></tr>`).join('');
  $('#bkTable').classList.toggle('hide',!rows.length);
  $('#bkEmpty').classList.toggle('hide',rows.length>0);
  $('#bkEmpty').innerHTML=all.length?'<b>No bookings match</b><span>Try another search or status.</span>':'<b>No bookings yet</b><span>Customer requests will show up here.</span>';
  const d0=new Date();const first=new Date(d0.getFullYear(),d0.getMonth(),1),last=new Date(d0.getFullYear(),d0.getMonth()+1,1);const dim=Math.round((last-first)/864e5);
  $('#utilSub').textContent=d0.toLocaleDateString('en-PH',{month:'long',year:'numeric'})+', approved, picked up and returned rentals';
  const used=c=>{let ms=0;all.filter(b=>b.carId===c.id&&['approved','active','completed'].includes(b.status)).forEach(b=>{const s=Math.max(+parse(b.start),+first),e=Math.min(+parse(b.end),+last);if(e>s)ms+=e-s});return Math.min(dim,Math.round(ms/864e5))};
  const u=S.cars.map(c=>({c,n:used(c)})).sort((a,b)=>b.n-a.n);
  $('#util').innerHTML=u.length?u.map(({c,n})=>`<div class="bar"><span>${esc(carTitle(c))}</span><span>${n} of ${dim}</span><i><em style="width:${(n/dim*100).toFixed(1)}%"></em></i></div>`).join(''):'<p class="small">No cars yet.</p>';
}
function renderCars(){
  const el=$('#carList');
  el.innerHTML=S.cars.length?[...S.cars].sort((a,b)=>carTitle(a).localeCompare(carTitle(b))).map(c=>`<div class="fleetrow"><div class="ph">${carPic(c)}</div><div class="info"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><h3>${esc(carTitle(c))}</h3><span class="pill s-${esc(c.status)}">${c.status==='available'?'Available':c.status==='hidden'?'Hidden':'Maintenance'}</span></div><div class="small">${esc(c.year||'')} ${esc(c.type||'')} · ${esc(c.seats||'?')} seats · ${esc(c.trans||'')} · ${esc(c.fuel||'')}</div>${c.plate?`<div><span class="plate">${esc(c.plate)}</span></div>`:''}</div><div class="acts"><span class="rateedit"><label for="r-${esc(c.id)}" class="small">₱ per day</label><input id="r-${esc(c.id)}" type="number" min="0" step="50" value="${esc(c.rate)}" data-rate="${esc(c.id)}"><button class="btn sm" data-saverate="${esc(c.id)}">Save price</button></span><label class="btn sm${S.assets?'':' hide'}" style="margin:0">Change photo<input type="file" accept="image/*" data-photo="${esc(c.id)}" hidden></label><button class="btn sm go" data-edit="${esc(c.id)}">Edit all details</button><button class="btn sm danger" data-cdel="${esc(c.id)}">Delete</button></div></div>`).join(''):'<div class="empty"><b>No cars yet</b><span>Add your first car to start taking bookings.</span></div>';
}
function renderPhotos(){
  const g=[...S.gallery].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('#pGrid').innerHTML=g.length?g.map(p=>`<figure><img src="${esc(imgUrl(p.imageId))}" alt="${esc(p.caption||'Renter photo')}" loading="lazy"><figcaption><span>${esc(p.caption||'No caption')}<br><span class="small">${esc(fmtD(p.date))}</span></span><button class="btn sm danger" data-pdel="${esc(p.id)}">Delete</button></figcaption></figure>`).join(''):'<div class="empty" style="grid-column:1/-1"><b>No photos yet</b><span>Upload photos of your renters with their cars.</span></div>';
}
function renderLogin(){}

/* ---------- messages ---------- */
const tk=(nn,l4)=>'t_'+(nn+'_'+l4).replace(/[^a-z0-9]/g,'_');
const myKey=()=>tk(S.session.key,S.session.pass);
const tAt=t=>new Date(t).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'});
function getThread(owner,key){
  const c=S.chats.find(d=>d.id===owner)?.threads?.[key]||{};const a=S.replies.find(d=>d.id===owner)?.threads?.[key]||{};
  const msgs=[...(c.msgs||[]).map(m=>({...m,from:'c'})),...(a.msgs||[]).map(m=>({...m,from:'a'}))].sort((x,y)=>x.at-y.at);
  return{owner,key,c,a,msgs,name:c.name||a.name||'',phone:c.phone||a.phone||'',unreadA:(c.msgs||[]).filter(m=>m.at>(a.seen||0)).length,unreadC:(a.msgs||[]).filter(m=>m.at>(c.seen||0)).length};
}
function allThreads(){
  const keys=new Set();
  [...S.chats,...S.replies].forEach(d=>Object.keys(d.threads||{}).forEach(k=>keys.add(d.id+'|'+k)));
  return[...keys].map(s=>{const[o,k]=s.split('|');return getThread(o,k)}).filter(t=>t.msgs.length).sort((x,y)=>(y.msgs.at(-1)?.at||0)-(x.msgs.at(-1)?.at||0));
}
function unreadCount(){
  if(S.session?.role==='admin')return allThreads().reduce((s,t)=>s+t.unreadA,0);
  if(S.session?.role==='customer')return getThread(S.uid,myKey()).unreadC;
  return 0;
}
function myPhone(){return [...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]?.phone||''}
async function writeThread(coll,owner,key,fn){
  const d=(coll==='chats'?S.chats:S.replies).find(x=>x.id===owner);
  const threads=JSON.parse(JSON.stringify(d?.threads||{}));threads[key]=fn(threads[key]||{msgs:[]});
  await serial(coll+owner,()=>S.db.doc(coll+'/'+owner).set({threads,updatedAt:Date.now()}));
}
async function sendMsg(text){
  const now=Date.now();const m={id:uid(),text,at:now};
  if(S.admin){const t=S.thread;await writeThread('replies',t.owner,t.key,x=>({...x,name:t.name,phone:t.phone,msgs:[...(x.msgs||[]),m].slice(-300),seen:now}))}
  else await writeThread('chats',S.uid,myKey(),x=>({...x,name:S.session.name,phone:myPhone(),msgs:[...(x.msgs||[]),m].slice(-300),seen:now}));
}
function markSeen(){
  if(S.view!=='messages'||document.hidden)return;
  if(S.admin&&S.thread){const t=getThread(S.thread.owner,S.thread.key);if(t.unreadA)writeThread('replies',t.owner,t.key,x=>({...x,name:t.name,phone:t.phone,seen:Date.now()})).catch(()=>{})}
  if(S.session?.role==='customer'){const t=getThread(S.uid,myKey());if(t.unreadC)writeThread('chats',S.uid,myKey(),x=>({...x,name:S.session.name,phone:myPhone(),seen:Date.now()})).catch(()=>{})}
}
function openThread(owner,key,name,phone,draft){S.thread={owner,key,name,phone};if(draft)S.draft=draft;location.hash='#messages';route();markSeen()}
function renderMessages(){
  const chat=$('#chat');const adm=S.admin;
  chat.classList.toggle('solo',!adm);$('#threads').classList.toggle('hide',!adm);
  $('#msgTitle').textContent=adm?'Messages':'Messages with the rental office';
  $('#msgSub').textContent=adm?'Chat with your customers. Start a new chat from Customers or from a booking.':'Ask about a booking, the pickup point or anything else. The office replies here.';
  let t;
  if(adm){
    const list=allThreads();
    if(S.thread&&!list.some(x=>x.owner===S.thread.owner&&x.key===S.thread.key))list.unshift(getThread(S.thread.owner,S.thread.key));
    $('#threads').innerHTML=list.length?list.map(x=>`<button class="th" data-th="${esc(x.owner)}|${esc(x.key)}" aria-current="${S.thread?.owner===x.owner&&S.thread?.key===x.key}"><b>${esc(x.name||S.thread?.name||'Customer')}</b>${x.unreadA?`<span class="badge">${x.unreadA}</span>`:'<span></span>'}<span class="last">${esc(x.msgs.at(-1)?.text||'No messages yet')}</span></button>`).join(''):'<p class="small" style="padding:16px">No messages yet.</p>';
    chat.classList.toggle('open',!!S.thread);
    if(!S.thread){$('#convh').innerHTML='';$('#msgs').innerHTML='<div class="empty" style="margin:auto">Choose a conversation.</div>';$('#compose').classList.add('hide');return}
    t=getThread(S.thread.owner,S.thread.key);
    $('#convh').innerHTML=`<button class="btn sm back" id="thBack">‹ All chats</button><div><b>${esc(S.thread.name||t.name)}</b> <span class="small">${esc(S.thread.phone||t.phone)}</span></div>`;
  }else{
    t=getThread(S.uid,myKey());$('#convh').innerHTML='<b>Rental office</b>';
  }
  $('#compose').classList.remove('hide');
  const me=adm?'a':'c';
  const box=$('#msgs');const atEnd=box.scrollHeight-box.scrollTop-box.clientHeight<40;
  box.innerHTML=t.msgs.length?t.msgs.map(m=>`<div class="msg${m.from===me?' me':''}">${esc(m.text)}<time>${m.from===me?'You':adm?esc(t.name||'Customer'):'Rental office'}, ${esc(tAt(m.at))}</time></div>`).join(''):`<div class="empty" style="margin:auto">${adm?'No messages yet. Write the first one below.':'No messages yet. Write to the office below.'}</div>`;
  if(atEnd||!S.msgScrolled){box.scrollTop=box.scrollHeight;S.msgScrolled=true}
  if(S.draft){$('#msgIn').value=S.draft;S.draft='';$('#msgIn').focus()}
  clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800);
}
$('#compose').addEventListener('submit',async e=>{
  e.preventDefault();const v=$('#msgIn').value.trim();if(!v)return;
  const b=$('#msgSend');b.disabled=true;
  try{await sendMsg(v);$('#msgIn').value='';S.msgScrolled=false;renderMessages()}catch(x){toast('Message not sent. Try again.')}finally{b.disabled=false}
});
$('#msgIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#compose').requestSubmit()}});
document.addEventListener('visibilitychange',markSeen);

/* ---------- customers (admin) ---------- */
function customers(){
  const m=new Map();
  allBookings().forEach(b=>{const k=b.owner+'|'+tk(norm(b.name),last4(b.phone));const c=m.get(k)||{owner:b.owner,key:tk(norm(b.name),last4(b.phone)),name:b.name,phone:b.phone,email:'',address:'',n:0,spent:0,last:'',lastCar:''};
    c.n++;if(['approved','active','completed'].includes(b.status))c.spent+=+b.total||0;if(!c.last||b.start>c.last){c.last=b.start;c.lastCar=b.carName;c.name=b.name;c.phone=b.phone;c.email=b.email||c.email;c.address=b.address||c.address}m.set(k,c)});
  return[...m.values()].sort((a,b)=>String(b.last).localeCompare(String(a.last)));
}
function renderCustomers(){
  const q=($('#custQ').value||'').toLowerCase();const list=customers().filter(c=>!q||[c.name,c.phone,c.email].join(' ').toLowerCase().includes(q));
  $('#custTable tbody').innerHTML=list.map(c=>`<tr><td><b>${esc(c.name)}</b><div class="small">${esc(c.email||'')}</div></td><td class="nw">${esc(c.phone)}</td><td>${esc(c.address)}</td><td class="num">${c.n}</td><td class="num">${esc(peso(c.spent))}</td><td class="nw">${esc(fmtD(c.last))}<div class="small">${esc(c.lastCar)}</div></td><td><div class="acts"><button class="btn sm" data-cbk="${esc(c.phone)}">Bookings</button><button class="btn sm go" data-msg="${esc(c.owner)}|${esc(c.key)}|${esc(c.name)}|${esc(c.phone)}">Message</button></div></td></tr>`).join('');
  $('#custTable').classList.toggle('hide',!list.length);$('#custEmpty').classList.toggle('hide',list.length>0);
}
$('#custQ').addEventListener('input',renderCustomers);
function render(){
  const v=S.view;
  if(v==='fleet'){ticket();renderFleet();renderStrip()}
  if(v==='my-bookings')renderMine();
  if(v==='bookings')renderAdmin();
  if(v==='cars')renderCars();
  if(v==='photos')renderPhotos();
  if(v==='login')renderLogin();
  if(v==='messages'&&S.session)renderMessages();
  if(v==='customers')renderCustomers();
}

/* ---------- booking wizard ---------- */
function openBooking(carId){
  const c=carById(carId);if(!c)return;S.booking=c;
  $('#bkTitle').textContent='Book the '+carTitle(c);
  $('#bkCar').innerHTML=`<div class="ph">${carPic(c)}</div><div><h3>${esc(carTitle(c))}</h3><div class="small">${esc(c.type||'')} · ${esc(c.seats||'?')} seats · ${esc(c.trans||'')}</div><b style="color:var(--price)">${esc(peso(c.rate))}</b> <span class="small">per day</span></div>`;
  const mine=S.session?.role==='customer'?[...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]:null;
  const p=mine||{};[['#bName','name'],['#bPhone','phone'],['#bEmail','email'],['#bAddr','address'],['#bLic','license'],['#bEmer','emergency']].forEach(([s,k])=>$(s).value=p[k]||'');
  const f=filters();$('#bStart').value=f.start;$('#bEnd').value=f.end;
  $('#bStart').min=$('#bEnd').min=toLocal(new Date());
  $('#bExtras').innerHTML=EXTRAS.map(x=>`<label class="opt"><input type="checkbox" data-x="${x.id}">${esc(x.label)}<span>+${esc(peso(x.perDay))} a day</span></label>`).join('');
  $('#bAgree').checked=false;$('#bNotes').value='';$('#bPick').value='office';
  step(1);$('#dBook').showModal();
}
function calc(){
  const c=S.booking;const s=$('#bStart').value,e=$('#bEnd').value;const n=days(s,e);
  const ex=[...document.querySelectorAll('#bExtras [data-x]:checked')].map(i=>EXTRAS.find(x=>x.id===i.dataset.x));
  const exDay=ex.reduce((a,x)=>a+x.perDay,0);const del=$('#bPick').value==='delivery'?DELIVERY:0;
  return{c,s,e,n,ex,exDay,del,total:n*(+c.rate+exDay)+del};
}
function sumHtml(k){return k.n?`<div><span>${esc(peso(k.c.rate))} × ${plural(k.n,'day')}</span><span>${esc(peso(k.c.rate*k.n))}</span></div>${k.ex.map(x=>`<div><span>${esc(x.label)} × ${k.n}</span><span>${esc(peso(x.perDay*k.n))}</span></div>`).join('')}${k.del?`<div><span>Delivery</span><span>${esc(peso(k.del))}</span></div>`:''}<div class="tot"><span>Total</span><span>${esc(peso(k.total))}</span></div>${+k.c.deposit?`<div class="small"><span>Refundable deposit, paid at pickup</span><span>${esc(peso(k.c.deposit))}</span></div>`:''}<div class="small"><span>Each day counts as 24 hours from pickup.</span></div>`:'<div class="small">Choose your pickup and return to see the price.</div>'}
function updSum(){
  const k=calc();const h=sumHtml(k);$('#bSum').innerHTML=h;$('#bSum3').innerHTML=h;
  $('#wTot').innerHTML=k.n?`<b>${esc(peso(k.total))}</b><span class="small">${plural(k.n,'day')}</span>`:'';
  const busy=k.n?clashes(k.c.id,k.s,k.e):[];
  $('#bErr').textContent=S.step===1&&busy.length?`This car is booked from ${fmt(busy[0].start)} to ${fmt(busy[0].end)}. Choose other dates.`:'';
}
function stepError(n){
  const k=calc();const v=id=>$(id).value.trim();
  if(n===1){
    if(!k.s||!k.e)return'Choose your pickup and return.';
    if(k.s<toLocal(new Date()))return'Pickup is in the past. Choose a later time.';
    if(k.e<=k.s)return'Return must be after pickup.';
    if(clashes(k.c.id,k.s,k.e).length)return'This car is already booked on those dates.';
  }
  if(n===2){
    const ph=v('#bPhone').replace(/\D/g,'');
    if(!v('#bName'))return['#bName','Enter your full name.'];
    if(ph.length<7||!/^[+()\-\s\d]+$/.test(v('#bPhone')))return['#bPhone','Enter a valid mobile number, like 0917 123 4567.'];
    if(v('#bEmail')&&!/^\S+@\S+\.\S+$/.test(v('#bEmail')))return['#bEmail','Check your email address.'];
    if(!v('#bAddr'))return['#bAddr','Enter your address.'];
    if(!v('#bLic'))return['#bLic',"Enter your driver's license number."];
  }
  if(n===3&&!$('#bAgree').checked)return['#bAgree','Tick the box to confirm your details.'];
  return'';
}
function step(n){
  S.step=n;
  document.querySelectorAll('#dBook .wp').forEach(p=>p.classList.toggle('hide',+p.dataset.p!==n));
  document.querySelectorAll('#wsteps li').forEach(l=>{const s=+l.dataset.s;l.className=s===n?'on':s<n?'done':'';if(s===n)l.setAttribute('aria-current','step');else l.removeAttribute('aria-current')});
  $('#wBack').classList.toggle('hide',n===1);
  $('#wNext').textContent=n===3?'Send booking request':'Next';
  $('#bErr').textContent='';
  if(n===3){const v=id=>esc($(id).value.trim()||'—');const k=calc();
    $('#bReview').innerHTML=`<dt>Car</dt><dd>${esc(carTitle(k.c))}</dd><dt>Pickup</dt><dd>${esc(fmt(k.s))}</dd><dt>Return</dt><dd>${esc(fmt(k.e))}</dd><dt>How you get it</dt><dd>${k.del?'Delivered to your address':'Pick up at the office'}</dd><dt>Full name</dt><dd>${v('#bName')}</dd><dt>Mobile</dt><dd>${v('#bPhone')}</dd><dt>Email</dt><dd>${v('#bEmail')}</dd><dt>Address</dt><dd>${v('#bAddr')}</dd><dt>License no.</dt><dd>${v('#bLic')}</dd><dt>Emergency contact</dt><dd>${v('#bEmer')}</dd><dt>Notes</dt><dd>${v('#bNotes')}</dd>`}
  updSum();
  $('#dBook .db').scrollTop=0;$('#dBook').scrollTop=0;
}
$('#wBack').addEventListener('click',()=>step(Math.max(1,S.step-1)));
$('#bookForm').addEventListener('input',e=>{if(!['bNotes','bName','bAddr','bLic','bEmer','bEmail'].includes(e.target.id))updSum()});
$('#bookForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const er=stepError(S.step);
  if(er){const[sel,msg]=Array.isArray(er)?er:[null,er];$('#bErr').textContent=msg;if(sel)$(sel).focus();return}
  if(S.step<3){step(S.step+1);return}
  const k=calc();const v=id=>$(id).value.trim();
  if(clashes(k.c.id,k.s,k.e).length){step(1);$('#bErr').textContent='Someone just booked this car on those dates. Choose other dates.';return}
  const btn=$('#wNext');btn.disabled=true;btn.textContent='Sending…';
  const b={id:uid(),ref:ref(),carId:k.c.id,carName:carTitle(k.c),plate:k.c.plate||'',name:v('#bName').replace(/\s+/g,' '),phone:v('#bPhone'),email:v('#bEmail'),address:v('#bAddr'),license:v('#bLic'),emergency:v('#bEmer'),start:k.s,end:k.e,days:k.n,rate:+k.c.rate,extras:k.ex.map(x=>x.label),extrasPerDay:k.exDay,pickup:$('#bPick').value,delivery:k.del,total:k.total,deposit:+k.c.deposit||0,notes:v('#bNotes'),status:'pending',createdAt:Date.now()};
  try{
    await saveOwner(S.uid,[...ownItems(),b]);
    $('#dBook').close();
    if(S.session?.role==='admin'){toast('Booking '+b.ref+' added');return}
    if(!isMine(b)){
      if(S.session)endSession();
      $('#lName').value=b.name;$('#lPass').value='';$('#lErr').textContent='';
      $('#lMsg').textContent=`Booking request sent for the ${b.carName}. Your reference is ${b.ref}. Log in to follow it: your password is the last 4 digits of ${b.phone}.`;
      location.hash='#login';route();setTimeout(()=>$('#lPass').focus(),50);return;
    }
    $('#doneBody').innerHTML=`<p>Your request for the <b>${esc(b.carName)}</b>, ${esc(fmt(b.start))} to ${esc(fmt(b.end))}, has been sent. Total: <b>${esc(peso(b.total))}</b>.</p><p>Reference <span class="plate" style="font-size:18px">${esc(b.ref)}</span></p><p class="small">The office will check and approve it. You can follow it under My bookings.</p>`;
    $('#dDone').showModal();
  }catch(x){$('#bErr').textContent=x?.code==='quota_exceeded'?'The booking list is full. Contact the rental office.':'The booking was not sent. Check your connection and send it again.'}
  finally{btn.disabled=false;btn.textContent=S.step===3?'Send booking request':'Next'}
});

/* ---------- writes ---------- */
const slim=items=>items.map(b=>({id:b.id,carId:b.carId,start:b.start,end:b.end,status:b.status}));
async function saveOwner(owner,items){
  await serial('b'+owner,()=>S.db.doc('bookings/'+owner).set({items,updatedAt:Date.now()}));
  await serial('k'+owner,()=>S.db.doc('blocks/'+owner).set({items:slim(items)}));
}
async function setStatus(owner,id,status,note){
  const items=(S.bdocs.find(x=>x.id===owner)?.items||[]).map(b=>b.id===id?{...b,status,...(note!==undefined?{adminNote:note}:{}),updatedAt:Date.now()}:b);
  await saveOwner(owner,items);
}
async function quick(status,owner,id){
  const b=allBookings().find(x=>x.owner===owner&&x.id===id);if(!b)return;
  if(status==='approved'&&clashes(b.carId,b.start,b.end,b.id).some(x=>x.status!=='pending')&&!await ask('This car already has an approved booking on overlapping dates. Approve anyway?','Approve'))return;
  if(status==='rejected'&&!await ask(`Reject ${b.name}'s request for the ${b.carName}?`,'Reject'))return;
  try{await setStatus(owner,id,status);toast(`${status==='approved'?'Approved':'Rejected'}: ${b.name}, ${b.carName}`)}catch(x){toast('Not saved. Try again.')}
}

/* ---------- admin booking detail ---------- */
function openDetail(owner,id){
  const b=allBookings().find(x=>x.owner===owner&&x.id===id);if(!b)return;const c=carById(b.carId);
  const clash=LIVE.includes(b.status)?clashes(b.carId,b.start,b.end,b.id).filter(x=>x.status!=='pending'):[];
  $('#detT').textContent='Booking '+b.ref;
  $('#detBody').innerHTML=`<div class="mini"><div class="ph">${carPic(c||{name:b.carName})}</div><div><h3>${esc(b.carName)}</h3><div class="small">${esc(c?.plate||b.plate||'')}</div><span class="pill s-${esc(b.status)}">${esc(STS[b.status])}</span></div></div>
  ${clash.length?`<p class="note">Overlaps an approved booking for this car, ${esc(fmt(clash[0].start))} to ${esc(fmt(clash[0].end))}.</p>`:''}
  <dl class="kv"><dt>Full name</dt><dd>${esc(b.name)}</dd><dt>Mobile</dt><dd>${esc(b.phone)}</dd><dt>Email</dt><dd>${esc(b.email||'—')}</dd><dt>Address</dt><dd>${esc(b.address)}</dd><dt>License no.</dt><dd>${esc(b.license)}</dd><dt>Emergency contact</dt><dd>${esc(b.emergency||'—')}</dd>
  <dt>Pickup</dt><dd>${esc(fmt(b.start))}</dd><dt>Return</dt><dd>${esc(fmt(b.end))} (${plural(+b.days||0,'day')})</dd><dt>How they get it</dt><dd>${b.pickup==='delivery'?'Deliver to address':'At the office'}</dd><dt>Extras</dt><dd>${esc((b.extras||[]).join(', ')||'None')}</dd>
  <dt>Total</dt><dd><b>${esc(peso(b.total))}</b> (${esc(peso(b.rate))} a day${b.extrasPerDay?` + ${esc(peso(b.extrasPerDay))} a day extras`:''}${b.delivery?` + ${esc(peso(b.delivery))} delivery`:''})</dd><dt>Deposit</dt><dd>${esc(peso(b.deposit))}</dd><dt>Customer notes</dt><dd>${esc(b.notes||'—')}</dd><dt>Requested</dt><dd>${esc(b.createdAt?new Date(b.createdAt).toLocaleString('en-PH'):'—')}</dd></dl>
  <div><label for="detNote">Comment or suggestion for the customer</label><textarea id="detNote" placeholder="Shown on their booking, e.g. where to pick up, or a suggestion for other dates">${esc(b.adminNote||'')}</textarea></div>
  <button class="btn" data-msg="${esc(owner)}|${esc(tk(norm(b.name),last4(b.phone)))}|${esc(b.name)}|${esc(b.phone)}" data-draft="About booking ${esc(b.ref)}: ">Send ${esc(b.name.split(' ')[0])} a message</button>`;
  const A={pending:[['rejected','Reject','danger'],['approved','Approve','okb']],approved:[['cancelled','Cancel booking','danger'],['active','Mark picked up','go']],active:[['completed','Mark returned','go']],completed:[],rejected:[['pending','Reopen','']],cancelled:[['pending','Reopen','']]}[b.status]||[];
  $('#detActs').innerHTML=`<button class="btn ghost danger" data-act="delete">Delete</button><button class="btn ghost" data-act="copy">Copy details</button><span style="flex:1"></span><button class="btn" data-act="note">Save comment</button>${A.map(([s,l,k])=>`<button class="btn ${k}" data-act="${s}">${l}</button>`).join('')}`;
  $('#detActs').onclick=async e=>{
    const a=e.target.closest('[data-act]')?.dataset.act;if(!a)return;const note=$('#detNote').value.trim();
    try{
      if(a==='copy'){const t=`${b.ref} ${b.carName}\n${b.name} ${b.phone} ${b.email||''}\n${b.address}\nLicense ${b.license}\n${fmt(b.start)} to ${fmt(b.end)} (${b.days} days)\nTotal ${peso(b.total)}`;await navigator.clipboard.writeText(t).then(()=>toast('Details copied'),()=>toast('Copying is blocked here'));return}
      if(a==='delete'){if(!await ask(`Delete booking ${b.ref} for ${b.name}? This can't be undone.`,'Delete'))return;await saveOwner(owner,(S.bdocs.find(x=>x.id===owner)?.items||[]).filter(x=>x.id!==id));$('#dDet').close();toast('Booking deleted');return}
      if(a==='note'){await setStatus(owner,id,b.status,note);toast('Comment saved');return}
      if(a==='approved'&&clash.length&&!await ask('This car already has an approved booking on overlapping dates. Approve anyway?','Approve'))return;
      await setStatus(owner,id,a,note);$('#dDet').close();toast('Marked '+STS[a].toLowerCase());
    }catch(x){toast('Not saved. Try again.')}
  };
  $('#dDet').showModal();
}

/* ---------- car editor ---------- */
$('#cType').innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');
function carFromForm(){const v=id=>$(id).value.trim();return{brand:v('#cBrand'),name:v('#cName'),year:+v('#cYear')||'',type:$('#cType').value,seats:+v('#cSeats')||'',trans:$('#cTrans').value,fuel:$('#cFuel').value,color:$('#cColor').value,rate:+v('#cRate')||0,deposit:+v('#cDep')||0,plate:v('#cPlate').toUpperCase(),desc:v('#cDesc'),status:$('#cStatus').value}}
function carPrev(){const c=carFromForm();$('#cPrev').innerHTML=S.newImg?`<img src="${S.newImgUrl}" alt="">`:(!S.dropImg&&S.editing?.imageId)?carPic({...c,imageId:S.editing.imageId}):carSvg(c);$('#cImgDel').classList.toggle('hide',!(S.newImg||(!S.dropImg&&S.editing?.imageId)))}
function openCar(id){
  const c=id?carById(id):null;S.editing=c;S.newImg=null;S.dropImg=false;$('#cImg').value='';$('#cErr').textContent='';
  const d=c||{type:'Sedan',seats:5,trans:'Automatic',fuel:'Gasoline',color:'#c0392b',status:'available',year:new Date().getFullYear()};
  [['#cBrand','brand'],['#cName','name'],['#cYear','year'],['#cSeats','seats'],['#cRate','rate'],['#cDep','deposit'],['#cPlate','plate'],['#cDesc','desc']].forEach(([s,k])=>$(s).value=d[k]??'');
  $('#cType').value=d.type;$('#cTrans').value=d.trans;$('#cFuel').value=d.fuel;$('#cColor').value=/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:'#8a8f99';$('#cStatus').value=d.status||'available';
  $('#carT').textContent=c?'Edit '+carTitle(c):'Add a car';$('#cDel').classList.toggle('hide',!c);
  $('#cImg').disabled=!S.assets;carPrev();$('#dCar').showModal();
}
$('#carForm').addEventListener('input',e=>{if(e.target.id!=='cImg')carPrev()});
$('#cImg').addEventListener('change',async()=>{const f=$('#cImg').files[0];if(!f)return;S.newImg=await shrink(f);if(S.newImgUrl)URL.revokeObjectURL(S.newImgUrl);S.newImgUrl=URL.createObjectURL(S.newImg);S.dropImg=false;carPrev()});
$('#cImgDel').addEventListener('click',()=>{S.dropImg=true;S.newImg=null;$('#cImg').value='';carPrev()});
$('#carForm').addEventListener('submit',async e=>{
  e.preventDefault();const c=carFromForm();
  if(!c.brand||!c.name){$('#cErr').textContent='Enter the brand and model.';return}
  if(!(c.rate>0)){$('#cErr').textContent='Enter a price per day above zero.';return}
  const btn=$('#cSave');btn.disabled=true;btn.textContent='Saving…';
  try{
    const old=S.editing;let imageId=old?.imageId||'';
    if(S.newImg){const up=await S.assets.upload(S.newImg);imageId=up.id}else if(S.dropImg)imageId='';
    const id=old?.id||'car-'+uid();
    await serial('c'+id,()=>S.db.doc('cars/'+id).set({...c,imageId,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()}));
    if(old?.imageId&&old.imageId!==imageId&&S.assets)S.assets.delete(old.imageId).catch(()=>{});
    $('#dCar').close();toast(old?'Car saved':'Car added');
  }catch(x){$('#cErr').textContent='The car was not saved. '+(x?.message||'')}
  finally{btn.disabled=false;btn.textContent='Save car'}
});
$('#cDel').addEventListener('click',async()=>{
  const c=S.editing;if(!c)return;const live=allBookings().filter(b=>b.carId===c.id&&LIVE.includes(b.status)).length;
  if(!await ask(`Delete the ${carTitle(c)}?${live?` It has ${plural(live,'open booking')}. Those keep the car's name.`:''}`,'Delete car'))return;
  try{await S.db.doc('cars/'+c.id).delete();if(c.imageId&&S.assets)S.assets.delete(c.imageId).catch(()=>{});$('#dCar').close();toast('Car deleted')}catch(x){$('#cErr').textContent='The car was not deleted. Try again.'}
});

/* ---------- photos ---------- */
const dz=$('#dropZone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over')});
dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');try{$('#pFiles').files=e.dataTransfer.files}catch(x){}$('#pMsg').textContent=plural(e.dataTransfer.files.length,'photo')+' ready to upload.'});
$('#pUp').addEventListener('click',async()=>{
  const files=[...$('#pFiles').files];const msg=$('#pMsg');
  if(!S.assets){msg.textContent='Uploading needs Editor access to this page.';return}
  if(!files.length){msg.textContent='Choose at least one photo.';return}
  const btn=$('#pUp');btn.disabled=true;let ok=0;
  for(const f of files){msg.textContent=`Uploading ${ok+1} of ${files.length}…`;
    try{const up=await S.assets.upload(await shrink(f));const id='p-'+uid();await S.db.doc('gallery/'+id).set({imageId:up.id,caption:$('#pCap').value.trim(),date:toLocal(new Date()),createdAt:Date.now()});ok++}catch(x){msg.textContent='A photo was not uploaded: '+(x?.message||'error')}}
  btn.disabled=false;$('#pFiles').value='';$('#pCap').value='';msg.textContent=`${plural(ok,'photo')} uploaded.`;
});

/* ---------- login ---------- */
$('#lShow').addEventListener('click',()=>{const p=$('#lPass');const s=p.type==='password';p.type=s?'text':'password';$('#lShow').textContent=s?'Hide':'Show'});
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();const name=$('#lName').value,pass=$('#lPass').value.trim();const err=$('#lErr');err.textContent='';
  if(!S.db){err.textContent='Sign in to Claude and open this page from its link to log in.';return}
  if(!norm(name)){err.textContent='Enter your full name.';$('#lName').focus();return}
  if(!pass){err.textContent='Enter your password.';$('#lPass').focus();return}
  if(!S.bReady||(S.editor&&!S.cfgLoaded)){err.textContent='Still loading. Try again in a moment.';return}
  const s=await tryLogin(name,pass);
  if(!s){err.textContent="That name and password don't match. Customers: use the full name and the last 4 digits of the mobile number from your booking form.";return}
  startSession(s);$('#lPass').value='';$('#lMsg').textContent='';
  location.hash=s.role==='admin'?'#bookings':'#my-bookings';route();toast('Welcome, '+s.name);
});
$('#logout').addEventListener('click',()=>{endSession();location.hash='#fleet';route();toast('Logged out')});
function openSetup(){const cur=S.adminCfg?.user||DEF_ADMIN.user;$('#sNow').textContent=`Current username: ${cur}. Change the username, the password, or both.`;$('#sName').value=cur;['#sCur','#sPhone','#sPhone2'].forEach(s=>$(s).value='');$('#sErr').textContent='';$('#dSetup').showModal()}
$('#chgAdmin').addEventListener('click',openSetup);
$('#setupForm').addEventListener('submit',async e=>{
  e.preventDefault();const user=$('#sName').value.trim().replace(/\s+/g,' '),cur=$('#sCur').value,np=$('#sPhone').value,np2=$('#sPhone2').value;const er=m=>{$('#sErr').textContent=m};
  if(!user)return er('Enter a username.');
  if(!await adminOk(S.adminCfg?.user||DEF_ADMIN.user,cur))return er('The current password is wrong.');
  if(np.length<6)return er('The new password needs at least 6 characters.');
  if(np!==np2)return er("The two new passwords don't match.");
  try{const h=await hash('cr-admin:'+np);await serial('cfg',()=>S.db.doc('admin/config').set({user,hash:h,updatedAt:Date.now()}));
    S.adminCfg={user,hash:h};startSession({role:'admin',name:user,key:norm(user),pass:np});$('#dSetup').close();route();toast('Admin login updated');
  }catch(x){er('Not saved. Only the page owner or an Editor can change the admin login.')}
});

/* ---------- events ---------- */
document.addEventListener('click',async e=>{
  const t=e.target;
  if(t.closest('[data-close]')){t.closest('dialog')?.close();return}
  const th=t.closest('[data-th]');if(th){const[o,k]=th.dataset.th.split('|');const x=getThread(o,k);S.thread={owner:o,key:k,name:x.name,phone:x.phone};S.msgScrolled=false;renderMessages();markSeen();return}
  if(t.closest('#thBack')){S.thread=null;renderMessages();return}
  const mg=t.closest('[data-msg]');if(mg){const[o,k,n,p]=mg.dataset.msg.split('|');t.closest('dialog')?.close();S.msgScrolled=false;openThread(o,k,n,p,mg.dataset.draft||'');return}
  const ab=t.closest('[data-askbk]');if(ab){S.draft=`About booking ${ab.dataset.askbk}: `;S.msgScrolled=false;location.hash='#messages';route();return}
  const cb=t.closest('[data-cbk]');if(cb){S.adm.q=cb.dataset.cbk;S.adm.status='all';$('#admQ').value=cb.dataset.cbk;location.hash='#bookings';route();return}
  const cd=t.closest('[data-cdel]');if(cd){const c=carById(cd.dataset.cdel);if(!c)return;const live=allBookings().filter(b=>b.carId===c.id&&LIVE.includes(b.status)).length;
    if(!await ask(`Delete the ${carTitle(c)} from the rental list?${live?` It has ${plural(live,'open booking')}. Those keep the car's name.`:''}`,'Delete car'))return;
    try{await S.db.doc('cars/'+c.id).delete();if(c.imageId&&S.assets)S.assets.delete(c.imageId).catch(()=>{});toast(carTitle(c)+' deleted')}catch(x){toast('Car not deleted. Try again.')}return}
  if(t.closest('#showAll')){e.preventDefault();$('#fFree').checked=false;renderFleet();return}
  if(t.closest('#clearF')){S.f={type:'',trans:''};$('#fQ').value='';$('#fFree').checked=false;renderFleet();return}
  const ty=t.closest('[data-ty]');if(ty){S.f.type=ty.dataset.ty;renderFleet();return}
  const tr=t.closest('[data-tr]');if(tr){S.f.trans=tr.dataset.tr;renderFleet();return}
  const r=t.closest('[data-rent]');if(r){openBooking(r.dataset.rent);return}
  const ed=t.closest('[data-edit]');if(ed){openCar(ed.dataset.edit);return}
  const ch=t.closest('[data-st]');if(ch){S.adm.status=ch.dataset.st;renderAdmin();return}
  const qk=t.closest('[data-quick]');if(qk){const[s,o,i]=qk.dataset.quick.split('|');qk.disabled=true;await quick(s,o,i);qk.disabled=false;return}
  const op=t.closest('[data-open]');if(op){const[o,i]=op.dataset.open.split('|');openDetail(o,i);return}
  const row=t.closest('[data-bk]');if(row){const[o,i]=row.dataset.bk.split('|');openDetail(o,i);return}
  const cn=t.closest('[data-cancel]');if(cn){const b=myItems().find(x=>x.id===cn.dataset.cancel);if(!b||!await ask(`Cancel booking ${b.ref} for the ${b.carName}?`,'Cancel booking'))return;try{await setStatus(S.uid,b.id,'cancelled');toast('Booking cancelled')}catch(x){toast('Not cancelled. Try again.')}return}
  const pd=t.closest('[data-pdel]');if(pd){const p=S.gallery.find(x=>x.id===pd.dataset.pdel);if(!p||!await ask('Delete this photo from the dashboard?','Delete'))return;try{await S.db.doc('gallery/'+p.id).delete();if(p.imageId&&S.assets)S.assets.delete(p.imageId).catch(()=>{});toast('Photo deleted')}catch(x){toast('Not deleted. Try again.')}return}
  const sr=t.closest('[data-saverate]');if(sr){const id=sr.dataset.saverate;const c=carById(id);const v=+document.getElementById('r-'+id)?.value;
    if(!c||!(v>0)){toast('Enter a price above zero');return}
    sr.disabled=true;try{await serial('c'+id,()=>S.db.doc('cars/'+id).update({rate:v,updatedAt:Date.now()}));toast(`${carTitle(c)}: ${peso(v)} per day`)}catch(x){toast('Price not saved. Try again.')}finally{sr.disabled=false}return}
});
document.addEventListener('change',async e=>{
  const inp=e.target.closest('[data-photo]');if(!inp||!inp.files[0])return;const id=inp.dataset.photo;const c=carById(id);if(!c||!S.assets)return;
  toast('Uploading photo…');
  try{const up=await S.assets.upload(await shrink(inp.files[0]));await serial('c'+id,()=>S.db.doc('cars/'+id).update({imageId:up.id,updatedAt:Date.now()}));if(c.imageId&&c.imageId!==up.id)S.assets.delete(c.imageId).catch(()=>{});toast('New photo for the '+carTitle(c))}
  catch(x){toast('Photo not uploaded. Try again.')}finally{inp.value=''}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const row=e.target.closest?.('[data-bk]');if(row){const[o,i]=row.dataset.bk.split('|');openDetail(o,i)}}});
$('#addCar').addEventListener('click',()=>openCar(null));
$('#searchForm').addEventListener('input',()=>{if($('#fStart').value&&$('#fEnd').value<=$('#fStart').value){const d=parse($('#fStart').value);d.setDate(d.getDate()+1);$('#fEnd').value=toLocal(d)}ticket();renderFleet()});
$('#fQ').addEventListener('input',renderFleet);
$('#fFree').addEventListener('change',renderFleet);
$('#admQ').addEventListener('input',e=>{S.adm.q=e.target.value;renderAdmin()});
const strip=$('#strip');const stepS=dir=>{const f=strip.querySelector('figure');strip.scrollBy({left:dir*((f?.offsetWidth||280)+14),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})};
$('#sPrev').onclick=()=>stepS(-1);$('#sNext').onclick=()=>stepS(1);
strip.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')stepS(-1);if(e.key==='ArrowRight')stepS(1)});

/* default dates: tomorrow 9:00 for 2 days */
{const a=new Date();a.setDate(a.getDate()+1);a.setHours(9,0,0,0);const b=new Date(a);b.setDate(b.getDate()+2);$('#fStart').value=toLocal(a);$('#fEnd').value=toLocal(b);$('#fStart').min=$('#fEnd').min=toLocal(new Date())}

/* ---------- stand-alone mode (downloaded file): saves in this browser ---------- */
const LSOK=(()=>{try{localStorage.setItem('cr-t','1');localStorage.removeItem('cr-t');return true}catch(e){return false}})();
const MEMIMG={};
function localDb(){
  let st={};const load=()=>{if(!LSOK)return;try{st=JSON.parse(localStorage.getItem('cr-db')||'{}')}catch(e){st={}}};load();
  const L=new Set();const notify=()=>L.forEach(f=>{try{f()}catch(e){}});
  const save=()=>{if(!LSOK)return;try{localStorage.setItem('cr-db',JSON.stringify(st))}catch(e){load();throw{code:'quota_exceeded',message:'Browser storage is full. Delete some photos.'}}};
  addEventListener('storage',e=>{if(e.key==='cr-db'){load();notify()}});
  const clone=o=>JSON.parse(JSON.stringify(o));
  const snap=p=>({id:p.split('/').pop(),exists:p in st,data:()=>st[p],metadata:{fromCache:false,hasPendingWrites:false}});
  return{
    doc:p=>({set:async d=>{st[p]=clone(d);save();notify()},update:async d=>{if(!(p in st))throw{code:'invalid_argument',message:'Not found'};st[p]={...st[p],...clone(d)};save();notify()},delete:async()=>{delete st[p];save();notify()},onSnapshot:n=>{const f=()=>n(snap(p));L.add(f);setTimeout(f,0);return()=>L.delete(f)}}),
    collection:c=>({onSnapshot:n=>{const f=()=>n({docs:Object.keys(st).filter(k=>{const s=k.split('/');return s.length===2&&s[0]===c}).map(snap),metadata:{fromCache:false}});L.add(f);setTimeout(f,0);return()=>L.delete(f)}})
  };
}
const localAssets={
  upload:blob=>new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const id='img-'+uid();if(!LSOK){MEMIMG[id]=r.result;res({id});return}try{localStorage.setItem('cr-'+id,r.result);res({id})}catch(e){rej({message:'Browser storage is full. Use a smaller photo or delete some.'})}};r.onerror=()=>rej({message:'Could not read the photo.'});r.readAsDataURL(blob)}),
  delete:async id=>{try{localStorage.removeItem('cr-'+id)}catch(e){}}
};
function seedLocal(db){
  if(LSOK){if(localStorage.getItem('cr-seeded'))return;localStorage.setItem('cr-seeded','1')}
  [['vios','Toyota','Vios 1.3 XLE',2024,'Sedan',5,'Automatic','Gasoline','#c0392b',1800,3000,'NDA 4521','Easy on fuel and easy to park. Good for city trips and airport runs.','available'],
   ['mirage','Mitsubishi','Mirage G4',2023,'Sedan',5,'Manual','Gasoline','#e6e6e6',1500,3000,'NCE 2287','Our lowest rate. Light and simple to drive.','available'],
   ['wigo','Toyota','Wigo G',2024,'Hatchback',5,'Automatic','Gasoline','#f39c12',1400,2000,'NGB 7734','Small hatchback for narrow streets and quick errands.','available'],
   ['fortuner','Toyota','Fortuner 2.8 LTD',2024,'SUV',7,'Automatic','Diesel','#2c3e50',4500,10000,'NHQ 9012','High ground clearance for provincial roads and mountain trips.','available'],
   ['innova','Toyota','Innova 2.8 E',2023,'MPV / Van',8,'Automatic','Diesel','#7f8c8d',3200,5000,'NBF 3390','Room for the whole family and their luggage.','available'],
   ['hiace','Toyota','Hiace GL Grandia',2022,'MPV / Van',12,'Manual','Diesel','#ffffff',5500,10000,'NAZ 6158','For group tours and company outings. Best booked with a driver.','maintenance']]
  .forEach(([id,brand,name,year,type,seats,trans,fuel,color,rate,deposit,plate,desc,status],i)=>db.doc('cars/car-'+id).set({brand,name,year,type,seats,trans,fuel,color,rate,deposit,plate,desc,status,imageId:'',createdAt:Date.now()+i}));
}

/* ---------- boot ---------- */
route();
(async()=>{
  S.local=!window.claude?.use;
  let db,user;
  if(S.local){db=localDb();user={canEdit:async()=>true,id:async()=>'local',can:async()=>true};seedLocal(db)}
  else [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
  S.db=db;S.user=user;
  if(!db){$('#fleetNote').textContent='Sign in to Claude and open this page from its link to see the cars and book.';S.ready=true;S.canWrite=false;route();return}
  S.editor=!!(await user?.canEdit?.());
  S.uid=await user?.id?.()??null;
  const cw=await user?.can?.('data.write');S.canWrite=!!S.uid&&cw!==false;
  if(S.editor)S.assets=S.local?localAssets:await window.claude.use('assets');
  if(S.local)$('#fleetNote').textContent=LSOK?'Running from the downloaded file: cars, bookings, photos and messages are saved in this browser on this computer only.':"This browser doesn't allow saving for files opened from your computer, so changes last only until you close this page. Open index.html in Chrome, Edge or Firefox to keep your data.";
  if(!S.canWrite&&!S.editor)$('#fleetNote').textContent='You can look at the cars, but booking needs Contributor access to this page. Ask the rental office to share it with you as a Contributor.';
  let saved=null;try{saved=JSON.parse(sessionStorage.getItem('cr-session')||'null')}catch(e){}
  const restore=async()=>{if(!saved||S.session||!S.bReady||(S.editor&&!S.cfgLoaded))return;const s=await tryLogin(saved.name,saved.pass);saved=null;if(s){S.session=s;route()}};
  if(S.editor)db.doc('admin/config').onSnapshot(d=>{S.adminCfg=d.exists?d.data():null;S.cfgLoaded=true;restore();render()},()=>{S.cfgLoaded=true;render()});else S.cfgLoaded=true;
  const timer=setTimeout(()=>{if(!S.ready){$('#fleetNote').textContent='The cars are taking a while to load. Check your connection.';S.ready=true;render()}},10000);
  const sub=(name,key,after)=>db.collection(name).onSnapshot(snap=>{S[key]=snap.docs.map(d=>({id:d.id,...d.data()}));if(name==='cars'){S.ready=true;clearTimeout(timer)}route();after&&after()},err=>{if(name==='bookings'){S.bReady=true;restore()}if(name==='cars'){S.ready=true;clearTimeout(timer);$('#fleetNote').textContent="The cars can't be loaded right now. Reload the page to try again."}render()});
  sub('cars','cars');sub('gallery','gallery');sub('bookings','bdocs',()=>{S.bReady=true;restore()});sub('blocks','blocks');sub('chats','chats',()=>{if(S.view==='messages'){clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800)}});sub('replies','replies',()=>{if(S.view==='messages'){clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800)}});
})();
}
