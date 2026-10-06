/**
 * @jest-environment jsdom
 */
// Tasks 0302/0354: the private-lobby row. Shown only when the citizenship
// surfaces are on AND (tester marker OR private_lobbies_all); Create locked for
// anything but a confirmed citizen; Join never locked. Task 0301: a locked tap
// opens the citizenship explainer popup.
jest.mock("../../src/client/Utils", () => ({
  translateText: jest.fn((key: string) => key),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashistConstants: {
    lockedFeatureIds: { privateLobby: "PrivateLobby" },
  },
  flashist_waitGameInitComplete: jest.fn().mockResolvedValue(undefined),
  isTesterMarkerSet: jest.fn(),
  FlashistFacade: {
    instance: {
      isPrivateLobbiesForEveryoneEnabled: jest.fn(),
      isCitizenshipSurfacesEnabled: jest.fn(),
      logLockedFeatureTapEvent: jest.fn(),
    },
  },
}));

import fs from "fs";
import path from "path";
import {
  publishCitizenshipStatus,
  resetCitizenshipStatusForTests,
} from "../../src/client/CitizenshipStatus";
import "../../src/client/components/baseComponents/Button";
import { OButton } from "../../src/client/components/baseComponents/Button";
import {
  FlashistFacade,
  flashist_waitGameInitComplete,
  isTesterMarkerSet,
} from "../../src/client/flashist/FlashistFacade";
import {
  PRIVATE_LOBBY_ROW_ID,
  PrivateLobbyAccess,
  isPrivateLobbyRowEnabled,
} from "../../src/client/PrivateLobbyAccess";

const isEveryoneEnabled = FlashistFacade.instance
  .isPrivateLobbiesForEveryoneEnabled as jest.Mock;
const isTester = isTesterMarkerSet as jest.Mock;
const isSurfacesEnabled = FlashistFacade.instance
  .isCitizenshipSurfacesEnabled as jest.Mock;
const logLockedFeatureTap = FlashistFacade.instance
  .logLockedFeatureTapEvent as jest.Mock;
const waitGameInit = flashist_waitGameInitComplete as jest.Mock;

let popupShow: jest.Mock;

function mountPage(): void {
  // The row exactly as both templates ship it: hidden by default.
  document.body.innerHTML = `
    <div id="private-lobby-row" class="container__row" style="display: none;">
      <o-button id="host-lobby-button" translationKey="main.create_lobby"></o-button>
      <o-button id="join-private-lobby-button" translationKey="main.join_lobby"></o-button>
    </div>
    <citizenship-explainer-modal></citizenship-explainer-modal>
  `;
  popupShow = jest.fn();
  Object.assign(document.querySelector("citizenship-explainer-modal")!, {
    show: popupShow,
  });
}

const row = () => document.getElementById("private-lobby-row")!;
const hostButton = () =>
  document.getElementById("host-lobby-button") as OButton;
const joinButton = () =>
  document.getElementById("join-private-lobby-button") as OButton;

async function flushLit(): Promise<void> {
  await hostButton().updateComplete;
  await joinButton().updateComplete;
}

async function startAccess(): Promise<PrivateLobbyAccess> {
  const access = new PrivateLobbyAccess();
  await access.start();
  await flushLit();
  return access;
}

const originalGameEnv = process.env.GAME_ENV;

afterAll(() => {
  if (originalGameEnv === undefined) {
    delete process.env.GAME_ENV;
  } else {
    process.env.GAME_ENV = originalGameEnv;
  }
});

