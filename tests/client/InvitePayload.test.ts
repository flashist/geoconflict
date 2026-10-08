// Task 0382 (ADR-119): the friend's side of a Yandex invite link. A valid
// payload opens the Join window once per tab (it comes back after a match, 0199
// probe P8), whatever the private-lobby flags say (owner ruling (a)).

// Ruling (a): the private-lobby flags and the start-screen access all say "no"
// for this player. InvitePayload must not consult them, so an invite still opens.
jest.mock("../../src/client/PrivateLobbyAccess", () => ({
  isPrivateLobbyRowEnabled: jest.fn().mockResolvedValue(false),
  PrivateLobbyAccess: class {
    isVisible() {
      return false;
    }
    isCreateLocked() {
      return true;
    }
  },
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  isTesterMarkerSet: jest.fn(() => false),
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
  FlashistFacade: {
    instance: {
      isPrivateLobbiesForEveryoneEnabled: jest.fn(() => false),
      isCitizenshipSurfacesEnabled: jest.fn(() => false),
    },
  },
}));

import * as fs from "fs";
import * as path from "path";
import {
  HANDLED_INVITES_KEY,
  InviteStorage,
  MAX_HANDLED_INVITES,
  claimInviteCode,
  lobbyCodeFromInvitePayload,
  openInviteFromPayload,
  resetInvitePayloadForTests,
  shouldAutoLaunchTutorial,
} from "../../src/client/InvitePayload";
import {
  beginJoiningLobby,
  isOnStartScreen,
  resetStartScreenPresenceForTests,
} from "../../src/client/StartScreenPresence";

// Fake codes in the 0389 alphabet (no 0 O 1 I L U).
const CODE = "K7M4PCRX";
const OTHER_CODE = "Q9W8E7RT";

class MemoryStorage implements InviteStorage {
  values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const throwingStorage: InviteStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("SecurityError");
  },
};

/** A new page load in the same tab: in-page memory gone, sessionStorage kept. */
const newPage = () => resetInvitePayloadForTests();

function open(
  payload: unknown,
  storage: InviteStorage | null,
  isBusy = false,
): { opened: boolean; openJoinWindow: jest.Mock } {
  const openJoinWindow = jest.fn();
  const opened = openInviteFromPayload({
    readPayload: () => payload,
    isBusy: () => isBusy,
    openJoinWindow,
    storage,
  });
  return { opened, openJoinWindow };
}

