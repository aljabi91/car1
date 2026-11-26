/*
 * Car Rental System on Vercel.
 * Data is saved in Upstash Redis (from the Vercel Marketplace) and photos in Vercel Blob,
 * because Vercel functions cannot keep files they write.
 * vercel.json sends every /api/... request here.
 */
const crypto = require('crypto');
const { createApi, SAMPLE_CARS } = require('../lib/core');

/* Finds the connection settings even if Vercel added a prefix to their names (e.g. MYDB_KV_REST_API_URL) */
const envEnding = (...ends) => { for (const e of ends) { if (process.env[e]) return process.env[e]; const k = Object.keys(process.env).find(n => n.endsWith('_' + e) && process.env[n]); if (k) return process.env[k]; } return ''; };
const R_URL = envEnding('KV_REST_API_URL', 'UPSTASH_REDIS_REST_URL');
const R_TOKEN = envEnding('KV_REST_API_TOKEN', 'UPSTASH_REDIS_REST_TOKEN');
const BLOB_TOKEN = envEnding('BLOB_READ_WRITE_TOKEN');
/* A connected Blob store gives either a read-write token, or BLOB_STORE_ID with Vercel's automatic sign-in (OIDC) */
const BLOB_ON = !!(BLOB_TOKEN || process.env.BLOB_STORE_ID);
const blobOpts = () => (BLOB_TOKEN ? { token: BLOB_TOKEN } : {});
const HASH = 'cr:db';

