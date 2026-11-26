/* Car Rental System */
new MutationObserver(()=>{for(const c of document.querySelectorAll('.stack td:not([data-l])')){let i=0,p=c;while(p=p.previousElementSibling)i+=p.colSpan;c.dataset.l=c.closest('table').rows[0].cells[i]?.textContent||''}}).observe(document,{childList:true,subtree:true});
{
const $=s=>document.querySelector(s);
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const peso=n=>'₱'+Math.round(Number(n)||0).toLocaleString('en-PH');
const TYPES=['Sedan','Hatchback','SUV','MPV / Van','Pickup'];
const DEF_SET={extras:[{id:'driver',label:'With a driver',perDay:1500,driver:true},{id:'seat',label:'Child car seat',perDay:200,driver:false},{id:'xdriver',label:'Additional driver on the contract',perDay:300,driver:false}],delivery:500,cancelDays:2};
const DEF_TERMS=`# Who can rent
- The renter must be at least 21 years old and hold a valid driver's license.
- Bring your driver's license and one valid government ID when you pick up the car.

# Booking and payment
- A booking is confirmed only after the office approves it.
- The rental price and security deposit are shown on your booking. The deposit is paid at pickup and returned after the car is checked on return, less any charges below.

# Pickup and return
- The car is checked together with the renter at pickup and at return. Photos of the car and the signed rental agreement are kept as a record and shown on your booking.
- Return the car on the agreed date and time, clean and with the same fuel level. Late returns may be charged for the extra time.

# Use of the car
- Only the renter and the drivers named in the rental agreement may drive the car.
- No smoking, no illegal use, and no trips outside the agreed area without the office's permission.
- Traffic violations, tolls and parking fees during the rental are paid by the renter.

# Damage, loss and accidents
- Report any accident, damage or breakdown to the office right away.
- The renter pays for damage or loss during the rental that is not covered by insurance, as stated in the signed rental agreement.

# Cancellation
- You can cancel online up to the number of days before pickup shown on your booking. After that, message the office.`;
const SET=()=>{const x=S.settings||{};return{contact:x.contact&&typeof x.contact==='object'?x.contact:{},siteName:String(x.siteName||'').trim()||'Car Rental',logoId:x.logoId||'',extras:Array.isArray(x.extras)?x.extras:DEF_SET.extras,delivery:Number.isFinite(+x.delivery)&&x.delivery!==undefined?+x.delivery:DEF_SET.delivery,cancelDays:Number.isFinite(+x.cancelDays)&&x.cancelDays!==undefined?+x.cancelDays:DEF_SET.cancelDays,cancelText:typeof x.cancelText==='string'?x.cancelText.trim():'',terms:typeof x.terms==='string'?x.terms:DEF_TERMS,termsAt:+x.termsAt||0}};
const hasTerms=()=>!!SET().terms.trim();
const EX=()=>SET().extras;
const cdTxt=()=>plural(SET().cancelDays,'day');
const needsDriver=b=>(b.extrasDetail||[]).some(x=>x.driver)||(b.extras||[]).includes('With a driver');
const ST={pending:'Waiting for approval',approved:'Approved',active:'Picked up',completed:'Returned',rejected:'Not approved',cancelled:'Cancelled'};
const STS={pending:'Pending',approved:'Approved',active:'Picked up',completed:'Returned',rejected:'Rejected',cancelled:'Cancelled'};
const LIVE=['pending','approved','active'];
const cancelBy=b=>new Date(+new Date(b.start)-SET().cancelDays*864e5);
const canCancelNow=b=>['pending','approved'].includes(b.status)&&Date.now()<+cancelBy(b);
const S={db:null,user:null,assets:null,uid:null,admin:false,editor:false,session:null,adminCfg:null,cfgLoaded:false,bReady:false,canWrite:true,ready:false,cars:[],gallery:[],bdocs:[],blocks:[],notifRead:null,pfCache:{},licCache:{},drivers:[],settings:null,chats:[],replies:[],thread:null,draft:'',local:false,adm:{status:'all',q:''},f:{type:'',trans:''},editing:null,newImg:null,dropImg:false,booking:null,step:1};

/* ---------- helpers ---------- */
const pad=n=>String(n).padStart(2,'0');
const toLocal=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const parse=s=>s?new Date(s):null;
const days=(a,b)=>{const ms=parse(b)-parse(a);return ms>0?Math.max(1,Math.ceil(ms/864e5-1/24)):0};
const fmt=s=>{const d=parse(s);return d&&!isNaN(d)?d.toLocaleString('en-PH',{weekday:'short',month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—'};
const dayOnly=s=>{const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s||''));return m?new Date(+m[1],+m[2]-1,+m[3]):null};
const fmtLong=s=>{const d=dayOnly(s)||parse(s);return d&&!isNaN(d)?d.toLocaleDateString('en-PH',{month:'long',day:'numeric',year:'numeric'}):''};
const fmtD=s=>{const d=dayOnly(s)||parse(s);return d&&!isNaN(d)?d.toLocaleDateString('en-PH',{month:'short',day:'numeric'}):'—'};
const plural=(n,w)=>`${n} ${w}${n===1?'':'s'}`;
const uid=()=>Math.random().toString(36).slice(2,10);
const ref=()=>'CR-'+Date.now().toString(36).slice(-4).toUpperCase()+Math.random().toString(36).slice(2,4).toUpperCase();
const carById=id=>S.cars.find(c=>c.id===id);
const imgUrl=id=>{if(!id)return'';if(/^rimg-[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(String(id)))return'api/img?id='+encodeURIComponent(id);if(/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(String(id)))return String(id);if(/^up-[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(String(id)))return'uploads/'+id;if(String(id).startsWith('img-')){if(MEMIMG[id])return MEMIMG[id];try{return localStorage.getItem('cr-'+id)||''}catch(e){return''}}return'/_blob/'+encodeURIComponent(id)};
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
const SLOTS=[['front','Front view','Main photo','<path d="M5 15h14M6 15l1.5-5.5A2 2 0 0 1 9.4 8h5.2a2 2 0 0 1 1.9 1.5L18 15M4 15h16v3H4zM6 18v2M18 18v2M7.5 12.5h.01M16.5 12.5h.01" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
 ['back','Back view','','<path d="M4 15h16v3H4zM6 15l1.5-5.5A2 2 0 0 1 9.4 8h5.2a2 2 0 0 1 1.9 1.5L18 15M6 18v2M18 18v2M6 13h3M15 13h3M10 16.5h4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
 ['interior','Interior','Dashboard and steering wheel','<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="2" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4.5 11h5.5M14 11h5.5M12 14v6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>'],
 ['seats','Inside / seats','Front and back seats','<path d="M8 4h4a2 2 0 0 1 2 2v7h3a2 2 0 0 1 2 2v3H8a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2zM8 18v2M17 18v2" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>'],
 ['other1','Other photo','For example, a side view','<path d="M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>'],
 ['other2','Other photo','For example, the trunk','<path d="M4 7h3l2-2h6l2 2h3v12H4zM12 16a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>']];
const SLOT_LABEL=Object.fromEntries(SLOTS.map(([k,l])=>[k,l]));
/* photos of a car, in slot order: [{id,kind}] (older cars: images[] or imageId) */
function carPhotos(c){if(Array.isArray(c?.photos)&&c.photos.length)return c.photos.filter(p=>p&&p.id);
  const im=Array.isArray(c?.images)&&c.images.length?c.images:(c?.imageId?[c.imageId]:[]);const order=['front','other1','other2','seats','interior','back'];return im.slice(0,6).map((id,i)=>({id,kind:order[i]}))}
const carImgs=c=>carPhotos(c).map(p=>p.id);
const carGallery=c=>{const ph=carPhotos(c);if(!ph.length)return carPic(c);const lab=p=>p.kind&&!/^other/.test(p.kind)?SLOT_LABEL[p.kind]:'';
  if(ph.length<2)return `<img src="${esc(imgUrl(ph[0].id))}" alt="${esc(carTitle(c))}" loading="lazy" data-cgz data-car="${esc(c.id)}" data-i="0" style="cursor:zoom-in">${lab(ph[0])?`<span class="cg-label">${esc(lab(ph[0]))}</span>`:''}`;
  return `<div class="cg"><div class="cg-track" data-cgt>${ph.map((p,i)=>`<img src="${esc(imgUrl(p.id))}" alt="${esc(carTitle(c))}${lab(p)?', '+esc(lab(p)):''}" loading="lazy" data-cgz data-car="${esc(c.id)}" data-i="${i}">`).join('')}</div><button type="button" class="cg-btn prev" data-cgp="-1" aria-label="Previous photo" disabled>‹</button><button type="button" class="cg-btn next" data-cgp="1" aria-label="Next photo">›</button><div class="cg-dots" aria-hidden="true">${ph.map((_,i)=>`<i class="${i?'':'on'}"></i>`).join('')}</div><span class="cg-count">1/${ph.length}</span><span class="cg-label" data-labels="${esc(JSON.stringify(ph.map(lab)))}"${lab(ph[0])?'':' hidden'}>${esc(lab(ph[0]))}</span></div>`};
const carPic=c=>c?.imageId?`<img src="${esc(imgUrl(c.imageId))}" alt="${esc(carTitle(c))}" loading="lazy">`:carSvg(c);

async function shrink(file){
  try{const bmp=await createImageBitmap(file);const mx=S.local?1000:S.server?1280:1600;const s=Math.min(1,mx/Math.max(bmp.width,bmp.height));if(s===1&&file.type==='image/jpeg'&&file.size<(S.local?3e5:S.server?5e5:1.5e6))return file;
    const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*s);cv.height=Math.round(bmp.height*s);const g=cv.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(bmp,0,0,cv.width,cv.height);
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
const cidOf=b=>b.cid||tk(norm(b.name),last4(b.phone));
const isMine=b=>S.session?.role==='customer'&&(S.session.cid?cidOf(b)===S.session.cid:norm(b.name)===S.session.key&&last4(b.phone)===S.session.pass);
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
  if(S.server){
    let j;try{j=await S.db.api('api/login',{method:'POST',body:JSON.stringify({name,pass})})}catch(e){return e.code==='resource_exhausted'?{error:e.message}:null}
    try{localStorage.setItem('cr-token',j.token)}catch(e){}
    S.uid=j.uid;S.editor=j.role==='admin';S.assets=S.editor?serverAssets:null;S.cfgLoaded=true;
    await S.db.ready(j.token);
    return{role:j.role,name:j.name,key:norm(j.name),pass,cid:j.cid};
  }
  if(await adminOk(name,pass))return{role:'admin',name:S.adminCfg?.user||DEF_ADMIN.user,key:norm(name),pass};
  if(!/^\d{4}$/.test(pass))return null;
  const m=ownItems().find(b=>norm(b.name)===norm(name)&&last4(b.phone)===pass);
  return m?{role:'customer',name:m.name,key:norm(name),pass,cid:cidOf(m)}:null;
}
function startSession(s){S.session=s;try{sessionStorage.setItem('cr-session',JSON.stringify({name:s.name,pass:s.pass}))}catch(e){}}
function endSession(){S.session=null;try{sessionStorage.removeItem('cr-session')}catch(e){}
  if(S.server){try{localStorage.removeItem('cr-token')}catch(e){}S.uid=null;S.editor=false;S.assets=null;S.db.ready(null).catch(()=>{})}}

/* ---------- routing ---------- */
const CUST=[['fleet','Cars'],['my-bookings','My bookings'],['messages','Messages'],['my-details','My details']];
const ADM=[['bookings','Rentals'],['customers','Customers'],['messages','Messages'],['cars','Fleet'],['drivers','Drivers'],['photos','Recent activity'],['reports','Reports'],['settings','Settings'],['fleet','Customer view']];
const ACT_VIEWS=['fleet','my-bookings','my-details'];
const GUEST=[['fleet','Cars'],['login','Log in']];
function navItems(){const t=hasTerms();
  if(S.session?.role==='admin')return[...ADM.slice(0,-1),['terms','Terms'],ADM.at(-1)];
  if(S.session)return t?[...CUST,['terms','Terms and conditions']]:CUST;
  return t?[GUEST[0],['terms','Terms and conditions'],GUEST[1]]:GUEST}
function route(){
  const items=navItems();let h=location.hash.slice(1);
  if(!items.some(i=>i[0]===h))h=items[0][0];
  S.admin=S.session?.role==='admin';
  applyBrand();
  $('#role').textContent=!S.db?'Offline preview':S.session?(S.admin?'Admin: ':'Hi, ')+S.session.name:'';
  $('#logout').classList.toggle('hide',!S.session);
  document.querySelectorAll('.view').forEach(v=>v.classList.toggle('hide',v.id!=='v-'+h));
  const pend=allBookings().filter(b=>b.status==='pending').length;
  const unread=S.session?unreadCount():0;
  closeMenu();
  $('#activityBand').classList.toggle('hide',!ACT_VIEWS.includes(h));
  $('#nav').innerHTML=items.map(([k,l])=>{const n=k==='bookings'&&S.admin?pend:k==='messages'?unread:0;return `<a href="#${k}" ${k===h?'aria-current="page"':''}>${esc(l)}${n?`<span class="count" aria-label="${n} new">${n}</span>`:''}</a>`}).join('');
  renderBell();fitHeader();
  const tot=(S.admin?pend:0)+unread;$('#menuDot').textContent=tot;$('#menuDot').classList.toggle('hide',!tot);
  if(S.view!==h)scrollTo(0,0);
  S.view=h;render();
}
addEventListener('hashchange',route);
function fitHeader(){const top=$('.top');top.classList.remove('compact');
  const nav=$('#nav'),brand=$('.brand'),who=$('.top .who');
  const wraps=innerWidth<=1000||nav.offsetTop>brand.offsetTop+8||(who.offsetWidth>0&&who.offsetTop>brand.offsetTop+8);
  top.classList.toggle('compact',wraps);if(!wraps)closeMenu()}
addEventListener('resize',()=>{clearTimeout(S.fitT);S.fitT=setTimeout(fitHeader,60)});
function closeMenu(){$('.top').classList.remove('open');$('#menuBtn').setAttribute('aria-expanded','false');$('#menuBtn').setAttribute('aria-label','Open menu')}
$('#menuBtn').addEventListener('click',e=>{e.stopPropagation();const o=!$('.top').classList.contains('open');$('.top').classList.toggle('open',o);$('#menuBtn').setAttribute('aria-expanded',String(o));$('#menuBtn').setAttribute('aria-label',o?'Close menu':'Open menu');if(o)$('#nav a')?.focus()});
document.addEventListener('click',e=>{if($('.top').classList.contains('open')&&!e.target.closest('#nav')&&!e.target.closest('#menuBtn'))closeMenu()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.top').classList.contains('open')){closeMenu();$('#menuBtn').focus()}});
$('#nav').addEventListener('click',e=>{if(e.target.closest('a'))closeMenu()});

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
    return `<article class="car${ok?'':' off'}"><div class="ph">${carGallery(c)}${flag}</div><div class="body">
      <div class="title"><div><h3>${esc(carTitle(c))}</h3><div class="small">${esc(c.year||'')} ${esc(c.type||'')}</div></div><div class="price"><b>${esc(peso(c.rate))}</b><span>per day</span></div></div>
      <ul class="specs">${icon('seat',(c.seats||'?')+' seats')}${icon('gear',c.trans||'')}${icon('fuel',c.fuel||'')}${c.plate?`<li><span class="plate">${esc(c.plate)}</span></li>`:''}</ul>
      ${c.desc?`<p class="desc">${esc(c.desc)}</p>`:''}
      <div class="foot">${ok&&dateOk?`<div class="tot"><span>${plural(n,'day')}</span><b>${esc(peso(n*c.rate))}</b></div>`:''}${why&&!can?`<p class="${ok?'small':'why'}">${esc(why)}</p>`:''}
      <div class="acts">${S.admin?`<button class="btn" data-edit="${esc(c.id)}">Edit</button>`:''}<button class="btn go" data-rent="${esc(c.id)}" ${can?'':'disabled'}>Rent this car</button></div></div>
    </div></article>`}).join('');
}
function perView(){const v=getComputedStyle($('#strip')).getPropertyValue('--per');return Math.max(1,parseInt(v)||4)}
function updDots(){const st=$('#strip');const n=st.querySelectorAll('.post').length;const per=perView();const pages=Math.ceil(n/per);
  $('#stripNav').classList.toggle('hide',n<=per);
  const w=st.clientWidth||1;const cur=Math.round(st.scrollLeft/w);
  $('#stripDots').innerHTML=pages>1?Array.from({length:pages},(_,i)=>`<i class="${i===cur?'on':''}"></i>`).join(''):'';
  $('#sPrev').disabled=st.scrollLeft<=4;$('#sNext').disabled=st.scrollLeft+st.clientWidth>=st.scrollWidth-4}
function renderStrip(){
  const s=$('#strip');const g=[...S.gallery].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  s.innerHTML=g.length?g.map(p=>`<figure class="post"><button type="button" class="pic" data-post="${esc(p.id)}" aria-label="See ${esc(p.caption||'this post')} larger"><img src="${esc(imgUrl(p.imageId))}" alt="${esc(p.caption||'Recent activity photo')}" loading="lazy"></button>${p.caption||p.date||p.desc?`<figcaption>${p.caption?`<b>${esc(p.caption)}</b>`:''}${p.date?`<span class="pdate"><svg class="ic" aria-hidden="true" viewBox="0 0 24 24"><path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>${esc(fmtLong(p.date))}</span>`:''}${p.desc?`<span class="pdesc">${esc(p.desc)}</span>`:''}</figcaption>`:''}</figure>`).join(''):`<div class="empty" style="flex:1">${S.admin?'<b>No posts yet</b><a class="btn go" href="#photos">Post a photo</a>':'Photos of our renters and trips will appear here.'}</div>`;
  updDots();
}

/* ---------- render: my bookings ---------- */
const ORDER=['pending','approved','active','completed'];
function renderMine(){
  $('#cancelBanner').innerHTML=policyHtml();
  const el=$('#mineList');const list=[...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  if(!list.length){el.innerHTML=`<div class="empty"><b>No bookings yet</b><a class="btn go" href="#fleet">Choose a car</a></div>`;return}
  el.innerHTML=list.map(b=>{const c=carById(b.carId);const canCancel=canCancelNow(b);const open=['pending','approved'].includes(b.status);const i=ORDER.indexOf(b.status);
    return `<article class="bk"><div class="ph">${carPic(c||{name:b.carName})}</div><div class="info">
      <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><h3>${esc(b.carName||carTitle(c))}</h3><span class="pill s-${esc(b.status)}">${esc(ST[b.status]||b.status)}</span></div>
      <div>${esc(fmt(b.start))} to ${esc(fmt(b.end))}</div>
      <div class="small">${plural(+b.days||0,'day')} · <b style="color:var(--ink)">${esc(peso(b.total))}</b> · ${b.pickup==='delivery'?'Delivered to your address':'Pick up at the office'} · Ref <span class="plate">${esc(b.ref)}</span></div>
      ${i>=0?`<ol class="track" aria-label="Booking progress">${['Requested','Approved','Picked up','Returned'].map((l,k)=>`<li class="${k<=i?'done':''}">${l}</li>`).join('')}</ol>`:''}
      ${needsDriver(b)&&!['rejected','cancelled'].includes(b.status)?`<div><b>Your driver:</b> ${b.driverName?`${esc(b.driverName)}, ${esc(b.driverPhone||'')}`:'<span class="small">the office will assign a driver and tell you here.</span>'}</div>`:''}
      ${(b.changes||[]).length?`<p class="okmsg" style="margin-top:6px;font-weight:500"><b>Changed by the office on ${esc(tAt(b.changes.at(-1).at))}:</b> ${esc(b.changes.at(-1).what)}</p>`:''}
      ${b.adminNote?`<p class="note" style="margin-top:6px"><b>Comment from the office:</b> ${esc(b.adminNote)}</p>`:''}
      ${['pickup','ret'].filter(sd=>hasHand(b,sd)).map(sd=>{const h=b.handover[sd];return`<div class="handc"><div><b>${HSIDE[sd][2]}</b>${h.updatedAt?` <span class="small">· ${esc(tAt(h.updatedAt))}</span>`:''}</div>${(h.files||[]).length?`<div class="pfgrid sm">${pfThumbs(S.uid,b,sd,false)}</div>`:''}${h.comment?`<p class="small" style="margin:0;color:var(--ink)"><b>Office comments:</b> ${esc(h.comment)}</p>`:''}</div>`}).join('')}
    </div><div class="acts"><button class="btn sm" data-askbk="${esc(b.ref)}">Ask about this booking</button>${canCancel?`<button class="btn sm danger" data-cancel="${esc(b.id)}">Cancel booking</button>`:''}</div>${open?`<p class="small" style="grid-column:1/-1;margin:0">${canCancel?`You can cancel until ${esc(fmt(toLocal(cancelBy(b))))}.`:`The ${esc(cdTxt())} cancellation period has passed. To change or cancel, message the office.`}</p>`:''}</article>`}).join('');
  fillPfImgs(el);
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
    return `<div class="prow"><div><b>${esc(b.name)}</b> <span class="small nw">${esc(b.phone)}</span><div class="small">Ref ${esc(b.ref)}</div></div><div>${esc(b.carName)}<div class="small">${esc(fmtD(b.start))} to ${esc(fmtD(b.end))}, ${plural(+b.days||0,'day')}, <b style="color:var(--ink)">${esc(peso(b.total))}</b></div>${cl?'<div class="err">Overlaps an approved booking</div>':''}${needsDriver(b)?`<div class="small"><b style="color:var(--ink)">With a driver:</b> ${b.driverName?esc(b.driverName):'not assigned yet'}</div>`:''}</div><div class="acts"><button class="btn sm" data-open="${esc(b.owner)}|${esc(b.id)}">Details</button><button class="btn sm danger" data-quick="rejected|${esc(b.owner)}|${esc(b.id)}">Reject</button><button class="btn sm okb" data-quick="approved|${esc(b.owner)}|${esc(b.id)}">Approve</button></div></div>`}).join('');
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
  el.innerHTML=S.cars.length?[...S.cars].sort((a,b)=>carTitle(a).localeCompare(carTitle(b))).map(c=>`<div class="fleetrow"><div class="ph">${carPic(c)}</div><div class="info"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><h3>${esc(carTitle(c))}</h3><span class="pill s-${esc(c.status)}">${c.status==='available'?'Available':c.status==='hidden'?'Hidden':'Maintenance'}</span></div><div class="small">${esc(c.year||'')} ${esc(c.type||'')} · ${esc(c.seats||'?')} seats · ${esc(c.trans||'')} · ${esc(c.fuel||'')}</div>${c.plate?`<div><span class="plate">${esc(c.plate)}</span> <span class="small">${plural(carImgs(c).length,'photo')}</span></div>`:`<div class="small">${plural(carImgs(c).length,'photo')}</div>`}</div><div class="acts"><span class="rateedit"><label for="r-${esc(c.id)}" class="small">₱ per day</label><input id="r-${esc(c.id)}" type="number" min="0" step="50" value="${esc(c.rate)}" data-rate="${esc(c.id)}"><button class="btn sm" data-saverate="${esc(c.id)}">Save price</button></span><label class="btn sm${S.assets?'':' hide'}" style="margin:0">Add photo<input type="file" accept="image/*" data-photo="${esc(c.id)}" hidden></label><button class="btn sm go" data-edit="${esc(c.id)}">Edit all details</button><button class="btn sm danger" data-cdel="${esc(c.id)}">Delete</button></div></div>`).join(''):'<div class="empty"><b>No cars yet</b><span>Add your first car to start taking bookings.</span></div>';
}
function renderPhotos(){
  const g=[...S.gallery].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('#pGrid').innerHTML=g.length?g.map(p=>`<figure><img src="${esc(imgUrl(p.imageId))}" alt="${esc(p.caption||'Recent activity photo')}" loading="lazy"><figcaption style="display:grid;gap:6px"><span><b>${esc(p.caption||'No caption')}</b><br><span class="small">${p.date?esc(fmtLong(p.date)):'No date shown'}</span>${p.desc?`<br><span class="small">${esc(p.desc.length>90?p.desc.slice(0,90)+'…':p.desc)}</span>`:''}</span><span class="acts" style="justify-content:flex-start"><button class="btn sm go" data-pedit="${esc(p.id)}">Edit</button><button class="btn sm danger" data-pdel="${esc(p.id)}">Delete</button></span></figcaption></figure>`).join(''):'<div class="empty" style="grid-column:1/-1"><b>No posts yet</b><span>Post photos of your renters and trips with a caption.</span></div>';
}
function renderLogin(){}

/* ---------- messages ---------- */
const tk=(nn,l4)=>'t_'+(nn+'_'+l4).replace(/[^a-z0-9]/g,'_');
const myKey=()=>S.session.cid||tk(S.session.key,S.session.pass);
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
  await serial(coll+owner,()=>S.db.doc(coll+'/'+owner).set({...(d?Object.fromEntries(Object.entries(d).filter(([k])=>k!=='id')):{}),threads,updatedAt:Date.now()}));
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
  if(S.editMsg&&!t.msgs.some(m=>m.from===me&&m.id===S.editMsg))S.editMsg=null;
  const ed=$('#msgEdit');if(ed)S.editDraft=ed.value;
  box.innerHTML=t.msgs.length?t.msgs.map(m=>{const mine=m.from===me;const who=mine?'You':adm?esc(t.name||'Customer'):'Rental office';const tm=`<time>${who}, ${esc(tAt(m.at))}${m.edited?' · Edited':''}</time>`;
    if(mine&&m.id&&S.editMsg===m.id)return`<div class="msg me editing"><label for="msgEdit" class="hide">Edit your message</label><textarea id="msgEdit">${esc(S.editDraft??m.text)}</textarea><div class="macts"><button type="button" class="mcancel" data-mcancel>Cancel</button><button type="button" class="msave" data-msave="${esc(m.id)}">Save</button></div></div>`;
    return`<div class="msg${mine?' me':''}">${esc(m.text)}${tm}${mine&&m.id?`<div class="macts"><button type="button" data-medit="${esc(m.id)}">Edit</button><button type="button" data-mdel="${esc(m.id)}">Delete</button></div>`:''}</div>`}).join(''):`<div class="empty" style="margin:auto">${adm?'No messages yet. Write the first one below.':'No messages yet. Write to the office below.'}</div>`;
  if(atEnd||!S.msgScrolled){box.scrollTop=box.scrollHeight;S.msgScrolled=true}
  if(S.draft){$('#msgIn').value=S.draft;S.draft='';$('#msgIn').focus()}
  const ne=$('#msgEdit');if(ne&&S.editFocus){S.editFocus=false;ne.focus();ne.setSelectionRange(ne.value.length,ne.value.length)}
  clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800);
}
$('#compose').addEventListener('submit',async e=>{
  e.preventDefault();const v=$('#msgIn').value.trim();if(!v)return;
  const b=$('#msgSend');b.disabled=true;
  try{await sendMsg(v);$('#msgIn').value='';S.msgScrolled=false;renderMessages()}catch(x){toast('Message not sent. Try again.')}finally{b.disabled=false}
});
async function changeMyMsg(id,fn){
  if(S.admin){const t=S.thread;await writeThread('replies',t.owner,t.key,x=>({...x,msgs:fn(x.msgs||[])}))}
  else await writeThread('chats',S.uid,myKey(),x=>({...x,msgs:fn(x.msgs||[])}));
}
async function saveEditMsg(id){
  const v=($('#msgEdit')?.value||'').trim();
  if(!v){toast('The message is empty. Write something, or use Delete.');return}
  const b=$('[data-msave]');if(b)b.disabled=true;
  try{await changeMyMsg(id,ms=>ms.map(m=>m.id===id?(m.text===v?m:{...m,text:v,edited:true,editedAt:Date.now()}):m));S.editMsg=null;S.editDraft=null;renderMessages();toast('Message updated')}
  catch(x){toast('Message not updated. Try again.');if(b)b.disabled=false}
}
$('#msgs').addEventListener('click',async e=>{
  const t=e.target;
  const ed=t.closest('[data-medit]');if(ed){S.editMsg=ed.dataset.medit;S.editDraft=null;S.editFocus=true;renderMessages();return}
  if(t.closest('[data-mcancel]')){S.editMsg=null;S.editDraft=null;renderMessages();return}
  const sv=t.closest('[data-msave]');if(sv){saveEditMsg(sv.dataset.msave);return}
  const dl=t.closest('[data-mdel]');if(dl){
    if(!await ask(S.admin?'Delete this message? The customer will no longer see it.':'Delete this message? The office will no longer see it.','Delete'))return;
    try{await changeMyMsg(dl.dataset.mdel,ms=>ms.filter(m=>m.id!==dl.dataset.mdel));renderMessages();toast('Message deleted')}catch(x){toast('Message not deleted. Try again.')}
  }
});
$('#msgs').addEventListener('keydown',e=>{
  if(!e.target.closest('.msg.editing'))return;
  if(e.key==='Escape'){e.preventDefault();S.editMsg=null;S.editDraft=null;renderMessages()}
  else if(e.key==='Enter'&&!e.shiftKey&&e.target.id==='msgEdit'){e.preventDefault();const b=$('[data-msave]');if(b)saveEditMsg(b.dataset.msave)}
});
$('#msgIn').addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();$('#compose').requestSubmit()}});
document.addEventListener('visibilitychange',markSeen);