describe("PrivateLobbyAccess (task 0302)", () => {
  beforeEach(() => {
    // Not a dev build unless a test says so (the dev bypass, review R2).
    delete process.env.GAME_ENV;
    jest.clearAllMocks();
    resetCitizenshipStatusForTests();
    waitGameInit.mockResolvedValue(undefined);
    // Shown by default via the everyone-flag; visibility tests override.
    isTester.mockReturnValue(false);
    isEveryoneEnabled.mockResolvedValue(true);
    isSurfacesEnabled.mockResolvedValue(true);
    mountPage();
  });

  describe("visibility (task 0354)", () => {
    it("is shown for a tester when the everyone-flag is off", async () => {
      isTester.mockReturnValue(true);
      isEveryoneEnabled.mockResolvedValue(false);

      const access = await startAccess();

      expect(row().style.display).toBe("");
      expect(access.isVisible()).toBe(true);
    });

    it("stays hidden for a non-tester when the everyone-flag is off — even for a citizen", async () => {
      isEveryoneEnabled.mockResolvedValue(false);
      publishCitizenshipStatus("citizen");

      const access = await startAccess();

      expect(row().style.display).toBe("none");
      expect(access.isVisible()).toBe(false);
    });

    it("is shown for a non-tester when the everyone-flag is on", async () => {
      const access = await startAccess();

      expect(row().style.display).toBe("");
      expect(access.isVisible()).toBe(true);
    });

    it.each([
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ])(
      "stays hidden when the citizenship surfaces are off (tester=%s, everyone=%s)",
      async (tester, everyone) => {
        isSurfacesEnabled.mockResolvedValue(false);
        isTester.mockReturnValue(tester);
        isEveryoneEnabled.mockResolvedValue(everyone);
        publishCitizenshipStatus("citizen");

        const access = await startAccess();

        expect(row().style.display).toBe("none");
        expect(access.isVisible()).toBe(false);
      },
    );

    it("stays hidden for a tester on a degraded boot (no flags → both reads false; owner ruling Q3)", async () => {
      isSurfacesEnabled.mockResolvedValue(false);
      isEveryoneEnabled.mockResolvedValue(false);
      isTester.mockReturnValue(true);

      await startAccess();

      expect(row().style.display).toBe("none");
    });

    it("stays hidden when the everyone-flag read throws — fail closed", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      isEveryoneEnabled.mockRejectedValue(new Error("boom"));

      await startAccess();

      expect(row().style.display).toBe("none");
    });

    it("stays hidden when the citizenship-surfaces read throws — fail closed, even for a tester", async () => {
      jest.spyOn(console, "warn").mockImplementation(() => {});
      isSurfacesEnabled.mockRejectedValue(new Error("boom"));
      isTester.mockReturnValue(true);

      const access = await startAccess();

      expect(row().style.display).toBe("none");
      expect(access.isVisible()).toBe(false);
    });

    it("reads the tester marker at start(), not at construction", async () => {
      isTester.mockReturnValue(true);
      isEveryoneEnabled.mockResolvedValue(false);
      const access = new PrivateLobbyAccess();

      expect(isTester).not.toHaveBeenCalled();

      await access.start();

      expect(isTester).toHaveBeenCalled();
      expect(row().style.display).toBe("");
    });

    it("does not decide before platform init completes", async () => {
      let releaseInit: () => void = () => {};
      waitGameInit.mockReturnValue(
        new Promise<void>((resolve) => (releaseInit = resolve)),
      );
      const access = new PrivateLobbyAccess();
      const started = access.start();
      await Promise.resolve();

      expect(isSurfacesEnabled).not.toHaveBeenCalled();
      expect(isTester).not.toHaveBeenCalled();
      expect(row().style.display).toBe("none");

      releaseInit();
      await started;
      expect(row().style.display).toBe("");
    });
  });

  // Task 0301: the visibility rule, extracted so the citizenship explainer's
  // private-lobby line reads the same answer as the row.
  describe("isPrivateLobbyRowEnabled()", () => {
    it.each([
      // surfaces, tester, everyone → enabled
      [true, true, false, true],
      [true, false, true, true],
      [true, true, true, true],
      [true, false, false, false],
      [false, true, true, false],
      [false, true, false, false],
      [false, false, true, false],
    ])(
      "surfaces=%s tester=%s everyone=%s → %s",
      async (surfaces, tester, everyone, expected) => {
        isSurfacesEnabled.mockResolvedValue(surfaces);
        isTester.mockReturnValue(tester);
        isEveryoneEnabled.mockResolvedValue(everyone);

        await expect(isPrivateLobbyRowEnabled()).resolves.toBe(expected);
      },
    );

    it("waits for platform init before reading anything", async () => {
      let releaseInit: () => void = () => {};
      waitGameInit.mockReturnValue(
        new Promise<void>((resolve) => (releaseInit = resolve)),
      );
      const answer = isPrivateLobbyRowEnabled();
      await Promise.resolve();

      expect(isSurfacesEnabled).not.toHaveBeenCalled();

      releaseInit();
      await expect(answer).resolves.toBe(true);
    });

    it("rejects when a read throws — the caller fails closed", async () => {
      isSurfacesEnabled.mockRejectedValue(new Error("boom"));

      await expect(isPrivateLobbyRowEnabled()).rejects.toThrow("boom");
    });
  });

  describe("switch on: Create is a citizen perk", () => {
    it.each([
      ["unknown (profile still loading)", null],
      ["not_citizen (guest / non-citizen / unreadable)", "not_citizen"],
    ] as const)("is locked for %s", async (_label, status) => {
      if (status !== null) publishCitizenshipStatus(status);

      await startAccess();

      expect(hostButton().locked).toBe(true);
      expect(
        hostButton()
          .querySelector(".c-button")!
          .classList.contains("c-button--locked"),
      ).toBe(true);
      expect(hostButton().textContent).toContain(
        "locked_feature.citizens_only",
      );
    });

    it("a locked tap fires LockedFeature:Tap:PrivateLobby, then opens the explainer, never the host modal", async () => {
      publishCitizenshipStatus("not_citizen");
      const access = await startAccess();
      const openHostModal = jest.fn();

      access.onCreateTap(openHostModal);

      expect(logLockedFeatureTap).toHaveBeenCalledWith("PrivateLobby");
      expect(popupShow).toHaveBeenCalledTimes(1);
      // Task 0301: the explainer, with the locked perk as its source.
      expect(popupShow).toHaveBeenCalledWith({
        source: "LockedFeature",
        featureId: "PrivateLobby",
      });
      // The tap event fires first.
      expect(logLockedFeatureTap.mock.invocationCallOrder[0]).toBeLessThan(
        popupShow.mock.invocationCallOrder[0],
      );
      expect(openHostModal).not.toHaveBeenCalled();
    });

    it("is unlocked for a citizen, and a tap opens the host modal", async () => {
      publishCitizenshipStatus("citizen");
      const access = await startAccess();
      const openHostModal = jest.fn();

      expect(hostButton().locked).toBe(false);
      expect(hostButton().querySelector(".c-button--locked")).toBeNull();

      access.onCreateTap(openHostModal);

      expect(openHostModal).toHaveBeenCalledTimes(1);
      expect(logLockedFeatureTap).not.toHaveBeenCalled();
      expect(popupShow).not.toHaveBeenCalled();
    });

    it("unlocks live when the status turns citizen (e.g. a purchase), no reload", async () => {
      publishCitizenshipStatus("not_citizen");
      await startAccess();
      expect(hostButton().locked).toBe(true);

      publishCitizenshipStatus("citizen");
      await flushLit();

      expect(hostButton().locked).toBe(false);
      expect(hostButton().querySelector(".c-button--locked")).toBeNull();
    });

    it("Join is never locked, whatever the status", async () => {
      publishCitizenshipStatus("not_citizen");
      await startAccess();

      expect(joinButton().locked).toBe(false);
      expect(joinButton().querySelector(".c-button--locked")).toBeNull();
    });
  });

  it("the click routing fails closed even when the row was never shown", async () => {
    isEveryoneEnabled.mockResolvedValue(false);
    const access = await startAccess();
    const openHostModal = jest.fn();

    access.onCreateTap(openHostModal);

    expect(openHostModal).not.toHaveBeenCalled();
  });

  // Review R2 (owner ruling 2026-09-27, "Dev-only bypass").
  describe("dev-only bypass", () => {
    it("a dev build does not lock Create, and a tap opens the host modal", async () => {
      process.env.GAME_ENV = "dev";
      publishCitizenshipStatus("not_citizen");
      const access = await startAccess();
      const openHostModal = jest.fn();

      expect(hostButton().locked).toBe(false);
      access.onCreateTap(openHostModal);

      expect(openHostModal).toHaveBeenCalledTimes(1);
      expect(popupShow).not.toHaveBeenCalled();
    });

    it.each([["prod"], ["staging"], [undefined]])(
      "GAME_ENV=%s still locks Create for a non-citizen",
      async (gameEnv) => {
        if (gameEnv !== undefined) process.env.GAME_ENV = gameEnv;
        publishCitizenshipStatus("not_citizen");
        const access = await startAccess();

        expect(access.isCreateLocked()).toBe(true);
        expect(hostButton().locked).toBe(true);
      },
    );
  });
});

