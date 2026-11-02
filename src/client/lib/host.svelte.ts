// Host-side game controller: owns the socket and the reactive room state.
import { GameSocket, type SocketStatus } from './ws';
import { clearSession, type HostSession } from './session';
import { setPickHandler, setThemeOverride, isThemeId, type ThemeId } from './themes';
import { CLOSE } from './close';
import { ClassicSound } from './sounds';
import type { ClaimView, LeaderboardEntry, PlayerSummary, PointsTable, ServerMsg, Stage } from '../../shared/protocol';

export type HostEnd = { kind: 'ended'; leaderboard: LeaderboardEntry[] } | { kind: 'gone'; code: string };

export class HostController {
  readonly code: string;
  status = $state<SocketStatus>('connecting');
  ready = $state(false);
  started = $state(false);
  /** Bumped when a state sync changes the called list, so the caller board rebuilds from it. */
  syncKey = $state(0);
  players = $state<PlayerSummary[]>([]);
  stage = $state<Stage>(1);
  called = $state<number[]>([]);
  locked = $state(false);
  points = $state<PointsTable>({ 1: 10, 2: 20, 3: 50 });
  expiresAt = $state(0);
  /** Pending claims, oldest first. Untrusted: the claim modal re-verifies each one. */
  claims = $state<ClaimView[]>([]);
  end = $state<HostEnd | null>(null);

  private socket: GameSocket;
  private lastError = '';

  constructor(session: HostSession) {
    this.code = session.code;
    setPickHandler(id => this.setTheme(id));
    this.socket = new GameSocket({
      code: session.code,
      role: 'host',
      onOpen: send => send({ t: 'host', hostKey: session.hostKey }),
      onMessage: m => this.onMessage(m),
      onStatus: s => (this.status = s),
      onFinalClose: (code, reason) => this.onFinal(code, reason),
    });
  }

  private onMessage(m: ServerMsg) {
    switch (m.t) {
      case 'hostState':
        this.players = m.players;
        this.started = m.started;
        this.stage = m.stage;
        // Rebuild the caller board only if the server's list differs from ours (e.g. a call
        // was lost while reconnecting), so stage or lock updates don't reset the roller.
        if (m.called.length !== this.called.length || m.called.some((n, i) => n !== this.called[i])) {
          this.called = m.called;
          this.syncKey++;
        }
        this.locked = m.locked;
        this.points = m.points;
        this.claims = m.claims;
        this.expiresAt = m.expiresAt;
        if (isThemeId(m.theme)) setThemeOverride(m.theme);
        this.ready = true;
        break;
      case 'roster':
        this.players = m.players;
        break;
      case 'claim': {
        const { t: _t, ...claim } = m;
        if (!this.claims.some(c => c.claimId === claim.claimId)) {
          this.claims = [...this.claims, claim];
          ClassicSound.claim();
        }
        break;
      }
      case 'ended':
        this.end = { kind: 'ended', leaderboard: m.leaderboard };
        break;
      case 'error':
        this.lastError = m.code;
        break;
    }
  }

  private onFinal(code: number, reason: string) {
    if (code === CLOSE.ended) {
      clearSession();
      this.end ??= { kind: 'ended', leaderboard: [] };
    } else {
      if (code !== CLOSE.replaced) clearSession();
      this.end = { kind: 'gone', code: reason || this.lastError || 'no_room' };
    }
    this.dispose();
  }

  setTheme(id: ThemeId) {
    setThemeOverride(id);
    this.socket.send({ t: 'setTheme', id });
  }

  start() {
    this.socket.send({ t: 'start' });
  }

  /** The caller board has revealed a number: tell the room. */
  call(n: number) {
    if (!this.called.includes(n)) this.called = [...this.called, n];
    this.socket.send({ t: 'call', n });
  }

  award(claimId: string, points: number) {
    this.claims = this.claims.filter(c => c.claimId !== claimId);
    this.socket.send({ t: 'award', claimId, points });
  }

  dismiss(claimId: string) {
    this.claims = this.claims.filter(c => c.claimId !== claimId);
    this.socket.send({ t: 'dismiss', claimId });
  }

  nextStage() {
    if (this.stage >= 3) return;
    const stage = (this.stage + 1) as Stage;
    this.stage = stage;
    this.claims = this.claims.filter(c => c.stage === stage);
    this.socket.send({ t: 'setStage', stage });
  }

  setPoints(stage: Stage, points: number) {
    this.points = { ...this.points, [stage]: points };
    this.socket.send({ t: 'setPoints', stage, points });
  }

  setLocked(locked: boolean) {
    this.locked = locked;
    this.socket.send({ t: 'lock', locked });
  }

  kick(playerId: string) {
    // Optimistic: drop them now; the server's roster update confirms it.
    this.players = this.players.filter(p => p.id !== playerId);
    this.claims = this.claims.filter(c => c.playerId !== playerId);
    this.socket.send({ t: 'kick', playerId });
  }

  endGame() {
    this.socket.send({ t: 'end' });
  }

  dispose() {
    setPickHandler(null);
    this.socket.close();
  }
}