/* ---------- customers (admin) ---------- */
function customers(){
  const m=new Map();
  allBookings().forEach(b=>{const k=b.owner+'|'+cidOf(b);const c=m.get(k)||{owner:b.owner,key:cidOf(b),name:b.name,phone:b.phone,email:'',address:'',n:0,spent:0,last:'',lastCar:''};
    c.n++;if(['approved','active','completed'].includes(b.status))c.spent+=+b.total||0;if(!c.last||b.start>c.last){c.last=b.start;c.lastCar=b.carName;c.name=b.name;c.phone=b.phone;c.email=b.email||c.email;c.address=b.address||c.address}m.set(k,c)});
  return[...m.values()].sort((a,b)=>String(b.last).localeCompare(String(a.last)));
}
function renderCustomers(){
  const q=($('#custQ').value||'').toLowerCase();const list=customers().filter(c=>!q||[c.name,c.phone,c.email].join(' ').toLowerCase().includes(q));
  $('#custTable tbody').innerHTML=list.map(c=>`<tr><td><b>${esc(c.name)}</b>${c.n>=3?' <span class="pill s-active">Regular</span>':''}<div class="small">${esc(c.email||'')}</div></td><td class="nw">${esc(c.phone)}</td><td>${esc(c.address)}</td><td class="num">${c.n}</td><td class="num">${esc(peso(c.spent))}</td><td class="nw">${esc(fmtD(c.last))}<div class="small">${esc(c.lastCar)}</div></td><td><div class="acts"><button class="btn sm" data-clic="${esc(c.owner)}|${esc(c.key)}|${esc(c.name)}">License</button><button class="btn sm" data-cbk="${esc(c.phone)}">Bookings</button><button class="btn sm go" data-msg="${esc(c.owner)}|${esc(c.key)}|${esc(c.name)}|${esc(c.phone)}">Message</button></div></td></tr>`).join('');
  $('#custTable').classList.toggle('hide',!list.length);$('#custEmpty').classList.toggle('hide',list.length>0);
}
$('#custQ').addEventListener('input',renderCustomers);

/* ---------- my details (customer) ---------- */
const PF=[['#pName','name'],['#pPhone','phone'],['#pEmail','email'],['#pAddr','address'],['#pEmer','emergency']];
function latestMine(){return [...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]||{}}
function fillDetails(){const p=latestMine();PF.forEach(([s,k])=>$(s).value=p[k]||'');S.pLicNew='';setThumb('#pLicThumb','');if(p.name)licGet(S.uid,cidOf(p)).then(img=>{if(!S.pLicNew)setThumb('#pLicThumb',img||'')}).catch(()=>{});detWarn()}
function renderDetails(){if(S.detFor!==S.session?.cid){S.detFor=S.session?.cid;$('#pMsgOk').textContent='';fillDetails()}}
function detWarn(){const p=latestMine();const nn=$('#pName').value,ph=$('#pPhone').value;const msgs=[];
  if(norm(nn)&&norm(nn)!==norm(p.name))msgs.push('your login name will change to '+nn.trim().replace(/\s+/g,' '));
  const l=last4(ph);if(l.length===4&&l!==last4(p.phone))msgs.push('your password will change to '+l);
  $('#pWarn').textContent=msgs.length?'After saving, '+msgs.join(' and ')+'.':''}
$('#detForm').addEventListener('input',e=>{if(['pName','pPhone'].includes(e.target.id))detWarn();$('#pMsgOk').textContent=''});
$('#pReset').addEventListener('click',()=>{fillDetails();$('#pErr').textContent='';$('#pMsgOk').textContent=''});
$('#detForm').addEventListener('submit',async e=>{
  e.preventDefault();const v=s=>$(s).value.trim();const err=(s,m)=>{$('#pErr').textContent=m;$(s).focus()};$('#pErr').textContent='';
  const name=v('#pName').replace(/\s+/g,' '),ph=v('#pPhone');
  if(!name)return err('#pName','Enter your full name.');
  if(ph.replace(/\D/g,'').length<7||!/^[+()\-\s\d]+$/.test(ph))return err('#pPhone','Enter a valid mobile number, like 0917 123 4567.');
  if(v('#pEmail')&&!/^\S+@\S+\.\S+$/.test(v('#pEmail')))return err('#pEmail','Check your email address.');
  if(!v('#pAddr'))return err('#pAddr','Enter your address.');
  const nk=norm(name),np=last4(ph);
  if(ownItems().some(b=>!isMine(b)&&norm(b.name)===nk&&last4(b.phone)===np))return err('#pName','Another customer on this device already uses this name and mobile number.');
  const cid=S.session.cid||myKey();const d={name,phone:ph,email:v('#pEmail'),address:v('#pAddr'),emergency:v('#pEmer')};
  const items=ownItems().map(b=>isMine(b)?{...b,...d,cid}:b);
  const btn=$('#pSave');btn.disabled=true;btn.textContent='Saving…';
  try{
    await saveOwner(S.uid,items);
    if(S.pLicNew){await licSave(S.uid,cid,S.pLicNew);S.pLicNew=''}
    if(S.chats.find(x=>x.id===S.uid)?.threads?.[cid])await writeThread('chats',S.uid,cid,x=>({...x,name,phone:ph}));
    startSession({role:'customer',name,key:nk,pass:np,cid});
    $('#pWarn').textContent='';$('#pMsgOk').textContent=`Saved. Log in next time with ${name} and password ${np}.`;route();toast('Details saved');
  }catch(x){$('#pErr').textContent='Not saved. Check your connection and try again.'}
  finally{btn.disabled=false;btn.textContent='Save changes'}
});
function render(){
  const v=S.view;
  if(v==='fleet'){ticket();renderFleet()}
  if(ACT_VIEWS.includes(v))renderStrip();
  if(v==='my-bookings')renderMine();
  if(v==='bookings')renderAdmin();
  if(v==='cars')renderCars();
  if(v==='photos')renderPhotos();
  if(v==='login')renderLogin();
  if(v==='messages'&&S.session)renderMessages();
  if(v==='customers')renderCustomers();
  if(v==='my-details')renderDetails();
  if(v==='drivers')renderDrivers();
  if(v==='settings')renderSettings();
  if(v==='terms')renderTerms();
  if(v==='reports')renderReports();
}

