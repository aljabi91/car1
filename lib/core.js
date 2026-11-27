/*
 * Car Rental System: the shared rules and API.
 * Used by run-local.js (your own computer) and api/index.js (Vercel).
 * Storage is plugged in: files on your computer, or Upstash Redis + Vercel Blob on Vercel.
 */
const crypto = require('crypto');

/* ---------- helpers ---------- */
const norm = s => String(s || '').trim().replace(/\s+/g, ' ').toLowerCase();
const last4 = p => String(p || '').replace(/\D/g, '').slice(-4);
const tk = (nn, l4) => 't_' + (nn + '_' + l4).replace(/[^a-z0-9]/g, '_');
const cidOf = b => b.cid || tk(norm(b.name), last4(b.phone));
/* the same mobile written differently (0916 908 5565, 09169085565, +63 916 908 5565) counts as one number */
const phoneKey = p => String(p || '').replace(/\D/g, '').slice(-10);
/*
 * Every account has its own ID, made once when the account is created and never from the login:
 *   C-20261127-2253-7F3A = Customer, created 2026-11-27 at 22:53 (Manila time), random code 7F3A.
 * All the account's data is filed under it. Only the admin sees it.
 */
/* birthday "YYYY-MM-DD" -> valid date or '' */
const okBday = v => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(v || '')); if (!m) return ''; const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])); return d.getUTCMonth() === +m[2] - 1 && +m[1] >= 1900 && d < new Date() ? m[0] : ''; };
const ageOn = (bday, on) => { const [y, m, d] = bday.split('-').map(Number); const t = new Date(on); let a = t.getFullYear() - y; if (t.getMonth() + 1 < m || (t.getMonth() + 1 === m && t.getDate() < d)) a--; return a; };
/* username = first name + last name + birth month and day, e.g. Aljon Abines, 1991-01-30 -> aljonabines0130 */
function baseUser(name, bday) {
  const parts = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z\s-]/g, ' ').trim().split(/[\s-]+/).filter(Boolean);
  const first = parts[0] || 'renter', last = parts.length > 1 ? parts[parts.length - 1] : '';
  return (first + last).slice(0, 24) + bday.slice(5, 7) + bday.slice(8, 10);
}
function freeUser(db, base, exceptId) {
  const used = new Set(Object.keys(db).filter(k => k.startsWith('accounts/') && k !== 'accounts/' + exceptId).map(k => db[k].user).filter(Boolean));
  for (const k in db) if (k.startsWith('trash/') && db[k].docs) for (const p in db[k].docs) if (p.startsWith('accounts/') && db[k].docs[p].user) used.add(db[k].docs[p].user);
  if (!used.has(base)) return base;
  for (let i = 2; ; i++) if (!used.has(base + '-' + i)) return base + '-' + i;
}
const normUser = v => String(v || '').trim().toLowerCase();
function newAccountId(at) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(at || Date.now())).map(x => [x.type, x.value]));
  return `C-${p.year}${p.month}${p.day}-${p.hour}${p.minute}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}
const adminHash = pass => crypto.createHash('sha256').update('cr-admin:' + pass).digest('hex');
const LIVE = ['pending', 'approved', 'active'];
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const okPath = p => { const s = String(p || '').split('/'); return s.length === 2 && s.every(x => SEG.test(x) && x !== '.' && x !== '..'); };
const DEF_SET = { extras: [{ id: 'driver', label: 'With a driver', perDay: 1500, driver: true }, { id: 'seat', label: 'Child car seat', perDay: 200, driver: false }, { id: 'xdriver', label: 'Additional driver on the contract', perDay: 300, driver: false }], delivery: 500, cancelDays: 2 };
function settingsOf(db) {
  const x = db['settings/main'] || {};
  return { extras: Array.isArray(x.extras) ? x.extras : DEF_SET.extras, delivery: x.delivery !== undefined ? +x.delivery : DEF_SET.delivery, cancelDays: x.cancelDays !== undefined ? +x.cancelDays : DEF_SET.cancelDays, minAge: x.minAge !== undefined && Number.isFinite(+x.minAge) ? +x.minAge : 21 };
}
/* "2026-11-27T09:00" as typed on the customer's phone, read in that phone's time zone */
function localTime(s, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return NaN;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isFinite(+tz) ? utc + (+tz) * 60000 : new Date(s).getTime();
}
const days = (a, b) => { const ms = localTime(b, 0) - localTime(a, 0); return ms > 0 ? Math.max(1, Math.ceil(ms / 864e5 - 1 / 24)) : 0; };
const LIC_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
const okLicense = img => typeof img === 'string' && img.length <= 1200000 && LIC_RE.test(img);
/* pickup and return records: photos or a PDF, kept private like license photos */
const FILE_RE = /^data:(image\/(jpeg|png|webp)|application\/pdf);base64,[A-Za-z0-9+/=]+$/;
const okFile = d => typeof d === 'string' && d.length <= 950000 && FILE_RE.test(d);
const PF_ID = /^pf-[a-f0-9]{16}$/;
const slim = items => items.map(b => ({ id: b.id, carId: b.carId, start: b.start, end: b.end, status: b.status }));

const SAMPLE_CARS = [['vios','Toyota','Vios 1.3 XLE',2024,'Sedan',5,'Automatic','Gasoline','#c0392b',1800,3000,'NDA 4521','Easy on fuel and easy to park. Good for city trips and airport runs.','available'],
  ['mirage','Mitsubishi','Mirage G4',2023,'Sedan',5,'Manual','Gasoline','#e6e6e6',1500,3000,'NCE 2287','Our lowest rate. Light and simple to drive.','available'],
  ['wigo','Toyota','Wigo G',2024,'Hatchback',5,'Automatic','Gasoline','#f39c12',1400,2000,'NGB 7734','Small hatchback for narrow streets and quick errands.','available'],
  ['fortuner','Toyota','Fortuner 2.8 LTD',2024,'SUV',7,'Automatic','Diesel','#2c3e50',4500,10000,'NHQ 9012','High ground clearance for provincial roads and mountain trips.','available'],
  ['innova','Toyota','Innova 2.8 E',2023,'MPV / Van',8,'Automatic','Diesel','#7f8c8d',3200,5000,'NBF 3390','Room for the whole family and their luggage.','available'],
  ['hiace','Toyota','Hiace GL Grandia',2022,'MPV / Van',12,'Manual','Diesel','#ffffff',5500,10000,'NAZ 6158','For group tours and company outings. Best booked with a driver.','maintenance']]
  .map(([id, brand, name, year, type, seats, trans, fuel, color, rate, deposit, plate, desc, status], i) => ['cars/car-' + id, { brand, name, year, type, seats, trans, fuel, color, rate, deposit, plate, desc, status, imageId: '', createdAt: Date.now() + i }]);

/* ---------- who may read and write ---------- */
const PUBLIC = ['cars', 'gallery', 'drivers', 'settings', 'blocks', 'reviews'];
function canRead(a, p) {
  const [col, id] = p.split('/');
  if (PUBLIC.includes(col)) return true;
  if (a.role === 'admin') return true;
  if (a.role === 'customer' && ['bookings', 'chats', 'replies', 'accounts'].includes(col)) return id === a.uid;
  return false;
}
/* What visitors and customers may see of a document. Drivers' phone, license number and notes stay with the admin. */
function viewOf(a, p, doc) {
  if (!doc || a.role === 'admin' || !p.startsWith('drivers/')) return doc;
  return { name: doc.name, imageId: doc.imageId || '', status: doc.status };
}
const CUST_KEYS = ['status', 'name', 'phone', 'email', 'address', 'license', 'hasLicense', 'emergency', 'cid', 'cancelledBy', 'meetAt', 'updatedAt'];
const GMAP_RE = /^https:\/\/((www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl|goo\.gl\/maps)\S*$/i;
/* the pickup place a customer chooses: a short place name and an optional Google Maps link */
const okMeet = m => m === null || m === undefined || (typeof m === 'object' && !Array.isArray(m) && Object.keys(m).every(k => ['text', 'link', 'at'].includes(k)) &&
  typeof m.text === 'string' && m.text.trim().length >= 3 && m.text.length <= 200 && (!m.link || (typeof m.link === 'string' && m.link.length <= 500 && GMAP_RE.test(m.link))) && Number.isFinite(+m.at));
/* is this full name already used by an account other than `exceptId`? */
function nameTaken(db, name, exceptId) {
  const n = norm(name);
  return Object.keys(db).some(k => k.startsWith('bookings/') && k !== 'bookings/' + exceptId && (db[k].items || []).some(x => norm(x.name) === n));
}
function checkCustomerBookings(db, oldDoc, newDoc, id) {
  const oldItems = (oldDoc && oldDoc.items) || [];
  const items = newDoc && Array.isArray(newDoc.items) ? newDoc.items : null;
  if (!items) return 'Bookings are missing.';
  if (items.length !== oldItems.length) return 'New bookings must be sent with the booking form.';
  const byId = new Map(oldItems.map(b => [b.id, b]));
  const cd = settingsOf(db).cancelDays;
  for (const b of items) {
    const o = byId.get(b && b.id);
    if (!o) return 'Unknown booking.';
    for (const k of new Set([...Object.keys(o), ...Object.keys(b)])) {
      if (JSON.stringify(o[k]) !== JSON.stringify(b[k]) && !CUST_KEYS.includes(k)) return 'Only the office can change that.';
    }
    if (norm(o.name) !== norm(b.name)) {
      if (String(b.name || '').trim().length < 2) return 'Enter your full name.';
      if (nameTaken(db, b.name, id)) return 'That name is already used by another account. Add your middle name or initial.';
    }
    if (JSON.stringify(o.meetAt) !== JSON.stringify(b.meetAt)) {
      if (!['pending', 'approved'].includes(o.status)) return 'The pickup place can only be changed before pickup. Message the office.';
      if (!okMeet(b.meetAt)) return 'Enter the place, and a Google Maps link only.';
    }
    if (o.status !== b.status) {
      if (!(['pending', 'approved'].includes(o.status) && b.status === 'cancelled')) return 'Only the office can change the booking status.';
      if (Date.now() >= localTime(o.start, o.tz) - cd * 864e5) return `Cancellation is only possible up to ${cd} day(s) before pickup. Message the office.`;
    }
  }
  return '';
}

/*
 * store: { all(), get(p), set(p, doc), del(p), secret(), tooMany(ip), version(), getLicense(id), setLicense(id, img), delLicense(id) }
 *   The same private store also keeps pickup and return photos and signed documents (ids pf-...).
 *   License photos are kept apart from everything else and only the admin and that customer can open them.
 * photos: { save(buffer, contentType) -> id, remove(id) }
 * onChange(path, docOrNull): optional, for live updates
 */
function createApi({ store, photos, onChange = () => {}, live = false }) {
  const b64 = s => Buffer.from(s).toString('base64url');
  async function sign(obj) { const sec = await store.secret(); const body = b64(JSON.stringify({ ...obj, exp: Date.now() + 30 * 864e5 })); return body + '.' + crypto.createHmac('sha256', sec).update(body).digest('base64url'); }
  async function verify(t) {
    if (!t || typeof t !== 'string' || !t.includes('.')) return null;
    const [body, sig] = t.split('.');
    const good = crypto.createHmac('sha256', await store.secret()).update(body).digest('base64url');
    if (!sig || sig.length !== good.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
    try { const o = JSON.parse(Buffer.from(body, 'base64url').toString()); return o.exp > Date.now() ? o : null; } catch (e) { return null; }
  }
  const authOf = async token => (await verify(token)) || { role: 'guest' };
  /*
   * What a visitor or customer receives for one document.
   * Availability lists (blocks/...) are named after the customer's name and the last 4 digits of
   * their mobile, which is their login, so everyone except the admin gets a scrambled name instead.
   */
  async function publicView(a, p, doc) {
    if (a.role === 'admin') return [p, doc];
    if (p.startsWith('blocks/')) {
      const k = crypto.createHmac('sha256', await store.secret()).update('blocks:' + p.slice(7)).digest('hex').slice(0, 20);
      return ['blocks/k' + k, doc && { items: (doc.items || []).map(b => ({ id: b.id, carId: b.carId, start: b.start, end: b.end, status: b.status })) }];
    }
    if (p.startsWith('reviews/') && doc && doc.hidden) return [p, null];   /* hidden reviews stay with the admin */
    return [p, viewOf(a, p, doc)];
  }
  async function put(p, doc) { if (doc === null) await store.del(p); else await store.set(p, doc); onChange(p, doc); }
  async function syncBlocks(db, id) { const b = db['bookings/' + id]; const doc = b ? { items: slim(b.items || []) } : null; db['blocks/' + id] = doc; await put('blocks/' + id, doc); }
  /* ---- deleted customers: kept in trash/<id> for a year, then erased ---- */
  const YEAR = 365 * 864e5;
  const fileIdsOf = docs => { const ids = new Set(); const walk = v => { if (!v || typeof v !== 'object') return; if (Array.isArray(v)) return v.forEach(walk); for (const k in v) { if ((k === 'id') && /^pf-[a-f0-9]{16}$/.test(String(v[k]))) ids.add(v[k]); walk(v[k]); } }; walk(docs); return [...ids]; };
  async function reown(ids, owner) {
    for (const f of ids) { let x = null; try { x = JSON.parse((await store.getLicense(f)) || 'null'); } catch (e) {} if (x) await store.setLicense(f, JSON.stringify({ ...x, owner })); }
  }
  /* moves everything filed under one customer ID to trash/<id>: bookings, messages, reviews, license photo, files */
  async function trashAccount(db, owner, why) {
    const items = ((db['bookings/' + owner] || {}).items) || [], last = [...items].sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))[0] || {};
    const docs = {};
    for (const p of ['bookings/', 'chats/', 'replies/', 'accounts/']) if (db[p + owner]) docs[p + owner] = db[p + owner];
    for (const it of items) if (db['reviews/' + it.id]) docs['reviews/' + it.id] = db['reviews/' + it.id];
    const lic = await store.getLicense(owner);
    if (!Object.keys(docs).length && !lic) return '';
    const thread = Object.values(((db['chats/' + owner] || db['replies/' + owner] || {}).threads) || {})[0] || {};
    const now = Date.now(), tid = owner + '~' + now.toString(36);
    let licKey = '';
    if (lic) { licKey = 'trash-lic-' + tid.replace(/[^A-Za-z0-9_-]/g, '_'); await store.setLicense(licKey, lic); await store.delLicense(owner); }
    await put('trash/' + tid, { owner, name: last.name || thread.name || '', phone: last.phone || thread.phone || '', email: last.email || '', bookings: items.length, why: why || '', deletedAt: now, purgeAt: now + YEAR, licKey, docs });
    await reown(fileIdsOf(docs), '_trash');
    for (const p in docs) { await put(p, null); delete db[p]; }
    await put('blocks/' + owner, null); delete db['blocks/' + owner];
    return tid;
  }
  async function moveAccount(db, from) {
    const items = (db['bookings/' + from] || {}).items || [];
    const first = Math.min(...items.map(x => x.createdAt || Date.now()), Date.now());
    let to = newAccountId(first); while (db['bookings/' + to] || db['chats/' + to]) to = newAccountId(first);
    const docs = {};
    for (const p of ['bookings/', 'chats/', 'replies/', 'accounts/']) if (db[p + from]) { docs[p] = db[p + from]; await put(p + to, docs[p]); db[p + to] = docs[p]; }
    const lic = await store.getLicense(from); if (lic) { await store.setLicense(to, lic); await store.delLicense(from); }
    for (const f of fileIdsOf(docs)) { let x = null; try { x = JSON.parse((await store.getLicense(f)) || 'null'); } catch (e) {} if (x && x.owner === from) await store.setLicense(f, JSON.stringify({ ...x, owner: to })); }
    await syncBlocks(db, to);
    for (const p of ['bookings/', 'chats/', 'replies/', 'blocks/', 'accounts/']) if (db[p + from]) { await put(p + from, null); delete db[p + from]; }
    return to;
  }
  async function eraseTrash(tid, t) {
    for (const f of fileIdsOf(t.docs || {})) await store.delLicense(f).catch(() => {});
    if (t.licKey) await store.delLicense(t.licKey).catch(() => {});
    await put('trash/' + tid, null);
  }
  let lastPurge = 0;
  async function purgeOld() {
    if (Date.now() - lastPurge < 3600e3) return; lastPurge = Date.now();
    const db = await store.all();
    for (const k in db) if (k.startsWith('trash/') && (db[k].purgeAt || 0) < Date.now()) await eraseTrash(k.slice(6), db[k]);
    /* accounts from before IDs were separate from the login (t_name_last4): move them to a new-style ID */
    for (const k of Object.keys(db)) if (/^bookings\/t_/.test(k)) await moveAccount(db, k.slice(9));
    /* messages left behind when all of a customer's bookings were deleted: move them out of sight */
    const owners = new Set(Object.keys(db).filter(k => /^(chats|replies)\//.test(k)).map(k => k.split('/')[1]));
    for (const o of owners) if (!db['bookings/' + o]) await trashAccount(db, o, 'Messages left after all bookings were deleted');
  }
  const err = (status, error, code) => ({ status, json: { error, code: code || (status === 409 ? 'conflict' : status === 429 ? 'resource_exhausted' : 'invalid_argument') } });
  const ok = json => ({ status: 200, json });

  /* route: 'ping' | 'me' | 'db' | 'ver' | 'login' | 'book' | 'write' | 'upload' | 'upload-delete' */
  async function handle({ route, method, token, ip, body }) {
    const a = await authOf(token);
    if (route === 'ping') return ok({ app: 'car-rental', live });
    if (route === 'ver') return ok({ v: await store.version() });
    if (route === 'me') {
      if (a.role === 'customer' && !(await store.get('bookings/' + a.uid))) return ok({ role: 'guest' });
      return ok(a);
    }
    if (route === 'db') { if (a.role === 'admin') await purgeOld(); const db = await store.all(); const docs = {}; for (const p in db) if (canRead(a, p)) { const [k, d] = await publicView(a, p, db[p]); if (d) docs[k] = d; } return ok({ docs, v: await store.version() }); }
    if (method !== 'POST') return err(405, 'Use POST.');
    body = body && typeof body === 'object' ? body : {};

    if (route === 'login') {
      if (await store.tooMany(ip, 'login', 10)) return err(429, 'Too many tries. Wait a minute and try again.');
      const { name, pass } = body;
      const db = await store.all();
      const cfg = db['admin/config'];
      const isAdmin = cfg && cfg.user && cfg.hash ? norm(cfg.user) === norm(name) && cfg.hash === adminHash(String(pass || '')) : norm(name) === 'admin1' && pass === 'admin123';
      if (isAdmin) { const n = (cfg && cfg.user) || 'admin1'; return ok({ token: await sign({ role: 'admin', uid: 'admin', name: n }), role: 'admin', uid: 'admin', name: n }); }
      if (/^\d{4}$/.test(String(pass || ''))) {
        /* username login: the account whose username this is, password = last 4 digits of its latest mobile */
        const acc = Object.keys(db).find(k => k.startsWith('accounts/') && db[k].user && db[k].user === normUser(name));
        if (acc) {
          const id = acc.slice(9), items = ((db['bookings/' + id] || {}).items) || [], m = [...items].sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0)).find(x => last4(x.phone) === pass);
          if (m) { const o = { role: 'customer', uid: id, cid: cidOf(m), name: m.name }; return ok({ token: await sign(o), ...o }); }
          return err(403, 'bad');
        }
        let best = null, bestAt = -1;
        for (const key in db) {
          if (!key.startsWith('bookings/')) continue;
          const items = db[key].items || [], m = items.find(b => norm(b.name) === norm(name) && last4(b.phone) === pass);
          if (!m) continue;
          const at = Math.max(...items.map(x => x.createdAt || 0));
          if (at > bestAt) { bestAt = at; best = { key, m }; }
        }
        if (best) { const o = { role: 'customer', uid: best.key.split('/')[1], cid: cidOf(best.m), name: best.m.name }; return ok({ token: await sign(o), ...o }); }
      }
      return err(403, 'bad');
    }

    if (route === 'book') {
      const b = body.booking;
      if (!b || typeof b !== 'object') return err(400, 'Missing booking.');
      if (a.role !== 'admin' && await store.tooMany(ip, 'book', 5)) return err(429, 'Too many booking requests from this connection. Wait a minute and try again.');
      const db = await store.all();
      const car = db['cars/' + b.carId];
      if (!car) return err(400, 'That car is no longer listed.');
      if (car.status !== 'available' && a.role !== 'admin') return err(409, 'That car is not available right now.');
      if (['name', 'phone', 'address', 'start', 'end'].some(k => !String(b[k] || '').trim())) return err(400, 'Fill in all required details.');
      if (b.licenseImg && !okLicense(b.licenseImg)) return err(400, "The license photo couldn't be read. Upload it again as a JPG or PNG.");
      if (String(b.phone).replace(/\D/g, '').length < 7) return err(400, 'Enter a valid mobile number.');
      const bday = okBday(b.birthday);
      if (b.birthday && !bday) return err(400, 'Enter a valid birthday.');
      const n = days(b.start, b.end);
      if (!n) return err(400, 'Return must be after pickup.');
      const clash = Object.keys(db).filter(k => k.startsWith('blocks/')).flatMap(k => db[k].items || []).find(x => x.carId === b.carId && LIVE.includes(x.status) && x.start < b.end && b.start < x.end);
      if (clash) return err(409, 'Someone has just booked this car on those dates. Choose other dates.');
      const st = settingsOf(db);
      const ex = st.extras.filter(x => (b.extras || []).includes(x.label));
      const exDay = ex.reduce((s, x) => s + (+x.perDay || 0), 0);
      const del = b.pickup === 'delivery' ? st.delivery : 0;
      let docId = null, cid = null;
      /* a logged-in customer booking under their own name stays in their account, even with a new mobile number */
      if (a.role === 'customer') {
        const mine = ((db['bookings/' + a.uid] || {}).items || []).find(x => norm(x.name) === norm(b.name));
        if (mine) { docId = a.uid; cid = cidOf(mine); }
      }
      if (!docId) for (const key in db) {
        if (!key.startsWith('bookings/')) continue;
        const m = (db[key].items || []).find(x => norm(x.name) === norm(b.name) && phoneKey(x.phone) === phoneKey(b.phone));
        if (m) { docId = key.split('/')[1]; cid = cidOf(m); break; }
      }
      /* one account per full name: a different mobile under a name that already has an account is refused (the admin may still add it) */
      /* even the admin can't create a second account that would log in exactly like an existing one */
      if (!docId && a.role === 'admin' && Object.keys(db).some(k => k.startsWith('bookings/') && (db[k].items || []).some(x => norm(x.name) === norm(b.name) && last4(x.phone) === last4(b.phone))))
        return err(409, `Another customer called "${String(b.name).trim().replace(/\s+/g, ' ')}" has a mobile number ending in the same 4 digits, so both would log in the same way. Add a middle name or initial to tell them apart.`, 'name_taken');
      if (!docId && a.role !== 'admin' && nameTaken(db, b.name, null))
        return err(409, `An account with the name "${String(b.name).trim().replace(/\s+/g, ' ')}" already exists. If it's yours, log in first (your password is the last 4 digits of the mobile number on that account). If it isn't you, add your middle name or initial so we can tell you apart.`, 'name_taken');
      if (!docId) {
        docId = newAccountId(); while (db['bookings/' + docId] || db['chats/' + docId]) docId = newAccountId(); cid = docId;
        /* a new account starts empty: old messages or a license photo left under this ID move to Deleted customers */
        if (!db['bookings/' + docId]) await trashAccount(db, docId, 'Left over from an earlier account with the same name and mobile');
      }
      /* birthday: needed for every new account (it makes the username) and checked against the minimum age */
      const acct = db['accounts/' + docId] || null, birthday = bday || (acct && acct.birthday) || '';
      if (!birthday && !acct && !db['bookings/' + docId] && a.role !== 'admin') return err(400, 'Enter your birthday.');
      const minAge = settingsOf(db).minAge;
      if (birthday && minAge > 0 && ageOn(birthday, localTime(b.start, b.tz) || Date.now()) < minAge) return err(400, `You must be at least ${minAge} years old on the pickup date to rent a car.`, 'too_young');
      if (!b.licenseImg && !(await store.getLicense(docId))) return err(400, "Upload a photo of your driver's license.");
      const item = {
        id: SEG.test(String(b.id || '')) ? b.id : crypto.randomBytes(5).toString('hex'),
        ref: /^CR-[A-Z0-9]{3,10}$/.test(String(b.ref || '')) ? b.ref : 'CR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cid, carId: b.carId, carName: `${car.brand || ''} ${car.name || ''}`.trim(), plate: car.plate || '',
        name: String(b.name).trim().replace(/\s+/g, ' ').slice(0, 120), phone: String(b.phone).slice(0, 40), email: String(b.email || '').slice(0, 120),
        address: String(b.address).slice(0, 400), license: String(b.license || '').slice(0, 60), hasLicense: true, emergency: String(b.emergency || '').slice(0, 160),
        start: String(b.start).slice(0, 16), end: String(b.end).slice(0, 16), days: n,
        rate: +car.rate || 0, extras: ex.map(x => x.label), extrasDetail: ex.map(x => ({ label: x.label, perDay: +x.perDay || 0, driver: !!x.driver })),
        extrasPerDay: exDay, pickup: b.pickup === 'delivery' ? 'delivery' : 'office', delivery: del,
        total: n * ((+car.rate || 0) + exDay) + del, deposit: +car.deposit || 0, notes: String(b.notes || '').slice(0, 1000),
        status: 'pending', createdAt: Date.now()
      };
      if (Number.isFinite(+b.tz)) item.tz = +b.tz;
      if (b.termsAgreedAt) item.termsAgreedAt = Date.now();
      if (b.licenseImg) await store.setLicense(docId, b.licenseImg);
      const cur = db['bookings/' + docId] || { items: [] };
      db['bookings/' + docId] = { items: [...(cur.items || []), item], updatedAt: Date.now() };
      await put('bookings/' + docId, db['bookings/' + docId]);
      await syncBlocks(db, docId);
      let account = db['accounts/' + docId] || { createdAt: Date.now() };
      if (birthday && (!account.birthday || !account.user)) { account = { ...account, birthday: account.birthday || birthday, user: account.user || freeUser(db, baseUser(item.name, account.birthday || birthday), docId), updatedAt: Date.now() }; db['accounts/' + docId] = account; await put('accounts/' + docId, account); }
      return ok({ ok: true, booking: item, username: account.user || '' });
    }

    if (route === 'write') {
      const { op, path: dp, data } = body;
      if (!['set', 'update', 'delete'].includes(op) || !okPath(dp)) return err(400, 'Bad request.');
      if (op !== 'delete' && (!data || typeof data !== 'object' || Array.isArray(data))) return err(400, 'Bad data.');
      const [col, id] = dp.split('/');
      const admin = a.role === 'admin';
      if (col === 'blocks') return ok({ ok: true });                         /* worked out from bookings */
      const cur = await store.get(dp);
      if (op === 'update' && !cur) return err(400, 'Not found.');
      let next = op === 'delete' ? null : op === 'set' ? data : { ...cur, ...data };
      if (!admin && next && JSON.stringify(next).length > 400000) return err(400, 'That is too much to save at once. Delete some old messages and try again.');
      if (['cars', 'gallery', 'drivers', 'settings', 'admin', 'replies', 'reviews'].includes(col)) { if (!admin) return err(403, 'Only the admin can change that.'); }
      else if (col === 'bookings') {
        if (!admin) {
          if (a.role !== 'customer' || a.uid !== id || op === 'delete') return err(403, 'Log in to change your bookings.');
          const db = await store.all();
          const why = checkCustomerBookings(db, cur, next, id); if (why) return err(403, why);
          next = { items: next.items, updatedAt: Date.now() };
        }
      } else if (col === 'chats') { if (!admin && !(a.role === 'customer' && a.uid === id)) return err(403, 'Log in to send messages.'); }
      else return err(403, 'Not allowed.');
      await put(dp, next);
      if (col === 'bookings') { const db = { [dp]: next }; await syncBlocks(db, id); }
      return ok({ ok: true });
    }

    if (route === 'license-get' || route === 'license-set') {
      const owner = a.role === 'admin' ? String(body.owner || '') : a.role === 'customer' ? a.uid : '';
      if (!owner || !SEG.test(owner)) return err(403, 'Log in to see license photos.');
      if (route === 'license-get') return ok({ img: (await store.getLicense(owner)) || '' });
      if (!okLicense(body.img)) return err(400, "That photo couldn't be read. Upload it again as a JPG or PNG.");
      if (!(await store.get('bookings/' + owner))) return err(400, 'No customer found.');
      await store.setLicense(owner, body.img);
      return ok({ ok: true });
    }
    if (route === 'file-set') {
      /* the admin adds pickup/return files and chat photos; a customer may only add chat photos to their own chat */
      if (a.role !== 'admin' && a.role !== 'customer') return err(403, 'Log in to send photos.');
      const owner = a.role === 'customer' ? a.uid : String(body.owner || '');
      if (a.role === 'customer') {
        if (!/^data:image\/(jpeg|png|webp);base64,/.test(String(body.data || ''))) return err(400, 'Send a JPG or PNG photo.');
        if (await store.tooMany(a.uid, 'file', 20)) return err(429, 'Too many photos at once. Wait a minute and try again.');
      }
      /* '_staff' holds the admin's own private files, such as drivers' license photos */
      if (owner !== '_staff' && (!SEG.test(owner) || !(await store.get('bookings/' + owner)))) return err(400, 'No customer found.');
      if (!okFile(body.data)) return err(400, String(body.data || '').length > 950000 ? 'That file is too large. Use a smaller photo or PDF.' : 'Upload a JPG or PNG photo, or a PDF.');
      const id = 'pf-' + crypto.randomBytes(8).toString('hex');
      await store.setLicense(id, JSON.stringify({ owner, data: body.data }));
      return ok({ id });
    }
    if (route === 'file-get' || route === 'file-del') {
      const id = String(body.id || '');
      if (!PF_ID.test(id)) return err(400, 'Bad file.');
      if (route === 'file-del') {
        if (a.role === 'customer') { let f = null; try { f = JSON.parse((await store.getLicense(id)) || 'null'); } catch (e) {} if (!f || f.owner !== a.uid) return err(403, 'Only the admin can remove that file.'); }
        else if (a.role !== 'admin') return err(403, 'Only the admin can remove files.');
        await store.delLicense(id); return ok({ ok: true });
      }
      if (a.role !== 'admin' && a.role !== 'customer') return err(403, 'Log in to see this file.');
      let f = null; try { f = JSON.parse((await store.getLicense(id)) || 'null'); } catch (e) { f = null; }
      if (!f) return err(404, 'This file was removed.', 'not_found');
      if (a.role === 'customer' && f.owner !== a.uid) return err(403, 'This file belongs to another booking.');
      return ok({ data: f.data });
    }
    if (route === 'account-set') {
      /* a customer adds their birthday; the first time, this also creates their username */
      if (a.role !== 'customer') return err(403, 'Log in first.');
      const db = await store.all(), bk = db['bookings/' + a.uid];
      if (!bk) return err(404, 'Account not found.', 'not_found');
      const bday = okBday(body.birthday); if (!bday) return err(400, 'Enter a valid birthday.');
      const cur = db['accounts/' + a.uid] || { createdAt: Date.now() };
      const last = [...(bk.items || [])].sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0))[0] || {};
      const next = { ...cur, birthday: bday, user: cur.user || freeUser(db, baseUser(last.name, bday), a.uid), updatedAt: Date.now() };
      await put('accounts/' + a.uid, next);
      return ok({ ok: true, username: next.user, birthday: bday });
    }
    if (route === 'review') {
      /* a customer rates a returned rental: 1-5 stars, a comment, and whether to post anonymously */
      if (a.role !== 'customer') return err(403, 'Log in to rate your rental.');
      if (await store.tooMany(a.uid, 'review', 10)) return err(429, 'Too many tries. Wait a minute and try again.');
      const bid = String(body.bookingId || ''), stars = Math.round(+body.stars), text = String(body.text || '').trim().replace(/\s+\n/g, '\n').slice(0, 600), anon = !!body.anon;
      if (!SEG.test(bid)) return err(400, 'Unknown booking.');
      if (!(stars >= 1 && stars <= 5)) return err(400, 'Choose 1 to 5 stars.');
      const dp = 'bookings/' + a.uid, doc = await store.get(dp);
      const item = doc && (doc.items || []).find(x => x.id === bid);
      if (!item) return err(404, 'Unknown booking.', 'not_found');
      if (item.status !== 'completed') return err(400, 'You can rate a rental after the car is returned.');
      const now = Date.now(), first = item.review && item.review.at;
      if (first && now - first > 7 * 864e5) return err(400, 'Reviews can be changed for 7 days after you post them.');
      const parts = String(item.name || '').trim().split(/\s+/), shown = anon ? '' : (parts[0] || 'Renter') + (parts.length > 1 ? ' ' + parts[parts.length - 1][0].toUpperCase() + '.' : '');
      const old = (await store.get('reviews/' + bid)) || {};
      const rev = { stars, text, anon, name: shown, carId: item.carId, carName: item.carName, when: String(item.end || item.start || '').slice(0, 7), createdAt: first || now, updatedAt: now, hidden: !!old.hidden, reply: old.reply || '', replyAt: old.replyAt || 0 };
      await put('reviews/' + bid, rev);
      const next = { ...doc, items: doc.items.map(x => x.id === bid ? { ...x, review: { stars, text, anon, at: first || now, updatedAt: now } } : x), updatedAt: now };
      await put(dp, next);
      return ok({ ok: true, review: rev });
    }
    if (route === 'customer-delete' || route === 'customer-restore' || route === 'customer-erase') {
      if (a.role !== 'admin') return err(403, 'Only the admin can do that.');
      const db = await store.all(), now = Date.now();
      if (route === 'customer-delete') {
        const owner = String(body.owner || '');
        if (!SEG.test(owner) || !(db['bookings/' + owner] || db['chats/' + owner] || db['replies/' + owner])) return err(404, 'Customer not found.', 'not_found');
        return ok({ ok: true, id: await trashAccount(db, owner, String(body.why || '').slice(0, 120)) });
      }
      const tid = String(body.id || ''), t = SEG.test(tid) && db['trash/' + tid];
      if (!t) return err(404, 'Not found in deleted customers.', 'not_found');
      if (route === 'customer-erase') { await eraseTrash(tid, t); return ok({ ok: true }); }
      if (db['bookings/' + t.owner] || (t.name && nameTaken(db, t.name, t.owner))) return err(409, 'This customer has made a new account since they were deleted. Restoring would mix the old and new accounts. You can delete the old one permanently instead.', 'conflict');
      for (const p in t.docs || {}) {
        let d = t.docs[p];
        if (p.startsWith('accounts/') && d.user && Object.keys(db).some(k => k.startsWith('accounts/') && db[k].user === d.user)) d = { ...d, user: freeUser(db, d.user.replace(/-\d+$/, ''), t.owner) };   /* someone took the username meanwhile */
        await put(p, d);
      }
      await reown(fileIdsOf(t.docs || {}), t.owner);
      if (t.licKey) { const lic = await store.getLicense(t.licKey); if (lic && !(await store.getLicense(t.owner))) await store.setLicense(t.owner, lic); await store.delLicense(t.licKey); }
      await syncBlocks({ ['bookings/' + t.owner]: t.docs['bookings/' + t.owner] }, t.owner);
      await put('trash/' + tid, null);
      return ok({ ok: true });
    }
    if (route === 'map-resolve') {
      /* opens a short Google Maps link (maps.app.goo.gl/...) to find the full link with the pin; Google addresses only */
      if (a.role !== 'admin') return err(403, 'Only the admin can do that.');
      let url = String(body.url || '');
      const okHost = u => { try { const h = new URL(u).hostname; return new URL(u).protocol === 'https:' && (/^(maps\.app\.goo\.gl|goo\.gl)$/.test(h) || /(^|\.)google\.[a-z.]+$/.test(h)); } catch (e) { return false; } };
      if (!/^https:\/\/(maps\.app\.goo\.gl|goo\.gl)\/\S+$/.test(url) || !okHost(url)) return err(400, 'Only short Google Maps links can be read.');
      try {
        for (let i = 0; i < 6; i++) {
          const r = await fetch(url, { redirect: 'manual', headers: { 'user-agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
          const loc = r.headers.get('location');
          if (!loc) break;
          let next = new URL(loc, url).toString();
          const cont = new URL(next).searchParams.get('continue');
          if (/consent\.google/.test(next) && cont) next = cont;
          if (!okHost(next)) break;
          url = next;
          if (/@-?\d+\.\d+,-?\d+\.\d+|!3d-?\d+\.\d+/.test(url)) break;
        }
      } catch (e) { return ok({ url: '' }); }
      return ok({ url: /google\./.test(new URL(url).hostname) ? url.slice(0, 1500) : '' });
    }
    if (route === 'upload') {
      if (a.role !== 'admin') return err(403, 'Only the admin can upload photos.');
      const type = String(body.type || '');
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type)) return err(400, 'Upload a JPG, PNG, WebP or GIF photo.');
      const buf = Buffer.from(String(body.data || ''), 'base64');
      if (!buf.length) return err(400, 'The photo is empty.');
      if (buf.length > 4 * 1024 * 1024) return err(400, 'That photo is too large. Use one under 4 MB.');
      return ok({ id: await photos.save(buf, type) });
    }
    if (route === 'upload-delete') {
      if (a.role !== 'admin') return err(403, 'Only the admin can delete photos.');
      await photos.remove(String(body.id || ''));
      return ok({ ok: true });
    }
    return err(404, 'Not found.');
  }

  return { handle, authOf, canRead, publicView };
}

module.exports = { createApi, canRead, viewOf, SAMPLE_CARS, norm };
