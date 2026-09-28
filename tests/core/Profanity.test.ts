// Task 0322. The match's rude-name matcher moved into its own module so the
// profile server can ask the SAME matcher (for the moderator's warning) without
// loading client code. Two jobs here:
//   1. prove src/core/validations/profanity.ts loads with no client Utils — the
//      reason it exists — and imports nothing but `obscenity`;
//   2. prove `./username` still gives the same verdicts (it re-exports this one).
//
// Real matcher, no obscenity mock (tests/Censor.test.ts covers the mocked logic).

// If profanity.ts ever loads client Utils, the import below throws. This is the
// runtime half of the proof; the source check below is the static half.
jest.mock("../../src/client/Utils", () => {
  throw new Error("profanity.ts must not load src/client/Utils");
});

import fs from "fs";
import path from "path";
import { isProfaneUsername } from "../../src/core/validations/profanity";

const SAMPLES = [
  "bitch",
  "B1tch_Queen",
  "Good_Name123",
  "Привет123",
  "[Clan] Tag",
  "Classic",
  "Assassin",
  "Scunthorpe",
];

describe("profanity.ts (task 0322)", () => {
  it("imports nothing but obscenity", () => {
    const source = fs.readFileSync(
      path.join(__dirname, "../../src/core/validations/profanity.ts"),
      "utf8",
    );
    const imports = [...source.matchAll(/from\s+"([^"]+)"/g)].map((m) => m[1]);
    expect(imports).toEqual(["obscenity"]);
  });

  it("flags an English-dataset word, including a leet respelling", () => {
    expect(isProfaneUsername("bitch")).toBe(true);
    expect(isProfaneUsername("B1tch_Queen")).toBe(true);
  });

  it("passes clean names, a Cyrillic name and the classic false positives", () => {
    for (const name of [
      "Good_Name123",
      "Привет123",
      "[Clan] Tag",
      "Classic",
      "Assassin",
      "Scunthorpe",
    ]) {
      expect(isProfaneUsername(name)).toBe(false);
    }
  });

  it("./username gives the same verdicts: it re-exports this matcher, and fixProfaneUsername follows it", () => {
    jest.isolateModules(() => {
      jest.doMock("../../src/client/Utils", () => ({
        translateText: (key: string) => key,
      }));
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const username = require("../../src/core/validations/username");
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const profanity = require("../../src/core/validations/profanity");
      expect(username.isProfaneUsername).toBe(profanity.isProfaneUsername);
      for (const name of SAMPLES) {
        expect(username.isProfaneUsername(name)).toBe(isProfaneUsername(name));
        expect(username.fixProfaneUsername(name) !== name).toBe(
          isProfaneUsername(name),
        );
      }
    });
  });
});