/* ---------- booking wizard ---------- */
function openBooking(carId){
  const c=carById(carId);if(!c)return;S.booking=c;
  $('#bkTitle').textContent='Book the '+carTitle(c);
  $('#bkCar').innerHTML=`<div class="ph">${carPic(c)}</div><div><h3>${esc(carTitle(c))}</h3><div class="small">${esc(c.type||'')} · ${esc(c.seats||'?')} seats · ${esc(c.trans||'')}</div><b style="color:var(--price)">${esc(peso(c.rate))}</b> <span class="small">per day</span></div>`;
  const mine=S.session?.role==='customer'?[...myItems()].sort((a,b)=>(b.createdAt||0)-(a.createdAt||0))[0]:null;
  S.licImg='';S.licOnFile='';setThumb('#bLicThumb','');
  if(mine)licGet(S.uid,cidOf(mine)).then(img=>{if(img&&!S.licImg){S.licOnFile=img;setThumb('#bLicThumb',img)}}).catch(()=>{});
  const p=mine||{};[['#bName','name'],['#bPhone','phone'],['#bEmail','email'],['#bAddr','address'],['#bEmer','emergency']].forEach(([s,k])=>$(s).value=p[k]||'');
  const f=filters();$('#bStart').value=f.start;$('#bEnd').value=f.end;
  $('#bStart').min=$('#bEnd').min=toLocal(new Date());
  $('#bPick').options[1].textContent=`Deliver to my address (+${peso(SET().delivery)})`;
  $('#bExtras').innerHTML=EX().map(x=>`<label class="opt"><input type="checkbox" data-x="${x.id}">${esc(x.label)}<span>+${esc(peso(x.perDay))} a day</span></label>`).join('');
  $('#bAgree').checked=false;$('#bTerms').checked=false;$('#bTermsRow').classList.toggle('hide',!hasTerms());$('#bNotes').value='';$('#bPick').value='office';
  step(1);$('#dBook').showModal();
}
function calc(){
  const c=S.booking;const s=$('#bStart').value,e=$('#bEnd').value;const n=days(s,e);
  const ex=[...document.querySelectorAll('#bExtras [data-x]:checked')].map(i=>EX().find(x=>x.id===i.dataset.x)).filter(Boolean);
  const exDay=ex.reduce((a,x)=>a+(+x.perDay||0),0);const del=$('#bPick').value==='delivery'?SET().delivery:0;
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
    if(!S.licImg&&!S.licOnFile)return['#bLicFile',"Upload a photo of your driver's license."];
  }
  if(n===3&&hasTerms()&&!$('#bTerms').checked)return['#bTerms','Tick the box to agree to the Terms and conditions.'];
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
  if(n===3){const v=id=>esc($(id).value.trim()||'—');const k=calc();const cb=cancelBy({start:k.s});$('#bAgreeT').textContent=`My details are correct, I'll bring my driver's license and one government ID at pickup, and I ${SET().cancelText?'accept the cancellation policy above':`understand that I can only cancel up to ${cdTxt()} before pickup`}.`;$('#bPolicy').innerHTML=policyHtml(cb);
    $('#bReview').innerHTML=`<dt>Car</dt><dd>${esc(carTitle(k.c))}</dd><dt>Pickup</dt><dd>${esc(fmt(k.s))}</dd><dt>Return</dt><dd>${esc(fmt(k.e))}</dd><dt>How you get it</dt><dd>${k.del?'Delivered to your address':'Pick up at the office'}</dd><dt>Full name</dt><dd>${v('#bName')}</dd><dt>Mobile</dt><dd>${v('#bPhone')}</dd><dt>Email</dt><dd>${v('#bEmail')}</dd><dt>Address</dt><dd>${v('#bAddr')}</dd><dt>Driver's license</dt><dd>${S.licImg||S.licOnFile?`<button type="button" class="licthumb has sm" data-zoom="b" aria-label="See your license photo larger"><img src="${esc(S.licImg||S.licOnFile)}" alt="Driver's license"></button>`:'—'}</dd><dt>Emergency contact</dt><dd>${v('#bEmer')}</dd><dt>Notes</dt><dd>${v('#bNotes')}</dd>`}
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
  const nm=v('#bName').replace(/\s+/g,' ');const prev=ownItems().find(x=>norm(x.name)===norm(nm)&&last4(x.phone)===last4(v('#bPhone')));
  const b={id:uid(),ref:ref(),cid:S.session?.role==='customer'&&isMine({name:nm,phone:v('#bPhone')})?S.session.cid:prev?cidOf(prev):tk(norm(nm),last4(v('#bPhone'))),carId:k.c.id,carName:carTitle(k.c),plate:k.c.plate||'',name:v('#bName').replace(/\s+/g,' '),phone:v('#bPhone'),email:v('#bEmail'),address:v('#bAddr'),hasLicense:true,emergency:v('#bEmer'),start:k.s,end:k.e,days:k.n,rate:+k.c.rate,extras:k.ex.map(x=>x.label),extrasDetail:k.ex.map(x=>({label:x.label,perDay:+x.perDay||0,driver:!!x.driver})),extrasPerDay:k.exDay,pickup:$('#bPick').value,delivery:k.del,total:k.total,deposit:+k.c.deposit||0,notes:v('#bNotes'),status:'pending',createdAt:Date.now()};
  if(hasTerms())b.termsAgreedAt=Date.now();
  try{
    if(S.server){const r=await S.db.book({...b,tz:new Date().getTimezoneOffset(),licenseImg:S.licImg||''});Object.assign(b,r.booking)}
    else{if(S.licImg)await licSave(S.uid,b.cid,S.licImg);await saveOwner(S.uid,[...ownItems(),b])}
    $('#dBook').close();
    if(S.session?.role==='admin'){toast('Booking '+b.ref+' added');return}
    if(!isMine(b)){
      if(S.session)endSession();
      $('#lName').value=b.name;$('#lPass').value='';$('#lErr').textContent='';
      $('#lMsg').textContent=`Booking request sent for the ${b.carName}. Your reference is ${b.ref}. Log in to follow it: your password is the last 4 digits of ${b.phone}.`;
      location.hash='#login';route();setTimeout(()=>$('#lPass').focus(),50);return;
    }
    $('#doneBody').innerHTML=`<p>Your request for the <b>${esc(b.carName)}</b>, ${esc(fmt(b.start))} to ${esc(fmt(b.end))}, has been sent. Total: <b>${esc(peso(b.total))}</b>.</p><p>Reference <span class="plate" style="font-size:18px">${esc(b.ref)}</span></p><p class="small">The office will check and approve it. You can follow it under My bookings. You can cancel until ${esc(fmt(toLocal(cancelBy(b))))} (${esc(cdTxt())} before pickup).</p>`;
    $('#dDone').showModal();
  }catch(x){$('#bErr').textContent=S.server&&x?.message?x.message:x?.code==='quota_exceeded'?'The booking list is full. Contact the rental office.':'The booking was not sent. Check your connection and send it again.'}
  finally{btn.disabled=false;btn.textContent=S.step===3?'Send booking request':'Next'}
});

/* ---------- writes ---------- */
const slim=items=>items.map(b=>({id:b.id,carId:b.carId,start:b.start,end:b.end,status:b.status}));
async function saveOwner(owner,items){
  await serial('b'+owner,()=>S.db.doc('bookings/'+owner).set({items,updatedAt:Date.now()}));
  await serial('k'+owner,()=>S.db.doc('blocks/'+owner).set({items:slim(items)}));
}
async function setStatus(owner,id,status,note,extra){
  const items=(S.bdocs.find(x=>x.id===owner)?.items||[]).map(b=>b.id===id?{...b,status,...(note!==undefined?{adminNote:note}:{}),...(extra||{}),updatedAt:Date.now()}:b);
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
  <dl class="kv"><dt>Full name</dt><dd>${esc(b.name)}</dd><dt>Mobile</dt><dd>${esc(b.phone)}</dd><dt>Email</dt><dd>${esc(b.email||'—')}</dd><dt>Address</dt><dd>${esc(b.address)}</dd><dt>Driver's license</dt><dd id="detLic"><span class="small">Loading photo…</span></dd><dt>Emergency contact</dt><dd>${esc(b.emergency||'—')}</dd>
  <dt>Pickup</dt><dd>${esc(fmt(b.start))}</dd><dt>Return</dt><dd>${esc(fmt(b.end))} (${plural(+b.days||0,'day')})</dd><dt>How they get it</dt><dd>${b.pickup==='delivery'?'Deliver to address':'At the office'}</dd><dt>Extras</dt><dd>${esc((b.extras||[]).join(', ')||'None')}</dd>${needsDriver(b)?`<dt>Driver</dt><dd>${b.driverName?`<b>${esc(b.driverName)}</b>, ${esc(b.driverPhone||'')}`:'<span class="err">Needs a driver. Assign one below.</span>'}</dd>`:''}
  <dt>Total</dt><dd><b>${esc(peso(b.total))}</b> (${esc(peso(b.rate))} a day${b.extrasPerDay?` + ${esc(peso(b.extrasPerDay))} a day extras`:''}${b.delivery?` + ${esc(peso(b.delivery))} delivery`:''})</dd><dt>Deposit</dt><dd>${esc(peso(b.deposit))}</dd><dt>Customer notes</dt><dd>${esc(b.notes||'—')}</dd><dt>Requested</dt><dd>${esc(b.createdAt?new Date(b.createdAt).toLocaleString('en-PH'):'—')}</dd><dt>Terms</dt><dd>${b.termsAgreedAt?`Agreed on ${esc(tAt(b.termsAgreedAt))}`:'<span class="small">Not recorded</span>'}</dd>${(b.changes||[]).length?`<dt>Changes</dt><dd>${b.changes.map(c=>`<div><b>${esc(tAt(c.at))}:</b> ${esc(c.what)}</div>`).join('')}</dd>`:''}</dl>
  ${needsDriver(b)&&!['rejected','cancelled','completed'].includes(b.status)?`<div><label for="detDrv">Driver for this trip</label><div class="acts" style="justify-content:flex-start;flex-wrap:nowrap"><select id="detDrv" style="flex:1">${driverOpts(b.start,b.end,b.id,b.driverId)}</select><button class="btn" data-act="drv">${b.driverId?'Change driver':'Assign driver'}</button></div>${S.drivers.length?'':'<p class="hint">No drivers yet. Add them on the Drivers page.</p>'}</div>`:''}
  ${['approved','active','completed'].includes(b.status)||hasHand(b,'pickup')||hasHand(b,'ret')?`<div class="hands">${['pickup','ret'].map(sd=>{const h=b.handover?.[sd]||{};return`<section class="hand" aria-labelledby="hh-${sd}"><h3 id="hh-${sd}">${HSIDE[sd][0]}</h3><p class="small" style="margin:0">${HSIDE[sd][1]} ${esc(b.name.split(' ')[0])} can see these on their booking.</p>
    <div class="pfgrid" id="pfg-${sd}">${pfThumbs(owner,b,sd,true)||'<p class="small" style="margin:0">Nothing added yet.</p>'}</div>
    <div class="acts" style="justify-content:flex-start"><label class="btn sm" for="pfP-${sd}">Add photos</label><input type="file" id="pfP-${sd}" class="vh" accept="image/*" multiple data-pfadd="${sd}|photo"><label class="btn sm" for="pfD-${sd}">Add signed document</label><input type="file" id="pfD-${sd}" class="vh" accept="image/*,application/pdf" multiple data-pfadd="${sd}|doc"><span class="small" id="pfMsg-${sd}" role="status"></span></div>
    <div><label for="pfC-${sd}">Comments</label><textarea id="pfC-${sd}" placeholder="${sd==='pickup'?'e.g. Fuel full, 23,450 km. Small scratch on the rear bumper, shown in photo 3.':'e.g. Returned on time, fuel full, no new damage. Deposit returned.'}">${esc(h.comment||'')}</textarea></div>
    <div class="acts" style="justify-content:flex-start"><button type="button" class="btn sm" data-pfsave="${sd}">Save comments</button>${h.updatedAt?`<span class="small">Last updated ${esc(tAt(h.updatedAt))}</span>`:''}</div></section>`}).join('')}</div>`:''}
  <div><label for="detNote">Comment or suggestion for the customer</label><textarea id="detNote" placeholder="Shown on their booking, e.g. where to pick up, or a suggestion for other dates">${esc(b.adminNote||'')}</textarea></div>
  <button class="btn" data-msg="${esc(owner)}|${esc(cidOf(b))}|${esc(b.name)}|${esc(b.phone)}" data-draft="About booking ${esc(b.ref)}: ">Send ${esc(b.name.split(' ')[0])} a message</button>`;
  const A={pending:[['edit','Change booking',''],['rejected','Reject','danger'],['approved','Approve','okb']],approved:[['edit','Change booking',''],['cancelled','Cancel booking','danger'],['active','Mark picked up','go']],active:[['edit','Change booking',''],['completed','Mark returned','go']],completed:[],rejected:[['pending','Reopen','']],cancelled:[['pending','Reopen','']]}[b.status]||[];
  $('#detActs').innerHTML=`<button class="btn ghost danger" data-act="delete">Delete</button><button class="btn ghost" data-act="copy">Copy details</button><span style="flex:1"></span><button class="btn" data-act="note">Save comment</button>${A.map(([s,l,k])=>`<button class="btn ${k}" data-act="${s}">${l}</button>`).join('')}`;
  licGet(owner,cidOf(b)).then(img=>{const el=$('#detLic');if(!el)return;el.innerHTML=img?`<button type="button" class="licthumb has sm" data-zoomsrc="1" aria-label="See the license photo larger"><img src="${esc(img)}" alt="Driver's license of ${esc(b.name)}"></button>`:`<span class="small">No photo uploaded${b.license?`. License no. ${esc(b.license)}`:''}</span>`}).catch(()=>{const el=$('#detLic');if(el)el.innerHTML='<span class="err">The photo could not be loaded.</span>'});
  fillPfImgs($('#detBody'));
  const saveHand=async(sd,fn)=>{let nb=null;const items=(S.bdocs.find(x=>x.id===owner)?.items||[]).map(x=>{if(x.id!==id)return x;const h=x.handover||{};nb={...x,handover:{...h,[sd]:{...fn(h[sd]||{}),updatedAt:Date.now()}}};return nb});
    if(!nb)throw{message:'This booking was not found.'};await saveOwner(owner,items);const d=S.bdocs.find(x=>x.id===owner);if(d)d.items=items;return nb};
  const redraw=(sd,nb)=>{const g=$('#pfg-'+sd);if(!g)return;g.innerHTML=pfThumbs(owner,nb,sd,true)||'<p class="small" style="margin:0">Nothing added yet.</p>';fillPfImgs(g)};
  $('#detBody').onchange=async e=>{const inp=e.target.closest('[data-pfadd]');if(!inp)return;const[sd,kind]=inp.dataset.pfadd.split('|');const files=[...inp.files];inp.value='';if(!files.length)return;
    const m=$('#pfMsg-'+sd);const added=[];
    for(const [k,f] of files.entries()){m.textContent=`Uploading ${k+1} of ${files.length}…`;
      try{const data=f.type==='application/pdf'?await pdfToDataUrl(f):await proofImg(f);const fid=await pfSave(owner,data);added.push({id:fid,kind,type:data.slice(5,data.indexOf(';')),name:String(f.name||'').slice(0,80),at:Date.now()})}
      catch(x){toast((f.name?f.name+': ':'')+(x?.message||'Not uploaded. Try again.'))}}
    if(added.length){try{redraw(sd,await saveHand(sd,h=>({...h,files:[...(h.files||[]),...added]})));m.textContent=`${added.length} added. ${b.name.split(' ')[0]} can see ${added.length>1?'them':'it'} now.`}catch(x){m.textContent='';toast('Not saved. Try again.')}}
    else m.textContent=''};
  $('#detBody').onclick=async e=>{const t=e.target;
    const dl=t.closest('[data-pfdel]');if(dl){const[sd,fid]=dl.dataset.pfdel.split('|');if(!await ask('Remove this file from the booking? The customer will no longer see it.','Remove'))return;
      try{redraw(sd,await saveHand(sd,h=>({...h,files:(h.files||[]).filter(f=>f.id!==fid)})));pfDel(owner,fid);toast('Removed')}catch(x){toast('Not removed. Try again.')}return}
    const sv=t.closest('[data-pfsave]');if(sv){const sd=sv.dataset.pfsave;sv.disabled=true;try{await saveHand(sd,h=>({...h,comment:$('#pfC-'+sd).value.trim().slice(0,2000)}));toast('Comments saved. '+b.name.split(' ')[0]+' can see them now.')}catch(x){toast('Not saved. Try again.')}finally{sv.disabled=false}return}
    if(t.closest('[data-act]'))$('#detActs').onclick(e)};
  if($('#detDrv'))$('#detDrv').value=b.driverId||'';
  $('#detActs').onclick=async e=>{
    const a=e.target.closest('[data-act]')?.dataset.act;if(!a)return;const note=$('#detNote').value.trim();
    try{
      if(a==='copy'){const t=`${b.ref} ${b.carName}\n${b.name} ${b.phone} ${b.email||''}\n${b.address}\nLicense ${b.license}\n${fmt(b.start)} to ${fmt(b.end)} (${b.days} days)\nTotal ${peso(b.total)}`;await navigator.clipboard.writeText(t).then(()=>toast('Details copied'),()=>toast('Copying is blocked here'));return}
      if(a==='delete'){if(!await ask(`Delete booking ${b.ref} for ${b.name}? This can't be undone.`,'Delete'))return;await saveOwner(owner,(S.bdocs.find(x=>x.id===owner)?.items||[]).filter(x=>x.id!==id));$('#dDet').close();toast('Booking deleted');return}
      if(a==='note'){await setStatus(owner,id,b.status,note);toast('Comment saved');return}
      if(a==='edit'){$('#dDet').close();openEdit(owner,id);return}
      if(a==='drv'){const dr=S.drivers.find(x=>x.id===$('#detDrv').value);if(!dr){toast('Choose a driver first');return}
        if(driverBusy(dr.id,b.start,b.end,b.id).length&&!await ask(`${dr.name} already drives another booking at that time. Assign anyway?`,'Assign anyway'))return;
        const items=(S.bdocs.find(x=>x.id===owner)?.items||[]).map(x=>x.id===id?{...x,driverId:dr.id,driverName:dr.name,driverPhone:dr.phone,changes:[...(x.changes||[]),{at:Date.now(),what:`driver: ${dr.name}, ${dr.phone}`}],updatedAt:Date.now()}:x);
        await saveOwner(owner,items);const now=Date.now();
        await writeThread('replies',owner,cidOf(b),x=>({...x,name:b.name,phone:b.phone,msgs:[...(x.msgs||[]),{id:uid(),text:`Your driver for booking ${b.ref} is ${dr.name} (${dr.phone}).`,at:now}].slice(-300),seen:now})).catch(()=>{});
        toast(`${dr.name} assigned to ${b.ref}`);openDetail(owner,id);return}
      if(a==='approved'&&clash.length&&!await ask('This car already has an approved booking on overlapping dates. Approve anyway?','Approve'))return;
      if(a==='cancelled'){if(!await ask(`Cancel booking ${b.ref} for ${b.name}? The ${b.carName} becomes free again for those dates, and ${b.name.split(' ')[0]} sees it as cancelled. You can reopen it later.`,'Cancel booking'))return;await setStatus(owner,id,a,note,{cancelledBy:'admin'});$('#dDet').close();toast('Booking cancelled');return}
      await setStatus(owner,id,a,note);$('#dDet').close();toast('Marked '+STS[a].toLowerCase());
    }catch(x){toast('Not saved. Try again.')}
  };
  $('#dDet').showModal();
}

