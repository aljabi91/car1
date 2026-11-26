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
const adminHash = pass => crypto.createHash('sha256').update('cr-admin:' + pass).digest('hex');
const LIVE = ['pending', 'approved', 'active'];
const SEG = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;
const okPath = p => { const s = String(p || '').split('/'); return s.length === 2 && s.every(x => SEG.test(x) && x !== '.' && x !== '..'); };
const DEF_SET = { extras: [{ id: 'driver', label: 'With a driver', perDay: 1500, driver: true }, { id: 'seat', label: 'Child car seat', perDay: 200, driver: false }, { id: 'xdriver', label: 'Additional driver on the contract', perDay: 300, driver: false }], delivery: 500, cancelDays: 2 };
function settingsOf(db) {
  const x = db['settings/main'] || {};
  return { extras: Array.isArray(x.extras) ? x.extras : DEF_SET.extras, delivery: x.delivery !== undefined ? +x.delivery : DEF_SET.delivery, cancelDays: x.cancelDays !== undefined ? +x.cancelDays : DEF_SET.cancelDays };
}
/* "2026-11-27T09:00" as typed on the customer's phone, read in that phone's time zone */
function localTime(s, tz) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(s || ''));
  if (!m) return NaN;
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  return Number.isFinite(+tz) ? utc + (+tz) * 60000 : new Date(s).getTime();
}
const days = (a, b) => { const ms = localTime(b, 0) - localTime(a, 0); return ms > 0 ? Math.max(1, Math.ceil(ms / 864e5 - 1 / 24)) : 0; };
const slim = items => items.map(b => ({ id: b.id, carId: b.carId, start: b.start, end: b.end, status: b.status }));

const SAMPLE_CARS = [['vios','Toyota','Vios 1.3 XLE',2024,'Sedan',5,'Automatic','Gasoline','#c0392b',1800,3000,'NDA 4521','Easy on fuel and easy to park. Good for city trips and airport runs.','available'],
  ['mirage','Mitsubishi','Mirage G4',2023,'Sedan',5,'Manual','Gasoline','#e6e6e6',1500,3000,'NCE 2287','Our lowest rate. Light and simple to drive.','available'],
  ['wigo','Toyota','Wigo G',2024,'Hatchback',5,'Automatic','Gasoline','#f39c12',1400,2000,'NGB 7734','Small hatchback for narrow streets and quick errands.','available'],
  ['fortuner','Toyota','Fortuner 2.8 LTD',2024,'SUV',7,'Automatic','Diesel','#2c3e50',4500,10000,'NHQ 9012','High ground clearance for provincial roads and mountain trips.','available'],
  ['innova','Toyota','Innova 2.8 E',2023,'MPV / Van',8,'Automatic','Diesel','#7f8c8d',3200,5000,'NBF 3390','Room for the whole family and their luggage.','available'],
  ['hiace','Toyota','Hiace GL Grandia',2022,'MPV / Van',12,'Manual','Diesel','#ffffff',5500,10000,'NAZ 6158','For group tours and company outings. Best booked with a driver.','maintenance']]
  .map(([id, brand, name, year, type, seats, trans, fuel, color, rate, deposit, plate, desc, status], i) => ['cars/car-' + id, { brand, name, year, type, seats, trans, fuel, color, rate, deposit, plate, desc, status, imageId: '', createdAt: Date.now() + i }]);

/* ---------- who may read and write ---------- */
const PUBLIC = ['cars', 'gallery', 'drivers', 'settings', 'blocks'];
function canRead(a, p) {
  const [col, id] = p.split('/');
  if (PUBLIC.includes(col)) return true;
  if (a.role === 'admin') return true;
  if (a.role === 'customer' && ['bookings', 'chats', 'replies'].includes(col)) return id === a.uid;
  return false;
}
const CUST_KEYS = ['status', 'name', 'phone', 'email', 'address', 'license', 'emergency', 'cid', 'updatedAt'];
function checkCustomerBookings(db, oldDoc, newDoc) {
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
    if (o.status !== b.status) {
      if (!(['pending', 'approved'].includes(o.status) && b.status === 'cancelled')) return 'Only the office can change the booking status.';
      if (Date.now() >= localTime(o.start, o.tz) - cd * 864e5) return `Cancellation is only possible up to ${cd} day(s) before pickup. Message the office.`;
    }
  }
  return '';
}

