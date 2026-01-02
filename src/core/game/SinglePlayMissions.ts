import { Difficulty, GameMapType } from "./Game";
import { mapMaxPlayers } from "./MapPlayers";
import { PseudoRandom } from "../PseudoRandom";

export const MISSION_SEED_VERSION = "spm:v1";

export type MissionTierCounts = {
  easy: number;
  medium: number;
  hard: number;
  impossible: number;
};

export function hashFNV1a32(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

export function deriveMissionSeed(mapId: GameMapType, level: number): number {
  return hashFNV1a32(`${MISSION_SEED_VERSION}:${mapId}:${level}`);
}

export function selectMissionMap(
  level: number,
  maps: GameMapType[],
): GameMapType {
  if (maps.length === 0) {
    throw new Error("mission map list is empty");
  }
  const sorted = [...maps].sort((a, b) => {
    const playersDiff = mapMaxPlayers(a) - mapMaxPlayers(b);
    if (playersDiff !== 0) return playersDiff;
    return String(a).localeCompare(String(b));
  });
  const index = (level - 1) % sorted.length;
  return sorted[index];
}

export function computeTierCounts(
  level: number,
  nationCount: number,
  divisors = { medium: 1, hard: 10, impossible: 50 },
): MissionTierCounts {
  const impossible = Math.min(
    nationCount,
    Math.floor(level / divisors.impossible),
  );
  const hard = Math.min(
    nationCount - impossible,
    Math.floor(level / divisors.hard),
  );
  const medium = Math.min(
    nationCount - impossible - hard,
    Math.floor(level / divisors.medium),
  );
  const easy = Math.max(0, nationCount - impossible - hard - medium);
  return { easy, medium, hard, impossible };
}

export function assignNationDifficulties(
  nationCount: number,
  counts: MissionTierCounts,
  rng: PseudoRandom,
): Difficulty[] {
  const indices = Array.from({ length: nationCount }, (_, i) => i);
  const shuffled = rng.shuffleArray(indices);
  const difficulties = Array(nationCount).fill(Difficulty.Easy) as Difficulty[];
  let cursor = 0;
  for (let i = 0; i < counts.impossible; i++) {
    difficulties[shuffled[cursor++]] = Difficulty.Impossible;
  }
  for (let i = 0; i < counts.hard; i++) {
    difficulties[shuffled[cursor++]] = Difficulty.Hard;
  }
  for (let i = 0; i < counts.medium; i++) {
    difficulties[shuffled[cursor++]] = Difficulty.Medium;
  }
  return difficulties;
}