/* ---------- drivers ---------- */
function driverBusy(did,start,end,ignore){return allBookings().filter(b=>b.driverId===did&&b.id!==ignore&&LIVE.includes(b.status)&&b.start<end&&start<b.end)}
function driverOpts(start,end,ignore,cur){
  return '<option value="">Choose a driver</option>'+[...S.drivers].sort((a,b)=>String(a.name).localeCompare(String(b.name))).filter(d=>d.status!=='off'||d.id===cur).map(d=>{const busy=driverBusy(d.id,start,end,ignore).length;return `<option value="${esc(d.id)}">${esc(d.name)}${busy?' (busy then)':''}${d.status==='off'?' (off duty)':''}</option>`}).join('');
}
const initials=n=>String(n||'?').trim().split(/\s+/).map(w=>w[0]).slice(0,2).join('').toUpperCase();
function renderDrivers(){
  const now=toLocal(new Date());
  $('#drvList').innerHTML=S.drivers.length?[...S.drivers].sort((a,b)=>String(a.name).localeCompare(String(b.name))).map(d=>{
    const trips=allBookings().filter(b=>b.driverId===d.id&&LIVE.includes(b.status)&&b.end>=now).sort((a,b)=>a.start.localeCompare(b.start));
    return `<div class="fleetrow drow"><div class="avatar">${d.imageId?`<img src="${esc(imgUrl(d.imageId))}" alt="">`:esc(initials(d.name))}</div><div class="info"><div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><h3>${esc(d.name)}</h3><span class="pill ${d.status==='off'?'s-cancelled':'s-available'}">${d.status==='off'?'Off duty':'Available'}</span></div><div class="small">${esc(d.phone)} · License ${esc(d.license||'—')}${d.notes?' · '+esc(d.notes):''}</div><div class="small">${trips.length?'Next: '+trips.slice(0,3).map(b=>`${esc(fmtD(b.start))} to ${esc(fmtD(b.end))}, ${esc(b.carName)} for ${esc(b.name)}`).join('; '):'No upcoming trips'}</div></div><div class="acts"><button class="btn sm go" data-dedit="${esc(d.id)}">Edit</button><button class="btn sm danger" data-ddel="${esc(d.id)}">Delete</button></div></div>`}).join(''):'<div class="empty"><b>No drivers yet</b><span>Add drivers so you can assign them to customers who book with a driver.</span></div>';
  const need=allBookings().filter(b=>needsDriver(b)&&!b.driverId&&LIVE.includes(b.status));
  $('#drvNeed').classList.toggle('hide',!need.length);
  $('#drvNeed').innerHTML=need.length?`<b>${plural(need.length,'booking')} still need a driver:</b> `+need.map(b=>`<button class="btn sm" data-open="${esc(b.owner)}|${esc(b.id)}">${esc(b.ref)} · ${esc(b.name)} · ${esc(fmtD(b.start))}</button>`).join(' '):'';
}
function openDriver(id){
  const d=id?S.drivers.find(x=>x.id===id):null;S.dEditing=d;S.dImg=null;$('#dImgIn').value='';$('#dErr').textContent='';
  $('#drvT').textContent=d?'Edit '+d.name:'Add a driver';
  [['#dName','name'],['#dPhone','phone'],['#dLic','license'],['#dNotes','notes']].forEach(([s,k])=>$(s).value=d?.[k]||'');$('#dStatus').value=d?.status||'available';
  $('#dImgIn').disabled=!S.assets;$('#dDrv').showModal();
}
$('#drvForm').addEventListener('submit',async e=>{
  e.preventDefault();const v=s=>$(s).value.trim();const er=m=>{$('#dErr').textContent=m};
  if(!v('#dName'))return er("Enter the driver's name.");
  if(v('#dPhone').replace(/\D/g,'').length<7)return er('Enter a valid mobile number.');
  if(!v('#dLic'))return er("Enter the driver's license number.");
  const btn=$('#dSave');btn.disabled=true;btn.textContent='Saving…';
  try{
    const old=S.dEditing;let imageId=old?.imageId||'';
    if(S.dImg){const up=await S.assets.upload(S.dImg);imageId=up.id;if(old?.imageId)S.assets.delete(old.imageId).catch(()=>{})}
    const id=old?.id||'drv-'+uid();const data={name:v('#dName').replace(/\s+/g,' '),phone:v('#dPhone'),license:v('#dLic'),notes:v('#dNotes'),status:$('#dStatus').value,imageId,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
    await serial('d'+id,()=>S.db.doc('drivers/'+id).set(data));
    if(old&&(old.name!==data.name||old.phone!==data.phone)){for(const doc of S.bdocs){if((doc.items||[]).some(b=>b.driverId===id&&LIVE.includes(b.status))){await saveOwner(doc.id,doc.items.map(b=>b.driverId===id&&LIVE.includes(b.status)?{...b,driverName:data.name,driverPhone:data.phone}:b))}}}
    $('#dDrv').close();toast(old?'Driver saved':'Driver added');
  }catch(x){er('Not saved. Try again.')}
  finally{btn.disabled=false;btn.textContent='Save driver'}
});
$('#dImgIn').addEventListener('change',async()=>{const f=$('#dImgIn').files[0];if(!f)return;const b=await cropImage(f,1,600);if(!b){$('#dImgIn').value='';return}S.dImg=b});
$('#addDrv').addEventListener('click',()=>openDriver(null));

/* ---------- settings (admin) ---------- */
function policyHtml(cb){const st=SET();const own=st.cancelText;
  const head=own?`<b>Cancellation policy:</b> ${esc(own).replace(/\n/g,'<br>')}`:`<b>Cancellation policy:</b> you can cancel ${cb?'':'a booking '}up to ${esc(cdTxt())} before ${cb?'pickup':'the pickup time'}.${cb?'':' After that, message the office.'}`;
  if(!cb)return head;
  const late=+cb<=Date.now();
  return head+(own?'<br>':' ')+(late?`Pickup is less than ${esc(cdTxt())} away, so this booking can't be cancelled online once sent. Message the office if your plans change.`:`${own?'You can cancel this booking online':'For this booking, that\'s'} until <b>${esc(fmt(toLocal(cb)))}</b>.`)}
function termsHtml(t){const out=[];let list=null;
  const flush=()=>{if(list){out.push('<ul>'+list.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>');list=null}};
  for(const raw of String(t||'').split(/\r?\n/)){const l=raw.trim();
    if(/^[-*•]\s+/.test(l)){(list=list||[]).push(l.replace(/^[-*•]\s+/,''));continue}
    flush();if(!l)continue;
    if(l.startsWith('#'))out.push(`<h2>${esc(l.replace(/^#+\s*/,''))}</h2>`);else out.push(`<p>${esc(l)}</p>`)}
  flush();return out.join('')}
function termsDate(){const t=SET().termsAt;return t?new Date(t).toLocaleDateString('en-PH',{year:'numeric',month:'long',day:'numeric'}):''}
function renderTerms(){const st=SET();const d=termsDate();
  $('#termsSub').textContent=(d?`Last updated ${d}. `:'')+'Please read these before you book. When you send a booking, you agree to them.';
  $('#termsBody').innerHTML=st.terms.trim()?termsHtml(st.terms):'<p>There are no terms and conditions yet.</p>';
  $('#termsEdit').classList.toggle('hide',!S.admin);$('#termsBook').classList.toggle('hide',!!S.admin)}
function renderSettings(){
  if(S.setDirty)return;const st=SET();
  S.setEx=st.extras.map(x=>({...x}));drawExRows();
  $('#setDel').value=st.delivery;$('#setCancel').value=st.cancelDays;$('#setCancelText').value=st.cancelText;$('#setMsg').textContent='';$('#setTerms').value=st.terms;$('#setTermsSample').classList.toggle('hide',typeof S.settings?.terms==='string');
  $('#setName').value=st.siteName;{const c=st.contact||{};$('#setPhone').value=c.phone||'';$('#setEmail').value=c.email||'';$('#setAddr').value=c.addr||'';$('#setHours').value=c.hours||'';SOCIALS.forEach(([k,id])=>$('#'+id).value=c[k]||'');$('#setOtherL').value=c.otherLabel||''}S.setLogo=null;S.setLogoDrop=false;S.setLogoId=st.logoId;drawLogoPrev();
}
function drawLogoPrev(){const src=S.setLogo?S.setLogoUrl:(!S.setLogoDrop&&S.setLogoId?imgUrl(S.setLogoId):'');$('#setLogoPrev').innerHTML=src?`<img src="${esc(src)}" alt="Logo preview">`:'<svg width="48" height="31" viewBox="0 0 34 22" style="color:#fff"><use href="#i-car"/></svg>';$('#setLogoDel').classList.toggle('hide',!src)}
function drawExRows(){
  $('#exRows').innerHTML=S.setEx.length?S.setEx.map((x,i)=>`<div class="exrow"><input aria-label="Extra name" data-exl="${i}" value="${esc(x.label)}" placeholder="e.g. Car phone holder"><div class="rateedit"><span class="small">₱</span><input aria-label="Price per day" type="number" min="0" step="50" data-exp="${i}" value="${esc(x.perDay)}"><span class="small nw">a day</span></div><label class="check" style="margin:0"><input type="checkbox" data-exd="${i}" ${x.driver?'checked':''}>Includes a driver</label><button type="button" class="btn sm danger" data-exx="${i}">Remove</button></div>`).join(''):'<p class="small">No extras. Customers won\'t see any extras when booking.</p>';
}
$('#v-settings').addEventListener('input',e=>{S.setDirty=true;$('#setMsg').textContent='';const t=e.target;
  if(t.dataset.exl!==undefined)S.setEx[+t.dataset.exl].label=t.value;
  if(t.dataset.exp!==undefined)S.setEx[+t.dataset.exp].perDay=+t.value;
  if(t.dataset.exd!==undefined)S.setEx[+t.dataset.exd].driver=t.checked;});
$('#v-settings').addEventListener('change',e=>{const t=e.target;if(t.dataset.exd!==undefined){S.setDirty=true;S.setEx[+t.dataset.exd].driver=t.checked}});
$('#v-settings').addEventListener('click',e=>{
  const x=e.target.closest('[data-exx]');if(x){S.setDirty=true;S.setEx.splice(+x.dataset.exx,1);drawExRows();return}
  if(e.target.closest('#exAdd')){S.setDirty=true;S.setEx.push({id:'x-'+uid(),label:'',perDay:0,driver:false});drawExRows();document.querySelector(`[data-exl="${S.setEx.length-1}"]`)?.focus();return}
  if(e.target.closest('#setUndo')){S.setDirty=false;renderSettings();return}
});
$('#setSave').addEventListener('click',async()=>{
  const ex=S.setEx.map(x=>({id:x.id||'x-'+uid(),label:String(x.label||'').trim(),perDay:Math.max(0,+x.perDay||0),driver:!!x.driver}));
  const msg=$('#setMsg');
  if(ex.some(x=>!x.label)){msg.textContent='Give every extra a name, or remove it.';return}
  const del=+$('#setDel').value,cd=+$('#setCancel').value;
  if(!(del>=0)){msg.textContent='Enter a delivery fee of 0 or more.';return}
  if(!(cd>=0&&cd<=60&&Number.isInteger(cd))){msg.textContent='Enter cancellation days as a whole number from 0 to 60.';return}
  const siteName=$('#setName').value.trim().replace(/\s+/g,' ');
  if(!siteName){msg.textContent='Enter a website name.';$('#setName').focus();return}
  if(S.setLogo&&!S.assets){msg.textContent='Only the admin can upload a logo.';return}
  const contact={phone:$('#setPhone').value.trim(),email:$('#setEmail').value.trim(),addr:$('#setAddr').value.trim(),hours:$('#setHours').value.trim(),otherLabel:$('#setOtherL').value.trim()};SOCIALS.forEach(([k,id])=>contact[k]=$('#'+id).value.trim());
  if(contact.email&&!/^\S+@\S+\.\S+$/.test(contact.email)){msg.textContent='Check the email address in Contact details.';$('#setEmail').focus();return}
  for(const [k,id,l] of SOCIALS){if(contact[k]&&!/^https:\/\/\S+\.\S+/i.test(contact[k])){msg.textContent=`The ${l} link must start with https://`;$('#'+id).focus();return}}
  if(contact.other&&!contact.otherLabel){msg.textContent='Give the other link a name, such as "Viber community".';$('#setOtherL').focus();return}
  const b=$('#setSave');b.disabled=true;const oldLogo=SET().logoId;
  try{
    let logoId=S.setLogoDrop?'':oldLogo;
    if(S.setLogo){try{logoId=(await S.assets.upload(S.setLogo)).id}catch(x){msg.textContent='The logo was not uploaded: '+(x?.message||'try a smaller picture.');return}}
    const terms=$('#setTerms').value.replace(/\s+$/,'');const termsAt=terms!==SET().terms||!(S.settings?.termsAt)?Date.now():S.settings.termsAt;
    const data={...(S.settings||{}),extras:ex,delivery:del,cancelDays:cd,siteName,logoId,contact,terms,termsAt,cancelText:$('#setCancelText').value.trim().slice(0,1500),updatedAt:Date.now()};
    await serial('set',()=>S.db.doc('settings/main').set(data));
    if(oldLogo&&oldLogo!==logoId&&S.assets)S.assets.delete(oldLogo).catch(()=>{});
    S.settings=data;S.setDirty=false;renderSettings();route();toast('Settings saved. Everyone sees the changes now.')}
  catch(x){msg.textContent='Not saved. '+(x?.message||'Try again.')}finally{b.disabled=false}
});

/* ---------- pictures: license photos, logo, zoom ---------- */
function setThumb(sel,img){const t=$(sel);if(!t)return;t.classList.toggle('has',!!img);t.innerHTML=img?`<img src="${esc(img)}" alt="Driver's license">`:'No photo yet';t.dataset.src=img||''}
function openCarGallery(c,i){const ph=carPhotos(c);if(!ph.length)return;S.zg={ph,c,i,title:'',desc:''};zgShow()}
function zgShow(){const{ph,c,i}=S.zg;const p=ph[i];const L=p.label!==undefined?p.label:p.kind&&!/^other/.test(p.kind)?SLOT_LABEL[p.kind]:'';
  openZoom(p.src||imgUrl(p.id),S.zg.title||carTitle(c),S.zg.desc||'');S.zg.on=true;$('#zLabel').textContent=`${L?L+' · ':''}${i+1} of ${ph.length}`;$('#zLabel').classList.remove('hide');
  $('#zHint').textContent=ph.length>1?'Swipe or use the arrows to see more. Tap to zoom.':'Tap the picture to zoom in or out.';
  $('#zPrev').classList.toggle('hide',ph.length<2);$('#zNext').classList.toggle('hide',ph.length<2);$('#zPrev').disabled=i<=0;$('#zNext').disabled=i>=ph.length-1}
$('#zPrev').addEventListener('click',()=>{if(S.zg&&S.zg.i>0){S.zg.i--;zgShow()}});
$('#zNext').addEventListener('click',()=>{if(S.zg&&S.zg.i<S.zg.ph.length-1){S.zg.i++;zgShow()}});
$('#dZoom').addEventListener('keydown',e=>{if(!S.zg?.on)return;if(e.key==='ArrowLeft')$('#zPrev').click();if(e.key==='ArrowRight')$('#zNext').click()});
/* swipe left/right in the larger viewer, like Instagram */
{let sx=null,sy=0;const zb=$('#zBody');
 zb.addEventListener('dragstart',e=>e.preventDefault());
 zb.addEventListener('pointerdown',e=>{if(S.zg?.on&&!zb.classList.contains('big')){sx=e.clientX;sy=e.clientY}});
 zb.addEventListener('pointercancel',()=>{sx=null});
 zb.addEventListener('pointerup',e=>{if(sx===null)return;const dx=e.clientX-sx,dy=e.clientY-sy;sx=null;if(Math.abs(dx)>45&&Math.abs(dx)>Math.abs(dy)){S.zg.swiped=true;(dx<0?$('#zNext'):$('#zPrev')).click()}});}
/* drag the car photos sideways with a mouse, too */
document.addEventListener('pointerdown',e=>{const t=e.target.closest?.('[data-cgt]');if(!t||e.pointerType!=='mouse')return;const x0=e.clientX,s0=t.scrollLeft;let moved=false;t.style.scrollSnapType='none';
  const mv=ev=>{const d=ev.clientX-x0;if(Math.abs(d)>4)moved=true;t.scrollLeft=s0-d};
  const upf=ev=>{removeEventListener('pointermove',mv);removeEventListener('pointerup',upf);const w=t.clientWidth,d=ev.clientX-x0;const i=Math.round(s0/w)+(Math.abs(d)>w*0.15?(d<0?1:-1):0);t.style.scrollSnapType='';t.scrollTo({left:Math.max(0,Math.min(t.children.length-1,i))*w,behavior:'smooth'});if(moved){t.dataset.dragged='1';setTimeout(()=>delete t.dataset.dragged,50)}};
  addEventListener('pointermove',mv);addEventListener('pointerup',upf)});
$('#dZoom').addEventListener('close',()=>{if(S.zg)S.zg.on=false;$('#zHint').textContent='Tap the picture to zoom in or out.';['#zPrev','#zNext','#zLabel'].forEach(x=>$(x).classList.add('hide'))});
function openZoom(src,title,desc,date){$('#zDesc').textContent=desc||'';$('#zDate').textContent=date||'';$('#zT').textContent=title||"Driver's license";$('#zImg').src=src;$('#zImg').alt=title||"Driver's license";$('#zBody').classList.remove('big');$('#dZoom').showModal()}
$('#zImg').addEventListener('click',()=>{if(S.zg?.swiped){S.zg.swiped=false;return}$('#zBody').classList.toggle('big')});
async function photoToDataUrl(file){
  if(!file)throw{message:'Choose a photo.'};
  if(!/^image\//.test(file.type||''))throw{message:"That file isn't a picture. Choose a JPG or PNG photo."};
  if(file.size>25*1024*1024)throw{message:'That photo is too large. Choose one under 25 MB.'};
  let bmp;try{bmp=await createImageBitmap(file)}catch(e){throw{message:"That picture can't be opened. Take the photo again or choose a JPG or PNG."}}
  for(const [mx,q] of [[1400,.82],[1200,.75],[1000,.7],[800,.65],[640,.6]]){
    const s=Math.min(1,mx/Math.max(bmp.width,bmp.height));const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*s);cv.height=Math.round(bmp.height*s);
    const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(bmp,0,0,cv.width,cv.height);
    const url=cv.toDataURL('image/jpeg',q);if(url.length<240000)return url;
  }
  throw{message:'That photo is too detailed to send. Take it again a little further away.'};
}
async function logoBlob(file){
  if(!/^image\//.test(file?.type||''))throw{message:"That file isn't a picture. Choose a PNG or JPG logo."};
  if(file.size>10*1024*1024)throw{message:'That logo is too large. Choose one under 10 MB.'};
  let bmp;try{bmp=await createImageBitmap(file)}catch(e){throw{message:"That picture can't be opened. Try a PNG or JPG."}}
  const s=Math.min(1,320/bmp.height,800/bmp.width);const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*s);cv.height=Math.round(bmp.height*s);cv.getContext('2d').drawImage(bmp,0,0,cv.width,cv.height);
  return await new Promise((res,rej)=>cv.toBlob(b=>b?res(b):rej({message:'The logo could not be prepared.'}),'image/png'));
}
/* license photos are private: only the admin and that customer can open them */
async function licSave(owner,cid,img){
  if(S.server){await S.db.api('api/license-set',{method:'POST',body:JSON.stringify({owner,img})});}
  else if(S.local){try{localStorage.setItem('cr-lic-'+cid,img)}catch(e){throw{message:'Browser storage is full. Delete some photos.'}}}
  else await S.db.doc(`licenses/${owner}/files/${cid}`).set({img,updatedAt:Date.now()});
  S.licCache[owner+'|'+cid]=img;
}
async function licGet(owner,cid){
  const k=owner+'|'+cid;if(S.licCache[k])return S.licCache[k];let img='';
  if(S.server)img=(await S.db.api('api/license-get',{method:'POST',body:JSON.stringify({owner})})).img||'';
  else if(S.local){try{img=localStorage.getItem('cr-lic-'+cid)||''}catch(e){}}
  else{const d=await S.db.doc(`licenses/${owner}/files/${cid}`).get();img=d.exists?(d.data().img||''):''}
  if(img)S.licCache[k]=img;return img;
}
/* pickup and return records: photos and signed documents, private like license photos */
const HSIDE={pickup:['Car released / picked up','Photos of the car when it was handed over, and the signed rental agreement.','Pickup record'],ret:['Car returned','Photos of the car when it came back, and any signed return form.','Return record']};
const hexId=()=>[...crypto.getRandomValues(new Uint8Array(8))].map(x=>x.toString(16).padStart(2,'0')).join('');
async function proofImg(file){
  if(!/^image\//.test(file?.type||''))throw{message:"That file isn't a picture or a PDF."};
  if(file.size>25*1024*1024)throw{message:'That photo is too large. Choose one under 25 MB.'};
  let bmp;try{bmp=await createImageBitmap(file)}catch(e){throw{message:"That picture can't be opened. Try a JPG or PNG."}}
  for(const [mx,q] of [[1600,.8],[1400,.75],[1200,.7],[1000,.65],[800,.6]]){
    const sc=Math.min(1,mx/Math.max(bmp.width,bmp.height));const cv=document.createElement('canvas');cv.width=Math.round(bmp.width*sc);cv.height=Math.round(bmp.height*sc);
    const g=cv.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,cv.width,cv.height);g.drawImage(bmp,0,0,cv.width,cv.height);
    const url=cv.toDataURL('image/jpeg',q);if(url.length<450000)return url}
  throw{message:'That photo is too detailed to save. Take it again a little further away.'}
}
function pdfToDataUrl(file){
  if(file.size>650*1024)return Promise.reject({message:'That PDF is too large. Use one under 650 KB, or upload photos of the pages instead.'});
  return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).replace(/^data:[^;]*;/,'data:application/pdf;'));r.onerror=()=>rej({message:"That PDF can't be read."});r.readAsDataURL(file)})
}
async function pfSave(owner,data){
  let id;
  if(S.server)id=(await S.db.api('api/file-set',{method:'POST',body:JSON.stringify({owner,data})})).id;
  else{id='pf-'+hexId();
    if(S.local){try{localStorage.setItem('cr-pf-'+id,data)}catch(e){throw{message:'Browser storage is full. Remove some photos.'}}}
    else await S.db.doc(`licenses/${owner}/files/${id}`).set({img:data,updatedAt:Date.now()})}
  S.pfCache[id]=data;return id
}
async function pfGet(owner,id){
  if(S.pfCache[id])return S.pfCache[id];let d='';
  if(S.server)d=(await S.db.api('api/file-get',{method:'POST',body:JSON.stringify({id})})).data||'';
  else if(S.local){try{d=localStorage.getItem('cr-pf-'+id)||''}catch(e){}}
  else{const x=await S.db.doc(`licenses/${owner}/files/${id}`).get();d=x.exists?(x.data().img||''):''}
  if(d)S.pfCache[id]=d;return d
}
async function pfDel(owner,id){
  delete S.pfCache[id];
  if(S.server)await S.db.api('api/file-del',{method:'POST',body:JSON.stringify({id})}).catch(()=>{});
  else if(S.local){try{localStorage.removeItem('cr-pf-'+id)}catch(e){}}
  else await S.db.doc(`licenses/${owner}/files/${id}`).delete().catch(()=>{})
}
const hasHand=(b,sd)=>{const h=b.handover?.[sd];return!!(h&&((h.files||[]).length||h.comment))};
function pfThumbs(owner,b,sd,admin){
  return(b.handover?.[sd]?.files||[]).map((f,i)=>{const pdf=f.type==='application/pdf';const src=S.pfCache[f.id];const what=f.kind==='doc'?'Signed document':'Photo';
    return`<figure class="pf"><button type="button" class="pfopen" data-pfview="${esc(owner)}|${esc(b.id)}|${sd}|${i}" aria-label="Open ${what.toLowerCase()} ${i+1}">${pdf?`<span class="pfpdf">${ic2('doc')}<span>PDF</span></span>`:`<img data-pfid="${esc(f.id)}" data-pfo="${esc(owner)}" ${src?`src="${esc(src)}"`:''} alt="${what}">`}</button><figcaption>${what}</figcaption>${admin?`<button type="button" class="pfx" data-pfdel="${sd}|${esc(f.id)}" aria-label="Remove this ${what.toLowerCase()}">×</button>`:''}</figure>`}).join('')
}
function fillPfImgs(root){root.querySelectorAll('img[data-pfid]:not([src])').forEach(im=>pfGet(im.dataset.pfo,im.dataset.pfid).then(d=>{if(d)im.src=d;else im.alt='Missing'}).catch(()=>{im.alt='Could not load'}))}
async function openPf(owner,bid,sd,i){
  const b=allBookings().find(x=>x.id===bid&&x.owner===owner)||allBookings().find(x=>x.id===bid);if(!b)return;
  const files=b.handover?.[sd]?.files||[];const f=files[i];if(!f)return;
  try{
    if(f.type==='application/pdf'){const d=await pfGet(owner,f.id);if(!d){toast('The document could not be loaded.');return}
      const blob=await (await fetch(d)).blob();const url=URL.createObjectURL(blob);
      const w=window.open(url,'_blank');if(!w){const a=document.createElement('a');a.href=url;a.download=(f.name||'signed-document')+(/\.pdf$/i.test(f.name||'')?'':'.pdf');document.body.appendChild(a);a.click();a.remove()}
      setTimeout(()=>URL.revokeObjectURL(url),60000);return}
    const imgs=files.filter(x=>x.type!=='application/pdf');const srcs=await Promise.all(imgs.map(x=>pfGet(owner,x.id).catch(()=>'')));
    S.zg={ph:imgs.map((x,k)=>({src:srcs[k],label:x.kind==='doc'?'Signed document':'Photo'})),title:`${HSIDE[sd][2]}, booking ${b.ref}`,desc:b.handover[sd].comment||'',i:imgs.indexOf(f)};zgShow()
  }catch(x){toast('That file could not be opened. Try again.')}
}
const SOCIALS=[['fb','setFb','Facebook'],['ig','setIg','Instagram'],['tt','setTt','TikTok'],['yt','setYt','YouTube'],['x','setX','X (Twitter)'],['web','setWeb','Website'],['other','setOther','Other link']];
const TRUST_IC={ig:'<rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="17" cy="7" r="1.2" fill="currentColor"/>',tt:'<path d="M14 4v10.5a3.5 3.5 0 1 1-3.5-3.5M14 4c.5 2.5 2.5 4.5 5 4.7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',yt:'<rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10 9.5v5l4.5-2.5z" fill="currentColor"/>',x:'<path d="M4 4l16 16M20 4L4 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',web:'<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M3 12h18M12 3c3 3.5 3 14.5 0 18M12 3c-3 3.5-3 14.5 0 18" fill="none" stroke="currentColor" stroke-width="2"/>',other:'<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',bell:'<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15zM10 20a2 2 0 0 0 4 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',chat:'<path d="M4 5h16v11H9l-5 4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',car:'<path d="M3 15l2-5q1-2 3-2h8q2 0 3 2l2 5v3H3zM7 18v2M17 18v2M6.5 14h.01M17.5 14h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',x2:'<path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',cal:'<path d="M4 6h16v14H4zM4 10h16M8 3v5M16 3v5M9 15l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',ok:'<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z M8.5 12l2.5 2.5 4.5-5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',truck:'<path d="M3 6h11v10H3zM14 10h4l3 3v3h-7M7 19a2 2 0 1 0 0-.1M17 19a2 2 0 1 0 0-.1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',user:'<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c1-4 4-6 8-6s7 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',phone:'<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',mail:'<path d="M3 6h18v12H3zM3 7l9 6 9-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>',pin:'<path d="M12 21s7-6 7-12a7 7 0 0 0-14 0c0 6 7 12 7 12zM12 11a2 2 0 1 0 0-.1" fill="none" stroke="currentColor" stroke-width="2"/>',clock:'<path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 7v5l3 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',doc:'<path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>',fb:'<path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v7h4v-7h3l1-4h-4V8.5a.5.5 0 0 1 .5-.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/>'};
const ic2=k=>`<svg viewBox="0 0 24 24" aria-hidden="true">${TRUST_IC[k]}</svg>`;
function renderTrust(){const st=SET();const items=[['cal',st.cancelDays>0?`Cancel online up to ${cdTxt()} before pickup`:'Book online in a few minutes'],['ok','Every booking confirmed by our office'],['truck',`Delivery to your address`,` <span class="nw">(+${esc(peso(st.delivery))})</span>`]];
  if(st.extras.some(x=>x.driver))items.push(['user','Rent with a driver']);
  $('#trust').innerHTML=items.map(([k,t,h])=>`<li>${ic2(k)}<span>${esc(t)}${h||''}</span></li>`).join('')}
