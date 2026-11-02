const { chromium } = require('playwright');
// Milestone 4: a full game Line -> Two Lines -> Full House with a host and 2 players, plus a forged
// claim, lock, a refresh with a pending claim, and the final wipe.
// Run against `npm run build && npx wrangler dev`:  node e2e/full-game.cjs [baseUrl] [screenshotDir]
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
  const H = await mk({ width: 1100, height: 1000 });
  const P = { Alice: await mk({ width: 390, height: 844 }), Bob: await mk({ width: 390, height: 844 }) };

  await H.goto(base);
  await H.click('text=Host a game');
  await H.click('text=Create game');
  await H.waitForSelector('.room-code');
  const code = (await H.textContent('.room-code')).trim();
  await H.waitForSelector('text=Connected');
  for (const [name, p] of Object.entries(P)) {
    await p.goto(`${base}/join/${code}`);
    await p.fill('#name', name);
    await p.click('button:has-text("Join game")');
    await p.waitForSelector('.ticket');
  }
  await H.waitForFunction(() => document.querySelectorAll('.roster-item').length === 2);
  await H.click('button:has-text("Start game")');
  await H.waitForSelector('button:has-text("CALL NUMBER")');

  const called = [];
  const call = async () => {
    await H.click('button:has-text("CALL NUMBER"):not([disabled])');
    await H.waitForFunction(() => !document.querySelector('.btn-call.rolling') && !document.querySelector('.btn-call[disabled]'), null, { timeout: 5000 });
    const n = Number((await H.textContent('.roller-number')).trim());
    called.push(n);
    for (const p of Object.values(P)) await p.waitForFunction(n => document.querySelector('.last-number')?.textContent === String(n), n);
    return n;
  };
  const markAll = async p => { for (const el of await p.locator('.ticket-cell.called').all()) await el.click(); };
  const canClaim = async p => p.locator('.btn-bingo').isVisible();

  // Lock joining blocks newcomers
  await H.check('.lock-toggle input');
  const C = await mk({ width: 390, height: 844 });
  await C.goto(`${base}/join/${code}`);
  await C.fill('#name', 'Late');
  await C.click('button:has-text("Join game")');
  await C.waitForSelector('text=locked this game');
  ok(true, 'locked room refuses a new player');
  await H.uncheck('.lock-toggle input');
  await C.close();

  // A forged claim (marks that were never called) from a raw socket on Bob's page
  await call();
  await P.Bob.evaluate(async ({ code, called }) => {
    const ws = new WebSocket(`ws://${location.host}/ws/${code}?role=player`);
    await new Promise(r => (ws.onopen = r));
    ws.send(JSON.stringify({ t: 'join', name: 'Cheat' }));
    await new Promise(r => setTimeout(r, 300));
    const t = [[1, 0, 21, 0, 41, 0, 61, 0, 81], [0, 12, 0, 32, 0, 52, 0, 72, 82], [3, 0, 23, 33, 0, 53, 0, 73, 0]];
    ws.send(JSON.stringify({ t: 'claim', stage: 1, ticket: t, marked: [1, 21, 41, 61, 81].filter(n => !called.includes(n)) }));
    await new Promise(r => setTimeout(r, 300));
    ws.close();
  }, { code, called });
  await H.click('.claim-chip:has-text("Cheat")');
  await H.waitForSelector('.verdict-bad');
  ok(await H.isVisible('.verdict-warn'), 'host flags marks that were not called');
  if (shots) await H.screenshot({ path: shots + '/forged.png' });
  await H.click('.modal button:text-is("Dismiss")');
  await H.locator('.roster-item', { hasText: 'Cheat' }).locator('.roster-kick').click();
  await H.click('.confirm-panel button:text-is("Remove")');

  let refreshed = false;
  for (const stage of [1, 2, 3]) {
    const stageName = ['', 'Line', 'Two Lines', 'Full House'][stage];
    let winners = [];
    while (!winners.length) {
      await call();
      for (const [name, p] of Object.entries(P)) { await markAll(p); if (await canClaim(p)) winners.push(name); }
    }
    log(`stage ${stage} winners after ${called.length} calls:`, winners);
    for (const w of winners) await P[w].click('.btn-bingo');
    await P[winners[0]].waitForSelector('.claim-pending');
    ok(true, `${winners.join(' & ')} claimed ${stageName}`);

    if (!refreshed) { // A pending claim survives a refresh
      refreshed = true;
      await P[winners[0]].reload();
      await P[winners[0]].waitForSelector('.claim-pending');
      ok(!(await canClaim(P[winners[0]])), 'pending claim restored after refresh, no second BINGO button');
    }

    await H.waitForFunction(n => document.querySelectorAll('.claim-chip').length === n, winners.length);
    for (const w of winners) {
      await H.click(`.claim-chip:has-text("${w}")`);
      await H.waitForSelector('.verdict-ok');
      if (shots && stage === 1) await H.screenshot({ path: shots + '/claim.png' });
      await H.click('.btn-award');
      await P[w].waitForSelector('.news-won');
      ok(true, `${w} awarded ${stageName}`);
      ok(!(await canClaim(P[w])), `${w} cannot claim ${stageName} twice`);
    }
    if (stage < 3) {
      await H.click('button:has-text("Next stage")');
      for (const p of Object.values(P)) await p.waitForSelector(`.stage-pill:has-text("${['', '', 'Two Lines', 'Full House'][stage + 1]}")`);
      ok(true, `everyone moved to stage ${stage + 1}`);
    }
  }
  if (shots) { await P.Alice.screenshot({ path: shots + '/alice.png', fullPage: true }); await H.screenshot({ path: shots + '/host-end.png', fullPage: true }); }

  const pts = await H.locator('.roster-item .roster-state').allInnerTexts();
  log('host roster', pts);
  await H.click('button:has-text("End game")');
  await H.click('button:has-text("Yes, end it")');
  for (const p of [H, ...Object.values(P)]) await p.waitForSelector('text=Final scoreboard');
  const board = await P.Alice.locator('.leaderboard li').allInnerTexts();
  log('leaderboard', board);
  ok(board.length === 2, 'everyone sees the final leaderboard');
  for (const p of [H, ...Object.values(P)]) ok((await p.evaluate(() => localStorage.getItem('bingo.session'))) === null, 'device session wiped');
  const gone = await P.Alice.evaluate(async code => {
    const ws = new WebSocket(`ws://${location.host}/ws/${code}?role=player`);
    return new Promise(r => { ws.onclose = e => r(e.reason); });
  }, code);
  ok(gone === 'no_room', 'room deleted on the server');
  ok(errors.length === 0, 'no console errors or external requests ' + JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
