import { z } from "zod";
import { PlatformSchema } from "./Platform";
import { PublicPlayerProfileSchema } from "./PlayerProfile";

/**
 * Shared client↔profile-server WIRE contract for `POST /v1/login` (task 0271, S2;
 * ADR-113; design report §4). The login sibling of CreditContract.ts /
 * PaymentsContract.ts, so the client (S4) parses exactly what the server returns.
 *
 * 🔓 The token adds NO security today: anyone who asserts a platform id gets one.
 * It takes Yandex ids out of URLs and logs and gives one later verification point
 * (0267). A `vfy:false` session never counts as a proven owner (e.g. 0250 paid
 * state).
 *
 * `signature` (task 0325, S2 — shadow mode) is Yandex's signed player data
 * (`getPlayer({ signed: true }).signature`). The server checks it and COUNTS the
 * outcome, but still mints only `vfy:false`: nothing depends on it yet. Once 0325's
 * S3a ships, a `vfy:true` session — and only that — is the proven owner. The field
 * is optional forever: a missing or bad signature means an unverified session,
 * never a refused login. ⛔ It is a credential: never log it, never persist it.
 *
 * Errors:
 *   400 bad_request                                     — body fails this schema / malformed JSON
 *   401 session_expired | session_invalid               — Bearer routes (never login itself)
 *   503 session_unavailable                             — no usable PROFILE_SESSION_SECRET
 *   503 creation_paused                                 — the login-creation switch is OFF and this
 *                                                         platform id has no player yet (task 0274)
 *   500 internal_error
 */

/**
 * Upper bound on `signature` (task 0325): `max(4 × 733, 2048)`, where 733 is the
 * length S0 observed on a real signed payload. Well under Express's 100 kb body
 * limit. The client drops a longer signature rather than send it, because the
 * server's 400 would latch its login failure for the page load.
 * ⚠️ Never lower this on the server ahead of the client.
 */
export const SIGNATURE_MAX = 2932;

/** Design §8 Q4 default: 1–128 characters until real Yandex ids are sampled. */
export const LoginRequestSchema = z.object({
  platform: PlatformSchema,
  platformUserId: z.string().min(1).max(128),
  // Omitted (never "") when the client has none — an empty string is a 400.
  signature: z.string().min(1).max(SIGNATURE_MAX).optional(),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

/**
 * `done` iff a one-off tenure grant row exists for the player (any amount — a
 * 0-XP row is a final "checked"); `pending` otherwise, including every brand-new
 * player (ADR-112, amended).
 */
export const TenureCheckStatusSchema = z.enum(["done", "pending"]);
export type TenureCheckStatus = z.infer<typeof TenureCheckStatusSchema>;

export const LoginResponseSchema = z.object({
  created: z.boolean(),
  /** Same projection as GET /v1/profile: no player id, no platform id, no paid fields. */
  profile: PublicPlayerProfileSchema,
  grantChecks: z.object({ tenure: TenureCheckStatusSchema }),
  session: z.object({
    token: z.string().min(1),
    expiresAt: z.iso.datetime(),
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const SESSION_ERROR_CODES = [
  "session_expired",
  "session_invalid",
  "session_unavailable",
] as const;
export type SessionErrorCode = (typeof SESSION_ERROR_CODES)[number];

/**
 * Every `error` value `POST /v1/login` itself can answer (task 0274, S5). The 401
 * session codes are NOT here: login mints a token, it never consumes one — they
 * belong to the Bearer routes and stay in SESSION_ERROR_CODES.
 *
 * `creation_paused` is the login-creation switch's 503: the operator has paused
 * creating players and this platform id has no player yet. It is a TEMPORARY refusal
 * of a NEW player, not an error the client can fix — task 0273's client already
 * treats any 503 from login as fail-soft with no retry, so nothing on the client
 * side has to change for it.
 */
export const LOGIN_ERROR_CODES = [
  "bad_request",
  "creation_paused",
  "session_unavailable",
  "internal_error",
] as const;
export type LoginErrorCode = (typeof LOGIN_ERROR_CODES)[number];
