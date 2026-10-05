import { customAlphabet } from "nanoid";

// Task 0389: private-lobby codes are made to be read out and typed. Capitals
// and digits only, with the look-alikes removed (no 0 O 1 I L U), typed in any
// case. The code is still the lobby's game id, so it routes through the same
// workerIndex() as every other id (ADR-109) — always clean it first.
//
// Imports only nanoid: Util.ts already imports Schemas.ts, so this cannot live
// there without a circular import.

export const PRIVATE_LOBBY_CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";
export const PRIVATE_LOBBY_CODE_LENGTH = 8;

const drawPrivateLobbyCode = customAlphabet(
  PRIVATE_LOBBY_CODE_ALPHABET,
  PRIVATE_LOBBY_CODE_LENGTH,
);

export function generatePrivateLobbyCode(): string {
  return drawPrivateLobbyCode();
}

/** What a player typed or pasted, as a code: no spaces or dashes, upper case. */
export function cleanLobbyCode(text: string): string {
  return text.replace(/[\s-]/g, "").toUpperCase();
}

/** `K7M4PCRX` is shown as `K7M4 PCRX`. Copy the code itself, not this. */
export function formatLobbyCodeForDisplay(code: string): string {
  return code.replace(/(.{4})(?=.)/g, "$1 ");
}
