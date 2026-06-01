// Schemas -> CosmeticSchemas pulls in `jose` (ESM, untransformed under jest).
// Mock it the same way CosmeticsConfig.test.ts does.
jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { mkdtempSync, rmSync } from "fs";
import { tmpdir } from "os";
import path from "path";
import { GameRecord } from "../../src/core/Schemas";
import {
  readGameRecordFromDisk,
  writeGameRecord,
} from "../../src/server/GameRecordStorage";

describe("GameRecordStorage", () => {
  const originalDir = process.env.GAME_RECORDS_DIR;
  let dir: string;

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "game-records-"));
    process.env.GAME_RECORDS_DIR = dir;
  });

  afterEach(() => {
    if (originalDir === undefined) {
      delete process.env.GAME_RECORDS_DIR;
    } else {
      process.env.GAME_RECORDS_DIR = originalDir;
    }
    rmSync(dir, { recursive: true, force: true });
  });

  test("writes then reads a record back unchanged", async () => {
    const record = {
      info: { gameID: "abcd1234", players: [{ username: "a" }] },
      version: "v0.0.1",
    } as unknown as GameRecord;

    await writeGameRecord("abcd1234", record);

    expect(await readGameRecordFromDisk("abcd1234")).toEqual(record);
  });

  test("serializes bigint fields to strings via the replacer", async () => {
    const record = { value: 42n, nested: { big: 7n } } as unknown as GameRecord;

    await writeGameRecord("efgh5678", record);

    expect(await readGameRecordFromDisk("efgh5678")).toEqual({
      value: "42",
      nested: { big: "7" },
    });
  });

  test("returns null when the record does not exist", async () => {
    expect(await readGameRecordFromDisk("zzzz9999")).toBeNull();
  });

  test("rejects an invalid game ID (path-traversal guard)", async () => {
    const record = {} as unknown as GameRecord;
    await expect(writeGameRecord("../secret", record)).rejects.toThrow(
      /invalid game ID/,
    );
    await expect(readGameRecordFromDisk("bad")).rejects.toThrow(
      /invalid game ID/,
    );
  });
});
