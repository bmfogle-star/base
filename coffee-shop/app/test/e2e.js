// End-to-end suite. Run from coffee-shop/app:  npm i -D playwright-core && node test/e2e.js
// Requires a Chromium binary: set CHROMIUM=/path/to/chromium (defaults to /opt/pw-browsers/chromium).
const { chromium } = require('playwright-core');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

(async () => {
  const server = spawn('node', ['server.js'], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: '3456', DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'e2e-data-')) },
  });
  server.stdout.on('data', d => process.stdout.write('[srv] ' + d));
  server.stderr.on('data', d => process.stdout.write('[srv!] ' + d));
  await new Promise(r => setTimeout(r, 1200));

  const errors = [];
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || '/opt/pw-browsers/chromium' });

  try {
    // ---- CUSTOMER: place an order ----
    const cust = await browser.newPage({ viewport: { width: 390, height: 844 } });
    cust.on('pageerror', e => errors.push('cust pageerror: ' + e.message));
    cust.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('cust console: ' + m.text()); });
    await cust.goto('http://localhost:3456/');
    await cust.waitForSelector('[data-tab="order"]');
    await cust.screenshot({ path: 'e2e-1-cust-home.png' });

    await cust.click('[data-tab="order"]');
    await cust.click('[data-item="latte"]');
    await cust.click('[data-milk="2"]');    // oat
    await cust.click('[data-extra="0"]');   // extra shot
    await cust.click('#addBtn');
    await cust.click('[data-cat="Bakery"]');
    await cust.click('[data-item="croissant"]');
    await cust.click('#addBtn');
    await cust.click('.float-cart');
    await cust.fill('#cName', 'Jess');
    await cust.fill('#cPhone', '555-867-5309');
    await cust.click('[data-tip="3"]');     // 20%
    await cust.screenshot({ path: 'e2e-2-cust-cart.png' });
    await cust.click('#payBtn');
    await cust.waitForSelector('#payBtn', { state: 'detached' });
    await cust.waitForSelector('.order-card');
    const pts1 = await cust.textContent('#ptsChip');
    console.log('CHECK customer points after order:', pts1.trim(), '(expect ★ 21: latte Med+oat+shot 7.00 + croissant 3.75 = 10.75 → floor(21.5))');

    // ---- DASHBOARD: see order, advance status ----
    const dash = await browser.newPage({ viewport: { width: 1100, height: 800 } });
    dash.on('pageerror', e => errors.push('dash pageerror: ' + e.message));
    dash.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errors.push('dash console: ' + m.text()); });
    await dash.goto('http://localhost:3456/dashboard');
    await dash.fill('#pin', '1234');
    await dash.click('#loginBtn');
    await dash.waitForSelector('.order');
    const orderText = await dash.textContent('.order');
    console.log('CHECK dashboard sees:', /Jess/.test(orderText) && /Café Latte/.test(orderText) && /Oat milk/.test(orderText) ? 'name+item+mods OK' : 'MISSING DATA: ' + orderText.slice(0, 200));
    await dash.screenshot({ path: 'e2e-3-dash-new.png' });

    await dash.click('[data-st$=":1"]');            // start preparing
    await dash.waitForSelector('[data-st$=":2"]');
    await dash.click('[data-st$=":2"]');            // mark ready

    // ---- CUSTOMER: sees "ready" via polling ----
    await cust.waitForSelector('.status-pill.s2', { timeout: 15000 });
    console.log('CHECK customer sees READY: yes');
    await cust.screenshot({ path: 'e2e-4-cust-ready.png' });

    // ---- DASHBOARD: mark picked up, 86 an item ----
    await dash.waitForSelector('[data-st$=":3"]');
    await dash.click('[data-st$=":3"]');
    await dash.click('[data-v="menu"]');
    await dash.waitForSelector('[data-avail="muffin"]');
    await dash.click('[data-avail="muffin"]');      // sold out
    await dash.screenshot({ path: 'e2e-5-dash-menu.png' });

    // ---- CUSTOMER: muffin gone after reload; earn more points then redeem ----
    await cust.reload();
    await cust.waitForSelector('[data-tab="order"]');
    await cust.click('[data-tab="order"]');
    await cust.click('[data-cat="Bakery"]');
    const muffin = await cust.$('[data-item="muffin"]');
    console.log('CHECK muffin hidden after 86:', muffin ? 'STILL VISIBLE (BUG)' : 'yes');

    // place a big order to build toward 50 pts (at 21)
    await cust.click('[data-cat="Espresso"]');
    await cust.click('[data-item="mocha"]');
    await cust.click('[data-q="1"]'); // qty 2
    await cust.click('#addBtn');
    await cust.click('.float-cart');
    await cust.click('#payBtn');
    await cust.waitForSelector('#payBtn', { state: 'detached' });
    await cust.waitForSelector('.order-card');
    const pts2 = await cust.textContent('#ptsChip');
    console.log('CHECK points after 2nd order:', pts2.trim(), '(expect ★ 44: mocha Med 5.75x2=11.50 → +23 → 44)');

    // one more to pass 50
    await cust.click('[data-tab="order"]');
    await cust.click('[data-item="esp"]');
    await cust.click('#addBtn');
    await cust.click('.float-cart');
    await cust.click('#payBtn');
    await cust.waitForSelector('#payBtn', { state: 'detached' });
    await cust.waitForSelector('.order-card');
    const pts3 = await cust.textContent('#ptsChip');
    console.log('CHECK points after 3rd order:', pts3.trim(), '(expect ★ 50: espresso 3.00 → +6)');

    // redeem free drip
    await cust.click('[data-tab="rewards"]');
    const redeemBtn = await cust.$('[data-redeem="0"]:not([disabled])');
    console.log('CHECK redeem unlocked:', redeemBtn ? 'yes' : 'NO (BUG)');
    await cust.click('[data-redeem="0"]');
    await cust.click('#addBtn');
    await cust.click('.float-cart');
    await cust.screenshot({ path: 'e2e-6-cust-redeem.png' });
    await cust.click('#payBtn');
    await cust.waitForSelector('#payBtn', { state: 'detached' });
    await cust.waitForSelector('.order-card');
    const pts4 = await cust.textContent('#ptsChip');
    console.log('CHECK points after redemption:', pts4.trim(), '(expect ★ 0: 50 - 50 + 0 earned)');

    // ---- RETURNING CUSTOMER: new browser, same phone, points restored ----
    const ret = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await ret.goto('http://localhost:3456/');
    await ret.waitForSelector('[data-tab="order"]');
    await ret.evaluate(() => { localStorage.setItem('cust-phone', '5558675309'); });
    await ret.reload();
    await ret.waitForSelector('[data-tab="order"]');
    const ptsRet = await ret.textContent('#ptsChip');
    console.log('CHECK returning customer points:', ptsRet.trim(), '(expect ★ 0)');

    // ---- GIFT CARDS: buy (demo), redeem on a fresh customer, spend at checkout ----
    await cust.click('[data-tab="home"]');
    await cust.click('[data-go="wallet"]');
    await cust.waitForSelector('[data-buygift]');
    await cust.click('[data-giftamt="10"]');
    await cust.click('[data-buygift]');
    await cust.waitForSelector('.pay-row .code');
    const code = (await cust.textContent('.pay-row .code')).trim();
    console.log('CHECK gift card purchased, code:', code);

    const friend = await browser.newPage({ viewport: { width: 390, height: 844 } });
    friend.on('pageerror', e => errors.push('friend pageerror: ' + e.message));
    await friend.goto('http://localhost:3456/');
    await friend.waitForSelector('[data-tab="order"]', { timeout: 15000 });
    await friend.click('[data-go="wallet"]');
    await friend.waitForSelector('#giftCode');
    await friend.fill('#walletPhone', '555-000-1111');
    await friend.fill('#giftCode', code);
    await friend.click('[data-redeemcode]');
    await friend.waitForSelector('.gb-amt');
    await friend.waitForFunction(() => document.querySelector('.gb-amt').textContent.includes('10.00'));
    console.log('CHECK friend redeemed code: balance $10.00');

    // friend orders a $2.95 cookie fully covered by gift balance
    await friend.click('[data-tab="order"]');
    await friend.click('[data-cat="Bakery"]');
    await friend.click('[data-item="cookie"]');
    await friend.click('#addBtn');
    await friend.click('.float-cart');
    await friend.fill('#cName', 'Pat');
    await friend.fill('#cPhone', '555-000-1111');
    await friend.click('[data-tip="0"]');
    await friend.click('[data-giftuse]');
    const payLabel = await friend.textContent('#payBtn');
    console.log('CHECK pay button with gift applied:', payLabel.trim(), '(expect $0.00)');
    await friend.click('#payBtn');
    await friend.waitForSelector('#payBtn', { state: 'detached' });
    await friend.waitForSelector('.order-card');
    const friendOrder = await friend.textContent('.order-card');
    console.log('CHECK gift shown on order:', /gift card/i.test(friendOrder) ? 'yes' : 'MISSING: ' + friendOrder.slice(0,150));

    // ---- DASHBOARD: customers tab ----
    await dash.click('[data-v="customers"]');
    await dash.waitForSelector('td');
    const custRow = await dash.textContent('tbody tr');
    console.log('CHECK customers tab:', /Jess/.test(custRow) ? 'Jess listed OK' : 'MISSING: ' + custRow);
    await dash.screenshot({ path: 'e2e-7-dash-customers.png' });

    // ---- HEALTH ENDPOINT + STRIPE WEBHOOK ROUTE ----
    const health = await (await fetch('http://localhost:3456/healthz')).json();
    console.log('CHECK healthz:', health.ok ? 'ok (boot #' + health.boot + ')' : 'FAILING (BUG)');
    const wh = await fetch('http://localhost:3456/stripe/webhook', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    console.log('CHECK stripe webhook without stripe configured:', wh.status === 404 ? '404 as expected' : 'BUG: HTTP ' + wh.status);

    // ---- SHOP HOURS GATE: close the shop, verify UI + API block orders ----
    const sapi = (p, body) => fetch('http://localhost:3456/api' + p, {
      method: 'POST', headers: { 'content-type': 'application/json', 'x-staff-pin': '1234' }, body: JSON.stringify(body),
    }).then(r => r.json());
    const mkDays = closed => Array.from({ length: 7 }, () => ({ open: closed ? '07:00' : '00:00', close: closed ? '18:00' : '23:59', closed }));
    await sapi('/staff/settings', { hoursConfig: { enabled: true, tz: 'America/New_York', days: mkDays(true) } });
    let shopInfo = await (await fetch('http://localhost:3456/api/shop')).json();
    console.log('CHECK shop reports closed:', shopInfo.openNow === false ? 'yes (' + shopInfo.hours + ')' : 'BUG: still open');
    const rejected = await (await fetch('http://localhost:3456/api/orders', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ lines: [{ id: 'esp', qty: 1 }], name: 'Late Larry', phone: '5552223333', tipPct: 0 }),
    })).json();
    console.log('CHECK order rejected while closed:', rejected.error ? 'yes — "' + rejected.error + '"' : 'BUG: order went through');

    await cust.reload();
    await cust.waitForSelector('[data-tab="order"]');
    const hoursTxt = await cust.textContent('#shopHours');
    console.log('CHECK header shows closed:', /closed/i.test(hoursTxt) ? 'yes (' + hoursTxt.trim() + ')' : 'BUG: ' + hoursTxt);
    await cust.click('[data-tab="order"]');
    await cust.click('[data-item="esp"]');
    await cust.click('#addBtn');
    await cust.click('.float-cart');
    const payDisabled = await cust.$eval('#payBtn', b => b.disabled);
    console.log('CHECK pay button disabled while closed:', payDisabled ? 'yes' : 'BUG: enabled');
    await cust.screenshot({ path: 'e2e-8-cust-closed.png' });

    // reopen 24/7 and confirm ordering works again
    await sapi('/staff/settings', { hoursConfig: { enabled: true, tz: 'America/New_York', days: mkDays(false) } });
    shopInfo = await (await fetch('http://localhost:3456/api/shop')).json();
    console.log('CHECK shop open again:', shopInfo.openNow ? 'yes' : 'BUG: still closed');
    await cust.reload();
    await cust.waitForSelector('[data-tab="order"]');
    await cust.click('[data-tab="orders"]');
    await cust.click('#payBtn');
    await cust.waitForSelector('#payBtn', { state: 'detached' });
    await cust.waitForSelector('.order-card');
    console.log('CHECK order placed after reopening: yes');

    console.log(errors.length ? 'ERRORS:\n' + errors.join('\n') : 'NO JS ERRORS');
  } finally {
    await browser.close();
    server.kill();
  }
})().catch(e => { console.error('FATAL', e); process.exit(1); });
