// Task 0507: the one-player message popup. Targets come from the Yandex flag
// `player_message_targets`; the popup shows once per page load on a clear
// start screen. Every dependency is injected; the start-screen and dialog
// sources are the real modules. Names here are placeholders, not players.
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    analyticEvents: {
      PLAYER_MESSAGE_SHOWN: "PlayerMessage:Shown",
    },
  },
  flashist_logEventAnalytics: jest.fn(),
  FlashistFacade: { instance: {} },
}));

import {
  beginPlatformDialog,
  isPlatformDialogOpen,
  resetPlatformDialogPresenceForTests,
  whenNoPlatformDialogOpen,
} from "../../src/client/PlatformDialogPresence";
import {
  isPlayerMessageTarget,
  parsePlayerMessageTargets,
  type PlayerMessageDeps,
  startPlayerMessage,
} from "../../src/client/PlayerMessage";
import {
  isOnStartScreen,
  reportBackOnStartScreen,
  resetStartScreenPresenceForTests,
  setStartScreenPresenceSource,
  whenOnStartScreen,
} from "../../src/client/StartScreenPresence";

const SHOWN = "PlayerMessage:Shown";

async function flush(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    await Promise.resolve();
  }
}

function makeHarness(options: { flag: unknown; name: string }) {
  let name = options.name;
  const usernameListeners = new Set<() => void>();
  const addUsernameChangeListener = jest.fn((listener: () => void) => {
    usernameListeners.add(listener);
    return () => {
      usernameListeners.delete(listener);
    };
  });
  const showPopup = jest.fn(() => true);
  const logEvent = jest.fn();

  const deps: PlayerMessageDeps = {
    readTargetsFlag: () => Promise.resolve(options.flag),
    getCurrentUsername: () => name,
    addUsernameChangeListener,
    isOnStartScreen,
    whenOnStartScreen,
    isPlatformDialogOpen,
    whenNoPlatformDialogOpen,
    showPopup,
    logEvent,
  };

  return {
    deps,
    showPopup,
    logEvent,
    addUsernameChangeListener,
    usernameListeners,
    async changeName(newName: string) {
      name = newName;
      for (const listener of [...usernameListeners]) {
        listener();
      }
      await flush();
    },
    async start() {
      await startPlayerMessage(deps);
      await flush();
    },
  };
}

describe("parsePlayerMessageTargets (task 0507)", () => {
  it.each([
    ["unset", undefined],
    ["null", null],
    ["empty", ""],
    ["only separators and spaces", " , ,  "],
    ["a number", 42],
    ["an object", { name: "PlayerOne" }],
  ])("%s → no targets", (_label, raw) => {
    expect(parsePlayerMessageTargets(raw)).toEqual([]);
  });

  it("a single name", () => {
    expect(parsePlayerMessageTargets("PlayerOne")).toEqual(["PlayerOne"]);
  });

  it("several names, trimmed, empties dropped, inner spaces kept", () => {
    expect(
      parsePlayerMessageTargets("  PlayerOne , Player Two,, [TAG] Three  "),
    ).toEqual(["PlayerOne", "Player Two", "[TAG] Three"]);
  });
});

describe("isPlayerMessageTarget (task 0507)", () => {
  const targets = ["PlayerOne", "Player Two"];

  it("an exact match is a target, padding around the name ignored", () => {
    expect(isPlayerMessageTarget("PlayerOne", targets)).toBe(true);
    expect(isPlayerMessageTarget(" Player Two ", targets)).toBe(true);
  });

  it("a different case is not a target", () => {
    expect(isPlayerMessageTarget("playerone", targets)).toBe(false);
    expect(isPlayerMessageTarget("PLAYERONE", targets)).toBe(false);
  });

  it("a substring or superstring is not a target", () => {
    expect(isPlayerMessageTarget("Player", targets)).toBe(false);
    expect(isPlayerMessageTarget("PlayerOne2", targets)).toBe(false);
  });

  it("an empty name is never a target", () => {
    expect(isPlayerMessageTarget("", targets)).toBe(false);
  });
});

