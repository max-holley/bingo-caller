const { chromium } = require('playwright');
// Milestone 5 / spec section 13 privacy checks: privacy notice reachable from the footer and the
// join screen, "Clear data on this device" wipes every bingo.* key and leaves the game, no cookies,
// no third-party requests, no CSP violations. Optional: pass a path to axe-core's axe.min.js as the
// third argument to run an accessibility scan of each screen.
// Run against `npm run build && npx wrangler dev`:  node e2e/compliance.cjs [baseUrl] [screenshotDir] [axePath]
const base = process.argv[2] || 'http://127.0.0.1:8787';
const shots = process.argv[3];
const axePath = process.argv[4];
const ok = (cond, msg) => { if (!cond) throw new Error('FAILED: ' + msg); console.log('ok', msg); };
(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const axeIssues = [];
  const mk = async viewport => {
    const ctx = await browser.newContext({ viewport, bypassCSP: !!axePath }); // the axe scan needs an injected script
    const page = await ctx.newPage();
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push(String(e)));
    page.on('request', r => { const u = r.url(); if (!u.startsWith(base) && !u.startsWith(base.replace('http', 'ws')) && !u.startsWith('data:')) errors.push('EXTERNAL ' + u); });
    return { ctx, page };
  };
  const axe = async (page, label) => {
    if (!axePath) return;
    await page.waitForTimeout(1200); // let fade-in animations finish
    await page.addScriptTag({ path: axePath });
    const r = await page.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa'] })).violations
      .map(v => `${v.id} (${v.impact}): ${v.nodes.length} × ${v.nodes.slice(0, 3).map(n => n.target.join(' ') + ' [' + (n.any[0]?.message ?? '').slice(0, 110) + ']').join(' | ')}`));
    r.forEach(x => axeIssues.push(`${label}: ${x}`));
  };
  const keys = page => page.evaluate(() => Object.keys(localStorage));

  const H = await mk({ width: 1100, height: 900 });
  const A = await mk({ width: 390, height: 844 });

  // Privacy notice straight from the URL, and from the landing footer
  await A.page.goto(`${base}/privacy`);
  await A.page.waitForSelector('text=Who we are');
  ok(await A.page.isVisible('a[href="mailto:max@webh.dev"]'), 'privacy notice loads at /privacy with the contact email');
  await axe(A.page, 'privacy');
  if (shots) await A.page.screenshot({ path: shots + '/privacy.png', fullPage: true });
  await A.page.click('button:has-text("Back")');
  await A.page.waitForSelector('text=Host a game');
  ok(new URL(A.page.url()).pathname === '/', 'back from privacy goes home');
  await axe(A.page, 'landing');
  await A.page.click('footer >> text=Privacy notice');
  await A.page.waitForSelector('text=Who we are');
  await A.page.goBack();
  await A.page.waitForSelector('text=Host a game');
  ok(true, 'footer link opens the notice; browser back closes it');
  ok((await keys(A.page)).length === 0, 'nothing stored before the user acts');

  // Host a game, player joins (privacy link on the join screen)
  await H.page.goto(base);
  await H.page.click('text=Host a game');
  await axe(H.page, 'host setup');
  await H.page.click('text=Create game');
  await H.page.waitForSelector('.room-code');
  const code = (await H.page.textContent('.room-code')).trim();
  await axe(H.page, 'host lobby');
  await A.page.goto(`${base}/join/${code}`);
  ok(await A.page.isVisible('.jit-notice a:has-text("Privacy notice")'), 'join screen links the privacy notice next to the nickname field');
  await axe(A.page, 'join');
  await A.page.fill('#name', 'Alice');
  await A.page.click('button:has-text("Join game")');
  await A.page.waitForSelector('.ticket');
  await H.page.waitForFunction(() => document.querySelectorAll('.roster-item').length === 1);
  await H.page.click('button:has-text("Start game")');
  await H.page.waitForSelector('button:has-text("CALL NUMBER")');
  await axe(H.page, 'host game');
  await H.page.click('button:has-text("CALL NUMBER")');
  await A.page.waitForSelector('.last-number');
  await axe(A.page, 'player game');
  if (shots) await A.page.screenshot({ path: shots + '/player-footer.png', fullPage: true });

  // Opening the notice mid-game keeps the game alive
  await A.page.click('footer >> text=Privacy notice');
  await A.page.waitForSelector('text=Who we are');
  await A.page.click('button:has-text("Back")');
  await A.page.waitForSelector('.ticket');
  ok(true, 'privacy notice mid-game returns to the game');

  for (const p of [H.page, A.page]) {
    const k = await keys(p);
    ok(k.length > 0 && k.every(x => x.startsWith('bingo.')), `all storage keys are bingo.*: ${k.join(', ')}`);
  }
  for (const c of [H.ctx, A.ctx]) ok((await c.cookies()).length === 0, 'no cookies');

  // Clear data on this device: wipes storage and leaves the game
  await A.page.click('footer >> text=Clear data on this device');
  await A.page.click('footer button:text-is("Clear")');
  await A.page.waitForSelector('text=has been deleted');
  ok((await keys(A.page)).length === 0, 'Clear data wipes every key');
  await H.page.waitForFunction(() => document.querySelector('.roster-item.offline'));
  ok(true, 'player left the game (shows as away for the host)');
  await A.page.reload();
  await A.page.waitForSelector('text=Host a game');
  ok(true, 'after a reload the device has no game to resume');

  // Headers
  const res = await A.page.request.get(base + '/');
  const h = res.headers();
  ok(h['content-security-policy']?.includes("default-src 'self'") && h['x-content-type-options'] === 'nosniff' && h['referrer-policy'] === 'no-referrer', 'security headers present');

  if (axePath) { console.log(axeIssues.length ? 'axe issues:\n  ' + axeIssues.join('\n  ') : 'ok axe: no WCAG A/AA violations'); }
  ok(errors.length === 0, 'no console errors (incl. CSP), no external requests ' + JSON.stringify(errors));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
