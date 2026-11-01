// Player-side game controller: owns the socket and the reactive player state.
import { GameSocket, type SocketStatus } from './ws';
import { clearSession, saveSession, type PlayerSession } from './session';
import { setThemeOverride, isThemeId } from './themes';
import { CLOSE } from './close';
import type { LeaderboardEntry, ServerMsg, Stage } from '../../shared/protocol';

export type PlayerEnd = { kind: 'ended'; leaderboard: LeaderboardEntry[] } | { kind: 'gone'; code: string };

type Identity = { playerId: string; playerKey: string };

export class PlayerController {
  readonly code: string;
  status = $state<SocketStatus>('connecting');
  joined = $state(false);
  name = $state('');
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

  /** Either resume a stored session or join fresh with a name. */
  constructor(opts: { session: PlayerSession } | { code: string; name: string }) {
    if ('session' in opts) {
      this.code = opts.session.code;
      this.identity = { playerId: opts.session.playerId, playerKey: opts.session.playerKey };
      this.requestedName = opts.session.name;
      this.name = opts.session.name;
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
        this.stage = m.stage;
        this.called = m.called;
        this.locked = m.locked;
        this.points = m.points;
        if (isThemeId(m.theme)) setThemeOverride(m.theme);
        saveSession({
          v: 1, role: 'player', code: this.code, playerId: m.playerId, playerKey: m.playerKey,
          name: m.name, expiresAt: m.expiresAt,
        });
        this.joined = true;
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
