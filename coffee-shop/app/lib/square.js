'use strict';
/*
 * Square connector (beta).
 *
 * Everything here is inert unless the shop has connected Square
 * (db.shop.square.accessToken set via the dashboard). Built against Square's
 * documented v2 API; field names are re-verified against the Square sandbox
 * before the first production shop connects.
 *
 * What it does:
 *  - listLocations / getCustomer: basic account reads
 *  - syncCatalog: pull the shop's Square menu (items, prices, categories,
 *    availability) into the app's menu
 *  - pushOrder: create a paid pickup order in Square so app orders appear on
 *    the shop's own register/tickets (note: Square charges 1% for API orders
 *    paid outside Square — the roadmap fix is taking payment through Square
 *    itself for connected shops)
 *  - verifyWebhook: HMAC-SHA256 validation for Square event notifications
 */

const crypto = require('crypto');

function cfg(db) {
  const c = db.shop.square;
  return c && c.accessToken ? c : null;
}

function baseUrl(c) {
  return c.env === 'production' ? 'https://connect.squareup.com' : 'https://connect.squareupsandbox.com';
}

async function sq(db, method, path, body) {
  const c = cfg(db);
  if (!c) throw new Error('Square is not connected.');
  const res = await fetch(baseUrl(c) + path, {
    method,
    headers: Object.assign(
      { 'Authorization': 'Bearer ' + c.accessToken, 'Content-Type': 'application/json' },
      c.version ? { 'Square-Version': c.version } : {}
    ),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const e = data.errors && data.errors[0];
    throw new Error('Square: ' + (e ? (e.detail || e.code) : 'HTTP ' + res.status));
  }
  return data;
}

async function listLocations(db) {
  return (await sq(db, 'GET', '/v2/locations')).locations || [];
}

async function getCustomer(db, customerId) {
  return (await sq(db, 'GET', '/v2/customers/' + encodeURIComponent(customerId))).customer || {};
}

/*
 * Pull the Square catalog into our menu shape.
 * v1 mapping: item name, description, first-variation price, category,
 * availability. Multi-size variations and Square modifier lists land in a
 * later pass (app-side global milk/extras options still apply meanwhile).
 * Replaces the app menu; the previous menu is kept in db.menuBackup.
 */
async function syncCatalog(db, saveDb) {
  const cats = {};
  const items = [];
  let cursor = '';
  do {
    const page = await sq(db, 'GET', '/v2/catalog/list?types=ITEM%2CCATEGORY' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    for (const o of page.objects || []) {
      if (o.type === 'CATEGORY' && o.category_data) cats[o.id] = o.category_data.name;
    }
    for (const o of page.objects || []) {
      if (o.type !== 'ITEM' || !o.item_data) continue;
      const v = (o.item_data.variations || [])[0];
      const priceMoney = v && v.item_variation_data && v.item_variation_data.price_money;
      if (!priceMoney) continue; // skip variable-priced items for now
      items.push({
        id: 'sq-' + o.id,
        squareId: o.id,
        squareVariationId: v.id,
        cat: cats[o.item_data.category_id] || 'Menu',
        name: o.item_data.name || 'Item',
        desc: (o.item_data.description || '').slice(0, 120),
        price: priceMoney.amount / 100,
        ic: '', warm: true, sized: false, milk: false,
        available: !o.item_data.is_archived,
        source: 'square',
      });
    }
    cursor = page.cursor || '';
  } while (cursor);

  if (!items.length) throw new Error('No priced items found in the Square catalog.');
  if (!db.menuBackup) db.menuBackup = db.menu;
  db.menu = items;
  db.shop.square.lastSync = Date.now();
  saveDb();
  return items.length;
}

/*
 * Push a paid app order into Square so it shows on the shop's register.
 * payload: { referenceId, recipientName, pickupNote, note,
 *            lineItems: [{ name, quantity, amountCents, note }], totalCents }
 */
async function pushOrder(db, payload) {
  const c = cfg(db);
  if (!c || !c.locationId) throw new Error('Square location not set.');
  const orderResp = await sq(db, 'POST', '/v2/orders', {
    idempotency_key: 'order-' + payload.referenceId,
    order: {
      location_id: c.locationId,
      reference_id: String(payload.referenceId),
      source: { name: payload.sourceName || 'Order-ahead app' },
      line_items: payload.lineItems.map(li => ({
        name: li.name,
        quantity: String(li.quantity),
        base_price_money: { amount: li.amountCents, currency: 'USD' },
        note: li.note || undefined,
      })),
      fulfillments: [{
        type: 'PICKUP',
        state: 'PROPOSED',
        pickup_details: {
          recipient: { display_name: payload.recipientName || 'App customer' },
          note: payload.pickupNote || undefined,
          schedule_type: 'ASAP',
        },
      }],
    },
  });
  const sqOrder = orderResp.order;
  // Record the payment as external (already collected by the app) so the
  // order flips to paid and appears on the POS.
  await sq(db, 'POST', '/v2/payments', {
    idempotency_key: 'pay-' + payload.referenceId,
    source_id: 'EXTERNAL',
    external_details: { type: 'OTHER', source: payload.sourceName || 'Order-ahead app' },
    amount_money: { amount: payload.totalCents, currency: 'USD' },
    order_id: sqOrder.id,
    location_id: c.locationId,
  });
  return sqOrder.id;
}

async function getOrder(db, orderId) {
  return (await sq(db, 'GET', '/v2/orders/' + encodeURIComponent(orderId))).order || {};
}

/*
 * Create (or reuse) a webhook subscription for payment events pointing at
 * our /square/webhook endpoint. Returns the subscription (with signature_key
 * when Square provides it).
 */
const WEBHOOK_EVENTS = ['payment.created', 'payment.updated', 'order.updated', 'order.fulfillment.updated'];

async function createWebhookSubscription(db, notificationUrl) {
  const listed = await sq(db, 'GET', '/v2/webhooks/subscriptions').catch(() => ({}));
  const existing = (listed.subscriptions || []).find(s => s.notification_url === notificationUrl);
  if (existing) {
    // Upgrade older subscriptions that are missing newer event types
    const have = existing.event_types || [];
    const missing = WEBHOOK_EVENTS.filter(t => !have.includes(t));
    if (missing.length) {
      const upd = await sq(db, 'PUT', '/v2/webhooks/subscriptions/' + encodeURIComponent(existing.id), {
        subscription: { event_types: WEBHOOK_EVENTS },
      }).catch(() => null);
      if (upd && upd.subscription) return { ...existing, ...upd.subscription };
    }
    return existing;
  }
  const resp = await sq(db, 'POST', '/v2/webhooks/subscriptions', {
    idempotency_key: 'lb-sub-' + Buffer.from(notificationUrl).toString('hex').slice(0, 24),
    subscription: {
      name: 'LocalBrew rewards',
      notification_url: notificationUrl,
      event_types: WEBHOOK_EVENTS,
    },
  });
  return resp.subscription || {};
}

/*
 * Plant one Square catalog DISCOUNT per reward tier, named "LB Reward: <tier>".
 * Baristas apply these at the register like any Square discount; our webhook
 * recognizes the name and deducts the stars. Idempotent by name.
 */
async function ensureRewardDiscounts(db, saveDb) {
  const existing = [];
  let cursor = '';
  do {
    const page = await sq(db, 'GET', '/v2/catalog/list?types=DISCOUNT' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''));
    for (const o of page.objects || []) {
      if (o.type === 'DISCOUNT' && o.discount_data) existing.push({ id: o.id, name: o.discount_data.name });
    }
    cursor = page.cursor || '';
  } while (cursor);

  const made = [];
  for (const t of db.shop.tiers) {
    const name = 'LB Reward: ' + t.name;
    let found = existing.find(e => e.name === name);
    if (!found) {
      const resp = await sq(db, 'POST', '/v2/catalog/object', {
        idempotency_key: 'lb-disc-' + t.pts + '-' + name.replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 30),
        object: {
          type: 'DISCOUNT',
          id: '#lbdisc' + t.pts,
          discount_data: { name, discount_type: 'VARIABLE_AMOUNT' },
        },
      });
      found = { id: (resp.catalog_object || {}).id, name };
    }
    made.push({ name, id: found.id, pts: t.pts });
  }
  db.shop.square.rewardDiscounts = made;
  saveDb();
  return made;
}

function verifyWebhook(signatureKey, notificationUrl, rawBody, signature) {
  if (!signatureKey || !signature) return false;
  const expected = crypto.createHmac('sha256', signatureKey)
    .update(notificationUrl + rawBody.toString())
    .digest('base64');
  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch (e) { return false; }
}

module.exports = { cfg, listLocations, getCustomer, syncCatalog, pushOrder, verifyWebhook, getOrder, createWebhookSubscription, ensureRewardDiscounts };
