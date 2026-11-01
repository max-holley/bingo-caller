// Wire protocol shared by client and Worker. Every inbound message is validated with these
// schemas; anything malformed or unknown is dropped.
import * as v from 'valibot';

export const MAX_MESSAGE_BYTES = 4096;
export const MAX_NUMBER = 90;
export const STAGES = [1, 2, 3] as const; // 1 Line, 2 Two Lines, 3 Full House
export type Stage = (typeof STAGES)[number];

export const THEME_IDS = ['midnight', 'ocean', 'sunset', 'forest', 'aurora', 'halloween', 'christmas'] as const;
export type ThemeIdWire = (typeof THEME_IDS)[number];

const Ball = v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_NUMBER));
const StageS = v.picklist(STAGES);
const Points = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(1000));
const Theme = v.picklist(THEME_IDS);
const Id = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{8,32}$/));
const Key = v.pipe(v.string(), v.regex(/^[A-Za-z0-9_-]{22}$/)); // 128-bit, base64url
const RawName = v.pipe(v.string(), v.maxLength(200)); // sanitised separately (shared/names.ts)
const Cell = v.pipe(v.number(), v.integer(), v.minValue(0), v.maxValue(MAX_NUMBER));
const TicketS = v.pipe(v.array(v.pipe(v.array(Cell), v.length(9))), v.length(3));

// ── Host → server ───────────────────────────────────────────────
// `host` authenticates the connection (keeps the secret out of the URL).
export const HostMsg = v.variant('t', [
  v.object({ t: v.literal('host'), hostKey: Key }),
  v.object({ t: v.literal('call'), n: Ball }),
  v.object({ t: v.literal('setTheme'), id: Theme }),
  v.object({ t: v.literal('setStage'), stage: StageS }),
  v.object({ t: v.literal('setPoints'), stage: StageS, points: Points }),
  v.object({ t: v.literal('lock'), locked: v.boolean() }),
  v.object({ t: v.literal('award'), claimId: Id, points: Points }),
  v.object({ t: v.literal('dismiss'), claimId: Id }),
  v.object({ t: v.literal('kick'), playerId: Id }),
  v.object({ t: v.literal('end') }),
]);
export type HostMsg = v.InferOutput<typeof HostMsg>;

// ── Player → server ─────────────────────────────────────────────
export const PlayerMsg = v.variant('t', [
  v.object({ t: v.literal('join'), name: RawName, playerId: v.optional(Id), playerKey: v.optional(Key) }),
  v.object({ t: v.literal('claim'), stage: StageS, ticket: TicketS, marked: v.pipe(v.array(Ball), v.maxLength(15)) }),
]);
export type PlayerMsg = v.InferOutput<typeof PlayerMsg>;

// ── Server → client ─────────────────────────────────────────────
export type PlayerSummary = { id: string; name: string; online: boolean; points: number };
export type PointsTable = Record<Stage, number>;
export type ClaimView = {
  claimId: string; playerId: string; name: string; stage: Stage;
  ticket: number[][]; marked: number[]; ts: number;
};
export type LeaderboardEntry = { name: string; points: number };

export type ErrorCode =
  | 'bad_message' | 'rate_limited' | 'no_room' | 'bad_key' | 'not_host' | 'locked' | 'full'
  | 'bad_name' | 'kicked' | 'already_called' | 'expired' | 'replaced' | 'not_joined';

export type HostOut =
  | { t: 'hostState'; theme: ThemeIdWire; stage: Stage; called: number[]; locked: boolean;
      players: PlayerSummary[]; claims: ClaimView[]; points: PointsTable; expiresAt: number }
  | { t: 'roster'; players: PlayerSummary[] }
  | ({ t: 'claim' } & ClaimView)
  | { t: 'ended'; leaderboard: LeaderboardEntry[] }
  | { t: 'error'; code: ErrorCode };

export type PlayerOut =
  | { t: 'welcome'; playerId: string; playerKey: string; name: string; theme: ThemeIdWire;
      stage: Stage; called: number[]; locked: boolean; points: number; expiresAt: number }
  | { t: 'called'; n: number }
  | { t: 'theme'; id: ThemeIdWire }
  | { t: 'stage'; stage: Stage }
  | { t: 'claimResult'; claimId: string; status: 'awarded' | 'dismissed'; points?: number }
  | { t: 'kicked' }
  | { t: 'ended'; leaderboard: LeaderboardEntry[] }
  | { t: 'error'; code: ErrorCode };

export type ServerMsg = HostOut | PlayerOut;

/** Parse raw socket data. Returns null for oversize, non-JSON or schema-invalid messages. */
export function parseMessage<S extends v.GenericSchema>(schema: S, raw: unknown): v.InferOutput<S> | null {
  if (typeof raw !== 'string' || raw.length > MAX_MESSAGE_BYTES) return null;
  let data: unknown;
  try { data = JSON.parse(raw); } catch { return null; }
  const r = v.safeParse(schema, data);
  return r.success ? r.output : null;
}

// ── HTTP ───────────────────────────────────────────────────────
export const CreateRoomBody = v.object({ theme: v.optional(Theme) });
export type CreateRoomResponse = { code: string; hostKey: string; expiresAt: number };