/* ---------- notifications: new bookings, messages, booking updates ---------- */
const ago=t=>{const m=Math.round((Date.now()-t)/60000);if(m<1)return'just now';if(m<60)return m+' min ago';const h=Math.round(m/60);if(h<24)return h+(h===1?' hour ago':' hours ago');const d=Math.round(h/24);return d<8?d+(d===1?' day ago':' days ago'):new Date(t).toLocaleDateString('en-PH',{month:'short',day:'numeric'})};
function readMap(){if(S.admin)return S.notifRead||{};if(S.session?.role==='customer'){const d=S.chats.find(x=>x.id===S.uid);return d?.notifRead?.[S.session.cid]||{}}return{}}
function notifList(){const out=[];const cut=Date.now()-45*864e5;
  if(S.admin){
    allBookings().forEach(b=>{if((b.createdAt||0)>cut)out.push({id:'b:'+b.id,ic:'car',t:b.createdAt,html:`<b>New booking${b.status==='pending'?' request':''}:</b> ${esc(b.name)} booked the ${esc(b.carName)}, ${esc(fmtD(b.start))} to ${esc(fmtD(b.end))}`,go:()=>openDetail(b.owner,b.id)});
      if(b.status==='cancelled'&&b.cancelledBy==='customer'&&(b.updatedAt||0)>cut)out.push({id:'c:'+b.id,ic:'x2',t:b.updatedAt,html:`<b>Booking cancelled:</b> ${esc(b.name)} cancelled ${esc(b.ref)} (${esc(b.carName)})`,go:()=>openDetail(b.owner,b.id)})});
    allThreads().forEach(th=>{const last=[...(th.c.msgs||[])].pop();if(!last||last.at<cut)return;out.push({id:`m:${th.owner}|${th.key}|${last.at}`,ic:'chat',t:last.at,auto:!th.unreadA,html:`<b>New message from ${esc(th.name||'a customer')}:</b> ${esc(last.text.length>90?last.text.slice(0,90)+'…':last.text)}`,go:()=>{S.thread={owner:th.owner,key:th.key,name:th.name,phone:th.phone};S.msgScrolled=false;location.hash='#messages';route();markSeen()}})});
  }else if(S.session?.role==='customer'){
    const th=getThread(S.uid,myKey());const last=[...(th.a.msgs||[])].pop();
    if(last&&last.at>cut)out.push({id:'r:'+last.at,ic:'chat',t:last.at,auto:!th.unreadC,html:`<b>Message from the office:</b> ${esc(last.text.length>90?last.text.slice(0,90)+'…':last.text)}`,go:()=>{S.msgScrolled=false;location.hash='#messages';route()}});
    const W={approved:'is approved',rejected:'was not approved',active:'is picked up. Enjoy your trip!',completed:'is returned. Thank you for renting with us!',cancelled:'is cancelled'};
    myItems().forEach(b=>{const t=b.updatedAt||0;if(t<cut)return;const ch=(b.changes||[]).at(-1);
      if(b.status!=='pending'&&!(b.status==='cancelled'&&b.cancelledBy==='customer'))out.push({id:`u:${b.id}:${b.status}`,ic:'car',t:ch&&ch.at>t-2000&&b.status==='approved'?t-1:t,html:`<b>Booking ${esc(b.ref)}</b> ${esc(W[b.status]||'was updated')}${b.status==='approved'&&b.driverName?` · Driver: ${esc(b.driverName)}`:''}`,go:()=>{location.hash='#my-bookings';route()}});
      if(ch&&ch.at>cut)out.push({id:`h:${b.id}:${(b.changes||[]).length}`,ic:'car',t:ch.at,html:`<b>Booking ${esc(b.ref)} was changed:</b> ${esc(ch.what.length>100?ch.what.slice(0,100)+'…':ch.what)}`,go:()=>{location.hash='#my-bookings';route()}})});
  }
  if(S.session?.role==='customer')myItems().forEach(b=>['pickup','ret'].forEach(sd=>{const h=b.handover?.[sd];if(!hasHand(b,sd)||!(h.updatedAt>cut))return;
    out.push({id:`p:${b.id}:${sd}:${(h.files||[]).length}:${(h.comment||'').length}`,ic:'doc',t:h.updatedAt,html:`<b>Booking ${esc(b.ref)}:</b> the office added ${sd==='pickup'?'pickup':'return'} photos and documents${h.comment?' with comments':''}`,go:()=>{location.hash='#my-bookings';route()}})}));
  const rm=readMap();out.forEach(n=>n.read=!!rm[n.id]||!!n.auto);return out.sort((a,b)=>b.t-a.t).slice(0,40)}
async function markRead(ids){if(!ids.length)return;
  if(S.admin){const cur={...(S.notifRead||{})};ids.forEach(i=>cur[i]=Date.now());const keep=Object.entries(cur).sort((a,b)=>b[1]-a[1]).slice(0,400);S.notifRead=Object.fromEntries(keep);renderBell();
    await serial('notif',()=>S.db.doc('admin/notifs').set({read:S.notifRead,updatedAt:Date.now()})).catch(()=>{})}
  else if(S.session?.role==='customer'){const d=S.chats.find(x=>x.id===S.uid);const all={...(d?.notifRead||{})};const mine={...(all[S.session.cid]||{})};ids.forEach(i=>mine[i]=Date.now());all[S.session.cid]=Object.fromEntries(Object.entries(mine).sort((a,b)=>b[1]-a[1]).slice(0,200));
    await serial('chats'+S.uid,()=>S.db.doc('chats/'+S.uid).set({...(d?Object.fromEntries(Object.entries(d).filter(([k])=>k!=='id')):{threads:{}}),notifRead:all,updatedAt:Date.now()})).catch(()=>{});renderBell()}}
function renderBell(){const on=!!S.session;$('#notifWrap').classList.toggle('hide',!on);if(!on){$('#nPanel').hidden=true;return}
  const L=notifList();S.nList=L;const un=L.filter(n=>!n.read).length;
  $('#bellCount').textContent=un>99?'99+':un;$('#bellCount').classList.toggle('hide',!un);$('#bellBtn').setAttribute('aria-label',un?`Notifications, ${un} unread`:'Notifications');
  $('#nAll').disabled=!un;
  $('#nList').innerHTML=L.length?L.map((n,i)=>`<button type="button" class="nitem${n.read?'':' unread'}" data-ni="${i}"><span class="ni">${ic2(n.ic)}</span><span class="nt">${n.html}<span class="nw2">${esc(ago(n.t))}${n.read?' · <span class="rd">Read</span>':''}</span></span><span class="dot" aria-label="${n.read?'Read':'Unread'}"></span></button>`).join(''):`<div class="nempty">No notifications yet.<br>${S.admin?'New bookings and messages will show up here.':'Messages and updates about your bookings will show up here.'}</div>`}
$('#bellBtn').addEventListener('click',e=>{e.stopPropagation();const p=$('#nPanel');p.hidden=!p.hidden;$('#bellBtn').setAttribute('aria-expanded',String(!p.hidden));if(!p.hidden){closeMenu();renderBell()}});
$('#nList').addEventListener('click',e=>{const b=e.target.closest('[data-ni]');if(!b)return;const n=S.nList[+b.dataset.ni];if(!n)return;$('#nPanel').hidden=true;$('#bellBtn').setAttribute('aria-expanded','false');if(!n.read)markRead([n.id]);n.go()});
$('#nAll').addEventListener('click',e=>{e.stopPropagation();markRead((S.nList||[]).filter(n=>!n.read).map(n=>n.id))});
document.addEventListener('click',e=>{if(!$('#nPanel').hidden&&!e.target.closest('#notifWrap')){$('#nPanel').hidden=true;$('#bellBtn').setAttribute('aria-expanded','false')}});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#nPanel').hidden){$('#nPanel').hidden=true;$('#bellBtn').focus()}});
function renderFooter(){const st=SET();const c=st.contact||{};$('#footTermsLi').classList.toggle('hide',!st.terms.trim());
  $('#footName').textContent=st.siteName;$('#footLogo').innerHTML=st.logoId?`<img src="${esc(imgUrl(st.logoId))}" alt="">`:'<svg width="34" height="22" style="color:#fff"><use href="#i-car"/></svg>';
  const li=[];if(c.phone)li.push(`<li>${ic2('phone')}<span>${esc(c.phone)}</span></li>`);if(c.email)li.push(`<li>${ic2('mail')}<span>${esc(c.email)}</span></li>`);if(c.addr)li.push(`<li>${ic2('pin')}<span>${esc(c.addr)}</span></li>`);if(c.hours)li.push(`<li>${ic2('clock')}<span>${esc(c.hours)}</span></li>`);li.push(`<li class="small" style="color:#c9d6ee">${ic2('chat')}<span>Message us after you book, under <a href="${S.session&&!S.admin?'#messages':'#login'}">Messages</a>.</span></li>`);
  const soc=SOCIALS.filter(([k])=>/^https:\/\//i.test(c[k]||'')).map(([k,,l])=>`<a class="soc" href="${esc(c[k])}" target="_blank" rel="noopener">${ic2(k==='fb'?'fb':k)}<span>${esc(k==='other'?(c.otherLabel||'Other link'):k==='fb'?'Facebook':l)}</span></a>`);
  if(soc.length)li.push(`<li class="socs">${soc.join('')}</li>`);else if(S.admin)li.push('<li class="small">Add your social media links in Settings.</li>');
  $('#footContact').innerHTML=li.join('');
  $('#footCopy').textContent=`© ${new Date().getFullYear()} ${st.siteName}`;$('#heroKicker').textContent=st.siteName;
  $('#footLogin').textContent=S.session?'My account':'Log in';$('#footLogin').href=S.session?(S.admin?'#bookings':'#my-bookings'):'#login'}
function applyBrand(){
  const st=SET();$('#brandName').textContent=st.siteName;renderFooter();renderTrust();
  const src=st.logoId?imgUrl(st.logoId):'';
  if(S.brandSrc!==src){S.brandSrc=src;$('#brandLogo').innerHTML=src?`<img src="${esc(src)}" alt="">`:'<svg width="34" height="22" style="color:#fff"><use href="#i-car"/></svg>';
    let ic=document.querySelector('link[rel=icon]');if(src){if(!ic){ic=document.createElement('link');ic.rel='icon';document.head.appendChild(ic)}ic.href=src}else if(ic)ic.remove()}
  if(document.title!==st.siteName)document.title=st.siteName;
}
$('#bLicFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('#bErr').textContent='';
  try{S.licImg=await photoToDataUrl(f);setThumb('#bLicThumb',S.licImg)}catch(x){$('#bErr').textContent=x.message||'The photo could not be used.'}});
$('#pLicFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('#pErr').textContent='';
  try{S.pLicNew=await photoToDataUrl(f);setThumb('#pLicThumb',S.pLicNew);$('#pMsgOk').textContent='';$('#pWarn').textContent=($('#pWarn').textContent?$('#pWarn').textContent+' ':'')+'Click Save changes to keep the new license photo.'}catch(x){$('#pErr').textContent=x.message||'The photo could not be used.'}});
$('#setLogoFile').addEventListener('change',async e=>{const f=e.target.files[0];e.target.value='';if(!f)return;$('#setMsg').textContent='';
  try{S.setLogo=await logoBlob(f);if(S.setLogoUrl)URL.revokeObjectURL(S.setLogoUrl);S.setLogoUrl=URL.createObjectURL(S.setLogo);S.setLogoDrop=false;S.setDirty=true;drawLogoPrev()}catch(x){$('#setMsg').textContent=x.message||'The logo could not be used.'}});
$('#setLogoDel').addEventListener('click',()=>{S.setLogo=null;S.setLogoDrop=true;S.setDirty=true;drawLogoPrev()});
document.addEventListener('click',e=>{
  const t=e.target.closest('.licthumb.has');if(t){const img=t.querySelector('img');if(img)openZoom(img.src,img.alt||"Driver's license");return}
});

/* ---------- reports (admin) ---------- */
const ymd=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
function repRange(q){const t=new Date();t.setHours(0,0,0,0);let a=new Date(t),b=new Date(t);
  if(q==='week'){const dow=(t.getDay()+6)%7;a.setDate(t.getDate()-dow);b=new Date(a);b.setDate(a.getDate()+6)}
  else if(q==='month'){a=new Date(t.getFullYear(),t.getMonth(),1);b=new Date(t.getFullYear(),t.getMonth()+1,0)}
  else if(q==='lastmonth'){a=new Date(t.getFullYear(),t.getMonth()-1,1);b=new Date(t.getFullYear(),t.getMonth(),0)}
  else if(q==='year'){a=new Date(t.getFullYear(),0,1);b=new Date(t.getFullYear(),11,31)}
  else if(q==='all')return['',''];
  return[ymd(a),ymd(b)]}
