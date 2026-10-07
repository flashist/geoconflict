// Task 0332 (ADR-124). The profile server's vouch for a session token the game
// server forwarded on its resolve call: one case per outcome, in check order.
// Every token is signed with the real signer over synthetic UUIDs.

import type { Platform } from "../../src/core/profile/Platform";
import {
  SESSION_TTL_SECONDS,
  signSessionToken,
} from "../../src/profile-server/SessionToken";
import { vouchForSession } from "../../src/profile-server/SessionVouch";

const SECRET = "0332-test-session-secret-0123456789abcdef"; // ≥ 32 chars, synthetic
const OTHER_SECRET = "0332-other-session-secret-fedcba9876543210";
const PLAYER_ID = "0b6f8a52-3c1e-4d7a-9f10-2a4b6c8d0e1f";
const OTHER_PLAYER_ID = "11111111-2222-4333-8444-555555555555";
const NOW_MS = Date.UTC(2026, 9, 7, 12, 0, 0);

const RESOLVED = { playerId: PLAYER_ID, platform: "yandex_games" as const };

function tokenFor(
  options: {
    playerId?: string;
    verified?: boolean;
    secret?: string;
    nowMs?: number;
  } = {},
): string {
  return signSessionToken(
    options.secret ?? SECRET,
    {
      playerId: options.playerId ?? PLAYER_ID,
      platform: "yandex_games",
      verified: options.verified ?? true,
    },
    options.nowMs ?? NOW_MS,
  ).token;
}

describe("vouchForSession (task 0332)", () => {
  test("verified: a valid, unexpired vfy:true session of the resolved player", () => {
    expect(vouchForSession(SECRET, tokenFor(), RESOLVED, NOW_MS)).toBe(
      "verified",
    );
  });

  test("absent: no token — checked before anything else, even with no secret", () => {
    expect(vouchForSession(SECRET, undefined, RESOLVED, NOW_MS)).toBe("absent");
    expect(vouchForSession("", undefined, RESOLVED, NOW_MS)).toBe("absent");
  });

  test("no_secret: an empty or short secret verifies nothing, even a genuine token", () => {
    expect(vouchForSession("", tokenFor(), RESOLVED, NOW_MS)).toBe("no_secret");
    expect(vouchForSession("too-short", tokenFor(), RESOLVED, NOW_MS)).toBe(
      "no_secret",
    );
  });

  test("invalid: a tampered MAC", () => {
    const token = tokenFor();
    const lastIndex = token.length - 2; // not the last char: its spare bits are ignored
    const swapped = token[lastIndex] === "A" ? "B" : "A";
    const tampered =
      token.slice(0, lastIndex) + swapped + token.slice(lastIndex + 1);
    expect(vouchForSession(SECRET, tampered, RESOLVED, NOW_MS)).toBe("invalid");
  });

  test("invalid: a token signed with a different secret (e.g. after rotation)", () => {
    expect(
      vouchForSession(
        SECRET,
        tokenFor({ secret: OTHER_SECRET }),
        RESOLVED,
        NOW_MS,
      ),
    ).toBe("invalid");
  });

  test("invalid: not a token at all", () => {
    expect(vouchForSession(SECRET, "not-a-token", RESOLVED, NOW_MS)).toBe(
      "invalid",
    );
  });

  test("expired: a genuine token past its 24 h TTL", () => {
    const old = tokenFor({ nowMs: NOW_MS - (SESSION_TTL_SECONDS + 1) * 1000 });
    expect(vouchForSession(SECRET, old, RESOLVED, NOW_MS)).toBe("expired");
  });

  test("unverified_session: a genuine vfy:false session of the right player", () => {
    expect(
      vouchForSession(SECRET, tokenFor({ verified: false }), RESOLVED, NOW_MS),
    ).toBe("unverified_session");
  });

  test("unverified_session wins over other_player: vfy is checked first", () => {
    expect(
      vouchForSession(
        SECRET,
        tokenFor({ verified: false, playerId: OTHER_PLAYER_ID }),
        RESOLVED,
        NOW_MS,
      ),
    ).toBe("unverified_session");
  });

  test("other_player: a genuine verified session of a DIFFERENT player", () => {
    expect(
      vouchForSession(
        SECRET,
        tokenFor({ playerId: OTHER_PLAYER_ID }),
        RESOLVED,
        NOW_MS,
      ),
    ).toBe("other_player");
  });

  // Cannot happen today: PlatformSchema has one value, and the strict claim schema
  // refuses any other `plt` as `invalid`, so no real token can carry another
  // platform. The branch is reached here from the other side — the RESOLVED
  // platform is cast to a value the enum does not have — which pins the check and
  // its place before `other_player` without adding a test seam to the source.
  test("other_platform: the token's platform differs from the resolved one (defensive)", () => {
    expect(
      vouchForSession(
        SECRET,
        tokenFor({ playerId: OTHER_PLAYER_ID }),
        { playerId: PLAYER_ID, platform: "other_platform" as Platform },
        NOW_MS,
      ),
    ).toBe("other_platform");
  });
});
