'use strict';
/*
 * Coffee shop ordering server — customer API + staff dashboard API.
 *
 * Modes:
 *   - Demo pay (default): orders are placed instantly with no real charge.
 *   - Stripe: set STRIPE_SECRET_KEY (sk_test_... or sk_live_...) and orders
 *     go through Stripe Checkout; the order is created only after payment.
 *
 * Env vars:
 *   PORT           (default 3000)
 *   STRIPE_SECRET_KEY   enables real payments when set
 *   DASHBOARD_PIN  staff login PIN (default 1234 — CHANGE FOR A REAL SHOP)
 *   PUBLIC_URL     public base URL, needed for Stripe redirects
 *   DATA_DIR       where db.json lives (default ./data)
 */

const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const PIN = process.env.DASHBOARD_PIN || '1234';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const STRIPE_KEY = process.env.STRIPE_SECRET_KEY || '';
const stripe = STRIPE_KEY ? require('stripe')(STRIPE_KEY) : null;

/* ---------------- Seed config (edited later via dashboard / db.json) ------ */
const SEED = {
  shop: {
    name: 'Bluebird Coffee Co.',
    address: '213 Harbor St.',
    hours: 'Open · closes 6:00 pm',
    earnRate: 2,            // stars per $1
    taxRate: 0.08,
    giftCards: { enabled: true, amounts: [10, 25, 50] },
    tiers: [
      { pts: 50,  name: 'Free drip coffee',      desc: 'Any size brewed coffee, on us',        grants: 'drip' },
      { pts: 100, name: 'Free bakery item',      desc: 'Muffin, croissant, cookie — you pick', grants: 'croissant' },
      { pts: 150, name: 'Any handcrafted drink', desc: 'Lattes, mochas, cold brew… anything',  grants: 'latte' },
    ],
    deals: [
      { ic: '✨', t: 'Double-Star Tuesdays', d: 'Every order earns 4★ per $1 all day Tuesday' },
      { ic: '🕑', t: 'Happy Hour 2–4 pm',    d: '$1 off any cold drink, every weekday' },
      { ic: '🎂', t: 'Birthday drink on us', d: 'Any handcrafted drink free during your birthday week' },
    ],
    sizes:  [ { n: 'Small', d: 0 }, { n: 'Medium', d: 0.5 }, { n: 'Large', d: 0.9 } ],
    milks:  [ { n: 'Whole', d: 0 }, { n: '2%', d: 0 }, { n: 'Oat', d: 0.75 }, { n: 'Almond', d: 0.75 } ],
    extras: [ { n: 'Extra shot', d: 1 }, { n: 'Vanilla', d: 0.6 }, { n: 'Caramel', d: 0.6 }, { n: 'Honey', d: 0.5 } ],
  },
  menu: [
    { id:'latte',     cat:'Espresso',      name:'Café Latte',         desc:'Double shot, silky steamed milk',     price:4.75, ic:'☕', warm:true,  sized:true,  milk:true,  available:true },
    { id:'capp',      cat:'Espresso',      name:'Cappuccino',         desc:'Equal parts espresso, milk, foam',    price:4.50, ic:'☕', warm:true,  sized:true,  milk:true,  available:true },
    { id:'mocha',     cat:'Espresso',      name:'Bluebird Mocha',     desc:'House dark chocolate + espresso',     price:5.25, ic:'🍫', warm:true,  sized:true,  milk:true,  available:true },
    { id:'flat',      cat:'Espresso',      name:'Flat White',         desc:'Ristretto shots, velvet microfoam',   price:4.95, ic:'☕', warm:true,  sized:false, milk:true,  available:true },
    { id:'esp',       cat:'Espresso',      name:'Espresso',           desc:'Double shot, house blend',            price:3.00, ic:'⚡', warm:true,  sized:false, milk:false, available:true },
    { id:'drip',      cat:'Brewed & Cold', name:'Drip Coffee',        desc:'Rotating single origin',              price:2.95, ic:'🫖', warm:true,  sized:true,  milk:false, available:true },
    { id:'coldbrew',  cat:'Brewed & Cold', name:'Cold Brew',          desc:'Steeped 18 hours, extra smooth',      price:4.50, ic:'🧊', warm:false, sized:true,  milk:false, available:true },
    { id:'icedlatte', cat:'Brewed & Cold', name:'Iced Latte',         desc:'Double shot over ice + cold milk',    price:4.95, ic:'🥤', warm:false, sized:true,  milk:true,  available:true },
    { id:'chai',      cat:'Tea & More',    name:'Chai Latte',         desc:'Spiced black tea, steamed milk',      price:4.65, ic:'🍂', warm:true,  sized:true,  milk:true,  available:true },
    { id:'matcha',    cat:'Tea & More',    name:'Matcha Latte',       desc:'Ceremonial grade, lightly sweet',     price:5.25, ic:'🍵', warm:false, sized:true,  milk:true,  available:true },
    { id:'cocoa',     cat:'Tea & More',    name:'Hot Chocolate',      desc:'House dark chocolate, whipped cream', price:3.95, ic:'🍫', warm:true,  sized:true,  milk:true,  available:true },
    { id:'croissant', cat:'Bakery',        name:'Butter Croissant',   desc:'Baked every morning',                 price:3.75, ic:'🥐', warm:true,  sized:false, milk:false, available:true },
    { id:'muffin',    cat:'Bakery',        name:'Blueberry Muffin',   desc:'Local blueberries, crumble top',      price:3.50, ic:'🫐', warm:false, sized:false, milk:false, available:true },
    { id:'cookie',    cat:'Bakery',        name:'Sea-Salt Choc Chip', desc:'Big, chewy, still warm at 8am',       price:2.95, ic:'🍪', warm:true,  sized:false, milk:false, available:true },
  ],
  orders: [],       // { num, phone, name, lines, subtotal, tax, tip, total, earned, spent, status, placedAt }
  customers: {},    // phone -> { name, points, giftBalance, orders: [num], createdAt }
  giftcards: {},    // code -> { balance, amount, purchasedBy, createdAt, redeemedBy }
  seq: 100,
};

