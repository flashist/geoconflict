// Task 0340 (0325 S3a): `resolveCaller` reports `verified` from the session token's
// `vfy` claim, through the pure `callerFromSession`. No supertest, no database.
// Synthetic ids only.

import { callerFromSession } from "../../src/profile-server/Routes";
import type { SessionClaims } from "../../src/profile-server/SessionToken";

const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";

function claims(vfy: boolean): SessionClaims {
  return {
    pid: PLAYER_ID,
    plt: "yandex_games",
    iat: 1_700_000_000,
    exp: 1_700_086_400,
    vfy,
  };
}

describe("callerFromSession", () => {
  test("vfy:true → verified: true", () => {
    expect(callerFromSession(claims(true))).toEqual({
      status: "ok",
      playerId: PLAYER_ID,
      verified: true,
    });
  });

  test("vfy:false → verified: false", () => {
    expect(callerFromSession(claims(false))).toEqual({
      status: "ok",
      playerId: PLAYER_ID,
      verified: false,
    });
  });

  test("the caller is the token's `pid`", () => {
    expect(callerFromSession(claims(true)).playerId).toBe(PLAYER_ID);
    expect(callerFromSession(claims(false)).playerId).toBe(PLAYER_ID);
  });

  test("a non-boolean `vfy` (a mis-typed caller) is never verified", () => {
    const loose = { ...claims(false), vfy: "true" } as unknown as SessionClaims;
    expect(callerFromSession(loose).verified).toBe(false);
  });
});
