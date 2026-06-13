import { canUseGuestProfileForState } from "../../src/client/flashist/guestProfileEligibility";

describe("canUseGuestProfileForState", () => {
  it("treats standalone (non-Yandex) web as a definite guest", () => {
    expect(
      canUseGuestProfileForState({
        yaGamesAvailable: false,
        hasYandexPlayer: false,
        isYandexAuthorized: false,
      }),
    ).toBe(true);
  });

  it("treats an unauthorized Yandex player as a guest", () => {
    expect(
      canUseGuestProfileForState({
        yaGamesAvailable: true,
        hasYandexPlayer: true,
        isYandexAuthorized: false,
      }),
    ).toBe(true);
  });

  it("skips an authorized Yandex player (server-authoritative)", () => {
    expect(
      canUseGuestProfileForState({
        yaGamesAvailable: true,
        hasYandexPlayer: true,
        isYandexAuthorized: true,
      }),
    ).toBe(false);
  });

  it("skips when on Yandex but auth is unknown (getPlayer hung/failed)", () => {
    expect(
      canUseGuestProfileForState({
        yaGamesAvailable: true,
        hasYandexPlayer: false,
        isYandexAuthorized: false,
      }),
    ).toBe(false);
  });
});
