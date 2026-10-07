import WebSocket from "ws";
import { TokenPayload } from "../core/ApiSchemas";
import { Tick } from "../core/game/Game";
import { ClientID, PlayerCosmetics, Winner } from "../core/Schemas";

export class Client {
  public lastPing: number = Date.now();

  public hashes: Map<Tick, number> = new Map();

  public reportedWinner: Winner | null = null;

  /**
   * Server-authored citizen display flag (task 0068). Filled in from the profile
   * resolve the server already makes at join (task 0272), and defaulted here rather
   * than passed in so the construction site needs no change.
   *
   * Derived from the UNTRUSTED `yandexPlayerId` below. Display-only, with ONE
   * owner-accepted exception: since task 0302 it gates starting a private match
   * (`GameServer.creatorMayStartPrivateLobby`) — a convenience perk, not money or
   * data. A forged citizen id passes that gate; the owner accepted this 2026-09-26
   * (real fix: task 0267). Re-raise if private lobbies gain value beyond convenience
   * (rewards, ranked, anything paid or scarce) or abuse is seen. Nothing else of
   * value may be gated on it: the profile server's own SQL stays the authority for
   * every real benefit, as it already is for the inbox. Fail-soft: `false` means
   * "citizen unknown OR not a citizen" — a lookup failure is indistinguishable from
   * a non-citizen by design.
   */
  public isCitizen: boolean = false;

  /**
   * The INTERNAL profile player id (task 0272, ADR-113) this client's creditable
   * identity resolved to; null until a resolve succeeds. Match credits are keyed by
   * it. SERVER-ONLY: never sent to a client and never logged. Only ever set from a
   * resolve of THIS client's creditable identity (or carried across a reconnect
   * presenting that same identity) — see GameServer.resolveProfilePlayer.
   */
  public profilePlayerId: string | null = null;

  /**
   * The player's approved display name (task 0322), from the same profile resolve
   * as `isCitizen`; null when there is none, it failed the join rule, or no resolve
   * has answered yet. Stored TRIMMED and already checked against the join rule;
   * `GameServer.matchDisplayName` checks it once more at the swap and otherwise
   * falls back to the typed `username`.
   *
   * SERVER-SIDE, and never logged. It comes through the ADR-103 identity funnel
   * (`GameServer.getCreditableYandexId`), so it is only as trusted as that
   * UNTRUSTED client-claimed id: someone who sends a citizen's id gets that
   * citizen's approved name — an owner-accepted risk until verified identity lands.
   * Only ever set from a resolve of THIS client's identity, or carried across a
   * reconnect presenting that same identity.
   */
  public approvedName: string | null = null;

  /**
   * Task 0332 (ADR-124). The player's profile-server session token, as sent in the
   * join or a late `update_identity`; null when none was sent or once a vouch has
   * answered for it (GameServer.applyVouchResult).
   *
   * ⛔ A CREDENTIAL (a 24 h bearer token, no revocation). SERVER-ONLY: never sent to
   * any client, never logged, never put in game info, a turn or the archive. Written
   * by Worker at construction and by `GameServer.acceptProfileSession`; read ONLY on
   * the resolve path (`GameServer.startProfileResolve`), which forwards it to the
   * profile server to be vouched for.
   */
  public profileSession: string | null = null;

  /**
   * Task 0332 (ADR-124). True once the profile server vouched that this client's
   * session token is a verified (`vfy:true`) session of the very player its Yandex id
   * resolves to. false → true only, never cleared, per Client object (a reconnect
   * carries it only for the same id). SERVER-ONLY, never sent or logged. Read ONLY
   * through the identity funnel (`GameServer.getCreditableIdentity`).
   */
  public identityVerified = false;

  constructor(
    public readonly clientID: ClientID,
    public readonly persistentID: string,
    public readonly claims: TokenPayload | null,
    public readonly roles: string[] | undefined,
    public readonly flares: string[] | undefined,
    public readonly ip: string,
    public readonly username: string,
    public readonly ws: WebSocket,
    public readonly cosmetics: PlayerCosmetics | undefined,
    // UNTRUSTED: client-asserted, NOT identity-verified (no Yandex signature check).
    // Do not use for profile lookup, crediting, or entitlements without verification.
    // Mutable (not readonly) only so a late identity refresh can fill it in when it
    // was null at join — see setYandexPlayerIdIfUnset.
    public yandexPlayerId: string | null,
  ) {}

  /**
   * Set the Yandex id from a late identity refresh (the `update_identity` message),
   * but ONLY when it is currently null. Returns whether it changed. Refusing to
   * overwrite a non-null id keeps the refresh within the same accepted-risk envelope
   * as the join field: it can recover the id of an authorized user whose SDK was
   * still initializing at join, but cannot be used to reassign an already-known id.
   */
  public setYandexPlayerIdIfUnset(yandexPlayerId: string): boolean {
    if (this.yandexPlayerId !== null) {
      return false;
    }
    this.yandexPlayerId = yandexPlayerId;
    return true;
  }
}
