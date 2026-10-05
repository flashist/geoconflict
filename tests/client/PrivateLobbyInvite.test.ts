import * as fs from "fs";
import * as path from "path";
import {
  inviteCopyText,
  lobbyIdFromJoinHash,
} from "../../src/client/PrivateLobbyInvite";

// Task 0380 (ADR-119): on the Yandex build the invite is the bare code and a
// `#join=` link is ignored; standalone keeps today's link and `#join=`.
const ORIGIN = "https://geoconflict.ru/yandex-games_iframe.html";

describe("inviteCopyText (task 0380)", () => {
  it("on Yandex is the bare lobby code, never a URL", () => {
    const text = inviteCopyText("AbC12345", true, ORIGIN);
    expect(text).toBe("AbC12345");
    expect(text).not.toContain("http");
    expect(text).not.toContain("#join=");
  });

  it("on standalone is exactly today's link", () => {
    expect(inviteCopyText("AbC12345", false, ORIGIN)).toBe(
      "https://geoconflict.ru/yandex-games_iframe.html#join=AbC12345",
    );
  });
});

describe("lobbyIdFromJoinHash (task 0380)", () => {
  it("returns the id for a valid #join= on standalone", () => {
    expect(lobbyIdFromJoinHash("#join=K7M4PCRX", false)).toBe("K7M4PCRX");
  });

  it("returns null for a valid #join= on Yandex", () => {
    expect(lobbyIdFromJoinHash("#join=K7M4PCRX", true)).toBeNull();
  });

  it.each(["#join=", "#join=short", "#join=TOOLONG123", "#join=AbC-1234"])(
    "returns null for an invalid id (%s) on standalone",
    (hash) => {
      expect(lobbyIdFromJoinHash(hash, false)).toBeNull();
    },
  );
});

// Task 0389: the website's `#join=` takes a private-lobby code only, cleaned
// the same way as the Join window (spaces and dashes dropped, any case).
describe("lobbyIdFromJoinHash private-lobby codes (task 0389)", () => {
  it.each([
    ["#join=K7M4PCRX", "K7M4PCRX"],
    ["#join=k7m4pcrx", "K7M4PCRX"],
    ["#join=K7M4 PCRX", "K7M4PCRX"],
    ["#join=k7m4-pcrx", "K7M4PCRX"],
  ])("%s on standalone opens %s", (hash, code) => {
    expect(lobbyIdFromJoinHash(hash, false)).toBe(code);
  });

  it.each(["#join=AbC12345", "#join=a1B2c3D4", "#join=K7M4PCR0"])(
    "returns null for an id that is not a private-lobby code (%s)",
    (hash) => {
      expect(lobbyIdFromJoinHash(hash, false)).toBeNull();
    },
  );

  it("is still null on Yandex, whatever the code", () => {
    expect(lobbyIdFromJoinHash("#join=k7m4 pcrx", true)).toBeNull();
  });
});

// Review R2: Main.ts's `Client` is not exported, so `handleHash()` cannot be
// driven from a test. Read its `#join=` branch from source instead (the same
// approach as PrivateLobbyAccess.test.ts / WinConditionAnalytics.test.ts) and
// check it routes through lobbyIdFromJoinHash with the platform flag, so
// putting back the old inline `ID.safeParse` check turns this red. This guards
// the wiring's text, not its runtime behaviour — the live check is 0381.
describe("Main.handleHash's #join= branch (task 0380, review R2)", () => {
  const main = fs.readFileSync(
    path.join(__dirname, "../../src/client/Main.ts"),
    "utf-8",
  );
  const JOIN_BRANCH = 'if (decodedHash.startsWith("#join=")) {';
  const NEXT_BRANCH = 'if (decodedHash.startsWith("#affiliate=")) {';

  const joinBranch = (): string => {
    const start = main.indexOf(JOIN_BRANCH);
    const end = main.indexOf(NEXT_BRANCH, start);
    // Never silently pass: a moved or renamed branch must fail loudly here.
    if (start === -1 || end === -1) {
      throw new Error(
        "Could not find the #join= branch (followed by #affiliate=) in Main.ts — update this guard",
      );
    }
    return main.slice(start, end);
  };

  it("has exactly one #join= branch", () => {
    expect(main.split('startsWith("#join=")')).toHaveLength(2);
  });

  it("asks lobbyIdFromJoinHash, passing the Yandex platform flag", () => {
    const branch = joinBranch().replace(/\s+/g, " ");
    expect(branch).toContain(
      "lobbyIdFromJoinHash( decodedHash, FlashistFacade.instance.yaGamesAvailable, )",
    );
    expect(branch).toContain(
      "if (lobbyId !== null) { this.joinModal.open(lobbyId);",
    );
  });

  it("does not parse the id itself (the old inline check)", () => {
    expect(joinBranch()).not.toContain("safeParse");
    expect(joinBranch()).not.toContain("substring(");
  });
});