/* ---------------- Tiny JSON store with atomic writes --------------------- */
let db;
function loadDb() {
  try { db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8')); }
  catch (e) { db = JSON.parse(JSON.stringify(SEED)); saveDb(); }
  // additive migrations: pick up new seed fields
  for (const k of Object.keys(SEED)) if (db[k] === undefined) db[k] = SEED[k];
  if (!db.shop.giftCards) db.shop.giftCards = JSON.parse(JSON.stringify(SEED.shop.giftCards));
}
let saveTimer = null;
function saveDb() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db, null, 1));
    fs.renameSync(tmp, DB_FILE);
  }, 150);
}
loadDb();

/* ---------------- Helpers ------------------------------------------------ */
const r2 = n => Math.round(n * 100) / 100;
const normPhone = p => String(p || '').replace(/\D/g, '').slice(-10);
function itemById(id) { return db.menu.find(m => m.id === id); }

function priceLine(l) {
  const it = itemById(l.id);
  if (!it || !it.available) return null;
  if (l.redeem) return 0;
  let p = it.price;
  if (it.sized && l.size != null) p += (db.shop.sizes[l.size] || { d: 0 }).d;
  if (it.milk && l.milk != null) p += (db.shop.milks[l.milk] || { d: 0 }).d;
  for (const i of l.extras || []) p += (db.shop.extras[i] || { d: 0 }).d;
  return r2(p * Math.max(1, Math.min(9, l.qty | 0)));
}

// Validate a cart server-side; returns {lines, subtotal, redeemPts} or {error}
function priceCart(rawLines, customer) {
  if (!Array.isArray(rawLines) || !rawLines.length || rawLines.length > 30) return { error: 'Cart is empty or invalid.' };
  const lines = []; let subtotal = 0, redeemPts = 0;
  for (const raw of rawLines) {
    const it = itemById(raw.id);
    if (!it) return { error: 'Unknown menu item.' };
    if (!it.available) return { error: `${it.name} is sold out — please remove it.` };
    const l = {
      id: it.id, qty: Math.max(1, Math.min(9, raw.qty | 0)),
      size: it.sized ? (raw.size | 0) : null,
      milk: it.milk ? (raw.milk | 0) : null,
      extras: (raw.extras || []).map(Number).filter(i => db.shop.extras[i]),
      redeem: 0,
    };
    if (raw.redeem) {
      const tier = db.shop.tiers.find(t => t.pts === +raw.redeem && t.grants === it.id);
      if (!tier) return { error: 'Invalid reward redemption.' };
      l.redeem = tier.pts; l.qty = 1; redeemPts += tier.pts;
    }
    const p = priceLine(l);
    if (p == null) return { error: 'Could not price an item.' };
    subtotal += p;
    lines.push(l);
  }
  if (redeemPts) {
    const pts = customer ? customer.points : 0;
    if (pts < redeemPts) return { error: 'Not enough stars for that reward.' };
  }
  return { lines, subtotal: r2(subtotal), redeemPts };
}

