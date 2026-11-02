// GameRoom logic, independent of the Durable Object runtime so it can be unit-tested.
// The DO (room.ts) supplies sockets, storage, alarms and the clock through RoomIO.
//
// Privacy: no IPs, user agents, tickets or marks are stored. Nothing here is logged.
import {
  HostMsg, PlayerMsg, parseMessage,
  type ErrorCode, type HostOut, type PlayerOut, type PlayerSummary, type PointsTable,
  type Stage, type ThemeIdWire, type ClaimView, type LeaderboardEntry,
} from '../shared/protocol';
import { sanitizeName, dedupeName } from '../shared/names';
import { randomId, randomToken, sha256, safeEqual } from '../shared/secrets';

export type Role = 'host' | 'player';

/** Per-connection data, kept in the hibernation attachment. */
export type Attachment = {
  role: Role;
  authed: boolean;
  playerId?: string;
  /** Message rate window start (ms) and count. */
  win: number;
  count: number;
};

export interface Conn {
  readonly att: Attachment;
  setAtt(a: Attachment): void;
  send(msg: HostOut | PlayerOut): void;
  close(code: number, reason: string): void;
}

export interface RoomIO {
  now(): number;
  /** All currently open connections. */
  conns(): Conn[];
  load(): Promise<RoomState | undefined>;
  save(s: RoomState): Promise<void>;
  deleteAll(): Promise<void>;
  setAlarm(at: number): Promise<void>;
  deleteAlarm(): Promise<void>;
}

export type PlayerRecord = { name: string; keyHash: string; points: number; lastSeen: number };
export type PendingClaim = ClaimView;

export type RoomState = {
  v: 1;
  code: string;
  createdAt: number;
  expiresAt: number; // hard cap
  hostKeyHash: string;
  hostLastSeen: number;
  theme: ThemeIdWire;
  stage: Stage;
  points: PointsTable;
  locked: boolean;
  called: number[];
  players: Record<string, PlayerRecord>; // insertion order = join order
  kicked: string[]; // player ids that may not rejoin
  claims: PendingClaim[];
};

export type RoomConfig = {
  ttlMs: number;       // hard cap from creation (24h)
  hostGraceMs: number; // room survives this long after the host disconnects (60 min)
  maxPlayers: number;  // default 60
  msgPerSec: number;   // per-connection message rate limit (10/s)
};

export const DEFAULT_CONFIG: RoomConfig = {
  ttlMs: 24 * 60 * 60 * 1000,
  hostGraceMs: 60 * 60 * 1000,
  maxPlayers: 60,
  msgPerSec: 10,
};

// Close codes (4000–4999 are application-defined). All are terminal for the client.
export const CLOSE = {
  ended: 4000,
  expired: 4001,
  rejected: 4002, // no_room, bad_key, kicked, locked, full
  replaced: 4003, // same identity connected elsewhere
  rateLimited: 4004,
} as const;

export class RoomCore {
  private state: RoomState | undefined;

  constructor(private io: RoomIO, private cfg: RoomConfig = DEFAULT_CONFIG) {}

  async init(): Promise<void> {
    this.state = await this.io.load();
  }

  get exists(): boolean { return !!this.state; }
  /** For tests. */
  get snapshot(): RoomState | undefined { return this.state && structuredClone(this.state); }

  // ── Lifecycle ────────────────────────────────────────────────
  /** Create the room. Returns false if this code is already in use. */
  async create(code: string, hostKeyHash: string, theme: ThemeIdWire): Promise<{ ok: boolean; expiresAt?: number }> {
    if (this.state) return { ok: false };
    const now = this.io.now();
    this.state = {
      v: 1, code, createdAt: now, expiresAt: now + this.cfg.ttlMs, hostKeyHash, hostLastSeen: now,
      theme, stage: 1, points: { 1: 10, 2: 20, 3: 50 }, locked: false, called: [],
      players: {}, kicked: [], claims: [],
    };
    await this.io.save(this.state);
    // The host has not connected yet: treat as disconnected so an abandoned room is cleaned up.
    await this.io.setAlarm(Math.min(now + this.cfg.hostGraceMs, this.state.expiresAt));
    return { ok: true, expiresAt: this.state.expiresAt };
  }

  async onConnect(conn: Conn): Promise<void> {
    if (!this.state) this.reject(conn, 'no_room');
  }

