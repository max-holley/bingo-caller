import { describe, it, expect, beforeEach } from 'vitest';
import { RoomCore, CLOSE, DEFAULT_CONFIG, type Attachment, type Conn, type RoomIO, type RoomState, type Role } from '../src/worker/room-core';
import { sha256, randomToken } from '../src/shared/secrets';

type Sent = { t: string; [k: string]: unknown };

class FakeConn implements Conn {
  att: Attachment;
  sent: Sent[] = [];
  closed: { code: number; reason: string } | null = null;
  constructor(role: Role, private io: FakeIO) { this.att = { role, authed: false, win: 0, count: 0 }; }
  setAtt(a: Attachment) { this.att = a; }
  send(m: unknown) { if (!this.closed) this.sent.push(m as Sent); }
  close(code: number, reason: string) { this.closed = { code, reason }; this.io.drop(this); }
  last(t?: string) { return [...this.sent].reverse().find(m => !t || m.t === t); }
}

class FakeIO implements RoomIO {
  t = 1_000_000;
  open: FakeConn[] = [];
  stored: RoomState | undefined;
  alarm: number | null = null;
  now() { return this.t; }
  conns() { return [...this.open]; }
  drop(c: FakeConn) { this.open = this.open.filter(x => x !== c); }
  async load() { return this.stored && structuredClone(this.stored); }
  async save(s: RoomState) { this.stored = structuredClone(s); }
  async deleteAll() { this.stored = undefined; this.alarm = null; }
  async setAlarm(at: number) { this.alarm = at; }
  async deleteAlarm() { this.alarm = null; }
}

const cfg = { ...DEFAULT_CONFIG, hostGraceMs: 60_000, ttlMs: 600_000, maxPlayers: 3 };
const send = (core: RoomCore, c: FakeConn, m: unknown) => core.onMessage(c, JSON.stringify(m));

let io: FakeIO;
let core: RoomCore;
let hostKey: string;

async function connect(role: Role) {
  const c = new FakeConn(role, io);
  io.open.push(c);
  await core.onConnect(c);
  return c;
}
async function host() {
  const h = await connect('host');
  await send(core, h, { t: 'host', hostKey });
  return h;
}
async function player(name: string) {
  const p = await connect('player');
  await send(core, p, { t: 'join', name });
  return p;
}

beforeEach(async () => {
  io = new FakeIO();
  core = new RoomCore(io, cfg);
  await core.init();
  hostKey = randomToken();
  await core.create('ABCDEF', await sha256(hostKey), 'ocean');
});

