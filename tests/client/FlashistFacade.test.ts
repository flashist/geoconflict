/**
 * @jest-environment jsdom
 */
import { FlashistFacade } from "../../src/client/flashist/FlashistFacade";

// The facade constructor runs platform detection and analytics wiring, so the
// formula is tested on a bare prototype instance with just the two fields set.
function makeFacade(
  yaGamesAvailable: boolean,
  yandexGamesSDK: unknown,
): FlashistFacade {
  const facade = Object.create(FlashistFacade.prototype) as FlashistFacade;
  facade.yaGamesAvailable = yaGamesAvailable;
  facade.yandexGamesSDK = yandexGamesSDK;
  return facade;
}

describe("FlashistFacade.isYandexDegraded", () => {
  it("is true only for a Yandex context without an initialized SDK", () => {
    // Degraded: Yandex platform detected, but YaGames.init() never produced
    // an SDK object (rejected or missed the platform-init deadline).
    expect(makeFacade(true, undefined).isYandexDegraded()).toBe(true);

    // Healthy Yandex session.
    expect(makeFacade(true, {}).isYandexDegraded()).toBe(false);

    // Standalone/no-Yandex context is a plain guest, never degraded.
    expect(makeFacade(false, undefined).isYandexDegraded()).toBe(false);
    expect(makeFacade(false, {}).isYandexDegraded()).toBe(false);
  });
});
