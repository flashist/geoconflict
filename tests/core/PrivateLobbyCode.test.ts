// jose pulls in ESM that jest can't load directly; DefaultConfig and Schemas
// import it. Same stub as tests/server/PublicLobbyWindow.test.ts.
jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { DevServerConfig } from "../../src/core/configuration/DevConfig";
import { prodConfig } from "../../src/core/configuration/ProdConfig";
import {
  PRIVATE_LOBBY_CODE_ALPHABET,
  cleanLobbyCode,
  formatLobbyCodeForDisplay,
  generatePrivateLobbyCode,
} from "../../src/core/PrivateLobbyCode";
import { ID, PrivateLobbyCodeSchema } from "../../src/core/Schemas";
import { generateID } from "../../src/core/Util";

// Task 0389: private-lobby codes — 8 characters from capitals and digits with
// the look-alikes removed, typed in any case, shown in two groups.

describe("generatePrivateLobbyCode (task 0389)", () => {
  const codes = Array.from({ length: 5000 }, () => generatePrivateLobbyCode());

  it("is always 8 characters from the alphabet", () => {
    for (const code of codes) {
      expect(code).toHaveLength(8);
      for (const character of code) {
        expect(PRIVATE_LOBBY_CODE_ALPHABET).toContain(character);
      }
    }
  });

  it("never uses a look-alike: 0 O 1 I L U", () => {
    for (const code of codes) {
      expect(code).not.toMatch(/[0O1ILU]/);
    }
  });

  it("the alphabet itself has no look-alike and no lower case", () => {
    expect(PRIVATE_LOBBY_CODE_ALPHABET).not.toMatch(/[0O1ILUa-z]/);
    expect(PRIVATE_LOBBY_CODE_ALPHABET).toHaveLength(30);
  });

  it("every code passes both PrivateLobbyCodeSchema and the shared ID", () => {
    for (const code of codes) {
      expect(PrivateLobbyCodeSchema.safeParse(code).success).toBe(true);
      expect(ID.safeParse(code).success).toBe(true);
    }
  });
});

describe("cleanLobbyCode (task 0389)", () => {
  it.each([
    ["k7m4-pcrx", "K7M4PCRX"],
    [" K7M4 PCRX ", "K7M4PCRX"],
    ["k7m4 pcrx", "K7M4PCRX"],
    ["K7M4PCRX", "K7M4PCRX"],
    ["\tk7m4\npcrx", "K7M4PCRX"],
  ])("%j becomes %j", (typed, code) => {
    expect(cleanLobbyCode(typed)).toBe(code);
  });

  it("maps nothing else: a Cyrillic look-alike stays Cyrillic and fails", () => {
    // Owner ruling 2026-10-05: Latin only, no Cyrillic mapping.
    const cleaned = cleanLobbyCode("К7М4РСРХ"); // Cyrillic К М Р С Х
    expect(cleaned).not.toBe("K7M4PCRX");
    expect(PrivateLobbyCodeSchema.safeParse(cleaned).success).toBe(false);
  });
});

describe("formatLobbyCodeForDisplay (task 0389)", () => {
  it("shows a code in two groups of four", () => {
    expect(formatLobbyCodeForDisplay("K7M4PCRX")).toBe("K7M4 PCRX");
  });

  it("shows nothing for no code yet", () => {
    expect(formatLobbyCodeForDisplay("")).toBe("");
  });

  it("a grouped code cleans back to the code", () => {
    const code = generatePrivateLobbyCode();
    expect(cleanLobbyCode(formatLobbyCodeForDisplay(code))).toBe(code);
  });
});

describe("routing a typed code (task 0389, ADR-109)", () => {
  it.each([
    ["prod", prodConfig],
    ["dev", new DevServerConfig()],
  ])(
    "a cleaned lowercase code reaches the same worker as the code (%s)",
    (_name, config) => {
      expect(config.workerIndex(cleanLobbyCode("k7m4 pcrx"))).toBe(
        config.workerIndex("K7M4PCRX"),
      );
      for (let i = 0; i < 200; i++) {
        const code = generatePrivateLobbyCode();
        const typed = formatLobbyCodeForDisplay(code).toLowerCase();
        expect(config.workerPath(cleanLobbyCode(typed))).toBe(
          config.workerPath(code),
        );
      }
    },
  );
});

describe("PrivateLobbyCodeSchema (task 0389)", () => {
  it("accepts a new code", () => {
    expect(PrivateLobbyCodeSchema.safeParse("K7M4PCRX").success).toBe(true);
  });

  it.each([
    ["a mixed-case generateID()-style id", "AbC12345"],
    ["lower case", "k7m4pcrx"],
    ["7 characters", "K7M4PCR"],
    ["9 characters", "K7M4PCRXA"],
    ["a 0", "K7M4PCR0"],
    ["an O", "K7M4PCRO"],
    ["a 1", "K7M4PCR1"],
    ["an I", "K7M4PCRI"],
    ["an L", "K7M4PCRL"],
    ["a U", "K7M4PCRU"],
    ["a space", "K7M4 PCR"],
    ["empty", ""],
  ])("rejects %s (%j)", (_label, id) => {
    expect(PrivateLobbyCodeSchema.safeParse(id).success).toBe(false);
  });

  it("never accepts a generateID() id that has a lower-case letter", () => {
    // The check is a format check: about 1 in 195 generateID() ids (case kept)
    // happens to be all-alphabet and passes. Every other one is refused.
    for (let i = 0; i < 2000; i++) {
      const id = generateID();
      if (/[a-z]/.test(id)) {
        expect(PrivateLobbyCodeSchema.safeParse(id).success).toBe(false);
      }
    }
  });
});