// Review R2: the client bypass keys on the build-time GAME_ENV. Prove the
// production build can only ever carry "prod" — the chain Dockerfile →
// `npm run build-prod` → `webpack --mode production` → GAME_ENV "prod".
describe("the production build never carries GAME_ENV=dev (review R2)", () => {
  const repoFile = (name: string) =>
    fs.readFileSync(path.join(__dirname, "../..", name), "utf-8");

  it("webpack defines GAME_ENV as prod in production mode", () => {
    const webpackConfig = repoFile("webpack.config.js");
    expect(webpackConfig).toContain(
      'const isProduction = argv.mode === "production";',
    );
    expect(webpackConfig).toContain(
      '"process.env.GAME_ENV": JSON.stringify(isProduction ? "prod" : "dev")',
    );
  });

  it("the image builds with build-prod, which is production mode", () => {
    const packageJson = JSON.parse(repoFile("package.json"));
    expect(packageJson.scripts["build-prod"]).toContain("--mode production");
    expect(repoFile("Dockerfile")).toContain("RUN npm run build-prod");
  });
});

// Review R5: the fixture above is hand-written. Check the REAL templates, so the
// "switch off → exactly today's state" promise does not rest on the eye.
describe.each(["index.html", "yandex-games_iframe.html"])(
  "the real %s template (review R5)",
  (template) => {
    const page = new DOMParser().parseFromString(
      fs.readFileSync(
        path.join(__dirname, "../../src/client", template),
        "utf-8",
      ),
      "text/html",
    );

    it("ships the private-lobby row hidden by default, holding Create and Join", () => {
      const row = page.getElementById(PRIVATE_LOBBY_ROW_ID);
      expect(row).not.toBeNull();
      expect((row as HTMLElement).style.display).toBe("none");
      expect(row!.querySelector("#host-lobby-button")).not.toBeNull();
      expect(row!.querySelector("#join-private-lobby-button")).not.toBeNull();
    });

    it("has exactly one Create button, and it is inside the row", () => {
      const buttons = page.querySelectorAll("#host-lobby-button");
      expect(buttons).toHaveLength(1);
      expect(buttons[0].closest(`#${PRIVATE_LOBBY_ROW_ID}`)).not.toBeNull();
    });

    // Task 0301: the explainer replaced 0302's interim notice.
    it("mounts <citizenship-explainer-modal>, and no interim notice", () => {
      expect(page.querySelectorAll("citizenship-explainer-modal")).toHaveLength(
        1,
      );
      expect(page.querySelectorAll("citizens-only-modal")).toHaveLength(0);
    });
  },
);
