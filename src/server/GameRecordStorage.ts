import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { GameID, GameRecord, ID } from "../core/Schemas";
import { replacer } from "../core/Util";

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDirname = path.dirname(moduleFilename);

function gameRecordsDir(): string {
  const override = process.env.GAME_RECORDS_DIR?.trim();
  if (override) {
    return override;
  }
  return path.join(moduleDirname, "../../data/game-records");
}

// Validates the game ID before it is used in a filename. ID is an 8-char
// alphanumeric string, so this also blocks path traversal (no "/" or "..").
function recordFilePath(gameId: string): string {
  if (!ID.safeParse(gameId).success) {
    throw new Error(`invalid game ID: ${gameId}`);
  }
  return path.join(gameRecordsDir(), `${gameId}.json`);
}

export async function writeGameRecord(
  gameId: GameID,
  record: GameRecord,
): Promise<void> {
  const filePath = recordFilePath(gameId);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(record, replacer), "utf8");
}

export async function readGameRecordFromDisk(
  gameId: GameID,
): Promise<GameRecord | null> {
  const filePath = recordFilePath(gameId);
  try {
    const contents = await readFile(filePath, "utf8");
    return JSON.parse(contents) as GameRecord;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