function repSetQuick(q){const[a,b]=repRange(q);$('#repFrom').value=a;$('#repTo').value=b;S.repQuick=q;renderReports()}
function repFilters(){return{from:$('#repFrom').value,to:$('#repTo').value,by:$('#repBy').value,q:$('#repQ').value.trim().toLowerCase(),car:$('#repCar').value,drv:$('#repDrv').value,pick:$('#repPick').value}}
const EARNED=['approved','active','completed'];
function repSplit(){const rows=repRows();return{earned:rows.filter(b=>EARNED.includes(b.status)),pending:rows.filter(b=>b.status==='pending'),lost:rows.filter(b=>['cancelled','rejected'].includes(b.status))}}
function repByCar(rows){const m=new Map();rows.forEach(b=>{const k=b.carId||b.carName;const c=m.get(k)||{car:b.carName,plate:b.plate||carById(b.carId)?.plate||'',n:0,days:0,total:0};c.n++;c.days+=+b.days||0;c.total+=+b.total||0;m.set(k,c)});return[...m.values()].sort((a,b)=>b.total-a.total)}
function repRows(){const f=repFilters();
  return allBookings().filter(b=>{
    const d=f.by==='created'?(b.createdAt?ymd(new Date(b.createdAt)):''):String(b.start||'').slice(0,10);
    if(f.from&&d<f.from)return false;if(f.to&&d>f.to)return false;
    if(f.q&&![b.name,b.phone,b.email,b.ref].join(' ').toLowerCase().includes(f.q))return false;
    if(f.car&&b.carId!==f.car)return false;
    if(f.drv==='with'&&!needsDriver(b))return false;if(f.drv==='without'&&needsDriver(b))return false;if(f.drv&&!['with','without'].includes(f.drv)&&b.driverId!==f.drv)return false;
    if(f.pick&&(b.pickup||'office')!==f.pick)return false;return true})
  .sort((x,y)=>String(f.by==='created'?y.createdAt:y.start).localeCompare(String(f.by==='created'?x.createdAt:x.start),undefined,{numeric:true}))}
function renderReports(){
  if(!$('#repCar').dataset.v||$('#repCar').dataset.v!==String(S.cars.length)){const cur=$('#repCar').value;$('#repCar').innerHTML='<option value="">All cars</option>'+[...S.cars].sort((a,b)=>carTitle(a).localeCompare(carTitle(b))).map(c=>`<option value="${esc(c.id)}">${esc(carTitle(c))}${c.plate?' · '+esc(c.plate):''}</option>`).join('');$('#repCar').value=cur;$('#repCar').dataset.v=String(S.cars.length)}
  {const cur=$('#repDrv').value;$('#repDrv').innerHTML='<option value="">Any</option><option value="with">Booked with a driver</option><option value="without">Without a driver</option>'+S.drivers.map(d=>`<option value="${esc(d.id)}">Driver: ${esc(d.name)}</option>`).join('');$('#repDrv').value=cur}
  if(S.repQuick===undefined){repSetQuick('month');return}
  document.querySelectorAll('#repQuick [data-rq]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.rq===S.repQuick)));
  const R=repSplit();const sumE=R.earned.reduce((a,b)=>a+(+b.total||0),0),sumP=R.pending.reduce((a,b)=>a+(+b.total||0),0),sumL=R.lost.reduce((a,b)=>a+(+b.total||0),0);
  const daysR=R.earned.reduce((a,b)=>a+(+b.days||0),0);
  $('#repSum').innerHTML=[[peso(sumE),'total earned',1],[R.earned.length,'rentals'],[daysR,'days rented'],[R.earned.length?peso(sumE/R.earned.length):'₱0','average per rental'],[peso(sumP),`${plural(R.pending.length,'pending request')}`],[peso(sumL),`${R.lost.length} cancelled or rejected`]].map(([v,l,h])=>`<div class="stat${h?' hot':''}"><b>${esc(v)}</b><span>${esc(l)}</span></div>`).join('');
  const f=repFilters();const all=R.earned.length+R.pending.length+R.lost.length;
  $('#repLine').textContent=`${plural(all,'transaction')}${f.from||f.to?`, ${f.by==='created'?'booked':'picking up'} ${f.from?fmtLong(f.from):'any time'} to ${f.to?fmtLong(f.to):'now'}`:', all time'}${f.q?`, customer matching "${$('#repQ').value.trim()}"`:''}.`;
  $('#repJump').innerHTML=[['rs-earned','Rentals and earnings',R.earned.length],['rs-pending','Pending',R.pending.length],['rs-lost','Cancelled and rejected',R.lost.length]].map(([id,l,n])=>`<a class="chip" href="#${id}" data-jump="${id}" style="text-decoration:none">${l} ${n}</a>`).join('');
  const row=(b,extra)=>`<tr class="click" data-bk="${esc(b.owner)}|${esc(b.id)}" tabindex="0"><td><b>${esc(b.ref)}</b></td><td>${esc(b.createdAt?fmtD(ymd(new Date(b.createdAt))):'—')}</td><td>${esc(b.name)}<div class="small">${esc(b.phone)}</div></td><td>${esc(b.carName)}</td><td>${esc(fmt(b.start))}</td><td>${esc(fmt(b.end))}</td><td class="num">${esc(b.days)}</td><td class="num">${esc(peso(b.total))}</td>${extra(b)}</tr>`;
  const table=(id,title,note,rows,extraHead,extra,footLabel)=>`<section class="rsec" id="${id}"><h2>${title} <span>${plural(rows.length,'booking')} · ${esc(peso(rows.reduce((a,b)=>a+(+b.total||0),0)))}</span></h2><p class="small" style="margin:0 0 8px">${note}</p>${rows.length?`<div class="scroll"><table class="stack rtab"><thead><tr><th>Ref</th><th>Booked</th><th>Customer</th><th>Car</th><th>Pickup</th><th>Return</th><th class="num">Days</th><th class="num">Total</th>${extraHead}</tr></thead><tbody>${rows.map(b=>row(b,extra)).join('')}</tbody><tfoot><tr><td colspan="6">${footLabel}</td><td class="num">${rows.reduce((a,b)=>a+(+b.days||0),0)}</td><td class="num">${esc(peso(rows.reduce((a,b)=>a+(+b.total||0),0)))}</td>${extraHead.split('<th').length>1?'<td colspan="'+(extraHead.split('<th').length-1)+'"></td>':''}</tr></tfoot></table></div>`:'<div class="empty">None for these filters.</div>'}</section>`;
  const byCar=repByCar(R.earned);
  const carTable=byCar.length?`<div class="scroll" style="margin-bottom:14px"><table class="stack rtab"><caption>Earnings by car</caption><thead><tr><th>Car</th><th>Plate</th><th class="num">Times rented</th><th class="num">Days</th><th class="num">Earned</th></tr></thead><tbody>${byCar.map(c=>`<tr><td>${esc(c.car)}</td><td>${esc(c.plate)}</td><td class="num">${c.n}</td><td class="num">${c.days}</td><td class="num">${esc(peso(c.total))}</td></tr>`).join('')}</tbody><tfoot><tr><td colspan="2">TOTAL</td><td class="num">${R.earned.length}</td><td class="num">${daysR}</td><td class="num">${esc(peso(sumE))}</td></tr></tfoot></table></div>`:'';
  $('#repSections').innerHTML=
    table('rs-earned','Rentals and earnings','Approved, picked up and returned bookings. This is the money earned.',R.earned,'<th>Status</th><th>Driver</th>',b=>`<td><span class="pill s-${esc(b.status)}">${esc(STS[b.status])}</span></td><td>${needsDriver(b)?esc(b.driverName||'Not assigned'):'—'}</td>`,'TOTAL EARNED').replace('</p>','</p>'+carTable)+
    table('rs-pending','Pending','Requests waiting for your answer. Total is what they would earn if approved.',R.pending,'<th>Waiting since</th>',b=>`<td>${esc(b.createdAt?new Date(b.createdAt).toLocaleString('en-PH',{month:'short',day:'numeric',hour:'numeric',minute:'2-digit'}):'—')}</td>`,'TOTAL PENDING')+
    table('rs-lost','Cancelled and rejected','Bookings that did not go ahead. Total is the value lost.',R.lost,'<th>Status</th><th>Comment from office</th>',b=>`<td><span class="pill s-${esc(b.status)}">${esc(STS[b.status])}</span></td><td class="wrapc">${esc(b.adminNote||'—')}</td>`,'TOTAL LOST');
  $('#repXlsx').textContent=`Download Excel (${all})`;$('#repXlsx').disabled=!all;
}
$('#repFilters').addEventListener('input',e=>{if(['repFrom','repTo'].includes(e.target.id))S.repQuick='custom';renderReports()});
$('#repFilters').addEventListener('change',()=>renderReports());
$('#repJump').addEventListener('click',e=>{const a=e.target.closest('[data-jump]');if(a){e.preventDefault();document.getElementById(a.dataset.jump)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})}});
$('#repQuick').addEventListener('click',e=>{const q=e.target.closest('[data-rq]')?.dataset.rq;if(q)repSetQuick(q)});
$('#repClear').addEventListener('click',()=>{['#repQ','#repCar','#repDrv','#repPick'].forEach(s=>$(s).value='');$('#repBy').value='start';repSetQuick('all')});

/* --- a small built-in Excel (.xlsx) writer: no internet needed --- */
const CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[n]=c>>>0}return t})();
const crc32=u=>{let c=0xFFFFFFFF;for(let i=0;i<u.length;i++)c=CRC[(c^u[i])&255]^(c>>>8);return(c^0xFFFFFFFF)>>>0};
function zip(files){const enc=new TextEncoder();const parts=[],cen=[];let off=0;
  for(const[name,text]of files){const nb=enc.encode(name),data=enc.encode(text),crc=crc32(data);
    const h=new DataView(new ArrayBuffer(30));h.setUint32(0,0x04034b50,true);h.setUint16(4,20,true);h.setUint16(6,0x0800,true);h.setUint16(8,0,true);h.setUint16(10,0,true);h.setUint16(12,0x21,true);h.setUint32(14,crc,true);h.setUint32(18,data.length,true);h.setUint32(22,data.length,true);h.setUint16(26,nb.length,true);h.setUint16(28,0,true);
    parts.push(new Uint8Array(h.buffer),nb,data);
    const c=new DataView(new ArrayBuffer(46));c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x0800,true);c.setUint16(10,0,true);c.setUint16(12,0,true);c.setUint16(14,0x21,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,nb.length,true);c.setUint32(42,off,true);
    cen.push(new Uint8Array(c.buffer),nb);off+=30+nb.length+data.length}
  const cs=cen.reduce((a,b)=>a+b.length,0);const e=new DataView(new ArrayBuffer(22));e.setUint32(0,0x06054b50,true);e.setUint16(8,files.length,true);e.setUint16(10,files.length,true);e.setUint32(12,cs,true);e.setUint32(16,off,true);
  return new Blob([...parts,...cen,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})}
const xe=v=>String(v??'').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const colL=i=>{let s='';i++;while(i){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26)}return s};
function sheetXml(rows,widths,money){
  const body=rows.map((r,ri)=>`<row r="${ri+1}">${r.map((v,ci)=>{const ref=colL(ci)+(ri+1);if(v&&typeof v==='object'&&ri>0){if('money' in v)return`<c r="${ref}" s="${v.bold?3:2}"><v>${+v.money||0}</v></c>`;if('num' in v)return`<c r="${ref}" s="${v.bold?4:0}"><v>${+v.num||0}</v></c>`;return`<c r="${ref}" t="inlineStr" s="${v.bold?1:0}"><is><t xml:space="preserve">${xe(v.text)}</t></is></c>`}if(typeof v==='number'&&ri>0)return`<c r="${ref}"${money.includes(ci)?' s="2"':''}><v>${v}</v></c>`;return`<c r="${ref}" t="inlineStr"${ri===0?' s="1"':''}><is><t xml:space="preserve">${xe(v)}</t></is></c>`}).join('')}</row>`).join('');
  return`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>${widths.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${body}</sheetData></worksheet>`}
function makeXlsx(sheets){
  const ws=sheets.map(s=>s.name);
  const files=[['[Content_Types].xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${ws.map((_,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`],
    ['_rels/.rels','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${ws.map((n,i)=>`<sheet name="${xe(n)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`],
    ['xl/_rels/workbook.xml.rels',`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${ws.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${ws.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`],
    ['xl/styles.xml','<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;₱&quot;#,##0"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="5"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>'],
    ...sheets.map((s,i)=>[`xl/worksheets/sheet${i+1}.xml`,sheetXml(s.rows,s.widths,s.money||[])])];
  return zip(files)}
async function saveFile(blob,filename){
  if(window.claude?.use){const dl=await window.claude.use('downloads');if(!dl)throw{message:'Downloads are not available here. Open the page in a browser.'};await dl.save({filename,data:blob});return}
  const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},4000)}
