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

  it('start then call broadcasts numbers; late joiners get the called list', async () => {
    const h = await host();
    const p = await player('Ann');
    expect(p.last('welcome')).toMatchObject({ started: false, called: [] });

    await send(core, h, { t: 'call', n: 7 });
    expect(h.last()).toEqual({ t: 'error', code: 'not_started' });

    await send(core, h, { t: 'start' });
    expect(p.last()).toEqual({ t: 'started' });
    expect(h.last('hostState')).toMatchObject({ started: true });

    await send(core, h, { t: 'call', n: 7 });
    await send(core, h, { t: 'call', n: 90 });
    expect(p.sent.filter(m => m.t === 'called')).toEqual([{ t: 'called', n: 7 }, { t: 'called', n: 90 }]);

    await send(core, h, { t: 'call', n: 7 });
    expect(h.last()).toEqual({ t: 'error', code: 'already_called' });
    for (const n of [0, 91, 2.5, '8']) await send(core, h, { t: 'call', n });
    expect(io.stored!.called).toEqual([7, 90]);

    const late = await player('Bob');
    expect(late.last('welcome')).toMatchObject({ started: true, called: [7, 90] });

    // The host resumes with the called list after reconnecting.
    h.close(1000, 'bye'); await core.onClose(h);
    const h2 = await host();
    expect(h2.last('hostState')).toMatchObject({ started: true, called: [7, 90] });
  });

  it('players cannot start or call', async () => {
    await host();
    const p = await player('Ann');
    await send(core, p, { t: 'start' });
    await send(core, p, { t: 'call', n: 5 });
    expect(io.stored!.started).toBeFalsy();
    expect(io.stored!.called).toEqual([]);
  });

  describe('claims and stages', () => {
    const ticket = [
      [1, 0, 21, 0, 41, 0, 61, 0, 81],
      [0, 12, 0, 32, 0, 52, 0, 72, 82],
      [3, 0, 23, 33, 0, 53, 0, 73, 0],
    ];
    const line = [1, 21, 41, 61, 81];
    const id = (c: FakeConn) => (c.last('welcome') as unknown as { playerId: string }).playerId;

    async function started() {
      const h = await host();
      await send(core, h, { t: 'start' });
      for (const n of line) await send(core, h, { t: 'call', n });
      return h;
    }

    it('claim reaches the host; award adds points and is reported to the player', async () => {
      const h = await started();
      const a = await player('Ann');
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      const claim = h.last('claim') as unknown as { claimId: string; name: string; marked: number[] };
      expect(claim).toMatchObject({ name: 'Ann', stage: 1, marked: line, ticket });

      // Only one pending claim per player.
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      expect(io.stored!.claims).toHaveLength(1);

      await send(core, h, { t: 'award', claimId: claim.claimId, points: 15 });
      expect(a.last('claimResult')).toEqual({ t: 'claimResult', claimId: claim.claimId, status: 'awarded', points: 15, total: 15 });
      expect(io.stored!.claims).toEqual([]);
      expect(io.stored!.players[id(a)].points).toBe(15);
      expect((h.last('roster') as unknown as { players: { points: number }[] }).players[0].points).toBe(15);

      // Can't claim the same stage again once awarded.
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      expect(io.stored!.claims).toEqual([]);
    });

    it('dismiss lets the player claim again', async () => {
      const h = await started();
      const a = await player('Ann');
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      const { claimId } = h.last('claim') as unknown as { claimId: string };
      await send(core, h, { t: 'dismiss', claimId });
      expect(a.last('claimResult')).toEqual({ t: 'claimResult', claimId, status: 'dismissed' });
      expect(io.stored!.players[id(a)].points).toBe(0);
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      expect(io.stored!.claims).toHaveLength(1);
    });

    it('rejects malformed claims and claims for the wrong stage', async () => {
      await started();
      const a = await player('Ann');
      await send(core, a, { t: 'claim', stage: 2, ticket, marked: line });
      expect(a.last()).toEqual({ t: 'error', code: 'bad_claim' });
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: [1, 2, 3] }); // not on ticket
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: [1, 1] });
      await send(core, a, { t: 'claim', stage: 1, ticket: [[1]], marked: [1] });
      expect(io.stored!.claims).toEqual([]);
    });

    it('next stage dismisses pending claims and tells players; rejoin restores claim state', async () => {
      const h = await started();
      const a = await player('Ann');
      const b = await player('Bob');
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      await send(core, b, { t: 'claim', stage: 1, ticket, marked: line });
      const { claimId } = h.sent.find(m => m.t === 'claim')! as unknown as { claimId: string };
      await send(core, h, { t: 'award', claimId, points: 10 });

      const { playerId, playerKey } = b.last('welcome') as unknown as { playerId: string; playerKey: string };
      const b2 = await connect('player');
      await send(core, b2, { t: 'join', name: 'Bob', playerId, playerKey });
      expect(b2.last('welcome')).toMatchObject({ pendingClaim: 1, won: [] });

      await send(core, h, { t: 'setStage', stage: 2 });
      expect(b2.sent.filter(m => m.t === 'claimResult').at(-1)).toMatchObject({ status: 'dismissed' });
      expect(a.last('stage')).toEqual({ t: 'stage', stage: 2 });
      expect(io.stored!.claims).toEqual([]);
      expect(h.last('hostState')).toMatchObject({ stage: 2, claims: [] });

      const a2 = await connect('player');
      const ak = a.last('welcome') as unknown as { playerId: string; playerKey: string };
      await send(core, a2, { t: 'join', name: 'Ann', playerId: ak.playerId, playerKey: ak.playerKey });
      expect(a2.last('welcome')).toMatchObject({ stage: 2, won: [1], pendingClaim: null, points: 10 });
    });

    it('points table and lock', async () => {
      const h = await started();
      await send(core, h, { t: 'setPoints', stage: 3, points: 100 });
      expect(io.stored!.points[3]).toBe(100);
      await send(core, h, { t: 'lock', locked: true });
      expect(h.last('hostState')).toMatchObject({ locked: true });
      const late = await player('Late');
      expect(late.last()).toEqual({ t: 'error', code: 'locked' });
      await send(core, h, { t: 'lock', locked: false });
      expect((await player('Late')).last('welcome')).toBeDefined();
    });

    it('players cannot award, change stage or lock', async () => {
      const h = await started();
      const a = await player('Ann');
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      const { claimId } = h.last('claim') as unknown as { claimId: string };
      for (const m of [{ t: 'award', claimId, points: 1000 }, { t: 'setStage', stage: 3 }, { t: 'lock', locked: true }]) await send(core, a, m);
      expect(io.stored).toMatchObject({ stage: 1, locked: false });
      expect(io.stored!.players[id(a)].points).toBe(0);
    });

    it('a full game ends with a leaderboard and empty storage', async () => {
      const h = await started();
      const a = await player('Ann');
      await send(core, a, { t: 'claim', stage: 1, ticket, marked: line });
      await send(core, h, { t: 'award', claimId: (h.last('claim') as unknown as { claimId: string }).claimId, points: 10 });
      await send(core, h, { t: 'end' });
      expect(a.last()).toEqual({ t: 'ended', leaderboard: [{ name: 'Ann', points: 10 }] });
      expect(io.stored).toBeUndefined();
      expect(io.alarm).toBeNull();
    });
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
