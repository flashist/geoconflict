import * as fs from "fs";
import * as path from "path";
import {
  buildInviteLink,
  inviteCopyText,
  lobbyIdFromJoinHash,
} from "../../src/client/PrivateLobbyInvite";

// Task 0380 (ADR-119): on the Yandex build the invite is the bare code and a
// `#join=` link is ignored; standalone keeps today's link and `#join=`.
const ORIGIN = "https://geoconflict.ru/yandex-games_iframe.html";

describe("inviteCopyText (task 0380)", () => {
  it("on Yandex is the bare lobby code, never a URL", () => {
    const text = inviteCopyText("AbC12345", true, ORIGIN, null);
    expect(text).toBe("AbC12345");
    expect(text).not.toContain("http");
    expect(text).not.toContain("#join=");
  });

  it("on standalone is exactly today's link", () => {
    expect(inviteCopyText("AbC12345", false, ORIGIN, null)).toBe(
      "https://geoconflict.ru/yandex-games_iframe.html#join=AbC12345",
    );
  });
});

// Task 0382 (ADR-119): on Yandex, the SDK's game URL with the code as
// `payload`, built with the URL API. Fake portal URLs and ids only.
const PORTAL = "https://portal.example/games/app/111111";
const CODE = "K7M4PCRX";

describe("buildInviteLink (task 0382)", () => {
  it("adds payload to a URL with no query", () => {
    expect(buildInviteLink(PORTAL, CODE)).toBe(
      "https://portal.example/games/app/111111?payload=K7M4PCRX",
    );
  });

  it("keeps an existing query", () => {
    expect(buildInviteLink(`${PORTAL}?lang=ru&x=1`, CODE)).toBe(
      "https://portal.example/games/app/111111?lang=ru&x=1&payload=K7M4PCRX",
    );
  });

  it("replaces an existing payload", () => {
    expect(buildInviteLink(`${PORTAL}?payload=OLD&lang=ru`, CODE)).toBe(
      "https://portal.example/games/app/111111?payload=K7M4PCRX&lang=ru",
    );
  });

  it("keeps a hash, after the query", () => {
    expect(buildInviteLink(`${PORTAL}#top`, CODE)).toBe(
      "https://portal.example/games/app/111111?payload=K7M4PCRX#top",
    );
  });

  it.each(["", "not a url", "/games/app/111111"])(
    "returns null for a URL that does not parse (%s)",
    (url) => {
      expect(buildInviteLink(url, CODE)).toBeNull();
    },
  );
});

describe("inviteCopyText with a portal link (task 0382)", () => {
  it("on Yandex with the link and a valid code copies the link", () => {
    expect(inviteCopyText(CODE, true, ORIGIN, PORTAL)).toBe(
      "https://portal.example/games/app/111111?payload=K7M4PCRX",
    );
  });

  it("on Yandex without the link copies the bare code", () => {
    expect(inviteCopyText(CODE, true, ORIGIN, null)).toBe(CODE);
  });

  it.each(["", "AbC12345", "K7M4PCR0"])(
    "on Yandex with the link but no valid code (%s) copies the code as is",
    (lobbyId) => {
      expect(inviteCopyText(lobbyId, true, ORIGIN, PORTAL)).toBe(lobbyId);
    },
  );

  it("on Yandex with a link that does not parse copies the bare code", () => {
    expect(inviteCopyText(CODE, true, ORIGIN, "not a url")).toBe(CODE);
  });

  it("on standalone ignores the portal link", () => {
    expect(inviteCopyText(CODE, false, ORIGIN, PORTAL)).toBe(
      "https://geoconflict.ru/yandex-games_iframe.html#join=K7M4PCRX",
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

// Task 0382: Main.ts's `Client` is not exported, so the payload wiring is read
// from source, as above. It guards the wiring's text, not its runtime
// behaviour — the live check is 0383.
describe("Main's invite payload wiring (task 0382)", () => {
  const main = fs.readFileSync(
    path.join(__dirname, "../../src/client/Main.ts"),
    "utf-8",
  );
  const flat = main.replace(/\s+/g, " ");

  const method = (): string => {
    const start = flat.indexOf("private openInviteFromPayload(): boolean {");
    const end = flat.indexOf("private handleHash() {", start);
    if (start === -1 || end === -1) {
      throw new Error(
        "Could not find Client.openInviteFromPayload in Main.ts — update this guard",
      );
    }
    return flat.slice(start, end);
  };

  it("reads the payload at startup, right after handleHash()", () => {
    expect(flat).toContain(
      "this.handleHash(); // Task 0382 (ADR-119): a Yandex invite link's payload opens the Join window",
    );
    expect(flat).toContain(
      "this.openedInviteAtStartup = this.openInviteFromPayload();",
    );
  });

  it("reads it again when a late SDK arrives", () => {
    expect(flat).toContain(
      "if (!FlashistFacade.instance.yandexGamesSDK) { void FlashistFacade.instance .whenYandexSdkAvailable() .then(() => this.openInviteFromPayload()); }",
    );
  });

  it("opens this.joinModal.open with the SDK payload, and checks no flag", () => {
    const body = method();
    expect(body).toContain(
      "readPayload: () => FlashistFacade.instance.getInvitePayload()",
    );
    // Review R1: busy also while a join is set up or the tutorial starts.
    expect(body).toContain(
      "isBusy: () => this.gameStop !== null || this.tutorialStarting || !isOnStartScreen(),",
    );
    expect(body).toContain(
      "openJoinWindow: (code) => this.joinModal.open(code)",
    );
    expect(body).not.toMatch(/PrivateLobby|Flag|Citizenship|isTester/);
  });

  it("marks the tutorial as starting until its join-lobby is sent (review R1)", () => {
    expect(flat).toContain(
      "async startTutorial(): Promise<void> { this.tutorialStarting = true; try { await this.dispatchTutorialJoin(); } finally {",
    );
    const start = flat.indexOf("private async dispatchTutorialJoin()");
    const end = flat.indexOf("private async startSinglePlayMission()", start);
    if (start === -1 || end === -1) {
      throw new Error(
        "Could not find Client.dispatchTutorialJoin in Main.ts — update this guard",
      );
    }
    const body = flat.slice(start, end);
    expect(body).toContain('new CustomEvent("join-lobby"');
    expect(body).not.toContain("tutorialStarting");
  });

  it("skips the tutorial auto-launch through shouldAutoLaunchTutorial", () => {
    expect(flat).toContain(
      "shouldAutoLaunchTutorial( Boolean(localStorage.getItem(TUTORIAL_COMPLETED_KEY)), client.openedInviteAtStartup, )",
    );
    expect(flat).not.toContain(
      "if (!localStorage.getItem(TUTORIAL_COMPLETED_KEY)) {",
    );
  });

  it("never reads or rewrites the query for the invite", () => {
    expect(method()).not.toContain("location");
  });
});
