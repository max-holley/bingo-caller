const { chromium } = require('playwright');
// Milestone 3: start, call, mark, uncalled rejection, refresh restore, late join, host resume.
// Run against `npm run build && npx wrangler dev`:  node e2e/calling.cjs [baseUrl] [screenshotDir]
const base = process.argv[2] || 'http://127.0.0.1:8787';
const shots = process.argv[3];
const log = (...a) => console.log(...a);
const ok = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); log('ok', msg); };
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const mk = async (viewport) => {
    const ctx = await browser.newContext({ viewport });
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith(base.replace('http', 'ws')) && !u.startsWith('data:')) errors.push('EXTERNAL ' + u); });
    return page;
  };
  const H = await mk({ width: 1100, height: 900 });
  const A = await mk({ width: 390, height: 844 });
  const B = await mk({ width: 390, height: 844 });

  await H.goto(base);
  await H.click('text=Host a game');
  await H.click('text=Create game');
  await H.waitForSelector('.room-code');
  const code = (await H.textContent('.room-code')).trim();
  await H.waitForSelector('text=Connected');

  const join = async (p, name) => {
    await p.goto(`${base}/join/${code}`);
    await p.fill('#name', name);
    await p.click('button:has-text("Join game")');
    await p.waitForSelector('.ticket');
  };
  await join(A, 'Alice');
  ok((await A.locator('.ticket-cell:not(.blank)').count()) === 15, 'player has a 15-number ticket');
  ok(await A.isVisible('text=Waiting for the host to start'), 'player waits for start');
  await H.waitForFunction(() => document.querySelectorAll('.roster-item').length === 1);

  // Start with a single player
  await H.click('button:has-text("Start game")');
  await H.waitForSelector('button:has-text("CALL NUMBER")');
  await A.waitForSelector('text=Waiting for the first number');
  ok(true, 'host and player moved to the game');

  const ticketA = (await A.locator('.ticket-cell:not(.blank)').allInnerTexts()).map(Number);
  const call = async () => {
    await H.click('button:has-text("CALL NUMBER"):not([disabled])');
    await H.waitForFunction(() => !document.querySelector('.btn-call.rolling') && !document.querySelector('.btn-call[disabled]'), null, { timeout: 5000 });
    return Number((await H.textContent('.roller-number')).trim());
  };
  const calls = [];
  for (let i = 0; i < 6; i++) calls.push(await call());
  log('called', calls);
  await A.waitForFunction(n => document.querySelector('.last-number')?.textContent === String(n), calls.at(-1));
  ok(true, 'player sees last called number');
  ok((await A.locator('.recent-ball').allInnerTexts()).map(Number).join() === calls.slice(0, -1).reverse().slice(0, 5).join(), 'player sees recent calls');

  // Keep calling until Alice has a called number on her ticket
  let hit = calls.find(n => ticketA.includes(n));
  while (hit === undefined) { const n = await call(); calls.push(n); if (ticketA.includes(n)) hit = n; }
  await A.waitForFunction(n => [...document.querySelectorAll('.ticket-cell.called')].some(c => c.textContent === String(n)), hit);
  ok(true, `called number ${hit} shows a dot, not a mark`);
  ok((await A.locator('.ticket-cell.marked').count()) === 0, 'nothing auto-marked');
  await A.click(`.ticket-cell:text-is("${hit}")`);
  ok((await A.locator('.ticket-cell.marked').allInnerTexts()).join() === String(hit), 'tap marks a called number');

  const uncalled = ticketA.find(n => !calls.includes(n));
  await A.click(`.ticket-cell:text-is("${uncalled}")`);
  ok(await A.isVisible(`text=${uncalled} hasn't been called yet`), 'uncalled number refused with message');
  ok((await A.locator('.ticket-cell.marked').count()) === 1, 'uncalled number not marked');
  if (shots) await A.screenshot({ path: shots + '/player.png', fullPage: true });

  // Player refresh keeps ticket and marks
  await A.reload();
  await A.waitForSelector('.ticket');
  await A.waitForFunction(n => document.querySelector('.last-number')?.textContent === String(n), calls.at(-1));
  ok((await A.locator('.ticket-cell:not(.blank)').allInnerTexts()).map(Number).join() === ticketA.join(), 'refresh keeps ticket');
  ok((await A.locator('.ticket-cell.marked').allInnerTexts()).join() === String(hit), 'refresh keeps marks');

  // Late joiner gets the called list
  await join(B, 'Bob');
  await B.waitForFunction(n => document.querySelector('.last-number')?.textContent === String(n), calls.at(-1));
  ok(true, 'late joiner sees called numbers');

  // Host refresh resumes with the called board
  await H.reload();
  await H.waitForSelector('button:has-text("CALL NUMBER"):not([disabled])');
  const lit = (await H.locator('.board-cell.lit').allInnerTexts()).map(Number).sort((a, b) => a - b);
  ok(lit.join() === [...calls].sort((a, b) => a - b).join(), 'host resumes with called board');
  const after = await call();
  ok(!calls.includes(after), 'host does not re-call a number after resuming');
  calls.push(after);
  await B.waitForFunction(n => document.querySelector('.last-number')?.textContent === String(n), after);
  ok(true, 'calls after host refresh reach players');

  // Theme sync
  await H.click('.theme-toggle, [aria-label*="theme" i]').catch(() => {});
  if (shots) await H.screenshot({ path: shots + '/host.png', fullPage: true });

  // End game wipes storage
  await H.click('button:has-text("End game")');
  await H.click('button:has-text("Yes, end it")');
  await A.waitForSelector('text=Final scoreboard');
  ok((await A.evaluate(() => Object.keys(localStorage).filter(k => k === 'bingo.session').length)) === 0, 'player session wiped at end');

  ok(errors.length === 0, 'no console errors or external requests ' + JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
