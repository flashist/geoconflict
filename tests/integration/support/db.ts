// Shared fixtures for the DB-backed integration suites (task 0270).
//
// The schema itself is built ONCE per run by tests/integration/globalSetup.ts
// (reset + the real migration runner). Suites only clear rows between tests and
// create players through the same repository production uses. This file does not
// match `*.it.test.ts`, so jest never runs it as a suite.

import type { Pool } from "pg";
import type { InboxSender } from "../../../src/profile-server/InboxRepository";
import {
  PLATFORM_YANDEX_GAMES,
  PlayerIdentityRepository,
} from "../../../src/profile-server/PlayerIdentityRepository";
import { PlayerProfileRepository } from "../../../src/profile-server/PlayerProfileRepository";
import type { ProfileRepo } from "../../../src/profile-server/Routes";

/** Every row-holding profile table — ONE list, so a new table is cleared everywhere. */
const PROFILE_TABLES = [
  "player_messages",
  "processed_purchases",
  "purchase_intents",
  "player_xp_grants",
  "player_cosmetic_ownership",
  "player_name_history",
  "player_match_xp_credits",
  "player_identities",
  "players",
];

export async function truncateProfileTables(pool: Pool): Promise<void> {
  await pool.query(
    `TRUNCATE ${PROFILE_TABLES.join(", ")} RESTART IDENTITY CASCADE`,
  );
}

/** Find-or-create a player for a Yandex id, the production way. Returns its id. */
export async function createYandexPlayer(
  pool: Pool,
  yandexPlayerId: string,
): Promise<string> {
  const resolved = await new PlayerIdentityRepository(
    pool,
  ).resolveOrCreatePlayer(PLATFORM_YANDEX_GAMES, yandexPlayerId, "game_server");
  return resolved.playerId;
}

/** A ProfileRepo bound over the real repositories, exactly as Server.ts binds it. */
export function realProfileRepo(pool: Pool, inbox?: InboxSender): ProfileRepo {
  const profiles = new PlayerProfileRepository(pool, inbox);
  const identities = new PlayerIdentityRepository(pool);
  return {
    ping: () => profiles.ping(),
    getProfile: (playerId) => profiles.getProfile(playerId),
    creditMatchXp: (gameId, playerId, xpAwarded) =>
      profiles.creditMatchXp(gameId, playerId, xpAwarded),
    findPlayerByIdentity: (platform, platformUserId) =>
      identities.findPlayerByIdentity(platform, platformUserId),
    resolveOrCreatePlayer: (platform, platformUserId, source) =>
      identities.resolveOrCreatePlayer(platform, platformUserId, source),
  };
}

/** Count of players with no identity at all — must always be 0. */
export async function countOrphanPlayers(pool: Pool): Promise<number> {
  const res = await pool.query(
    `SELECT count(*)::int AS n FROM players p
     WHERE NOT EXISTS (SELECT 1 FROM player_identities i WHERE i.player_id = p.id)`,
  );
  return Number(res.rows[0].n);
}
