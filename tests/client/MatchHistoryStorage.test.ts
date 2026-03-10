/**
 * @jest-environment jsdom
 */
import {
  readMatchHistory,
  writeMatchStart,
  updateMatchOutcome,
} from "../../src/client/MatchHistoryStorage";

const STORAGE_KEY = "geoconflict_match_history";

beforeEach(() => {
  localStorage.clear();
});

describe("readMatchHistory", () => {
  it("returns empty array when nothing stored", () => {
    expect(readMatchHistory()).toEqual([]);
  });

  it("returns empty array on malformed JSON", () => {
    localStorage.setItem(STORAGE_KEY, "not json");
    expect(readMatchHistory()).toEqual([]);
  });

  it("returns empty array when stored value is not an array", () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    expect(readMatchHistory()).toEqual([]);
  });
});

describe("writeMatchStart", () => {
  it("writes an abandoned entry", () => {
    writeMatchStart("abc123", "FFA", "World");
    const history = readMatchHistory();
    expect(history).toHaveLength(1);
    expect(history[0]).toMatchObject({
      gameID: "abc123",
      gameType: "FFA",
      gameMap: "World",
      outcome: "abandoned",
    });
    expect(typeof history[0].timestamp).toBe("number");
  });

  it("deduplicates by gameID — existing entry replaced, new entry at front", () => {
    writeMatchStart("game1", "FFA", "Map1");
    writeMatchStart("game2", "Teams", "Map2");
    writeMatchStart("game1", "FFA", "Map1"); // duplicate
    const history = readMatchHistory();
    expect(history).toHaveLength(2);
    expect(history[0].gameID).toBe("game1");
    expect(history[1].gameID).toBe("game2");
  });

  it("trims to MAX_ENTRIES (5)", () => {
    for (let i = 0; i < 7; i++) {
      writeMatchStart(`game${i}`, "", "");
    }
    expect(readMatchHistory()).toHaveLength(5);
  });

  it("most recent entry is at index 0", () => {
    writeMatchStart("old", "", "");
    writeMatchStart("new", "", "");
    expect(readMatchHistory()[0].gameID).toBe("new");
  });

  it("uses empty strings for missing gameType/gameMap", () => {
    writeMatchStart("x");
    const entry = readMatchHistory()[0];
    expect(entry.gameType).toBe("");
    expect(entry.gameMap).toBe("");
  });
});

describe("updateMatchOutcome", () => {
  it("updates an existing entry outcome to win", () => {
    writeMatchStart("g1", "FFA", "Map");
    updateMatchOutcome("g1", "win");
    expect(readMatchHistory()[0].outcome).toBe("win");
  });

  it("updates an existing entry outcome to loss", () => {
    writeMatchStart("g1", "FFA", "Map");
    updateMatchOutcome("g1", "loss");
    expect(readMatchHistory()[0].outcome).toBe("loss");
  });

  it("does nothing when gameID not found", () => {
    writeMatchStart("g1", "", "");
    updateMatchOutcome("unknown", "win");
    expect(readMatchHistory()[0].outcome).toBe("abandoned");
  });

  it("updates only the matching entry when multiple exist", () => {
    writeMatchStart("g1", "", "");
    writeMatchStart("g2", "", "");
    updateMatchOutcome("g1", "win");
    const history = readMatchHistory();
    expect(history.find((e) => e.gameID === "g1")?.outcome).toBe("win");
    expect(history.find((e) => e.gameID === "g2")?.outcome).toBe("abandoned");
  });
});