async function redis(cmd) {
  const r = await fetch(R_URL, { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}` }, body: JSON.stringify(cmd) });
  const j = await r.json();
  if (j.error) throw new Error('Redis: ' + j.error);
  return j.result;
}
async function pipeline(cmds) {
  const r = await fetch(R_URL + '/pipeline', { method: 'POST', headers: { Authorization: `Bearer ${R_TOKEN}` }, body: JSON.stringify(cmds) });
  const j = await r.json();
  const bad = Array.isArray(j) ? j.find(x => x.error) : j;
  if (!Array.isArray(j) || bad) throw new Error('Redis: ' + ((bad && bad.error) || 'pipeline failed'));
  return j.map(x => x.result);
}

let seeded = false, secret = process.env.SESSION_SECRET || null;
const store = {
  async all() {
    const flat = (await redis(['HGETALL', HASH])) || [];
    const out = {};
    for (let i = 0; i < flat.length; i += 2) { try { out[flat[i]] = JSON.parse(flat[i + 1]); } catch (e) {} }
    if (!Object.keys(out).length && !seeded) {
      seeded = true;
      if (await redis(['SET', 'cr:seeded', '1', 'NX'])) {
        await pipeline(SAMPLE_CARS.map(([p, d]) => ['HSET', HASH, p, JSON.stringify(d)]));
        for (const [p, d] of SAMPLE_CARS) out[p] = d;
      }
    }
    return out;
  },
  async get(p) { const v = await redis(['HGET', HASH, p]); return v ? JSON.parse(v) : null; },
  async set(p, d) { await pipeline([['HSET', HASH, p, JSON.stringify(d)], ['INCR', 'cr:ver']]); },
  async del(p) { await pipeline([['HDEL', HASH, p], ['INCR', 'cr:ver']]); },
  async getLicense(id) { return (await redis(['HGET', 'cr:lic', id])) || ''; },
  async setLicense(id, img) { await redis(['HSET', 'cr:lic', id, img]); },
  async delLicense(id) { await redis(['HDEL', 'cr:lic', id]); },
  async version() { return +(await redis(['GET', 'cr:ver'])) || 0; },
  async secret() {
    if (secret) return secret;
    await redis(['SET', 'cr:secret', crypto.randomBytes(32).toString('hex'), 'NX']);
    secret = await redis(['GET', 'cr:secret']);
    return secret;
  },
  async tooMany(ip) {
    const key = 'cr:rl:' + String(ip || '?').replace(/[^0-9a-fA-F:.]/g, '') + ':' + Math.floor(Date.now() / 60000);
    const [n] = await pipeline([['INCR', key], ['EXPIRE', key, 120]]);
    return n > 10;
  }
};

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const userError = msg => Object.assign(new Error(msg), { userMessage: msg });
/*
 * Photos go to Vercel Blob when it is connected. If it isn't (or an upload fails),
 * the photo is kept in the Upstash Redis database instead, so saving never breaks.
 */
const photos = {
  async save(buf, type) {
    if (BLOB_ON) {
      try {
        const { put } = require('@vercel/blob');
        const blob = await put(`car-rental/${crypto.randomBytes(8).toString('hex')}.${EXT[type]}`, buf, { access: 'public', contentType: type, ...blobOpts() });
        return blob.url;
      } catch (e) {
        console.error('Vercel Blob upload failed, keeping the photo in Redis instead:', e && e.message);
      }
    }
    if (buf.length > 900 * 1024) throw userError('That photo is too large to save. Choose a smaller photo, under 900 KB.');
    const id = `rimg-${crypto.randomBytes(8).toString('hex')}.${EXT[type]}`;
    await redis(['HSET', 'cr:img', id, JSON.stringify({ t: type, d: buf.toString('base64') })]);
    return id;
  },
  async remove(id) {
    if (/^rimg-[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(id)) { await redis(['HDEL', 'cr:img', id]).catch(() => {}); return; }
    if (!/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(id) || !BLOB_ON) return;
    const { del } = require('@vercel/blob');
    await del(id, blobOpts()).catch(() => {});
  }
};

const api = createApi({ store, photos, live: false });

module.exports = async (req, res) => {
  res.setHeader('cache-control', 'no-store');
  const route0 = String((req.query && req.query.route) || '').replace(/^\/+|\/+$/g, '');
  if (route0 === 'ping') return res.status(200).json({ app: 'car-rental', live: false, ready: !!(R_URL && R_TOKEN), photoStore: BLOB_ON ? 'vercel-blob' : 'database', problem: R_URL && R_TOKEN ? '' : 'The database is not connected yet. In Vercel, open this project, go to Storage, add Upstash Redis, then redeploy.' });
  if (route0 === 'img' && R_URL && R_TOKEN) {
    const id = String((req.query && req.query.id) || '');
    if (!/^rimg-[a-f0-9]{16}\.(jpg|png|webp|gif)$/.test(id)) return res.status(404).end();
    try {
      const v = await redis(['HGET', 'cr:img', id]);
      if (!v) return res.status(404).end();
      const { t, d } = JSON.parse(v);
      res.setHeader('content-type', t); res.setHeader('cache-control', 'public, max-age=31536000, immutable');
      return res.status(200).end(Buffer.from(d, 'base64'));
    } catch (e) { console.error(e); return res.status(500).end(); }
  }
  if (!R_URL || !R_TOKEN) return res.status(500).json({ error: 'The database is not connected yet. In Vercel, add Upstash Redis to this project (Storage tab), then redeploy.', code: 'unavailable' });
  const route = String((req.query && req.query.route) || new URL(req.url, 'http://x').pathname.replace(/^\/api\/?/, '')).replace(/^\/+|\/+$/g, '');
  let body = {};
  if (req.method === 'POST') { try { body = req.body || {}; } catch (e) { return res.status(400).json({ error: 'Bad request.' }); } }
  try {
    const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket?.remoteAddress;
    const r = await api.handle({ route, method: req.method, token: req.headers['x-token'], ip, body });
    res.status(r.status).json(r.json);
  } catch (e) {
    console.error(e);
    if (e && e.userMessage) return res.status(400).json({ error: e.userMessage, code: 'invalid_argument' });
    const m = String((e && e.message) || e);
    res.status(500).json({ error: m.startsWith('Redis') ? (/max.*(request|size)|too large|exceed/i.test(m) ? 'That is too large for the database. Use a smaller photo.' : 'Could not reach the database. Check the Upstash Redis connection in Vercel.') : 'Something went wrong on the server: ' + m.slice(0, 160), code: 'unavailable' });
  }
};
