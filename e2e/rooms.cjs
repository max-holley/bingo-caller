const { chromium } = require('playwright');
// Run against `wrangler dev` with HOST_GRACE_SECONDS=8 in .dev.vars:  node e2e/rooms.cjs [baseUrl]
const base = process.argv[2] || 'http://127.0.0.1:8787';
const log = (...a) => console.log(...a);
(async () => {
  const browser = await chromium.launch();
  const mk = async () => {
    const ctx = await browser.newContext({ viewport: { width: 1100, height: 850 } });
    const page = await ctx.newPage();
    page.errors = [];
    page.on('console', m => { if (m.type() === 'error') page.errors.push(m.text()); });
    page.on('pageerror', e => page.errors.push(String(e)));
    page.on('request', r => { if (!r.url().startsWith(base) && !r.url().startsWith('ws://127.0.0.1:8787') && !r.url().startsWith('data:')) page.errors.push('EXTERNAL ' + r.url()); });
    return { ctx, page };
  };
  const H = await mk(), A = await mk(), B = await mk();

  // Host creates a game
  await H.page.goto(base);
  await H.page.click('text=Host a game');
  await H.page.click('text=Create game');
  await H.page.waitForSelector('.room-code');
  const code = (await H.page.textContent('.room-code')).trim();
  log('code', code, 'url', H.page.url());
  await H.page.waitForSelector('text=Connected');
  log('qr present', await H.page.locator('svg.qr path').count());

  // Player A joins via code entry; B via join link with a hostile name
  await A.page.goto(base);
  await A.page.click('text=Join a game');
  await A.page.fill('#code', code.toLowerCase());
  await A.page.fill('#name', '  Alice  ');
  await A.page.click('button:has-text("Join game")');
  await A.page.waitForSelector('text=You\'re in');
  await B.page.goto(`${base}/join/${code}`);
  await B.page.fill('#name', '<img src=x onerror=alert(1)>');
  await B.page.click('button:has-text("Join game")');
  await B.page.waitForSelector('text=You\'re in');
  log('B welcome text:', await B.page.textContent('.welcome-name'));
  log('B img injected?', await B.page.locator('.welcome-name img').count());
  await H.page.waitForFunction(() => document.querySelectorAll('.roster-item').length === 2);
  log('roster', await H.page.locator('.roster-item').allInnerTexts());

  // Refresh players and host: they should rejoin with the same identity
  const sessA = await A.page.evaluate(() => localStorage.getItem('bingo.session'));
  await A.page.reload();
  await A.page.waitForSelector('text=You\'re in');
  log('A same id after refresh', JSON.parse(sessA).playerId === JSON.parse(await A.page.evaluate(() => localStorage.getItem('bingo.session'))).playerId);
  await H.page.reload();
  await H.page.waitForSelector('.room-code');
  await H.page.waitForFunction(() => document.querySelectorAll('.roster-item').length === 2);
  log('host resumed, code same', (await H.page.textContent('.room-code')).trim() === code);

  // Player disconnects -> shown as away, then rejoins
  await B.page.goto('about:blank');
  await H.page.waitForSelector('.roster-item.offline');
  log('roster after B left', await H.page.locator('.roster-item').allInnerTexts());
  await B.page.goto(base);
  await B.page.waitForSelector('text=You\'re in');
  await H.page.waitForFunction(() => document.querySelectorAll('.roster-item.offline').length === 0);
  log('B rejoined from stored session at /');

  // Host theme change reaches players
  await H.page.click('.theme-toggle-btn');
  await H.page.click('.theme-options >> text=Halloween');
  await A.page.waitForFunction(() => document.documentElement.dataset.theme === 'halloween');
  log('player theme synced: halloween; player theme button visible?', await A.page.locator('.theme-toggle-btn').count());

  // Kill the host: room stays alive inside the grace period, then is deleted (HOST_GRACE_SECONDS=8)
  await H.page.close();
  await new Promise(r => setTimeout(r, 3000));
  await A.page.reload();
  await A.page.waitForSelector('text=You\'re in');
  log('room alive 3s after host left');
  await A.page.waitForSelector('text=This game has ended', { timeout: 20000 });
  log('after grace: player sees', (await A.page.textContent('.notice')).trim());
  log('A session cleared', await A.page.evaluate(() => localStorage.getItem('bingo.session')));
  await B.page.waitForSelector('.notice', { timeout: 5000 });
  // Rejoining the deleted room
  await B.page.goto(`${base}/join/${code}`);
  await B.page.fill('#name', 'Bob');
  await B.page.click('button:has-text("Join game")');
  await B.page.waitForSelector('.form-error');
  log('join deleted room:', (await B.page.textContent('.form-error')).trim());

  // Second game: end game → leaderboard + wipe
  const H2 = await mk();
  await H2.page.goto(base);
  await H2.page.click('text=Host a game');
  await H2.page.click('text=Create game');
  await H2.page.waitForSelector('text=Connected');
  const code2 = (await H2.page.textContent('.room-code')).trim();
  await A.page.goto(`${base}/join/${code2}`);
  await A.page.fill('#name', 'Alice');
  await A.page.click('button:has-text("Join game")');
  await A.page.waitForSelector('text=You\'re in');
  await H2.page.click('text=End game');
  await H2.page.click('text=Yes, end it');
  await H2.page.waitForSelector('text=Final scoreboard');
  await A.page.waitForSelector('text=Final scoreboard');
  log('player leaderboard', await A.page.locator('.leaderboard li').allInnerTexts());
  log('storage after end', await A.page.evaluate(() => Object.keys(localStorage)), await H2.page.evaluate(() => Object.keys(localStorage)));
  await H2.page.screenshot({ path: 'test-results/rooms-end.png' });

  for (const [n, x] of [['A', A], ['B', B], ['H2', H2]]) log(n, 'errors', x.page.errors.filter(e => !/WebSocket|Failed to load resource/.test(e)));
  log('cookies', (await A.ctx.cookies()).length + (await H2.ctx.cookies()).length);
  await browser.close();
})().catch(e => { console.error('FAIL', e); process.exit(1); });
