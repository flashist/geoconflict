import { z } from "zod";

/**
 * Platform spellings a login can come from (ADR-113). The ONE home for this list:
 * the login contract (task 0271, S2), the server's identity repository and the
 * game server's resolve route (task 0272, S3) all import it.
 *
 * Must match the `player_identities.platform` CHECK in migrations/006 — a value
 * added here without a migration is a DB error, not a new platform.
 */
export const PlatformSchema = z.enum(["yandex_games"]);
export type Platform = z.infer<typeof PlatformSchema>;
