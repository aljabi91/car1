/*
 * Run the Car Rental System on your own computer.
 * Saves everything in the data/ folder. Start with:  node run-local.js
 * Phones and laptops on the same Wi-Fi open the address it prints.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { createApi, canRead, SAMPLE_CARS } = require('./lib/core');

const PORT = +process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const DATA = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS = path.join(DATA, 'uploads');
const DB_FILE = path.join(DATA, 'db.json');
const LICENSES = path.join(DATA, 'licenses');
fs.mkdirSync(UPLOADS, { recursive: true });
fs.mkdirSync(LICENSES, { recursive: true });

/* ---------- file storage ---------- */
let db = {};
try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); } catch (e) { db = {}; }
let ver = Date.now();
const save = () => { const tmp = DB_FILE + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(db, null, 1)); fs.renameSync(tmp, DB_FILE); };
if (!Object.keys(db).length) { for (const [p, d] of SAMPLE_CARS) db[p] = d; save(); }
let SECRET;
try { SECRET = fs.readFileSync(path.join(DATA, 'secret.key'), 'utf8').trim(); } catch (e) { SECRET = crypto.randomBytes(32).toString('hex'); fs.writeFileSync(path.join(DATA, 'secret.key'), SECRET); }
const tries = new Map();
const store = {
  all: async () => db,
  get: async p => db[p] || null,
  set: async (p, d) => { db[p] = d; ver++; save(); },
  del: async p => { delete db[p]; ver++; save(); },
  secret: async () => SECRET,
  version: async () => ver,
  getLicense: async id => { try { return fs.readFileSync(path.join(LICENSES, id + '.txt'), 'utf8'); } catch (e) { return ''; } },
  setLicense: async (id, img) => { fs.writeFileSync(path.join(LICENSES, id + '.txt'), img); },
  delLicense: async id => { fs.rmSync(path.join(LICENSES, id + '.txt'), { force: true }); },
  tooMany: async (ip, kind = 'login', max = 10) => { const k = kind + ':' + ip; const now = Date.now(); const t = (tries.get(k) || []).filter(x => now - x < 60000); t.push(now); tries.set(k, t); return t.length > max; }
};
const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };
const photos = {
  save: async (buf, type) => { const id = 'up-' + crypto.randomBytes(8).toString('hex') + EXT[type]; fs.writeFileSync(path.join(UPLOADS, id), buf); return id; },
  remove: async id => { if (/^up-[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(id)) fs.rmSync(path.join(UPLOADS, id), { force: true }); }
};

/* ---------- live updates ---------- */
const clients = new Set();
async function onChange(p, doc) {
  for (const c of clients) {
    if (!canRead(c.a, p)) continue;
    const [path2, doc2] = await api.publicView(c.a, p, doc);
    c.res.write('data: ' + JSON.stringify({ path: path2, doc: doc2 }) + '\n\n');
  }
}
setInterval(() => { for (const c of clients) c.res.write(': ping\n\n'); }, 25000);

const api = createApi({ store, photos, onChange, live: true });

/* ---------- http ---------- */
/* Same browser rules as vercel.json: only this site's own scripts may run */
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https://*.blob.vercel-storage.com; connect-src 'self' data: blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'";
const SAFE = { 'x-content-type-options': 'nosniff', 'x-frame-options': 'DENY', 'referrer-policy': 'same-origin', 'content-security-policy': CSP };
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
function readBody(req, max) {
  return new Promise((resolve, reject) => {
    const chunks = []; let n = 0;
    req.on('data', c => { n += c.length; if (n > max) { reject(new Error('too big')); req.destroy(); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}
http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const p = url.pathname;
  try {
    if (p === '/api/events') {
      const a = await api.authOf(url.searchParams.get('t'));
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-store', connection: 'keep-alive' });
      res.write('retry: 3000\n\n');
      const c = { a, res }; clients.add(c); req.on('close', () => clients.delete(c));
      return;
    }
    if (p.startsWith('/api/')) {
      let body = {};
      if (req.method === 'POST') { const raw = await readBody(req, 8 * 1024 * 1024).catch(() => null); if (!raw) { res.writeHead(413); return res.end(); } try { body = JSON.parse(raw.toString() || '{}'); } catch (e) { body = {}; } }
      const r = await api.handle({ route: p.slice(5), method: req.method, token: req.headers['x-token'], ip: req.socket.remoteAddress, body });
      res.writeHead(r.status, { ...SAFE, 'content-type': 'application/json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify(r.json));
    }
    const up = /^\/uploads\/(up-[a-f0-9]{16}\.(jpg|png|webp|gif))$/.exec(p);
    if (up) {
      const f = path.join(UPLOADS, up[1]);
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { ...SAFE, 'content-type': TYPES[path.extname(f)], 'cache-control': 'public, max-age=31536000, immutable' });
      return fs.createReadStream(f).pipe(res);
    }
    const f = path.normalize(path.join(PUB, decodeURIComponent(p === '/' ? '/index.html' : p)));
    if (!f.startsWith(PUB) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('Not found'); }
    res.writeHead(200, { ...SAFE, 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
    fs.createReadStream(f).pipe(res);
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.writeHead(500, { 'content-type': 'application/json' }); res.end(JSON.stringify({ error: 'Something went wrong on the server.', code: 'unavailable' })); }
  }
}).listen(PORT, () => {
  console.log('\n  Car Rental System is running.\n');
  console.log(`  On this computer:   http://localhost:${PORT}`);
  for (const list of Object.values(os.networkInterfaces())) for (const n of list || []) if (n.family === 'IPv4' && !n.internal) console.log(`  Phones and laptops on the same Wi-Fi:   http://${n.address}:${PORT}`);
  console.log(`\n  Everything is saved in: ${DATA}`);
  console.log('  Keep this window open while people use the system. Press Ctrl+C to stop.\n');
});
