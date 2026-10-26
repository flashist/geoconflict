// Client claim of a rewarded video's extra match XP (task 0488; route: 0491).

const profileFetch = jest.fn();
jest.mock("../../src/client/ProfileSession", () => ({
  profileFetch: (...args: unknown[]) => profileFetch(...args),
}));
jest.mock("../../src/client/flashist/FlashistFacade", () => ({
  flashist_logEventAnalytics: jest.fn(),
  flashistConstants: {
    analyticEvents: {
      AD_REWARDED_REWARD_GRANTED: "Ad:Rewarded:Reward:Granted",
      AD_REWARDED_REWARD_DUPLICATE: "Ad:Rewarded:Reward:Duplicate",
      AD_REWARDED_REWARD_NOT_CREDITED: "Ad:Rewarded:Reward:NotCredited",
      AD_REWARDED_REWARD_FAILED: "Ad:Rewarded:Reward:Failed",
    },
  },
}));

import { flashist_logEventAnalytics } from "../../src/client/flashist/FlashistFacade";
import {
  claimRewardedMatchXp,
  REWARDED_MATCH_XP_RETRY_DELAYS_MS,
  resetRewardedMatchXpClaimsForTests,
} from "../../src/client/RewardedMatchXpClaim";

const logEvent = flashist_logEventAnalytics as jest.Mock;
const GAME_ID = "game-abc";
const noWait = jest.fn(async () => {});

function response(status: number, body: unknown) {
  return {
    kind: "response",
    response: { status, json: async () => body },
  };
}

const granted = response(200, { status: "granted", xpAwarded: 1, xp: 42 });
const notCredited = response(200, {
  status: "not_credited",
  xpAwarded: 0,
  xp: 41,
});

describe("claimRewardedMatchXp", () => {
  beforeEach(() => {
    resetRewardedMatchXpClaimsForTests();
    profileFetch.mockReset();
    logEvent.mockReset();
    noWait.mockClear();
  });

  it("granted: posts only the game id, fires Granted with the XP", async () => {
    profileFetch.mockResolvedValue(granted);

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "granted",
      xpAwarded: 1,
      xp: 42,
    });

    expect(profileFetch).toHaveBeenCalledTimes(1);
    const [path, options] = profileFetch.mock.calls[0];
    expect(path).toBe("/v1/profile/rewarded-match-xp");
    expect(options.method).toBe("POST");
    expect(JSON.parse(options.body)).toEqual({ gameId: GAME_ID });
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:Granted", 1]]);
  });

  it("duplicate: final, no retry", async () => {
    profileFetch.mockResolvedValue(
      response(200, { status: "duplicate", xpAwarded: 0, xp: 42 }),
    );

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "duplicate",
    });
    expect(profileFetch).toHaveBeenCalledTimes(1);
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:Duplicate"]]);
  });

  it("not_credited then granted: retried after the first backoff", async () => {
    profileFetch
      .mockResolvedValueOnce(notCredited)
      .mockResolvedValueOnce(granted);

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toMatchObject({
      status: "granted",
    });
    expect(noWait.mock.calls).toEqual([[REWARDED_MATCH_XP_RETRY_DELAYS_MS[0]]]);
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:Granted", 1]]);
  });

  it("not_credited every time: 3 retries with backoff, then not_credited once", async () => {
    profileFetch.mockResolvedValue(notCredited);

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "not_credited",
    });
    expect(profileFetch).toHaveBeenCalledTimes(4);
    expect(noWait.mock.calls).toEqual([[2_000], [5_000], [10_000]]);
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:NotCredited"]]);
  });

  it("network errors and 5xx are retried, then failed", async () => {
    profileFetch
      .mockResolvedValueOnce({ kind: "network_error" })
      .mockResolvedValueOnce(response(503, {}))
      .mockResolvedValueOnce(response(500, {}))
      .mockResolvedValueOnce({ kind: "network_error" });

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "failed",
    });
    expect(profileFetch).toHaveBeenCalledTimes(4);
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:Failed"]]);
  });

  it.each([
    ["no session", { kind: "no_session" }],
    ["unconfigured", { kind: "unconfigured" }],
    ["401", response(401, {})],
    ["404 (old box or no player row)", response(404, { error: "not_found" })],
    ["a body that fails the schema", response(200, { status: "weird" })],
  ])("%s: failed, not retried", async (_label, result) => {
    profileFetch.mockResolvedValue(result);

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "failed",
    });
    expect(profileFetch).toHaveBeenCalledTimes(1);
    expect(logEvent.mock.calls).toEqual([["Ad:Rewarded:Reward:Failed"]]);
  });

  it("never throws: a rejecting fetch resolves failed", async () => {
    profileFetch.mockRejectedValue(new Error("boom"));

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toEqual({
      status: "failed",
    });
  });

  it("never throws when analytics throws", async () => {
    profileFetch.mockResolvedValue(granted);
    logEvent.mockImplementation(() => {
      throw new Error("analytics broke");
    });

    await expect(claimRewardedMatchXp(GAME_ID, noWait)).resolves.toMatchObject({
      status: "granted",
    });
  });

  it("once per game id: a second call shares the first claim", async () => {
    profileFetch.mockResolvedValue(granted);

    const first = claimRewardedMatchXp(GAME_ID, noWait);
    const second = claimRewardedMatchXp(GAME_ID, noWait);

    expect(second).toBe(first);
    await first;
    expect(profileFetch).toHaveBeenCalledTimes(1);
    expect(logEvent).toHaveBeenCalledTimes(1);

    await claimRewardedMatchXp("other-game", noWait);
    expect(profileFetch).toHaveBeenCalledTimes(2);
  });
});