function createOrder({ lines, subtotal, redeemPts, tipPct, pickup, phone, name, giftApplied }) {
  const tip = r2(subtotal * (tipPct || 0));
  const tax = r2(subtotal * db.shop.taxRate);
  const total = r2(subtotal + tax + tip);
  const earned = Math.floor(subtotal * db.shop.earnRate);
  const num = ++db.seq;
  let c = db.customers[phone];
  if (!c) c = db.customers[phone] = { name, points: 0, orders: [], createdAt: Date.now() };
  if (!c.token) c.token = crypto.randomBytes(16).toString('hex');
  const gift = r2(Math.min(giftApplied || 0, c.giftBalance || 0, total));
  const order = {
    num, phone, name, lines, subtotal, tax, tip, total,
    earned, spent: redeemPts, giftApplied: gift, pickup: pickup || 'ASAP',
    status: 0, placedAt: Date.now(),
  };
  db.orders.push(order);
  if (db.orders.length > 500) db.orders = db.orders.slice(-400);
  c.name = name || c.name;
  c.points = c.points - redeemPts + earned;
  if (gift) c.giftBalance = r2((c.giftBalance || 0) - gift);
  c.orders.push(num);
  saveDb();
  return order;
}

function genGiftCode() {
  const s = () => crypto.randomBytes(2).toString('hex').toUpperCase();
  let code;
  do { code = 'BB-' + s() + '-' + s(); } while (db.giftcards[code]);
  return code;
}

function staffLine(l) {
  const it = itemById(l.id);
  const parts = [];
  if (it && it.sized && l.size != null && db.shop.sizes[l.size]) parts.push(db.shop.sizes[l.size].n);
  if (it && it.milk && l.milk != null && db.shop.milks[l.milk] && db.shop.milks[l.milk].n !== 'Whole') parts.push(db.shop.milks[l.milk].n + ' milk');
  for (const i of l.extras || []) if (db.shop.extras[i]) parts.push(db.shop.extras[i].n);
  return { ...l, itemName: it ? it.name : l.id, modsText: parts.join(' · ') };
}
const staffOrder = o => ({ ...o, lines: o.lines.map(staffLine) });

const publicOrder = o => ({
  num: o.num, lines: o.lines, subtotal: o.subtotal, tax: o.tax, tip: o.tip,
  total: o.total, earned: o.earned, spent: o.spent, giftApplied: o.giftApplied || 0,
  status: o.status, pickup: o.pickup, placedAt: o.placedAt,
});

/* ---------------- App ---------------------------------------------------- */
const app = express();
app.set('trust proxy', 1); // Railway/Render terminate TLS in front of us
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.set({ 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'no-referrer' });
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Simple in-memory rate limiter (per-IP buckets)
const buckets = new Map();
setInterval(() => buckets.clear(), 60 * 60 * 1000).unref();
function allow(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, t: now };
  if (now - b.t > windowMs) { b.n = 0; b.t = now; }
  b.n++;
  buckets.set(key, b);
  return b.n <= max;
}

/* ---- Customer API ---- */
app.get('/api/shop', (req, res) => {
  const { name, address, hours, earnRate, tiers, deals, sizes, milks, extras, taxRate } = db.shop;
  res.json({
    name, address, hours, earnRate, tiers, deals, sizes, milks, extras, taxRate,
    giftCards: db.shop.giftCards || { enabled: false, amounts: [] },
    payMode: stripe ? 'stripe' : 'demo',
    menu: db.menu.filter(m => m.available),
  });
});

app.post('/api/customers/lookup', (req, res) => {
  if (!allow('lookup:' + req.ip, 30, 3600e3)) return res.status(429).json({ error: 'Too many lookups — try again later.' });
  const phone = normPhone(req.body.phone);
  if (phone.length !== 10) return res.status(400).json({ error: 'Enter a 10-digit phone number.' });
  const c = db.customers[phone];
  // Privacy: a bare phone number only reveals the star balance. Name and
  // order history require the device token issued when this phone ordered.
  if (!c || !req.body.token || req.body.token !== c.token) {
    return res.json({ phone, points: c ? c.points : 0 });
  }
  const orders = db.orders.filter(o => o.phone === phone).slice(-10).map(publicOrder);
  res.json({ phone, name: c.name, points: c.points, giftBalance: c.giftBalance || 0, orders });
});