beforeEach(() => {
  newPage();
  resetStartScreenPresenceForTests();
  jest.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("lobbyCodeFromInvitePayload (task 0382)", () => {
  it.each([
    ["K7M4PCRX", "K7M4PCRX"],
    ["k7m4pcrx", "K7M4PCRX"],
    ["K7M4 PCRX", "K7M4PCRX"],
    ["k7m4-pcrx", "K7M4PCRX"],
  ])("cleans %s to %s (task 0389 rule)", (payload, code) => {
    expect(lobbyCodeFromInvitePayload(payload)).toBe(code);
  });

  it.each([
    ["empty", ""],
    ["wrong alphabet", "K7M4PCR0"],
    ["too short", "K7M4PCR"],
    ["too long", "K7M4PCRXZ"],
    ["very long", "K7M4PCRX".repeat(20)],
    ["another payload use", "level=3"],
    ["non-string", 12345678],
    ["object", { payload: "K7M4PCRX" }],
    ["null", null],
    ["undefined", undefined],
  ])("ignores %s", (_label, payload) => {
    expect(lobbyCodeFromInvitePayload(payload)).toBeNull();
  });
});

describe("openInviteFromPayload (task 0382)", () => {
  it("a valid code opens the Join window with the cleaned code", () => {
    const { opened, openJoinWindow } = open("k7m4 pcrx", new MemoryStorage());

    expect(opened).toBe(true);
    expect(openJoinWindow).toHaveBeenCalledWith(CODE);
  });

  it("an invalid payload opens nothing and is not stored", () => {
    const storage = new MemoryStorage();

    const { opened, openJoinWindow } = open("K7M4PCR0", storage);

    expect(opened).toBe(false);
    expect(openJoinWindow).not.toHaveBeenCalled();
    expect(storage.getItem(HANDLED_INVITES_KEY)).toBeNull();
  });

  it("no payload at all opens nothing", () => {
    const { opened } = open(null, new MemoryStorage());
    expect(opened).toBe(false);
  });

  // P8: the payload comes back on the post-match reload.
  it("the same code on a later page load (same tab) does not open again", () => {
    const storage = new MemoryStorage();
    expect(open(CODE, storage).opened).toBe(true);

    newPage();
    const again = open(CODE, storage);

    expect(again.opened).toBe(false);
    expect(again.openJoinWindow).not.toHaveBeenCalled();
  });

  it("the same code typed differently is still the same invite", () => {
    const storage = new MemoryStorage();
    open(CODE, storage);
    newPage();

    expect(open("k7m4-pcrx", storage).opened).toBe(false);
  });

  it("a different code (a new invite) opens", () => {
    const storage = new MemoryStorage();
    open(CODE, storage);
    newPage();

    const next = open(OTHER_CODE, storage);

    expect(next.opened).toBe(true);
    expect(next.openJoinWindow).toHaveBeenCalledWith(OTHER_CODE);
  });

  it("the startup read and the SDK-ready read on one page open it once", () => {
    const storage = new MemoryStorage();

    expect(open(CODE, storage).opened).toBe(true);
    expect(open(CODE, storage).opened).toBe(false);
  });

  // Owner ruling 2026-10-08 (Q2, "Don't auto-open"): without sessionStorage a
  // post-match reload cannot be told apart, so the Join window is not opened.
  it.each([
    ["missing", null],
    ["throwing", throwingStorage],
  ])("%s sessionStorage: does not open", (_label, storage) => {
    const { opened, openJoinWindow } = open(CODE, storage);

    expect(opened).toBe(false);
    expect(openJoinWindow).not.toHaveBeenCalled();
  });

  it("a busy player is not pulled out, and the invite does not come back later", () => {
    const storage = new MemoryStorage();

    const busy = open(CODE, storage, true);
    expect(busy.opened).toBe(false);
    expect(busy.openJoinWindow).not.toHaveBeenCalled();

    newPage();
    expect(open(CODE, storage).opened).toBe(false);
  });

  // Review R1: Main's isBusy also reads isOnStartScreen(), which counts a join
  // still being set up (task 0336) — gameStop is not set yet then.
  it("a join still being set up counts as busy through isOnStartScreen()", () => {
    const storage = new MemoryStorage();
    const openWhenBusyIs = (payload: string) => {
      const openJoinWindow = jest.fn();
      const opened = openInviteFromPayload({
        readPayload: () => payload,
        isBusy: () => !isOnStartScreen(),
        openJoinWindow,
        storage,
      });
      return { opened, openJoinWindow };
    };

    const endJoining = beginJoiningLobby();
    const during = openWhenBusyIs(CODE);
    expect(during.opened).toBe(false);
    expect(during.openJoinWindow).not.toHaveBeenCalled();

    endJoining();
    expect(openWhenBusyIs(CODE).opened).toBe(false);
    expect(openWhenBusyIs(OTHER_CODE).opened).toBe(true);
  });

  it("opens with every private-lobby flag off for this player (ruling (a))", () => {
    const { opened, openJoinWindow } = open(CODE, new MemoryStorage());

    expect(opened).toBe(true);
    expect(openJoinWindow).toHaveBeenCalledWith(CODE);
  });
});

describe("claimInviteCode storage (task 0382)", () => {
  it(`remembers only the last ${MAX_HANDLED_INVITES} codes`, () => {
    const storage = new MemoryStorage();
    const alphabet = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
    const codes = Array.from(
      { length: MAX_HANDLED_INVITES + 5 },
      (_, i) => `AAAAAAA${alphabet[i]}`,
    );

    for (const code of codes) {
      expect(claimInviteCode(code, storage)).toBe("claimed");
    }

    const stored = JSON.parse(storage.getItem(HANDLED_INVITES_KEY)!);
    expect(stored).toEqual(codes.slice(-MAX_HANDLED_INVITES));
  });

  it("an unreadable stored value is replaced, not fatal", () => {
    const storage = new MemoryStorage();
    storage.setItem(HANDLED_INVITES_KEY, "{not json");

    expect(claimInviteCode(CODE, storage)).toBe("claimed");
    expect(JSON.parse(storage.getItem(HANDLED_INVITES_KEY)!)).toEqual([CODE]);
  });
});

describe("shouldAutoLaunchTutorial (task 0382, owner ruling Q1)", () => {
  it.each([
    [false, false, true],
    [false, true, false],
    [true, false, false],
    [true, true, false],
  ])(
    "tutorial done=%s, invite opened=%s → auto-launch %s",
    (tutorialDone, openedInvite, expected) => {
      expect(shouldAutoLaunchTutorial(tutorialDone, openedInvite)).toBe(
        expected,
      );
    },
  );
});

// Brief "Do not": never strip or rewrite the query (Yandex's loader reads its
// SDK address there, 0331/0337), and ruling (a): no flag input at all.
describe("InvitePayload.ts source guards (task 0382)", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "../../src/client/InvitePayload.ts"),
    "utf-8",
  );

  it("never touches location or history", () => {
    expect(source).not.toMatch(/\blocation\./);
    expect(source).not.toMatch(/\bhistory\./);
    expect(source).not.toContain("replaceState");
    expect(source).not.toContain("pushState");
  });

  it("imports no flag or access check", () => {
    expect(source).not.toContain("PrivateLobbyAccess");
    expect(source).not.toContain("FlashistFacade");
  });
});
