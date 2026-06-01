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

const config = getServerConfigFromServer();

const log = logger.child({ component: "Archive" });

export async function archive(gameRecord: GameRecord) {
  // Archiving is disabled until S3-backed, citizen-gated archival ships
  // (s4-archive-s3-backed-citizen-gated.md). No-op so completed games stop
  // posting to a non-existent endpoint and flooding telemetry.
  if (!config.archiveEnabled()) {
    return;
  }
  try {
    const parsed = GameRecordSchema.safeParse(gameRecord);
    if (!parsed.success) {
      log.error(
        `invalid game record (gameID: ${gameRecord.info.gameID}): ${z.prettifyError(parsed.error)}`,
      );
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
      log.error(
        `error archiving game record (gameID: ${gameRecord.info.gameID}): ${response.statusText}`,
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
    const url = `${config.jwtIssuer()}/game/${gameId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    const record = await response.json();
    if (!response.ok) {
      log.error(
        `error reading game record (gameID: ${gameId}): ${response.statusText}`,
      );
      return null;
    }
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