  async onAlarm(): Promise<void> {
    if (!this.state) { await this.io.deleteAll(); return; }
    await this.destroy({ t: 'error', code: 'expired' }, CLOSE.expired, 'expired');
  }

  async onClose(conn: Conn): Promise<void> {
    const s = this.state;
    if (!s || !conn.att.authed) return;
    if (conn.att.role === 'host') {
      if (this.hostConns(conn).length === 0) {
        s.hostLastSeen = this.io.now();
        await this.io.save(s);
        await this.io.setAlarm(Math.min(s.hostLastSeen + this.cfg.hostGraceMs, s.expiresAt));
      }
    } else if (conn.att.playerId) {
      const p = s.players[conn.att.playerId];
      if (p) { p.lastSeen = this.io.now(); await this.io.save(s); }
      this.sendRoster(conn);
    }
  }

  // ── Messages ─────────────────────────────────────────────────
  async onMessage(conn: Conn, raw: unknown): Promise<void> {
    if (!this.rateOk(conn)) {
      conn.send({ t: 'error', code: 'rate_limited' });
      conn.close(CLOSE.rateLimited, 'rate_limited');
      return;
    }
    if (!this.state) { this.reject(conn, 'no_room'); return; }

    if (conn.att.role === 'host') {
      const msg = parseMessage(HostMsg, raw);
      if (!msg) { conn.send({ t: 'error', code: 'bad_message' }); return; }
      if (msg.t === 'host') return this.hostAuth(conn, msg.hostKey);
      if (!conn.att.authed) { conn.send({ t: 'error', code: 'not_host' }); return; }
      return this.hostMessage(conn, msg);
    }

    const msg = parseMessage(PlayerMsg, raw);
    if (!msg) { conn.send({ t: 'error', code: 'bad_message' }); return; }
    if (msg.t === 'join') return this.join(conn, msg);
    if (!conn.att.authed) { conn.send({ t: 'error', code: 'not_joined' }); return; }
    // claim: milestone 4
  }

  private rateOk(conn: Conn): boolean {
    const now = this.io.now();
    const a = { ...conn.att };
    if (now - a.win >= 1000) { a.win = now; a.count = 0; }
    a.count++;
    conn.setAtt(a);
    return a.count <= this.cfg.msgPerSec;
  }

  private async hostAuth(conn: Conn, hostKey: string): Promise<void> {
    const s = this.state!;
    if (!safeEqual(await sha256(hostKey), s.hostKeyHash)) { this.reject(conn, 'bad_key'); return; }
    // One host connection at a time: the newest wins.
    for (const other of this.hostConns(conn)) {
      other.send({ t: 'error', code: 'replaced' });
      other.close(CLOSE.replaced, 'replaced');
    }
    conn.setAtt({ ...conn.att, authed: true });
    s.hostLastSeen = this.io.now();
    await this.io.save(s);
    await this.io.setAlarm(s.expiresAt); // host is back: only the hard cap applies
    conn.send(this.hostState());
  }

  private async hostMessage(conn: Conn, msg: HostMsg): Promise<void> {
    const s = this.state!;
    switch (msg.t) {
      case 'setTheme':
        if (s.theme === msg.id) return;
        s.theme = msg.id;
        await this.io.save(s);
        this.broadcastPlayers({ t: 'theme', id: msg.id });
        return;
      case 'end':
        await this.destroy({ t: 'ended', leaderboard: this.leaderboard() }, CLOSE.ended, 'ended');
        return;
      case 'kick': {
        if (!s.players[msg.playerId]) return;
        // Forget the player entirely (name, key hash, points, claims); keep only the id so a
        // stored identity can't be used to rejoin.
        delete s.players[msg.playerId];
        s.claims = s.claims.filter(c => c.playerId !== msg.playerId);
        if (!s.kicked.includes(msg.playerId)) s.kicked.push(msg.playerId);
        await this.io.save(s);
        for (const c of this.playerConns(msg.playerId)) {
          c.send({ t: 'kicked' });
          c.close(CLOSE.rejected, 'kicked');
        }
        this.sendRoster();
        return;
      }
      default:
        // call, setStage, setPoints, lock, award, dismiss: later milestones.
        void conn;
        return;
    }
  }