// Pending carts awaiting Stripe payment: token -> {cart data, expires}
const pending = new Map();
setInterval(() => { const now = Date.now(); for (const [k, v] of pending) if (v.expires < now) pending.delete(k); }, 60000).unref();

app.post('/api/orders', async (req, res) => {
  if (!allow('order:' + req.ip, 60, 3600e3)) return res.status(429).json({ error: 'Too many orders from this connection — try again later.' });
  const { lines, tipPct, pickup } = req.body;
  const phone = normPhone(req.body.phone);
  const name = String(req.body.name || '').slice(0, 40).trim();
  if (phone.length !== 10 || !name) return res.status(400).json({ error: 'Name and a 10-digit phone number are required.' });
  const tp = [0, 0.10, 0.15, 0.20].includes(+tipPct) ? +tipPct : 0;
  const priced = priceCart(lines, db.customers[phone]);
  if (priced.error) return res.status(400).json({ error: priced.error });

  // Gift balance: spendable only from a device holding the customer's token
  let giftApplied = 0;
  const cust = db.customers[phone];
  const total = r2(priced.subtotal * (1 + db.shop.taxRate) + priced.subtotal * tp);
  if (req.body.useGift) {
    if (!cust || !req.body.token || req.body.token !== cust.token) {
      return res.status(400).json({ error: 'Gift balance can only be used from a device that has ordered or redeemed a card before.' });
    }
    giftApplied = r2(Math.min(cust.giftBalance || 0, total));
  }
  const data = { ...priced, tipPct: tp, pickup: String(pickup || 'ASAP').slice(0, 30), phone, name, giftApplied };

  if (!stripe || (giftApplied >= total && giftApplied > 0)) { // demo mode, or gift fully covers it
    const order = createOrder(data);
    const c = db.customers[phone];
    return res.json({ order: publicOrder(order), points: c.points, giftBalance: c.giftBalance || 0, token: c.token });
  }

  // Stripe mode: create a Checkout Session, finalize after payment
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const tip = r2(data.subtotal * tp), tax = r2(data.subtotal * db.shop.taxRate);
    let items;
    if (giftApplied > 0) {
      // Gift card partially covers the order: charge the remainder as one line
      items = [{ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round((total - giftApplied) * 100), product_data: { name: db.shop.name + ' order (gift card applied)' } } }];
    } else {
      items = data.lines.filter(l => !l.redeem).map(l => ({
        quantity: l.qty,
        price_data: {
          currency: 'usd',
          unit_amount: Math.round(priceLine(l) / l.qty * 100),
          product_data: { name: itemById(l.id).name },
        },
      }));
      if (tax > 0) items.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(tax * 100), product_data: { name: 'Sales tax' } } });
      if (tip > 0) items.push({ quantity: 1, price_data: { currency: 'usd', unit_amount: Math.round(tip * 100), product_data: { name: 'Tip' } } });
    }
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: items,
      success_url: `${base}/?finalize=${token}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?canceled=1`,
    });
    pending.set(token, { data, sessionId: session.id, expires: Date.now() + 30 * 60 * 1000 });
    res.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('stripe error', e.message);
    res.status(502).json({ error: 'Payment system error — please try again.' });
  }
});

app.post('/api/orders/finalize', async (req, res) => {
  const p = pending.get(String(req.body.token || ''));
  if (!p || p.type) return res.status(404).json({ error: 'Order session expired — please try again.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(p.sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not completed.' });
    pending.delete(req.body.token);
    const order = createOrder(p.data);
    const c = db.customers[p.data.phone];
    res.json({ order: publicOrder(order), points: c.points, giftBalance: c.giftBalance || 0, token: c.token });
  } catch (e) {
    console.error('finalize error', e.message);
    res.status(502).json({ error: 'Could not verify payment.' });
  }
});