/*
 * store: { all(), get(p), set(p, doc), del(p), secret(), tooMany(ip), version() }
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
  async function put(p, doc) { if (doc === null) await store.del(p); else await store.set(p, doc); onChange(p, doc); }
  async function syncBlocks(db, id) { const b = db['bookings/' + id]; const doc = b ? { items: slim(b.items || []) } : null; db['blocks/' + id] = doc; await put('blocks/' + id, doc); }
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
    if (route === 'db') { const db = await store.all(); const docs = {}; for (const p in db) if (canRead(a, p)) docs[p] = db[p]; return ok({ docs, v: await store.version() }); }
    if (method !== 'POST') return err(405, 'Use POST.');
    body = body && typeof body === 'object' ? body : {};

    if (route === 'login') {
      if (await store.tooMany(ip)) return err(429, 'Too many tries. Wait a minute and try again.');
      const { name, pass } = body;
      const db = await store.all();
      const cfg = db['admin/config'];
      const isAdmin = cfg && cfg.user && cfg.hash ? norm(cfg.user) === norm(name) && cfg.hash === adminHash(String(pass || '')) : norm(name) === 'admin1' && pass === 'admin123';
      if (isAdmin) { const n = (cfg && cfg.user) || 'admin1'; return ok({ token: await sign({ role: 'admin', uid: 'admin', name: n }), role: 'admin', uid: 'admin', name: n }); }
      if (/^\d{4}$/.test(String(pass || ''))) {
        for (const key in db) {
          if (!key.startsWith('bookings/')) continue;
          const m = (db[key].items || []).find(b => norm(b.name) === norm(name) && last4(b.phone) === pass);
          if (m) { const o = { role: 'customer', uid: key.split('/')[1], cid: cidOf(m), name: m.name }; return ok({ token: await sign(o), ...o }); }
        }
      }
      return err(403, 'bad');
    }

    if (route === 'book') {
      const b = body.booking;
      if (!b || typeof b !== 'object') return err(400, 'Missing booking.');
      const db = await store.all();
      const car = db['cars/' + b.carId];
      if (!car) return err(400, 'That car is no longer listed.');
      if (car.status !== 'available' && a.role !== 'admin') return err(409, 'That car is not available right now.');
      if (['name', 'phone', 'address', 'license', 'start', 'end'].some(k => !String(b[k] || '').trim())) return err(400, 'Fill in all required details.');
      if (String(b.phone).replace(/\D/g, '').length < 7) return err(400, 'Enter a valid mobile number.');
      const n = days(b.start, b.end);
      if (!n) return err(400, 'Return must be after pickup.');
      const clash = Object.keys(db).filter(k => k.startsWith('blocks/')).flatMap(k => db[k].items || []).find(x => x.carId === b.carId && LIVE.includes(x.status) && x.start < b.end && b.start < x.end);
      if (clash) return err(409, 'Someone has just booked this car on those dates. Choose other dates.');
      const st = settingsOf(db);
      const ex = st.extras.filter(x => (b.extras || []).includes(x.label));
      const exDay = ex.reduce((s, x) => s + (+x.perDay || 0), 0);
      const del = b.pickup === 'delivery' ? st.delivery : 0;
      let docId = null, cid = null;
      for (const key in db) {
        if (!key.startsWith('bookings/')) continue;
        const m = (db[key].items || []).find(x => norm(x.name) === norm(b.name) && last4(x.phone) === last4(b.phone));
        if (m) { docId = key.split('/')[1]; cid = cidOf(m); break; }
      }
      if (!docId) { docId = tk(norm(b.name), last4(b.phone)); cid = docId; }
      const item = {
        id: SEG.test(String(b.id || '')) ? b.id : crypto.randomBytes(5).toString('hex'),
        ref: /^CR-[A-Z0-9]{3,10}$/.test(String(b.ref || '')) ? b.ref : 'CR-' + crypto.randomBytes(3).toString('hex').toUpperCase(),
        cid, carId: b.carId, carName: `${car.brand || ''} ${car.name || ''}`.trim(), plate: car.plate || '',
        name: String(b.name).trim().replace(/\s+/g, ' ').slice(0, 120), phone: String(b.phone).slice(0, 40), email: String(b.email || '').slice(0, 120),
        address: String(b.address).slice(0, 400), license: String(b.license).slice(0, 60), emergency: String(b.emergency || '').slice(0, 160),
        start: String(b.start).slice(0, 16), end: String(b.end).slice(0, 16), days: n,
        rate: +car.rate || 0, extras: ex.map(x => x.label), extrasDetail: ex.map(x => ({ label: x.label, perDay: +x.perDay || 0, driver: !!x.driver })),
        extrasPerDay: exDay, pickup: b.pickup === 'delivery' ? 'delivery' : 'office', delivery: del,
        total: n * ((+car.rate || 0) + exDay) + del, deposit: +car.deposit || 0, notes: String(b.notes || '').slice(0, 1000),
        status: 'pending', createdAt: Date.now()
      };
      if (Number.isFinite(+b.tz)) item.tz = +b.tz;
      const cur = db['bookings/' + docId] || { items: [] };
      db['bookings/' + docId] = { items: [...(cur.items || []), item], updatedAt: Date.now() };
      await put('bookings/' + docId, db['bookings/' + docId]);
      await syncBlocks(db, docId);
      return ok({ ok: true, booking: item });
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
      if (['cars', 'gallery', 'drivers', 'settings', 'admin', 'replies'].includes(col)) { if (!admin) return err(403, 'Only the admin can change that.'); }
      else if (col === 'bookings') {
        if (!admin) {
          if (a.role !== 'customer' || a.uid !== id || op === 'delete') return err(403, 'Log in to change your bookings.');
          const db = await store.all();
          const why = checkCustomerBookings(db, cur, next); if (why) return err(403, why);
          next = { items: next.items, updatedAt: Date.now() };
        }
      } else if (col === 'chats') { if (!admin && !(a.role === 'customer' && a.uid === id)) return err(403, 'Log in to send messages.'); }
      else return err(403, 'Not allowed.');
      await put(dp, next);
      if (col === 'bookings') { const db = { [dp]: next }; await syncBlocks(db, id); }
      return ok({ ok: true });
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

  return { handle, authOf, canRead };
}

module.exports = { createApi, canRead, SAMPLE_CARS, norm };