describe('room lifecycle', () => {
  it('stores only hashes, sets an abandonment alarm, rejects duplicate creation', async () => {
    expect(io.stored!.hostKeyHash).not.toBe(hostKey);
    expect(JSON.stringify(io.stored)).not.toContain(hostKey);
    expect(io.alarm).toBe(io.t + cfg.hostGraceMs);
    expect((await core.create('ABCDEF', 'x', 'midnight')).ok).toBe(false);
  });

  it('connections to a room that does not exist are rejected', async () => {
    const empty = new RoomCore(new FakeIO(), cfg);
    await empty.init();
    const c = new FakeConn('player', io);
    await empty.onConnect(c);
    expect(c.last()).toEqual({ t: 'error', code: 'no_room' });
    expect(c.closed?.code).toBe(CLOSE.rejected);
  });

  it('host auth resets the alarm to the hard cap and returns state', async () => {
    const h = await host();
    expect(h.last('hostState')).toMatchObject({ theme: 'ocean', stage: 1, called: [], players: [] });
    expect(io.alarm).toBe(io.stored!.expiresAt);
  });

  it('wrong host key is rejected', async () => {
    const h = await connect('host');
    await send(core, h, { t: 'host', hostKey: randomToken() });
    expect(h.last()).toEqual({ t: 'error', code: 'bad_key' });
    expect(h.closed).toBeTruthy();
  });

  it('host disconnect schedules deletion; reconnect cancels it; alarm deletes everything', async () => {
    const h = await host();
    io.t += 1000;
    io.drop(h);
    await core.onClose(h);
    expect(io.alarm).toBe(io.t + cfg.hostGraceMs);
    const h2 = await host();
    expect(io.alarm).toBe(io.stored!.expiresAt);
    const p = await player('Ann');
    io.drop(h2);
    await core.onClose(h2);
    await core.onAlarm();
    expect(io.stored).toBeUndefined();
    expect(io.alarm).toBeNull();
    expect(p.last()).toEqual({ t: 'error', code: 'expired' });
    expect(p.closed?.code).toBe(CLOSE.expired);
  });

  it('host grace never extends past the hard cap', async () => {
    const h = await host();
    io.t = io.stored!.expiresAt - 10;
    io.drop(h);
    await core.onClose(h);
    expect(io.alarm).toBe(io.stored!.expiresAt);
  });

  it('end wipes storage and sends the leaderboard', async () => {
    const h = await host();
    const p = await player('Ann');
    await send(core, h, { t: 'end' });
    expect(io.stored).toBeUndefined();
    expect(io.alarm).toBeNull();
    expect(p.last()).toEqual({ t: 'ended', leaderboard: [{ name: 'Ann', points: 0 }] });
    expect(p.closed?.code).toBe(CLOSE.ended);
    expect(h.closed?.code).toBe(CLOSE.ended);
  });
});