/* ---- Gift cards ---- */
app.post('/api/giftcards/buy', async (req, res) => {
  const gc = db.shop.giftCards || {};
  if (!gc.enabled) return res.status(400).json({ error: 'This shop does not sell gift cards.' });
  if (!allow('gift:' + req.ip, 20, 3600e3)) return res.status(429).json({ error: 'Too many attempts — try again later.' });
  const amount = +req.body.amount;
  if (!gc.amounts.includes(amount)) return res.status(400).json({ error: 'Invalid gift card amount.' });
  const phone = normPhone(req.body.phone) || null;

  if (!stripe) { // demo: instant code
    const code = genGiftCode();
    db.giftcards[code] = { balance: amount, amount, purchasedBy: phone, createdAt: Date.now() };
    saveDb();
    return res.json({ code, amount });
  }
  try {
    const token = crypto.randomBytes(16).toString('hex');
    const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ quantity: 1, price_data: { currency: 'usd', unit_amount: amount * 100, product_data: { name: db.shop.name + ' digital gift card' } } }],
      success_url: `${base}/?giftfinalize=${token}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/?canceled=1`,
    });
    pending.set(token, { type: 'gift', amount, phone, sessionId: session.id, expires: Date.now() + 30 * 60 * 1000 });
    res.json({ checkoutUrl: session.url });
  } catch (e) {
    console.error('gift stripe error', e.message);
    res.status(502).json({ error: 'Payment system error — please try again.' });
  }
});

app.post('/api/giftcards/finalize', async (req, res) => {
  const p = pending.get(String(req.body.token || ''));
  if (!p || p.type !== 'gift') return res.status(404).json({ error: 'Purchase session expired.' });
  try {
    const session = await stripe.checkout.sessions.retrieve(p.sessionId);
    if (session.payment_status !== 'paid') return res.status(402).json({ error: 'Payment not completed.' });
    pending.delete(req.body.token);
    const code = genGiftCode();
    db.giftcards[code] = { balance: p.amount, amount: p.amount, purchasedBy: p.phone, createdAt: Date.now() };
    saveDb();
    res.json({ code, amount: p.amount });
  } catch (e) {
    res.status(502).json({ error: 'Could not verify payment.' });
  }
});

app.post('/api/giftcards/redeem', (req, res) => {
  if (!allow('redeem:' + req.ip, 20, 3600e3)) return res.status(429).json({ error: 'Too many attempts — try again later.' });
  const phone = normPhone(req.body.phone);
  const name = String(req.body.name || '').slice(0, 40).trim();
  if (phone.length !== 10) return res.status(400).json({ error: 'Enter a 10-digit phone number — your balance saves to it.' });
  const code = String(req.body.code || '').toUpperCase().replace(/\s/g, '');
  const card = db.giftcards[code];
  if (!card || card.balance <= 0) return res.status(404).json({ error: 'That code is invalid or already used.' });
  let c = db.customers[phone];
  if (!c) c = db.customers[phone] = { name, points: 0, orders: [], createdAt: Date.now() };
  if (!c.token) c.token = crypto.randomBytes(16).toString('hex');
  c.giftBalance = r2((c.giftBalance || 0) + card.balance);
  card.balance = 0; card.redeemedBy = phone; card.redeemedAt = Date.now();
  saveDb();
  res.json({ giftBalance: c.giftBalance, token: c.token });
});

app.get('/api/orders/:num', (req, res) => {
  const o = db.orders.find(o => o.num === +req.params.num);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  res.json(publicOrder(o));
});