$('#repXlsx').addEventListener('click',async()=>{
  const R=repSplit();const all=R.earned.length+R.pending.length+R.lost.length;if(!all)return;$('#repErr').textContent='';
  const t=(x)=>x?fmt(x):'';
  const head=['Reference','Date booked','Customer','Mobile','Email','Address','Car','Plate','Pickup','Return','Days','Price per day','Extras','Extras per day','How they get the car','Delivery fee','Total','Deposit','Status','Driver','Driver mobile','Customer notes','Comment from office','Changes'];
  const rowOf=b=>[b.ref,b.createdAt?new Date(b.createdAt).toLocaleString('en-PH'):'',b.name,b.phone,b.email||'',b.address||'',b.carName,b.plate||carById(b.carId)?.plate||'',t(b.start),t(b.end),+b.days||0,+b.rate||0,(b.extras||[]).join(', '),+b.extrasPerDay||0,b.pickup==='delivery'?'Delivered':'Office pickup',+b.delivery||0,+b.total||0,+b.deposit||0,STS[b.status]||b.status,needsDriver(b)?(b.driverName||'Not assigned'):'',b.driverPhone||'',b.notes||'',b.adminNote||'',(b.changes||[]).map(c=>c.what).join(' | ')];
  const totalRow=(label,rows)=>{const r=head.map(()=>'');r[0]={text:label,bold:true};r[10]={num:rows.reduce((a,b)=>a+(+b.days||0),0),bold:true};r[15]={money:rows.reduce((a,b)=>a+(+b.delivery||0),0),bold:true};r[16]={money:rows.reduce((a,b)=>a+(+b.total||0),0),bold:true};return r};
  const W=[12,20,22,15,24,30,22,11,22,22,7,13,28,13,16,12,12,12,13,18,15,30,30,40],M=[11,13,15,16,17];
  const sheet=(name,rows,label)=>({name,rows:[head,...rows.map(rowOf),...(rows.length?[totalRow(label,rows)]:[[{text:'None for these filters'}]])],widths:W,money:M});
  const f=repFilters();const sumE=R.earned.reduce((a,b)=>a+(+b.total||0),0);const sel=id=>$(id).selectedOptions[0]?.textContent||'';
  const summary=[['Item','Value'],['Report from',SET().siteName],['Downloaded',new Date().toLocaleString('en-PH')],['Dates',f.from||f.to?`${f.from||'any'} to ${f.to||'any'} (${sel('#repBy')})`:'All time'],['Customer search',$('#repQ').value.trim()||'Everyone'],['Car',sel('#repCar')],['Driver',sel('#repDrv')],['How they get the car',sel('#repPick')],['',''],
    [{text:'TOTAL EARNED',bold:true},{money:sumE,bold:true}],['Rentals (approved, picked up, returned)',R.earned.length],['Days rented',R.earned.reduce((a,b)=>a+(+b.days||0),0)],['Average per rental',{money:R.earned.length?Math.round(sumE/R.earned.length):0}],
    ['Pending requests',R.pending.length],['Pending value',{money:R.pending.reduce((a,b)=>a+(+b.total||0),0)}],['Cancelled or rejected',R.lost.length],['Value lost',{money:R.lost.reduce((a,b)=>a+(+b.total||0),0)}]];
  const byCar=repByCar(R.earned);
  const carRows=[['Car','Plate','Times rented','Days','Earned'],...byCar.map(c=>[c.car,c.plate,c.n,c.days,{money:c.total}]),...(byCar.length?[[{text:'TOTAL',bold:true},'',{num:R.earned.length,bold:true},{num:R.earned.reduce((a,b)=>a+(+b.days||0),0),bold:true},{money:sumE,bold:true}]]:[])];
  const blob=makeXlsx([{name:'Summary',rows:summary,widths:[38,44]},sheet('Rentals and earnings',R.earned,'TOTAL EARNED'),{name:'Earnings by car',rows:carRows,widths:[26,12,14,8,14]},sheet('Pending',R.pending,'TOTAL PENDING'),sheet('Cancelled and rejected',R.lost,'TOTAL LOST')]);
  const name=`${SET().siteName} report ${f.from||'all'}${f.to?' to '+f.to:''}`.replace(/[\\/:*?"<>|]+/g,'-').slice(0,120)+'.xlsx';
  try{await saveFile(blob,name);toast('Excel file ready: '+name)}catch(x){if(x?.code!=='declined')$('#repErr').textContent=x?.message||'The file could not be saved.'}
});

/* ---------- car photo carousel ---------- */
function cgUpdate(t){const n=t.children.length,i=Math.round(t.scrollLeft/(t.clientWidth||1));const g=t.parentElement;const lb=g.querySelector('[data-labels]');if(lb){const L=JSON.parse(lb.dataset.labels)[i]||'';lb.textContent=L;lb.hidden=!L}g.querySelectorAll('.cg-dots i').forEach((d,k)=>d.classList.toggle('on',k===i));const c=g.querySelector('.cg-count');if(c)c.textContent=`${i+1}/${n}`;g.querySelector('.prev').disabled=i<=0;g.querySelector('.next').disabled=i>=n-1}
document.addEventListener('scroll',e=>{const t=e.target;if(t?.matches?.('[data-cgt]')){clearTimeout(t._cgT);t._cgT=setTimeout(()=>cgUpdate(t),60)}},true);
document.addEventListener('click',e=>{const b=e.target.closest('[data-cgp]');if(b){e.stopPropagation();const t=b.parentElement.querySelector('[data-cgt]');t.scrollBy({left:(+b.dataset.cgp)*t.clientWidth,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});return}
  const z=e.target.closest('[data-cgz]');if(z&&z.closest('[data-cgt]')?.dataset.dragged)return;if(z){const c=carById(z.dataset.car);if(c)openCarGallery(c,+z.dataset.i||0)}});

/* ---------- photo editor: zoom in/out and drag to position ---------- */
function cropImage(file,aspect,outW,step){return new Promise(async resolve=>{
  if(!file||!/^image\//.test(file.type||'')){toast("That file isn't a picture. Choose a JPG or PNG photo.");return resolve(null)}
  let bmp;try{bmp=await createImageBitmap(file)}catch(e){toast("That picture can't be opened. Try a JPG or PNG.");return resolve(null)}
  const d=$('#dCrop'),box=$('#crBox'),cv=$('#crCv'),zoom=$('#crZoom');
  box.style.aspectRatio=String(aspect);$('#crStep').textContent=step||'';
  const iw=bmp.width,ih=bmp.height;let W=0,H=0,s=1,cx=0,cy=0,minS=1,maxS=1,cover=1;
  const toSlider=v=>Math.log(v/minS)/Math.log(maxS/minS)*100,fromSlider=t=>minS*Math.pow(maxS/minS,t/100);
  const clamp=()=>{const w=iw*s,h=ih*s;cx=w>=W?Math.min(w/2,Math.max(W-w/2,cx)):Math.max(w/2,Math.min(W-w/2,cx));cy=h>=H?Math.min(h/2,Math.max(H-h/2,cy)):Math.max(h/2,Math.min(H-h/2,cy))};
  const draw=()=>{const r=devicePixelRatio||1;cv.width=Math.round(W*r);cv.height=Math.round(H*r);const g=cv.getContext('2d');g.setTransform(r,0,0,r,0,0);g.fillStyle='#ffffff';g.fillRect(0,0,W,H);g.imageSmoothingQuality='high';g.drawImage(bmp,cx-iw*s/2,cy-ih*s/2,iw*s,ih*s);zoom.value=toSlider(s)};
  const setS=(ns,px=W/2,py=H/2)=>{ns=Math.max(minS,Math.min(maxS,ns));cx=px+(cx-px)*(ns/s);cy=py+(cy-py)*(ns/s);s=ns;clamp();draw()};
  const layout=()=>{const nW=box.clientWidth,nH=box.clientHeight;if(!nW||!nH)return;const k=W?nW/W:1;cx*=k;cy*=k;s*=W?k:1;W=nW;H=nH;cover=Math.max(W/iw,H/ih);minS=Math.min(W/iw,H/ih);maxS=cover*4;if(!s||s<minS)s=minS;clamp();draw()};
  d.showModal();await new Promise(r=>requestAnimationFrame(r));
  W=box.clientWidth;H=box.clientHeight;cover=Math.max(W/iw,H/ih);minS=Math.min(W/iw,H/ih);maxS=cover*4;s=cover;cx=W/2;cy=H/2;draw();
  const ro=new ResizeObserver(layout);ro.observe(box);
  const pts=new Map();let last=null,pinch=0;
  const down=e=>{box.setPointerCapture(e.pointerId);pts.set(e.pointerId,{x:e.clientX,y:e.clientY});box.classList.add('drag');if(pts.size===2){const[a,b]=[...pts.values()];pinch=Math.hypot(a.x-b.x,a.y-b.y)}last={x:e.clientX,y:e.clientY}};
  const move=e=>{if(!pts.has(e.pointerId))return;pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    if(pts.size===2){const[a,b]=[...pts.values()];const dist=Math.hypot(a.x-b.x,a.y-b.y);if(pinch){const rc=box.getBoundingClientRect();setS(s*dist/pinch,(a.x+b.x)/2-rc.left,(a.y+b.y)/2-rc.top)}pinch=dist;return}
    if(last){cx+=e.clientX-last.x;cy+=e.clientY-last.y;clamp();draw()}last={x:e.clientX,y:e.clientY}};
  const up=e=>{pts.delete(e.pointerId);if(pts.size<2)pinch=0;if(!pts.size){box.classList.remove('drag');last=null}else{const p=[...pts.values()][0];last={x:p.x,y:p.y}}};
  const wheel=e=>{e.preventDefault();const rc=box.getBoundingClientRect();setS(s*Math.pow(1.0015,-e.deltaY),e.clientX-rc.left,e.clientY-rc.top)};
  const key=e=>{const st=20;if(e.key==='ArrowLeft'){cx-=st}else if(e.key==='ArrowRight'){cx+=st}else if(e.key==='ArrowUp'){cy-=st}else if(e.key==='ArrowDown'){cy+=st}else if(e.key==='+'||e.key==='='){setS(s*1.15);return}else if(e.key==='-'){setS(s/1.15);return}else return;e.preventDefault();clamp();draw()};
  box.tabIndex=0;box.addEventListener('pointerdown',down);box.addEventListener('pointermove',move);box.addEventListener('pointerup',up);box.addEventListener('pointercancel',up);box.addEventListener('wheel',wheel,{passive:false});box.addEventListener('keydown',key);
  const onZoom=()=>setS(fromSlider(+zoom.value));zoom.addEventListener('input',onZoom);
  $('#crIn').onclick=()=>setS(s*1.2);$('#crOut').onclick=()=>setS(s/1.2);
  $('#crFill').onclick=()=>{s=cover;cx=W/2;cy=H/2;clamp();draw()};$('#crFit').onclick=()=>{s=minS;cx=W/2;cy=H/2;clamp();draw()};
  const finish=async ok=>{ro.disconnect();box.removeEventListener('pointerdown',down);box.removeEventListener('pointermove',move);box.removeEventListener('pointerup',up);box.removeEventListener('pointercancel',up);box.removeEventListener('wheel',wheel);box.removeEventListener('keydown',key);zoom.removeEventListener('input',onZoom);
    d.onclose=null;d.oncancel=null;if(d.open)d.close();if(!ok)return resolve(null);
    const outH=Math.round(outW/aspect),k=outW/W,o=document.createElement('canvas');o.width=outW;o.height=outH;const g=o.getContext('2d');g.fillStyle='#ffffff';g.fillRect(0,0,outW,outH);g.imageSmoothingQuality='high';g.drawImage(bmp,(cx-iw*s/2)*k,(cy-ih*s/2)*k,iw*s*k,ih*s*k);
    o.toBlob(b=>resolve(b),'image/jpeg',.86)};
  $('#crOk').onclick=()=>finish(true);$('#crCancel').onclick=()=>finish(false);$('#crX').onclick=()=>finish(false);d.oncancel=e=>{e.preventDefault();finish(false)};
})}

/* ---------- change booking (admin) ---------- */
function openEdit(owner,id){
  const b=allBookings().find(x=>x.owner===owner&&x.id===id);if(!b)return;S.edit={owner,id,b};
  $('#edT').textContent='Change booking '+b.ref;
  $('#eWho').textContent=`${b.name}, ${b.phone}. Currently: ${b.carName}, ${fmt(b.start)} to ${fmt(b.end)}, ${peso(b.total)}.`;
  const opts=S.cars.filter(c=>c.status!=='hidden'||c.id===b.carId);
  $('#eCar').innerHTML=(carById(b.carId)?'':`<option value="${esc(b.carId)}">${esc(b.carName)} (removed)</option>`)+opts.map(c=>`<option value="${esc(c.id)}">${esc(carTitle(c))}, ${esc(peso(c.rate))}/day${c.status==='maintenance'?' (maintenance)':''}</option>`).join('');
  $('#eCar').value=b.carId;$('#eStart').value=b.start;$('#eEnd').value=b.end;$('#ePick').value=b.pickup||'office';
  $('#ePick').options[1].textContent=`Deliver to their address (+${peso(SET().delivery)})`;
  S.editEx=[...EX(),...(b.extrasDetail||[]).filter(o=>!EX().some(x=>x.label===o.label)).map((o,i)=>({...o,id:'old'+i}))];
  $('#eDrv').innerHTML=driverOpts(b.start,b.end,b.id,b.driverId);$('#eDrv').value=b.driverId||'';
  $('#eExtras').innerHTML=S.editEx.map(x=>`<label class="opt"><input type="checkbox" data-ex="${x.id}" ${(b.extras||[]).includes(x.label)?'checked':''}>${esc(x.label)}<span>+${esc(peso(x.perDay))} a day</span></label>`).join('');
  $('#eTell').checked=true;$('#eErr').textContent='';updEdit();$('#dEdit').showModal();
}
function editCalc(){
  const b=S.edit.b;const carId=$('#eCar').value;const c=carById(carId);const s=$('#eStart').value,e=$('#eEnd').value;const n=days(s,e);
  const rate=carId===b.carId?+b.rate:+(c?.rate||0);
  const ex=[...document.querySelectorAll('#eExtras [data-ex]:checked')].map(i=>S.editEx.find(x=>x.id===i.dataset.ex)).filter(Boolean);
  const exDay=ex.reduce((a,x)=>a+(+x.perDay||0),0);const del=$('#ePick').value==='delivery'?(($('#ePick').value===(b.pickup||'office')&&b.delivery)?+b.delivery:SET().delivery):0;
  return{b,c,carId,s,e,n,rate,ex,exDay,del,total:n*(rate+exDay)+del,clash:n?clashes(carId,s,e,b.id):[]};
}
function updEdit(){
  const k=editCalc();$('#eDrvBox').classList.toggle('hide',!k.ex.some(x=>x.driver));
  $('#eSum').innerHTML=k.n?`<div><span>${esc(peso(k.rate))} × ${plural(k.n,'day')}${k.carId===k.b.carId?' (price they booked at)':''}</span><span>${esc(peso(k.rate*k.n))}</span></div>${k.ex.map(x=>`<div><span>${esc(x.label)} × ${k.n}</span><span>${esc(peso(x.perDay*k.n))}</span></div>`).join('')}${k.del?`<div><span>Delivery</span><span>${esc(peso(k.del))}</span></div>`:''}<div class="tot"><span>New total</span><span>${esc(peso(k.total))}</span></div><div class="small"><span>Before</span><span>${esc(peso(k.b.total))}</span></div>`:'<div class="small">Choose pickup and return.</div>';
  $('#eClash').textContent=k.clash.length?`This car has another booking from ${fmt(k.clash[0].start)} to ${fmt(k.clash[0].end)}.`:'';
}
$('#editForm').addEventListener('input',updEdit);
$('#editForm').addEventListener('submit',async e=>{
  e.preventDefault();const k=editCalc();const er=m=>{$('#eErr').textContent=m};
  if(!k.s||!k.e)return er('Choose pickup and return.');
  if(k.e<=k.s)return er('Return must be after pickup.');
  if(k.clash.length&&!await ask(`The ${carTitle(k.c)||'car'} is already booked from ${fmt(k.clash[0].start)} to ${fmt(k.clash[0].end)}. Save anyway?`,'Save anyway'))return;
  const b=k.b;const parts=[];
  if(k.carId!==b.carId)parts.push(`car ${b.carName} → ${carTitle(k.c)}`);
  if(k.s!==b.start||k.e!==b.end)parts.push(`dates ${fmt(b.start)} to ${fmt(b.end)} → ${fmt(k.s)} to ${fmt(k.e)}`);
  if(($('#ePick').value)!==(b.pickup||'office'))parts.push($('#ePick').value==='delivery'?'now delivered to their address':'now picked up at the office');
  const exL=k.ex.map(x=>x.label);if(exL.join()!==(b.extras||[]).join())parts.push('extras: '+(exL.join(', ')||'none'));
  const wantsDrv=k.ex.some(x=>x.driver);const dr=wantsDrv?S.drivers.find(x=>x.id===$('#eDrv').value):null;
  if((dr?.id||'')!==(b.driverId||''))parts.push(dr?`driver: ${dr.name}, ${dr.phone}`:'no driver');
  if(dr&&driverBusy(dr.id,k.s,k.e,b.id).length&&!await ask(`${dr.name} already drives another booking at that time. Assign anyway?`,'Assign anyway'))return;
  if(k.total!==+b.total)parts.push(`total ${peso(b.total)} → ${peso(k.total)}`);
  if(!parts.length)return er('Nothing has changed.');
  const what=parts.join('; ');const c=k.c||carById(b.carId);
  const upd={carId:k.carId,carName:c?carTitle(c):b.carName,plate:c?.plate||b.plate||'',start:k.s,end:k.e,days:k.n,rate:k.rate,extras:exL,extrasDetail:k.ex.map(x=>({label:x.label,perDay:+x.perDay||0,driver:!!x.driver})),driverId:dr?.id||'',driverName:dr?.name||'',driverPhone:dr?.phone||'',extrasPerDay:k.exDay,pickup:$('#ePick').value,delivery:k.del,total:k.total,deposit:k.carId===b.carId?b.deposit:(+c?.deposit||0),changes:[...(b.changes||[]),{at:Date.now(),what}],updatedAt:Date.now()};
  const btn=$('#eSave');btn.disabled=true;btn.textContent='Saving…';
  try{
    const items=(S.bdocs.find(x=>x.id===S.edit.owner)?.items||[]).map(x=>x.id===b.id?{...x,...upd}:x);
    await saveOwner(S.edit.owner,items);
    if($('#eTell').checked){const now=Date.now();await writeThread('replies',S.edit.owner,cidOf(b),x=>({...x,name:b.name,phone:b.phone,msgs:[...(x.msgs||[]),{id:uid(),text:`Your booking ${b.ref} has been changed: ${what}.`,at:now}].slice(-300),seen:now}))}
    $('#dEdit').close();toast('Booking '+b.ref+' changed');openDetail(S.edit.owner,b.id);
  }catch(x){er('Not saved. Try again.')}
  finally{btn.disabled=false;btn.textContent='Save changes'}
});

/* ---------- car editor ---------- */
$('#cType').innerHTML=TYPES.map(t=>`<option>${t}</option>`).join('');
function carFromForm(){const v=id=>$(id).value.trim();return{brand:v('#cBrand'),name:v('#cName'),year:+v('#cYear')||'',type:$('#cType').value,seats:+v('#cSeats')||'',trans:$('#cTrans').value,fuel:$('#cFuel').value,color:$('#cColor').value,rate:+v('#cRate')||0,deposit:+v('#cDep')||0,plate:v('#cPlate').toUpperCase(),desc:v('#cDesc'),status:$('#cStatus').value}}
function carPrev(){const c=carFromForm();const first=SLOTS.map(([k])=>S.carSlots?.[k]).find(Boolean);$('#cPrev').innerHTML=first?`<img src="${esc(first.url)}" alt="Main photo">`:carSvg(c);drawSlots()}
function drawSlots(){const sl=S.carSlots||{};const n=SLOTS.filter(([k])=>sl[k]).length;$('#cPhotoCount').textContent=n?`(${n} of 6)`:'';
  const mainK=SLOTS.map(([k])=>k).find(k=>sl[k]);
  $('#cSlots').innerHTML=SLOTS.map(([k,l,h,ic])=>{const x=sl[k];return x?`<div class="slot has"><div class="pic"><img src="${esc(x.url)}" alt="${esc(l)}">${k===mainK?'<span class="mainb">Main</span>':''}</div><div class="meta"><b>${esc(l)}</b></div><div class="acts2"><button type="button" class="btn" data-slot="${k}" data-sa="add">Change</button><button type="button" class="btn danger" data-slot="${k}" data-sa="rm">Remove</button></div></div>`
    :`<div class="slot"><div class="pic"><svg viewBox="0 0 24 24" aria-hidden="true">${ic}</svg></div><div class="meta"><span><b>${esc(l)}</b>${h?`<br><span class="small">${esc(h)}</span>`:''}</span></div><div class="acts2"><button type="button" class="btn sm go" data-slot="${k}" data-sa="add" ${S.assets?'':'disabled'}>Add</button></div></div>`}).join('')}
function openCar(id){
  const c=id?carById(id):null;S.editing=c;$('#cImg').value='';$('#cErr').textContent='';
  S.carSlots={};carPhotos(c).forEach(p=>{let k=p.kind&&SLOT_LABEL[p.kind]&&!S.carSlots[p.kind]?p.kind:SLOTS.map(([x])=>x).find(x=>!S.carSlots[x]);if(k)S.carSlots[k]={id:p.id,url:imgUrl(p.id)}});
  const d=c||{type:'Sedan',seats:5,trans:'Automatic',fuel:'Gasoline',color:'#c0392b',status:'available',year:new Date().getFullYear()};
  [['#cBrand','brand'],['#cName','name'],['#cYear','year'],['#cSeats','seats'],['#cRate','rate'],['#cDep','deposit'],['#cPlate','plate'],['#cDesc','desc']].forEach(([s,k])=>$(s).value=d[k]??'');
  $('#cType').value=d.type;$('#cTrans').value=d.trans;$('#cFuel').value=d.fuel;$('#cColor').value=/^#[0-9a-f]{6}$/i.test(d.color||'')?d.color:'#8a8f99';$('#cStatus').value=d.status||'available';
  $('#carT').textContent=c?'Edit '+carTitle(c):'Add a car';$('#cDel').classList.toggle('hide',!c);
  carPrev();$('#dCar').showModal();
}
$('#carForm').addEventListener('input',e=>{if(e.target.id!=='cImg')carPrev()});
$('#cSlots').addEventListener('click',e=>{const b=e.target.closest('[data-slot]');if(!b)return;const k=b.dataset.slot;
  if(b.dataset.sa==='rm'){delete S.carSlots[k];carPrev();return}
  S.slotFor=k;$('#cImg').click()});
$('#cImg').addEventListener('change',async()=>{const f=$('#cImg').files[0];$('#cImg').value='';const k=S.slotFor;if(!f||!k)return;$('#cErr').textContent='';
  $('#crT').textContent='Adjust photo: '+SLOT_LABEL[k];const b=await cropImage(f,16/9,1280);$('#crT').textContent='Adjust photo';
  if(b){S.carSlots[k]={blob:b,url:URL.createObjectURL(b)}}carPrev()});
$('#carForm').addEventListener('submit',async e=>{
  e.preventDefault();const c=carFromForm();
  if(!c.brand||!c.name){$('#cErr').textContent='Enter the brand and model.';return}
  if(!(c.rate>0)){$('#cErr').textContent='Enter a price per day above zero.';return}
  const btn=$('#cSave');btn.disabled=true;btn.textContent='Saving…';
  try{
    const old=S.editing;const photos=[];const todo=SLOTS.filter(([k])=>S.carSlots[k]&&!S.carSlots[k].id).length;let up=0;
    for(const [k,l] of SLOTS){const x=S.carSlots[k];if(!x)continue;
      if(!x.id){up++;btn.textContent=`Uploading photo ${up} of ${todo}…`;try{x.id=(await S.assets.upload(x.blob)).id}catch(err){throw{message:`The ${l} photo was not uploaded: ${err?.message||'try a smaller photo'}`}}}
      photos.push({id:x.id,kind:k})}
    const images=photos.map(p=>p.id);const id=old?.id||'car-'+uid();
    await serial('c'+id,()=>S.db.doc('cars/'+id).set({...c,imageId:images[0]||'',images,photos,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()}));
    if(S.assets)carImgs(old).filter(x=>!images.includes(x)).forEach(x=>S.assets.delete(x).catch(()=>{}));
    $('#dCar').close();toast(old?'Car saved':'Car added');
  }catch(x){$('#cErr').textContent='The car was not saved. '+(x?.message||'Check your connection and try again.')}
  finally{btn.disabled=false;btn.textContent='Save car'}
});
$('#cDel').addEventListener('click',async()=>{
  const c=S.editing;if(!c)return;const live=allBookings().filter(b=>b.carId===c.id&&LIVE.includes(b.status)).length;
  if(!await ask(`Delete the ${carTitle(c)}?${live?` It has ${plural(live,'open booking')}. Those keep the car's name.`:''}`,'Delete car'))return;
  try{await S.db.doc('cars/'+c.id).delete();if(S.assets)carImgs(c).forEach(x=>S.assets.delete(x).catch(()=>{}));$('#dCar').close();toast('Car deleted')}catch(x){$('#cErr').textContent='The car was not deleted. Try again.'}
});

/* ---------- photos ---------- */
const dz=$('#dropZone');
dz.addEventListener('dragover',e=>{e.preventDefault();dz.classList.add('over')});
dz.addEventListener('dragleave',()=>dz.classList.remove('over'));
dz.addEventListener('drop',e=>{e.preventDefault();dz.classList.remove('over');try{$('#pFiles').files=e.dataTransfer.files}catch(x){}$('#pMsg').textContent=plural(e.dataTransfer.files.length,'photo')+' ready to upload.'});
$('#pUp').addEventListener('click',async()=>{
  const files=[...$('#pFiles').files];const msg=$('#pMsg');
  if(!S.assets){msg.textContent='Uploading needs Editor access to this page.';return}
  if(!files.length){msg.textContent='Choose at least one photo to post.';return}
  if($('#pDate').value&&$('#pDate').value>toLocal(new Date()).slice(0,10)){msg.textContent="The date rented can't be in the future.";return}
  const btn=$('#pUp');btn.disabled=true;let ok=0;
  let n=0;for(const f of files){n++;
    if(!/^image\//.test(f.type||'')){msg.textContent=`${f.name} isn't a picture. Choose JPG or PNG photos.`;continue}
    const cb=await cropImage(f,4/3,1200,files.length>1?`Photo ${n} of ${files.length}`:'');if(!cb){msg.textContent=`Photo ${n} skipped.`;continue}
    msg.textContent=`Posting ${n} of ${files.length}…`;
    try{const up=await S.assets.upload(cb);const id='p-'+uid();await S.db.doc('gallery/'+id).set({imageId:up.id,caption:$('#pCap').value.trim(),desc:$('#pDesc').value.trim(),date:$('#pDate').value||'',createdAt:Date.now()});ok++}catch(x){msg.textContent='A photo was not posted: '+(x?.message||'error')}}
  btn.disabled=false;if(ok){$('#pFiles').value='';$('#pCap').value='';$('#pDesc').value='';$('#pDate').value='';msg.textContent=`${plural(ok,'photo')} posted. Customers can see ${ok===1?'it':'them'} in Recent activity.`}
});

/* ---------- edit a recent activity post ---------- */
function openPost(id){const p=S.gallery.find(x=>x.id===id);if(!p)return;S.post=p;S.postImg=null;
  $('#poPrev').innerHTML=`<img src="${esc(imgUrl(p.imageId))}" alt="">`;$('#poImg').value='';$('#poCap').value=p.caption||'';$('#poDesc').value=p.desc||'';
  $('#poDate').value=/^\d{4}-\d{2}-\d{2}/.test(p.date||'')?String(p.date).slice(0,10):'';$('#poDate').max=toLocal(new Date()).slice(0,10);$('#poErr').textContent='';$('#dPost').showModal()}
$('#poNoDate').addEventListener('click',()=>{$('#poDate').value=''});
$('#poImg').addEventListener('change',async()=>{const f=$('#poImg').files[0];if(!f)return;if(!/^image\//.test(f.type||'')){$('#poErr').textContent="That file isn't a picture. Choose a JPG or PNG photo.";$('#poImg').value='';return}const pb=await cropImage(f,4/3,1200);$('#poImg').value='';if(!pb)return;S.postImg=pb;if(S.postUrl)URL.revokeObjectURL(S.postUrl);S.postUrl=URL.createObjectURL(S.postImg);$('#poPrev').innerHTML=`<img src="${S.postUrl}" alt="">`;$('#poErr').textContent=''});
$('#postForm').addEventListener('submit',async e=>{e.preventDefault();const p=S.post;if(!p)return;const er=$('#poErr');
  if($('#poDate').value&&$('#poDate').value>toLocal(new Date()).slice(0,10)){er.textContent="The date rented can't be in the future.";return}
  const b=$('#poSave');b.disabled=true;b.textContent='Saving…';
  try{let imageId=p.imageId;if(S.postImg){imageId=(await S.assets.upload(S.postImg)).id}
    await serial('g'+p.id,()=>S.db.doc('gallery/'+p.id).set({...(({id,...r})=>r)(p),imageId,caption:$('#poCap').value.trim(),desc:$('#poDesc').value.trim(),date:$('#poDate').value||'',updatedAt:Date.now()}));
    if(imageId!==p.imageId&&p.imageId&&S.assets)S.assets.delete(p.imageId).catch(()=>{});
    $('#dPost').close();toast('Post saved')}catch(x){er.textContent='Not saved. '+(x?.message||'Try again.')}finally{b.disabled=false;b.textContent='Save post'}});
$('#poDel').addEventListener('click',async()=>{const p=S.post;if(!p||!await ask('Delete this post from Recent activity?','Delete'))return;try{await S.db.doc('gallery/'+p.id).delete();if(p.imageId&&S.assets)S.assets.delete(p.imageId).catch(()=>{});$('#dPost').close();toast('Post deleted')}catch(x){$('#poErr').textContent='Not deleted. Try again.'}});
document.addEventListener('click',e=>{
  const pe=e.target.closest('[data-pedit]');if(pe){openPost(pe.dataset.pedit);return}
  const po=e.target.closest('[data-post]');if(po){const p=S.gallery.find(x=>x.id===po.dataset.post);if(p)openZoom(imgUrl(p.imageId),p.caption||'Recent activity',p.desc||'',p.date?'Rented '+fmtLong(p.date):'')}
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
  if(s?.error){err.textContent=s.error;return}
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
  const pv=t.closest('[data-pfview]');if(pv){const[o,bid,sd,i]=pv.dataset.pfview.split('|');openPf(o,bid,sd,+i);return}
  if(t.closest('[data-showterms]')){e.preventDefault();$('#tmBody').innerHTML=termsHtml(SET().terms)+(termsDate()?`<p class="small">Last updated ${esc(termsDate())}.</p>`:'');$('#dTerms').showModal();return}
  const th=t.closest('[data-th]');if(th){const[o,k]=th.dataset.th.split('|');const x=getThread(o,k);S.thread={owner:o,key:k,name:x.name,phone:x.phone};S.msgScrolled=false;renderMessages();markSeen();return}
  if(t.closest('#thBack')){S.thread=null;renderMessages();return}
  const mg=t.closest('[data-msg]');if(mg){const[o,k,n,p]=mg.dataset.msg.split('|');t.closest('dialog')?.close();S.msgScrolled=false;openThread(o,k,n,p,mg.dataset.draft||'');return}
  const ab=t.closest('[data-askbk]');if(ab){S.draft=`About booking ${ab.dataset.askbk}: `;S.msgScrolled=false;location.hash='#messages';route();return}
  const cl=t.closest('[data-clic]');if(cl){const[o,k,n]=cl.dataset.clic.split('|');cl.disabled=true;try{const img=await licGet(o,k);img?openZoom(img,`Driver's license of ${n}`):toast(`${n} hasn't uploaded a license photo yet.`)}catch(x){toast('The license photo could not be loaded.')}finally{cl.disabled=false}return}
  const cb=t.closest('[data-cbk]');if(cb){S.adm.q=cb.dataset.cbk;S.adm.status='all';$('#admQ').value=cb.dataset.cbk;location.hash='#bookings';route();return}
  const cd=t.closest('[data-cdel]');if(cd){const c=carById(cd.dataset.cdel);if(!c)return;const live=allBookings().filter(b=>b.carId===c.id&&LIVE.includes(b.status)).length;
    if(!await ask(`Delete the ${carTitle(c)} from the rental list?${live?` It has ${plural(live,'open booking')}. Those keep the car's name.`:''}`,'Delete car'))return;
    try{await S.db.doc('cars/'+c.id).delete();if(S.assets)carImgs(c).forEach(x=>S.assets.delete(x).catch(()=>{}));toast(carTitle(c)+' deleted')}catch(x){toast('Car not deleted. Try again.')}return}
  const de=t.closest('[data-dedit]');if(de){openDriver(de.dataset.dedit);return}
  const dd=t.closest('[data-ddel]');if(dd){const d=S.drivers.find(x=>x.id===dd.dataset.ddel);if(!d)return;const n=allBookings().filter(b=>b.driverId===d.id&&LIVE.includes(b.status)).length;
    if(!await ask(`Delete ${d.name} from the drivers list?${n?` They are assigned to ${plural(n,'open booking')}; those keep the driver's name until you change it.`:''}`,'Delete driver'))return;
    try{await S.db.doc('drivers/'+d.id).delete();if(d.imageId&&S.assets)S.assets.delete(d.imageId).catch(()=>{});toast(d.name+' deleted')}catch(x){toast('Not deleted. Try again.')}return}
  if(t.closest('#chgAdmin2')){openSetup();return}
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
  const cn=t.closest('[data-cancel]');if(cn){const b=myItems().find(x=>x.id===cn.dataset.cancel);if(b&&!canCancelNow(b)){toast(`Cancellation is only possible up to ${cdTxt()} before pickup. Message the office.`);renderMine();return}if(!b||!await ask(`Cancel booking ${b.ref} for the ${b.carName}?`,'Cancel booking'))return;try{await setStatus(S.uid,b.id,'cancelled',undefined,{cancelledBy:'customer'});toast('Booking cancelled')}catch(x){toast('Not cancelled. Try again.')}return}
  const pd=t.closest('[data-pdel]');if(pd){const p=S.gallery.find(x=>x.id===pd.dataset.pdel);if(!p||!await ask('Delete this photo from the dashboard?','Delete'))return;try{await S.db.doc('gallery/'+p.id).delete();if(p.imageId&&S.assets)S.assets.delete(p.imageId).catch(()=>{});toast('Photo deleted')}catch(x){toast('Not deleted. Try again.')}return}
  const sr=t.closest('[data-saverate]');if(sr){const id=sr.dataset.saverate;const c=carById(id);const v=+document.getElementById('r-'+id)?.value;
    if(!c||!(v>0)){toast('Enter a price above zero');return}
    sr.disabled=true;try{await serial('c'+id,()=>S.db.doc('cars/'+id).update({rate:v,updatedAt:Date.now()}));toast(`${carTitle(c)}: ${peso(v)} per day`)}catch(x){toast('Price not saved. Try again.')}finally{sr.disabled=false}return}
});
document.addEventListener('change',async e=>{
  const inp=e.target.closest('[data-photo]');if(!inp||!inp.files[0])return;const id=inp.dataset.photo;const c=carById(id);if(!c||!S.assets)return;
  const ph=carPhotos(c);const used=new Set(ph.map(p=>p.kind));const slot=SLOTS.find(([k])=>!used.has(k));
  if(!slot){toast('All 6 photo slots are used. Open Edit all details to change or remove one.');inp.value='';return}
  $('#crT').textContent='Adjust photo: '+slot[1];
  const cropped=await cropImage(inp.files[0],16/9,1280);$('#crT').textContent='Adjust photo';if(!cropped){inp.value='';return}
  toast('Uploading photo…');
  try{const up=await S.assets.upload(cropped);const order=SLOTS.map(([k])=>k);const photos=[...ph,{id:up.id,kind:slot[0]}].sort((a,b)=>order.indexOf(a.kind)-order.indexOf(b.kind));const images=photos.map(p=>p.id);await serial('c'+id,()=>S.db.doc('cars/'+id).update({imageId:images[0],images,photos,updatedAt:Date.now()}));toast(`Added as ${slot[1]} for the ${carTitle(c)}`)}
  catch(x){toast('Photo not uploaded. Try again.')}finally{inp.value=''}
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'){const row=e.target.closest?.('[data-bk]');if(row){const[o,i]=row.dataset.bk.split('|');openDetail(o,i)}}});
$('#addCar').addEventListener('click',()=>openCar(null));
$('#searchForm').addEventListener('input',()=>{if($('#fStart').value&&$('#fEnd').value<=$('#fStart').value){const d=parse($('#fStart').value);d.setDate(d.getDate()+1);$('#fEnd').value=toLocal(d)}ticket();renderFleet()});
$('#fQ').addEventListener('input',renderFleet);
$('#fFree').addEventListener('change',renderFleet);
$('#admQ').addEventListener('input',e=>{S.adm.q=e.target.value;renderAdmin()});
const strip=$('#strip');const stepS=dir=>{strip.scrollBy({left:dir*(strip.clientWidth+parseInt(getComputedStyle(strip).getPropertyValue('--gap')||16)),behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'})};
strip.addEventListener('scroll',()=>{clearTimeout(S.dotT);S.dotT=setTimeout(updDots,80)},{passive:true});addEventListener('resize',()=>{if(S.view==='fleet')updDots()});
$('#sPrev').onclick=()=>stepS(-1);$('#sNext').onclick=()=>stepS(1);
strip.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')stepS(-1);if(e.key==='ArrowRight')stepS(1)});

/* default dates: tomorrow 9:00 for 2 days */
{const a=new Date();a.setDate(a.getDate()+1);a.setHours(9,0,0,0);const b=new Date(a);b.setDate(b.getDate()+2);$('#fStart').value=toLocal(a);$('#fEnd').value=toLocal(b);$('#fStart').min=$('#fEnd').min=toLocal(new Date())}

/* ---------- server mode (opened from server.js): everything is saved on the server ---------- */
function serverDb(live){
  let st={},tok=null,es=null,poll=null,ver=null;const L=new Set();const notify=()=>L.forEach(f=>{try{f()}catch(e){}});
  const api=async(url,opt={})=>{const r=await fetch(url,{...opt,headers:{'content-type':'application/json',...(tok?{'x-token':tok}:{}),...(opt.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw{code:j.code||'invalid_argument',message:j.error||('Server error '+r.status)};return j};
  const load=async()=>{const j=await api('api/db');st=j.docs||{};ver=j.v;notify()};
  const connect=()=>{es?.close();clearInterval(poll);
    if(!live||!window.EventSource){const tick=async()=>{if(document.hidden)return;try{const j=await api('api/ver');if(j.v!==ver)await load()}catch(e){}};poll=setInterval(tick,4000);if(!connect.vis){connect.vis=1;document.addEventListener('visibilitychange',tick)}return}
    es=new EventSource('api/events'+(tok?'?t='+encodeURIComponent(tok):''));
    es.onmessage=e=>{try{const m=JSON.parse(e.data);if(m.doc===null)delete st[m.path];else st[m.path]=m.doc;notify()}catch(x){}};
    es.onopen=()=>load().catch(()=>{});};
  const clone=o=>JSON.parse(JSON.stringify(o));
  const write=async(op,p,data)=>{await api('api/write',{method:'POST',body:JSON.stringify({op,path:p,data})});if(op==='delete')delete st[p];else if(op==='set')st[p]=clone(data);else st[p]={...st[p],...clone(data)};notify()};
  const snap=p=>({id:p.split('/').pop(),exists:p in st,data:()=>st[p],metadata:{fromCache:false,hasPendingWrites:false}});
  return{
    api,setToken:t=>{tok=t||null},
    ready:async t=>{tok=t||null;await load();connect()},
    book:async b=>{const j=await api('api/book',{method:'POST',body:JSON.stringify({booking:b})});await load();return j},
    doc:p=>({set:d=>write('set',p,d),update:d=>write('update',p,d),delete:()=>write('delete',p),onSnapshot:n=>{const f=()=>n(snap(p));L.add(f);setTimeout(f,0);return()=>L.delete(f)}}),
    collection:c=>({onSnapshot:n=>{const f=()=>n({docs:Object.keys(st).filter(k=>{const x=k.split('/');return x.length===2&&x[0]===c}).map(snap),metadata:{fromCache:false}});L.add(f);setTimeout(f,0);return()=>L.delete(f)}}),
    token:()=>tok
  };
}
const serverAssets={
  upload:async blob=>{const data=await new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result).split(',')[1]||'');r.onerror=()=>rej({message:'Could not read the photo.'});r.readAsDataURL(blob)});
    const j=await S.db.api('api/upload',{method:'POST',body:JSON.stringify({type:blob.type||'image/jpeg',data})});return{id:j.id}},
  delete:async id=>{await S.db.api('api/upload-delete',{method:'POST',body:JSON.stringify({id})}).catch(()=>{})}
};

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
  S.local=false;S.server=false;
  let ping=null;if(!window.claude?.use&&/^https?:$/.test(location.protocol)){try{const r=await fetch('api/ping',{cache:'no-store'});ping=await r.json();S.server=ping.app==='car-rental'}catch(e){}}
  if(!window.claude?.use&&!S.server)S.local=true;
  let db,user;
  if(S.server){
    db=serverDb(ping.live!==false);if(ping.ready===false)$('#fleetNote').textContent=ping.problem||'The database is not connected yet.';let tok=null;try{tok=localStorage.getItem('cr-token')}catch(e){}
    let me={role:'guest'};if(tok){db.setToken(tok);try{me=await db.api('api/me')}catch(e){}if(!me.role||me.role==='guest'){tok=null;try{localStorage.removeItem('cr-token')}catch(e){}}}
    await db.ready(tok).catch(e=>{$('#fleetNote').textContent=e?.message||"Can't reach the server. Check that it's running, then reload."});
    S.uid=me.uid||null;S.editor=me.role==='admin';S.cfgLoaded=true;
    if(me.role&&me.role!=='guest')S.session={role:me.role,name:me.name,key:norm(me.name),pass:'',cid:me.cid};
    user={canEdit:async()=>S.editor,id:async()=>S.uid,can:async()=>true};
  }
  else if(S.local){db=localDb();user={canEdit:async()=>true,id:async()=>'local',can:async()=>true};seedLocal(db)}
  else [db,user]=await Promise.all([window.claude.use('db'),window.claude.use('user')]);
  S.db=db;S.user=user;
  if(!db){$('#fleetNote').textContent='Sign in to Claude and open this page from its link to see the cars and book.';S.ready=true;S.canWrite=false;route();return}
  S.editor=!!(await user?.canEdit?.());
  S.uid=await user?.id?.()??null;
  const cw=await user?.can?.('data.write');S.canWrite=S.server||(!!S.uid&&cw!==false);
  if(S.editor)S.assets=S.server?serverAssets:S.local?localAssets:await window.claude.use('assets');
  if(S.local)$('#fleetNote').textContent=LSOK?'Running from the downloaded file: cars, bookings, photos and messages are saved in this browser on this computer only.':"This browser doesn't allow saving for files opened from your computer, so changes last only until you close this page. Open index.html in Chrome, Edge or Firefox to keep your data.";
  if(!S.canWrite&&!S.editor)$('#fleetNote').textContent='You can look at the cars, but booking needs Contributor access to this page. Ask the rental office to share it with you as a Contributor.';
  let saved=null;if(!S.server){try{saved=JSON.parse(sessionStorage.getItem('cr-session')||'null')}catch(e){}}
  const restore=async()=>{if(!saved||S.session||!S.bReady||(S.editor&&!S.cfgLoaded))return;const s=await tryLogin(saved.name,saved.pass);saved=null;if(s){S.session=s;route()}};
  if(S.editor||S.server)db.doc('admin/config').onSnapshot(d=>{S.adminCfg=d.exists?d.data():null;S.cfgLoaded=true;restore();render()},()=>{S.cfgLoaded=true;render()});if(!S.editor)S.cfgLoaded=true;
  const timer=setTimeout(()=>{if(!S.ready){$('#fleetNote').textContent='The cars are taking a while to load. Check your connection.';S.ready=true;render()}},10000);
  const sub=(name,key,after)=>db.collection(name).onSnapshot(snap=>{S[key]=snap.docs.map(d=>({id:d.id,...d.data()}));if(name==='cars'){S.ready=true;clearTimeout(timer)}route();after&&after()},err=>{if(name==='bookings'){S.bReady=true;restore()}if(name==='cars'){S.ready=true;clearTimeout(timer);$('#fleetNote').textContent="The cars can't be loaded right now. Reload the page to try again."}render()});
  sub('cars','cars');sub('gallery','gallery');sub('bookings','bdocs',()=>{S.bReady=true;restore()});sub('blocks','blocks');if(S.editor||S.server||S.local)db.doc('admin/notifs').onSnapshot(d=>{S.notifRead=d.exists?(d.data().read||{}):{};if(S.session)renderBell()},()=>{});sub('drivers','drivers');db.doc('settings/main').onSnapshot(d=>{S.settings=d.exists?d.data():null;render()},()=>{});sub('chats','chats',()=>{if(S.view==='messages'){clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800)}});sub('replies','replies',()=>{if(S.view==='messages'){clearTimeout(S.seenT);S.seenT=setTimeout(markSeen,800)}});
})();
}
