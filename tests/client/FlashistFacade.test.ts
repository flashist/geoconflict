/**
 * @jest-environment jsdom
 */
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";

// The facade constructor runs platform detection and analytics wiring, so the
// formula is tested on a bare prototype instance with just the relevant
// fields set (yandexSdkPlayerObject is protected — hence Object.assign).
function makeFacade(fields: {
  yaGamesAvailable: boolean;
  yandexGamesSDK?: unknown;
  yandexSdkPlayerObject?: unknown;
}): FlashistFacade {
  return Object.assign(
    Object.create(FlashistFacade.prototype),
    fields,
  ) as FlashistFacade;
}

const guestPlayer = { isAuthorized: () => false };

describe("FlashistFacade.isYandexDegraded", () => {
  it("is true when YaGames.init() never produced an SDK", () => {
    expect(
      makeFacade({ yaGamesAvailable: true }).isYandexDegraded(),
    ).toBe(true);
  });

  it("is true when the SDK is present but the boot player fetch never completed", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
      }).isYandexDegraded(),
    ).toBe(true);
  });

  it("is false for a real logged-out guest (SDK and player object present)", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: guestPlayer,
      }).isYandexDegraded(),
    ).toBe(false);
  });

  it("is false for an authorized player", () => {
    expect(
      makeFacade({
        yaGamesAvailable: true,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: { isAuthorized: () => true },
      }).isYandexDegraded(),
    ).toBe(false);
  });

  it("is false in a standalone/no-Yandex context, whatever the other fields", () => {
    expect(
      makeFacade({ yaGamesAvailable: false }).isYandexDegraded(),
    ).toBe(false);
    expect(
      makeFacade({
        yaGamesAvailable: false,
        yandexGamesSDK: {},
        yandexSdkPlayerObject: guestPlayer,
      }).isYandexDegraded(),
    ).toBe(false);
  });
});