/* ---- Staff API (PIN auth) ---- */
function staff(req, res, next) {
  const tok = req.get('x-staff-pin');
  if (tok !== PIN) return res.status(401).json({ error: 'Wrong PIN.' });
  next();
}
app.post('/api/staff/login', (req, res) => {
  if (!allow('pin:' + req.ip, 10, 15 * 60e3)) return res.status(429).json({ error: 'Too many attempts — wait 15 minutes.' });
  if (String(req.body.pin) !== PIN) return res.status(401).json({ error: 'Wrong PIN.' });
  res.json({ ok: true });
});
app.get('/api/staff/orders', staff, (req, res) => {
  const since = +req.query.since || 0;
  const active = db.orders.filter(o => o.status < 3 || o.placedAt > Date.now() - 2 * 3600e3);
  res.json({
    orders: active.slice(-100).reverse().map(staffOrder),
    newest: db.orders.length ? db.orders[db.orders.length - 1].placedAt : 0,
    hasNew: db.orders.some(o => o.placedAt > since),
  });
});
app.post('/api/staff/orders/:num/status', staff, (req, res) => {
  const o = db.orders.find(o => o.num === +req.params.num);
  if (!o) return res.status(404).json({ error: 'Order not found.' });
  const st = +req.body.status;
  if (![0, 1, 2, 3].includes(st)) return res.status(400).json({ error: 'Bad status.' });
  o.status = st; saveDb();
  res.json({ ok: true });
});
app.get('/api/staff/menu', staff, (req, res) => res.json(db.menu));
app.post('/api/staff/menu/:id', staff, (req, res) => {
  const m = itemById(req.params.id);
  if (!m) return res.status(404).json({ error: 'No such item.' });
  if (typeof req.body.available === 'boolean') m.available = req.body.available;
  if (req.body.price != null && isFinite(+req.body.price) && +req.body.price >= 0 && +req.body.price < 100) m.price = r2(+req.body.price);
  saveDb(); res.json(m);
});
app.get('/api/staff/customers', staff, (req, res) => {
  const list = Object.entries(db.customers).map(([phone, c]) => ({
    phone, name: c.name, points: c.points, orders: c.orders.length,
    spend: r2(db.orders.filter(o => o.phone === phone).reduce((a, o) => a + o.total, 0)),
  })).sort((a, b) => b.spend - a.spend).slice(0, 200);
  res.json(list);
});
app.get('/api/staff/settings', staff, (req, res) => {
  const { earnRate, tiers } = db.shop;
  res.json({ earnRate, tiers, giftCardsEnabled: !!(db.shop.giftCards && db.shop.giftCards.enabled) });
});
app.post('/api/staff/settings', staff, (req, res) => {
  if (req.body.earnRate != null && +req.body.earnRate >= 0 && +req.body.earnRate <= 20) db.shop.earnRate = +req.body.earnRate;
  if (typeof req.body.giftCardsEnabled === 'boolean') {
    db.shop.giftCards = db.shop.giftCards || { amounts: [10, 25, 50] };
    db.shop.giftCards.enabled = req.body.giftCardsEnabled;
  }
  if (Array.isArray(req.body.tiers)) {
    const ok = req.body.tiers.every(t => t && +t.pts > 0 && t.name && itemById(t.grants));
    if (ok) db.shop.tiers = req.body.tiers.map(t => ({ pts: +t.pts, name: String(t.name).slice(0, 60), desc: String(t.desc || '').slice(0, 100), grants: t.grants }));
  }
  saveDb(); res.json({ ok: true });
});

app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dashboard.html')));