  private async join(conn: Conn, msg: Extract<PlayerMsg, { t: 'join' }>): Promise<void> {
    const s = this.state!;
    if (conn.att.authed) return; // already joined on this connection

    let playerId: string;
    let playerKey: string;

    if (msg.playerId || msg.playerKey) {
      // Rejoin with stored identity.
      if (!msg.playerId || !msg.playerKey) { this.reject(conn, 'bad_key'); return; }
      if (s.kicked.includes(msg.playerId)) { this.reject(conn, 'kicked'); return; }
      const p = s.players[msg.playerId];
      if (!p || !safeEqual(await sha256(msg.playerKey), p.keyHash)) { this.reject(conn, 'bad_key'); return; }
      playerId = msg.playerId;
      playerKey = msg.playerKey;
      for (const other of this.playerConns(playerId, conn)) {
        other.send({ t: 'error', code: 'replaced' });
        other.close(CLOSE.replaced, 'replaced');
      }
      p.lastSeen = this.io.now();
    } else {
      if (s.locked) { this.reject(conn, 'locked'); return; }
      if (Object.keys(s.players).length >= this.cfg.maxPlayers) { this.reject(conn, 'full'); return; }
      const clean = sanitizeName(msg.name);
      if (!clean) { conn.send({ t: 'error', code: 'bad_name' }); return; } // allow a retry
      playerId = randomId();
      playerKey = randomToken();
      const keyHash = await sha256(playerKey);
      // Re-check after the await, then dedupe and insert synchronously so concurrent joins can't collide.
      if (Object.keys(s.players).length >= this.cfg.maxPlayers) { this.reject(conn, 'full'); return; }
      const name = dedupeName(clean, Object.values(s.players).map(p => p.name));
      s.players[playerId] = { name, keyHash, points: 0, lastSeen: this.io.now() };
    }

    await this.io.save(s);
    conn.setAtt({ ...conn.att, authed: true, playerId });
    const p = s.players[playerId];
    conn.send({
      t: 'welcome', playerId, playerKey, name: p.name, theme: s.theme, stage: s.stage,
      called: s.called, locked: s.locked, points: p.points, expiresAt: s.expiresAt,
    });
    this.sendRoster();
  }

  // ── Helpers ──────────────────────────────────────────────────
  private reject(conn: Conn, code: ErrorCode) {
    conn.send({ t: 'error', code });
    conn.close(CLOSE.rejected, code);
  }

  private async destroy(finalMsg: HostOut | PlayerOut, closeCode: number, reason: string) {
    for (const c of this.io.conns()) {
      try { c.send(finalMsg); c.close(closeCode, reason); } catch { /* already gone */ }
    }
    this.state = undefined;
    await this.io.deleteAlarm();
    await this.io.deleteAll();
  }

  private hostConns(except?: Conn): Conn[] {
    return this.io.conns().filter(c => c !== except && c.att.role === 'host' && c.att.authed);
  }

  private playerConns(playerId: string, except?: Conn): Conn[] {
    return this.io.conns().filter(c => c !== except && c.att.role === 'player' && c.att.authed && c.att.playerId === playerId);
  }

  roster(except?: Conn): PlayerSummary[] {
    const s = this.state!;
    const online = new Set(
      this.io.conns().filter(c => c !== except && c.att.role === 'player' && c.att.authed).map(c => c.att.playerId),
    );
    return Object.entries(s.players).map(([id, p]) => ({ id, name: p.name, online: online.has(id), points: p.points }));
  }

  private hostState(): HostOut {
    const s = this.state!;
    return {
      t: 'hostState', theme: s.theme, stage: s.stage, called: s.called, locked: s.locked,
      players: this.roster(), claims: s.claims, points: s.points, expiresAt: s.expiresAt,
    };
  }

  private sendRoster(except?: Conn) {
    const msg: HostOut = { t: 'roster', players: this.roster(except) };
    for (const h of this.hostConns(except)) h.send(msg);
  }

  private broadcastPlayers(msg: PlayerOut) {
    for (const c of this.io.conns()) if (c.att.role === 'player' && c.att.authed) c.send(msg);
  }

  private leaderboard(): LeaderboardEntry[] {
    return Object.values(this.state!.players)
      .map(p => ({ name: p.name, points: p.points }))
      .sort((a, b) => b.points - a.points);
  }
}
