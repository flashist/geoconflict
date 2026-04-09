import z from "zod";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import {
  GameID,
  GameRecord,
  GameRecordSchema,
  ID,
  PartialGameRecord,
} from "../core/Schemas";
import { replacer } from "../core/Util";
import { logger } from "./Logger";

const config = getServerConfigFromServer();

const log = logger.child({ component: "Archive" });

export async function archive(gameRecord: GameRecord) {
  try {
    const parsed = GameRecordSchema.safeParse(gameRecord);
    if (!parsed.success) {
      log.error(`invalid game record (gameID: ${gameRecord.info.gameID}): ${z.prettifyError(parsed.error)}`);
      return;
    }
    const url = `${config.jwtIssuer()}/game/${gameRecord.info.gameID}`;
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(gameRecord, replacer),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey(),
      },
    });
    if (!response.ok) {
      log.error(`error archiving game record: ${response.statusText} (gameID: ${gameRecord.info.gameID})`);
      return;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error(`error archiving game record (gameID: ${gameRecord.info.gameID}): ${err.message}\n${err.stack ?? ""}`);
    return;
  }
}

export async function readGameRecord(
  gameId: GameID,
): Promise<GameRecord | null> {
  try {
    if (!ID.safeParse(gameId).success) {
      log.error(`invalid game ID: ${gameId}`);
      return null;
    }
    const url = `${config.jwtIssuer()}/game/${gameId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const record = await response.json();
    if (!response.ok) {
      log.error(`error reading game record: ${response.statusText} (gameID: ${gameId})`);
      return null;
    }
    return GameRecordSchema.parse(record);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    log.error(`error reading game record (gameID: ${gameId}): ${err.message}\n${err.stack ?? ""}`);
    return null;
  }
}

export function finalizeGameRecord(
  clientRecord: PartialGameRecord,
): GameRecord {
  return {
    ...clientRecord,
    gitCommit: config.gitCommit(),
    deployment: config.deploymentId(),
    publicHost: config.publicHost(),
  };
}