describe('players', () => {
  it('join gives a welcome with a fresh identity and updates the host roster', async () => {
    const h = await host();
    const p = await player('  Ann  ');
    const w = p.last('welcome')!;
    expect(w).toMatchObject({ name: 'Ann', theme: 'ocean', stage: 1, called: [], points: 0 });
    expect(typeof w.playerKey).toBe('string');
    expect(JSON.stringify(io.stored)).not.toContain(w.playerKey as string);
    expect(h.last('roster')).toEqual({ t: 'roster', players: [{ id: w.playerId, name: 'Ann', online: true, points: 0 }] });
  });

  it('duplicate names get a suffix', async () => {
    await player('Sam');
    const p2 = await player('sam');
    expect(p2.last('welcome')!.name).toBe('sam (2)');
  });

  it('bad names get an error but the socket stays open for a retry', async () => {
    const p = await player('​  ');
    expect(p.last()).toEqual({ t: 'error', code: 'bad_name' });
    expect(p.closed).toBeNull();
    await send(core, p, { t: 'join', name: 'Bo' });
    expect(p.last('welcome')).toBeTruthy();
  });

  it('rejoin with the right key restores the player; wrong key is rejected', async () => {
    const h = await host();
    const p = await player('Ann');
    const { playerId, playerKey } = p.last('welcome') as unknown as { playerId: string; playerKey: string };
    io.drop(p);
    await core.onClose(p);
    expect(h.last('roster')).toMatchObject({ players: [{ online: false }] });

    const bad = await connect('player');
    await send(core, bad, { t: 'join', name: 'x', playerId, playerKey: randomToken() });
    expect(bad.last()).toEqual({ t: 'error', code: 'bad_key' });

    const again = await connect('player');
    await send(core, again, { t: 'join', name: 'ignored', playerId, playerKey });
    expect(again.last('welcome')).toMatchObject({ playerId, playerKey, name: 'Ann' });
    expect(h.last('roster')).toMatchObject({ players: [{ id: playerId, online: true }] });
    expect(Object.keys(io.stored!.players)).toHaveLength(1);
  });

  it('a second connection for the same player replaces the first', async () => {
    const p = await player('Ann');
    const { playerId, playerKey } = p.last('welcome') as unknown as { playerId: string; playerKey: string };
    const p2 = await connect('player');
    await send(core, p2, { t: 'join', name: 'Ann', playerId, playerKey });
    expect(p.closed?.code).toBe(CLOSE.replaced);
  });

  it('kicked players cannot rejoin', async () => {
    const p = await player('Ann');
    const { playerId, playerKey } = p.last('welcome') as unknown as { playerId: string; playerKey: string };
    io.stored!.kicked.push(playerId);
    await core.init();
    const again = await connect('player');
    await send(core, again, { t: 'join', name: 'Ann', playerId, playerKey });
    expect(again.last()).toEqual({ t: 'error', code: 'kicked' });
  });

  it('host can kick a player, online or away', async () => {
    const h = await host();
    const p = await player('Ann');
    const away = await player('Bob');
    const { playerId, playerKey } = p.last('welcome') as unknown as { playerId: string; playerKey: string };
    const bobId = (away.last('welcome') as unknown as { playerId: string }).playerId;
    away.close(1000, 'bye'); await core.onClose(away);

    await send(core, h, { t: 'kick', playerId });
    expect(p.last()).toEqual({ t: 'kicked' });
    expect(p.closed).toEqual({ code: CLOSE.rejected, reason: 'kicked' });
    expect(io.stored!.players[playerId]).toBeUndefined();
    expect(io.stored!.kicked).toEqual([playerId]);
    expect(JSON.stringify(io.stored)).not.toContain('Ann');

    await send(core, h, { t: 'kick', playerId: bobId });
    const roster = h.last('roster') as unknown as { players: unknown[] };
    expect(roster.players).toEqual([]);

    const again = await connect('player');
    await send(core, again, { t: 'join', name: 'Ann', playerId, playerKey });
    expect(again.last()).toEqual({ t: 'error', code: 'kicked' });
  });

  it('kicking frees a place in a full room; players cannot kick', async () => {
    const h = await host();
    const a = await player('A'); const b = await player('B'); await player('C');
    const aId = (a.last('welcome') as unknown as { playerId: string }).playerId;
    await send(core, b, { t: 'kick', playerId: aId });
    expect(io.stored!.players[aId]).toBeDefined();
    await send(core, h, { t: 'kick', playerId: aId });
    const d = await player('D');
    expect(d.last('welcome')).toBeDefined();
  });

  it('caps players per room', async () => {
    await player('A'); await player('B'); await player('C');
    const d = await player('D');
    expect(d.last()).toEqual({ t: 'error', code: 'full' });
  });

  it('theme changes reach players', async () => {
    const h = await host();
    const p = await player('Ann');
    await send(core, h, { t: 'setTheme', id: 'halloween' });
    expect(p.last('theme')).toEqual({ t: 'theme', id: 'halloween' });
    expect(io.stored!.theme).toBe('halloween');
  });
});

describe('enforcement', () => {
  it('host messages from an unauthenticated host socket are refused', async () => {
    const h = await connect('host');
    await send(core, h, { t: 'end' });
    expect(h.last()).toEqual({ t: 'error', code: 'not_host' });
    expect(io.stored).toBeDefined();
  });

  it('players cannot send host messages', async () => {
    const p = await player('Ann');
    await send(core, p, { t: 'end' });
    expect(p.last()).toEqual({ t: 'error', code: 'bad_message' });
    expect(io.stored).toBeDefined();
  });

  it('malformed and oversized messages are dropped', async () => {
    const p = await connect('player');
    await core.onMessage(p, '{oops');
    await core.onMessage(p, 'x'.repeat(5000));
    expect(p.sent.every(m => m.t === 'error' && m.code === 'bad_message')).toBe(true);
    expect(io.stored!.players).toEqual({});
  });

  it('more than 10 messages per second disconnects', async () => {
    const p = await player('Ann');
    for (let i = 0; i < 9; i++) await core.onMessage(p, '{}'); // + the join = 10
    expect(p.closed).toBeNull();
    await core.onMessage(p, '{}');
    expect(p.closed?.code).toBe(CLOSE.rateLimited);
  });
});
