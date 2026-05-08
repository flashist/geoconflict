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
const RESPONSE_BODY_EXCERPT_LIMIT = 300;

function archiveBaseUrl(): string {
  return config.apiBaseUrl().replace(/\/+$/, "");
}

function archiveGameUrl(gameID: GameID): string {
  return `${archiveBaseUrl()}/game/${gameID}`;
}

function safeUrlForLog(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0];
  }
}

function excerptText(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return "<empty>";
  }
  if (normalized.length <= RESPONSE_BODY_EXCERPT_LIMIT) {
    return normalized;
  }
  return `${normalized.slice(0, RESPONSE_BODY_EXCERPT_LIMIT)}...`;
}

async function responseBodyExcerpt(response: Response): Promise<string> {
  try {
    return excerptText(await response.text());
  } catch (error) {
    return `<unreadable response body: ${formatError(error).split("\n")[0]}>`;
  }
}

export async function archiveFailureContext(
  url: string,
  response: Response,
): Promise<string> {
  const statusText = response.statusText ? ` ${response.statusText}` : "";
  return `status=${response.status}${statusText} url=${safeUrlForLog(url)} body="${await responseBodyExcerpt(response)}"`;
}

export async function archive(gameRecord: GameRecord) {
  try {
    const parsed = GameRecordSchema.safeParse(gameRecord);
    if (!parsed.success) {
      log.error(
        `invalid game record (gameID: ${gameRecord.info.gameID}): ${z.prettifyError(parsed.error)}`,
      );
      return;
    }
    const url = archiveGameUrl(gameRecord.info.gameID);
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
        `error archiving game record (gameID: ${gameRecord.info.gameID}): ${await archiveFailureContext(url, response)}`,
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
    const url = archiveGameUrl(gameId);
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      log.error(
        `error reading game record (gameID: ${gameId}): ${await archiveFailureContext(url, response)}`,
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
