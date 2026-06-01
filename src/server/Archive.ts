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
import { formatError, logger } from "./Logger";
import { localGameRecordUrl } from "./ServerEndpoints";

const config = getServerConfigFromServer();

const log = logger.child({ component: "Archive" });

export async function archive(gameRecord: GameRecord) {
  try {
    const parsed = GameRecordSchema.safeParse(gameRecord);
    if (!parsed.success) {
      log.error(
        `invalid game record (gameID: ${gameRecord.info.gameID}): ${z.prettifyError(parsed.error)}`,
      );
      return;
    }
    const url = localGameRecordUrl(gameRecord.info.gameID);
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(gameRecord, replacer),
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey(),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error(
        `error archiving game record (gameID: ${gameRecord.info.gameID}): ` +
          `HTTP ${response.status} ${response.statusText} ${url} — ${body.slice(0, 200)}`,
      );
      return;
    }
  } catch (error) {
    log.error(
      `error archiving game record (gameID: ${gameRecord.info.gameID}): ${formatError(error)}`,
    );
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
    const url = localGameRecordUrl(gameId);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": config.apiKey(),
      },
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      log.error(
        `error reading game record (gameID: ${gameId}): ` +
          `HTTP ${response.status} ${response.statusText} ${url} — ${body.slice(0, 200)}`,
      );
      return null;
    }
    const record = await response.json();
    return GameRecordSchema.parse(record);
  } catch (error) {
    log.error(
      `error reading game record (gameID: ${gameId}): ${formatError(error)}`,
    );
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
