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
   * upsert the server already makes at join, and defaulted here rather than passed
   * in so the construction site needs no change.
   *
   * DISPLAY ONLY, and deliberately NOT an entitlement gate: it is derived from the
   * UNTRUSTED `yandexPlayerId` below, so nothing of value may ever be gated on it.
   * The profile server's own SQL stays the authority for every real benefit, as it
   * already is for the inbox. Fail-soft: `false` means "citizen unknown OR not a
   * citizen" — a lookup failure is indistinguishable from a non-citizen by design.
   */
  public isCitizen: boolean = false;

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
