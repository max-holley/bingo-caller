// Player-side game controller: owns the socket and the reactive player state.
import { GameSocket, type SocketStatus } from './ws';
import { clearSession, saveSession, updatePlayerSession, type PlayerSession } from './session';
import { generateTicket, isValidTicket, ticketNumbers, type Ticket } from '../../shared/ticket';
import { setThemeOverride, isThemeId } from './themes';
import { CLOSE } from './close';
import type { LeaderboardEntry, ServerMsg, Stage } from '../../shared/protocol';

export type PlayerEnd = { kind: 'ended'; leaderboard: LeaderboardEntry[] } | { kind: 'gone'; code: string };

type Identity = { playerId: string; playerKey: string };

export class PlayerController {
  readonly code: string;
  status = $state<SocketStatus>('connecting');
  joined = $state(false);
  started = $state(false);
  name = $state('');
  /** Generated on this device; never sent to the server except in a claim (milestone 4). */
  ticket = $state<Ticket | null>(null);
  marks = $state<Set<number>>(new Set());
  stage = $state<Stage>(1);
  called = $state<number[]>([]);
  locked = $state(false);
  points = $state(0);
  /** Error shown on the join form (socket still open, e.g. bad_name). */
  joinError = $state<string | null>(null);
  end = $state<PlayerEnd | null>(null);

  private socket: GameSocket;
  private identity: Identity | null;
  private requestedName: string;
  private lastError = '';
  private storedPlayerId: string | null = null;

  /** Either resume a stored session or join fresh with a name. */
  constructor(opts: { session: PlayerSession } | { code: string; name: string }) {
    if ('session' in opts) {
      this.code = opts.session.code;
      this.identity = { playerId: opts.session.playerId, playerKey: opts.session.playerKey };
      this.requestedName = opts.session.name;
      this.name = opts.session.name;
      this.storedPlayerId = opts.session.playerId;
      if (isValidTicket(opts.session.ticket)) {
        this.ticket = opts.session.ticket;
        const nums = new Set(ticketNumbers(this.ticket));
        this.marks = new Set((opts.session.marks ?? []).filter(n => nums.has(n)));
      }
    } else {
      this.code = opts.code;
      this.identity = null;
      this.requestedName = opts.name;
    }
    this.socket = new GameSocket({
      code: this.code,
      role: 'player',
      onOpen: send => send({ t: 'join', name: this.requestedName, ...(this.identity ?? {}) }),
      onMessage: m => this.onMessage(m),
      onStatus: s => (this.status = s),
      onFinalClose: (code, reason) => this.onFinal(code, reason),
    });
  }

  retryName(name: string) {
    this.requestedName = name;
    this.joinError = null;
    this.socket.send({ t: 'join', name });
  }

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case 'welcome':
        this.identity = { playerId: m.playerId, playerKey: m.playerKey };
        this.name = m.name;
        this.started = m.started;
        this.stage = m.stage;
        this.called = m.called;
        this.locked = m.locked;
        this.points = m.points;
        if (isThemeId(m.theme)) setThemeOverride(m.theme);
        // A ticket belongs to one identity in one game; make a new one if we don't have it.
        if (!this.ticket || this.storedPlayerId !== m.playerId) {
          this.ticket = generateTicket();
          this.marks = new Set();
        }
        this.storedPlayerId = m.playerId;
        saveSession({
          v: 1, role: 'player', code: this.code, playerId: m.playerId, playerKey: m.playerKey,
          name: m.name, expiresAt: m.expiresAt, ticket: this.ticket, marks: [...this.marks],
        });
        this.joined = true;
        break;
      case 'started':
        this.started = true;
        break;
      case 'called':
        if (!this.called.includes(m.n)) this.called = [...this.called, m.n];
        break;
      case 'stage':
        this.stage = m.stage;
        break;
      case 'theme':
        if (isThemeId(m.id)) setThemeOverride(m.id);
        break;
      case 'ended':
        this.end = { kind: 'ended', leaderboard: m.leaderboard };
        break;
      case 'kicked':
        this.lastError = 'kicked';
        break;
      case 'error':
        this.lastError = m.code;
        if (m.code === 'bad_name') this.joinError = m.code;
        break;
    }
  }

  private onFinal(code: number, reason: string) {
    if (code !== CLOSE.replaced) clearSession();
    if (code === CLOSE.ended) this.end ??= { kind: 'ended', leaderboard: [] };
    else this.end = { kind: 'gone', code: reason || this.lastError || 'no_room' };
    this.dispose();
  }

  /** Toggle a mark. Only called numbers can be marked; returns false if `n` hasn't been called. */
  toggle(n: number): boolean {
    if (!this.called.includes(n)) return false;
    const next = new Set(this.marks);
    if (next.has(n)) next.delete(n); else next.add(n);
    this.marks = next;
    updatePlayerSession({ marks: [...next] });
    return true;
  }

  /** Leave voluntarily: forget the game on this device. */
  leave() {
    clearSession();
    this.dispose();
  }

  dispose() {
    this.socket.close();
    setThemeOverride(null);
  }
}