// Generated media (splash video + menu photos): fetched once from the asset
// CDN (unreachable from some dev sandboxes, fine in production), cached on
// the data volume, then served locally. The app degrades gracefully on 404.
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_3EpLWxWBo6QlDmwjFC7NjlTBGAZ/';
const MEDIA_URLS = {
  'splash.mp4': process.env.SPLASH_VIDEO_URL || CDN + 'hf_20260707_223135_aaf8d3e8-2e4b-4568-8ab7-7d7517aae822.mp4',
  'menu-latte.webp': CDN + 'hf_20260707_230542_b8fa9218-f6b2-441d-b07a-2640b314117d_min.webp',
  'menu-capp.webp': CDN + 'hf_20260707_230551_4cfb6b7c-19ae-4b2d-8464-31ab6bc81e70_min.webp',
  'menu-mocha.webp': CDN + 'hf_20260707_230618_ee9d22eb-8b2c-41d2-a1bd-df8764e509d1_min.webp',
  'menu-flat.webp': CDN + 'hf_20260707_230621_71336eaf-b757-4860-bf52-352a9165ac67_min.webp',
  'menu-esp.webp': CDN + 'hf_20260707_230647_42714135-a3d9-4b38-b781-3fc1fb110c4a_min.webp',
  'menu-drip.webp': CDN + 'hf_20260707_230650_510bb8b6-016c-459d-a55d-31d768bf8b32_min.webp',
  'menu-coldbrew.webp': CDN + 'hf_20260707_230652_46e05186-fb9e-4659-a8ee-c15a664ebe58_min.webp',
  'menu-icedlatte.webp': CDN + 'hf_20260707_230655_68fba3a0-3103-4797-affc-167668f1357f_min.webp',
  'menu-chai.webp': CDN + 'hf_20260707_230658_ac7526ea-e738-42ce-bcb0-81b504381e6d_min.webp',
  'menu-matcha.webp': CDN + 'hf_20260707_230701_40e91b2a-0e5c-4fb6-9a8e-cc28535675c0_min.webp',
  'menu-cocoa.webp': CDN + 'hf_20260707_230708_a52b88ff-7879-4250-82d5-14dbc6a91b84_min.webp',
  'menu-croissant.webp': CDN + 'hf_20260707_230723_8ee86a68-fa6c-43fd-b5e8-e44899fcbcf0_min.webp',
  'menu-muffin.webp': CDN + 'hf_20260707_230731_94710071-cbd3-4d6d-b408-063bce8e369d_min.webp',
  'menu-cookie.webp': CDN + 'hf_20260707_223627_26bd0780-55b0-40a7-850d-6380d2be587d_min.webp',
};
const mediaFetching = new Map();
async function serveCachedMedia(key, res) {
  const url = MEDIA_URLS[key];
  if (!url || !url.startsWith('http')) return res.status(404).end();
  const cached = path.join(DATA_DIR, 'media-' + key.replace(/[^a-z0-9.-]/gi, '_'));
  if (!fs.existsSync(cached)) {
    try {
      if (!mediaFetching.has(key)) mediaFetching.set(key, (async () => {
        const r = await fetch(url);
        if (!r.ok) throw new Error('upstream ' + r.status);
        fs.mkdirSync(DATA_DIR, { recursive: true });
        const buf = Buffer.from(await r.arrayBuffer());
        fs.writeFileSync(cached + '.tmp', buf);
        fs.renameSync(cached + '.tmp', cached);
      })());
      await mediaFetching.get(key);
      mediaFetching.delete(key);
    } catch (e) {
      mediaFetching.delete(key);
      console.error('media fetch failed:', key, e.message);
      return res.status(404).end();
    }
  }
  res.sendFile(cached);
}
app.get('/splash.mp4', (req, res) => serveCachedMedia('splash.mp4', res));
app.get('/img/menu/:id', (req, res) => serveCachedMedia('menu-' + String(req.params.id).replace(/[^a-z0-9]/gi, '') + '.webp', res));

app.get('/privacy', (req, res) => {
  const shop = db.shop.name;
  res.type('html').send(`<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Privacy — ${shop}</title>
<style>body{font:16px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#2B1E16;background:#F6F1E8;max-width:640px;margin:0 auto;padding:28px 20px}h1{font-size:24px}h2{font-size:17px;margin-top:22px}p,li{color:#5C4B3E}a{color:#2A5F70}</style>
</head><body>
<h1>Privacy at ${shop}</h1>
<p>This ordering app is operated for ${shop}. Here is everything it collects and why — in plain language.</p>
<h2>What we collect</h2>
<ul>
<li><b>Your first name</b> — so the barista can call your order.</li>
<li><b>Your phone number</b> — it is your rewards account: your star balance is saved to it.</li>
<li><b>Your orders</b> — what you bought, so rewards and order history work.</li>
</ul>
<h2>What we never see</h2>
<p><b>Your card details.</b> Payments are processed by <a href="https://stripe.com/privacy">Stripe</a> on their secure payment page. Card numbers never touch this app's servers.</p>
<h2>What we don't do</h2>
<ul>
<li>We don't sell or share your information with anyone outside ${shop}.</li>
<li>We don't send you marketing texts or calls. Your number is used only as your rewards ID.</li>
<li>We don't use advertising trackers.</li>
</ul>
<h2>Your choices</h2>
<p>Want your data deleted? Ask any staff member or contact the shop, and your rewards account and order history will be removed.</p>
<p style="margin-top:26px;font-size:13px">Questions: talk to us at the counter, or contact ${shop} at ${db.shop.address}.</p>
</body></html>`);
});

app.listen(PORT, () => {
  console.log(`☕ ${db.shop.name} server on http://localhost:${PORT}`);
  console.log(`   Customer app: /    Dashboard: /dashboard (PIN ${PIN === '1234' ? '1234 — CHANGE THIS' : 'set'})`);
  console.log(`   Payments: ${stripe ? 'STRIPE (' + (STRIPE_KEY.startsWith('sk_live') ? 'LIVE' : 'test') + ')' : 'demo mode (no real charges)'}`);
});