describe("startPlayerMessage (task 0507)", () => {
  beforeEach(() => {
    resetStartScreenPresenceForTests();
    resetPlatformDialogPresenceForTests();
  });

  it("no targets: never shows and adds no username listener", async () => {
    const harness = makeHarness({ flag: undefined, name: "PlayerOne" });
    await harness.start();

    expect(harness.addUsernameChangeListener).not.toHaveBeenCalled();
    expect(harness.showPopup).not.toHaveBeenCalled();
    expect(harness.logEvent).not.toHaveBeenCalled();
  });

  it("a non-matching name never shows", async () => {
    const harness = makeHarness({ flag: "PlayerOne", name: "SomeoneElse" });
    await harness.start();
    await harness.changeName("AnotherName");

    expect(harness.showPopup).not.toHaveBeenCalled();
    expect(harness.logEvent).not.toHaveBeenCalled();
  });

  it("a matching name shows once and logs Shown with no name in it", async () => {
    const harness = makeHarness({
      flag: "Other, PlayerOne",
      name: "PlayerOne",
    });
    await harness.start();

    expect(harness.showPopup).toHaveBeenCalledTimes(1);
    expect(harness.logEvent.mock.calls).toEqual([[SHOWN]]);
    expect(JSON.stringify(harness.logEvent.mock.calls)).not.toContain(
      "PlayerOne",
    );
    expect(harness.usernameListeners.size).toBe(0);

    // Matching again later never shows it a second time.
    await harness.changeName("Other");
    await harness.changeName("PlayerOne");
    expect(harness.showPopup).toHaveBeenCalledTimes(1);
  });

  it("a name that only matches after a username change shows then", async () => {
    const harness = makeHarness({ flag: "PlayerOne", name: "Anon1234" });
    await harness.start();
    expect(harness.showPopup).not.toHaveBeenCalled();

    await harness.changeName("PlayerOne");

    expect(harness.showPopup).toHaveBeenCalledTimes(1);
    expect(harness.logEvent.mock.calls).toEqual([[SHOWN]]);
  });

  it("waits while away from the start screen", async () => {
    let away = true;
    setStartScreenPresenceSource(() => away);
    const harness = makeHarness({ flag: "PlayerOne", name: "PlayerOne" });
    await harness.start();
    expect(harness.showPopup).not.toHaveBeenCalled();

    away = false;
    reportBackOnStartScreen();
    await flush();

    expect(harness.showPopup).toHaveBeenCalledTimes(1);
  });

  it("waits while a platform dialog is open", async () => {
    const endDialog = beginPlatformDialog();
    const harness = makeHarness({ flag: "PlayerOne", name: "PlayerOne" });
    await harness.start();
    expect(harness.showPopup).not.toHaveBeenCalled();

    endDialog();
    await flush();

    expect(harness.showPopup).toHaveBeenCalledTimes(1);
  });

  it("re-checks the start screen after a dialog closes", async () => {
    let away = false;
    setStartScreenPresenceSource(() => away);
    const endDialog = beginPlatformDialog();
    const harness = makeHarness({ flag: "PlayerOne", name: "PlayerOne" });
    await harness.start();

    away = true;
    endDialog();
    await flush();
    expect(harness.showPopup).not.toHaveBeenCalled();

    away = false;
    reportBackOnStartScreen();
    await flush();
    expect(harness.showPopup).toHaveBeenCalledTimes(1);
  });

  it("logs nothing when the popup element is missing", async () => {
    const harness = makeHarness({ flag: "PlayerOne", name: "PlayerOne" });
    harness.showPopup.mockReturnValue(false);
    await harness.start();

    expect(harness.logEvent).not.toHaveBeenCalled();
  });

  it("a failing flag read never throws and never shows", async () => {
    const harness = makeHarness({ flag: "PlayerOne", name: "PlayerOne" });
    harness.deps.readTargetsFlag = () => Promise.reject(new Error("no flags"));

    await expect(startPlayerMessage(harness.deps)).resolves.toBeUndefined();
    await flush();
    expect(harness.showPopup).not.toHaveBeenCalled();
  });
});
