import { AiPlayersConfig } from "../configuration/Config";
import { PseudoRandom } from "../PseudoRandom";
import { simpleHash } from "../Util";

export function clampInt(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function computeTargetTotal(
  capacity: number,
  tPassedSec: number,
  timeoutSec: number,
  targetTotalByTimeout: number,
): number {
  if (capacity <= 0 || timeoutSec <= 0) return 0;
  const coef = clampInt(tPassedSec / timeoutSec, 0, 1);
  return Math.floor(Math.min(capacity, targetTotalByTimeout) * coef);
}

export function computeMaxAiAllowed(
  capacity: number,
  minHumanSlots: number,
  humans: number,
  aiPlayersMax: number,
): number {
  const reserved = Math.max(0, minHumanSlots - humans);
  return clampInt(capacity - reserved, 0, aiPlayersMax);
}

export function computeDesiredAi(
  humans: number,
  targetTotal: number,
  maxAiAllowedNow: number,
): number {
  const requiredTotal = Math.max(humans, targetTotal);
  return clampInt(requiredTotal - humans, 0, maxAiAllowedNow);
}

export function aiNameWidth(config: AiPlayersConfig): number {
  const maxValue = config.name.start + config.name.reserve - 1;
  return Math.max(4, String(Math.max(0, maxValue)).length);
}

export function formatAiName(
  index: number,
  config: AiPlayersConfig,
): string {
  const raw = config.name.start + index;
  const width = aiNameWidth(config);
  return `${config.name.prefix}${String(raw).padStart(width, "0")}`;
}

export function allocateAiNames(
  count: number,
  existingNames: Iterable<string>,
  startIndex: number,
  config: AiPlayersConfig,
): { names: string[]; nextIndex: number } {
  const existing = new Set(existingNames);
  const names: string[] = [];
  let index = startIndex;
  while (names.length < count && index < config.name.reserve) {
    const name = formatAiName(index, config);
    index += 1;
    if (existing.has(name)) {
      continue;
    }
    existing.add(name);
    names.push(name);
  }
  return { names, nextIndex: index };
}

export function shuffledAiNameIndices(
  seed: string,
  config: AiPlayersConfig,
): number[] {
  const rand = new PseudoRandom(simpleHash(seed));
  const indices = Array.from({ length: config.name.reserve }, (_, i) => i);
  return rand.shuffleArray(indices);
}

export function allocateAiNamesFromOrder(
  count: number,
  existingNames: Iterable<string>,
  nameOrder: number[],
  startIndex: number,
  config: AiPlayersConfig,
): { names: string[]; nextIndex: number } {
  const existing = new Set(existingNames);
  const names: string[] = [];
  let index = startIndex;
  while (names.length < count && index < nameOrder.length) {
    const nameIndex = nameOrder[index];
    index += 1;
    const name = formatAiName(nameIndex, config);
    if (existing.has(name)) {
      continue;
    }
    existing.add(name);
    names.push(name);
  }
  return { names, nextIndex: index };
}

export function deterministicShuffleIndices(
  seed: string,
  count: number,
): number[] {
  const rand = new PseudoRandom(simpleHash(seed));
  const indices = Array.from({ length: count }, (_, i) => i);
  return rand.shuffleArray(indices);
}

export function aiJoinDelayMs(
  seed: string,
  joinIndex: number,
  config: AiPlayersConfig,
): number {
  const rand = new PseudoRandom(simpleHash(seed) + joinIndex);
  const min = Math.max(0, config.joinJitterMs.min);
  const max = Math.max(min, config.joinJitterMs.max);
  return rand.nextInt(min, max + 1);
}

export function deterministicAiClientId(
  seed: string,
  joinIndex: number,
): string {
  const rand = new PseudoRandom(simpleHash(seed) + joinIndex + 1000);
  return rand.nextID();
}

export function isAiPlayerName(name: string): boolean {
  return /^Anon0\d{3}$/.test(name);
}
