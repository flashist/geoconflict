import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import {
  Cosmetics,
  CosmeticsSchema,
  PatternNameSchema,
} from "../core/CosmeticSchemas";

type RawPattern = Record<string, unknown>;

type RawCosmetics = {
  patterns?: Record<string, RawPattern>;
  [key: string]: unknown;
};

const moduleFilename = fileURLToPath(import.meta.url);
const moduleDirname = path.dirname(moduleFilename);
const DEFAULT_COSMETICS_PATH = path.join(
  moduleDirname,
  "../../resources/cosmetics/cosmetics.json",
);
let cachedConfig: { cosmeticsPath: string; data: Cosmetics } | null = null;

function normalizePatternName(name: unknown): string {
  if (typeof name === "string" && PatternNameSchema.safeParse(name).success) {
    return name;
  }

  const normalized = String(name ?? "pattern")
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);

  return normalized.length > 0 ? normalized : "pattern";
}

function normalizePattern(
  patternData: string,
  pattern: RawPattern,
): RawPattern {
  const name = normalizePatternName(pattern.name);
  return {
    ...pattern,
    name,
    pattern: pattern.pattern ?? patternData,
    product: pattern.product ?? null,
    affiliateCode: pattern.affiliateCode ?? null,
  };
}

export function normalizeCosmeticsData(raw: unknown): unknown {
  if (raw === null || typeof raw !== "object") {
    return raw;
  }

  const cosmetics = raw as RawCosmetics;
  const normalizedPatterns = Object.fromEntries(
    Object.entries(cosmetics.patterns ?? {}).map(([patternData, pattern]) => {
      const normalizedPattern = normalizePattern(patternData, pattern);
      return [normalizedPattern.name, normalizedPattern];
    }),
  );

  return {
    ...cosmetics,
    patterns: normalizedPatterns,
  };
}

export function loadCosmeticsConfig(
  cosmeticsPath: string = DEFAULT_COSMETICS_PATH,
): Cosmetics {
  if (cachedConfig?.cosmeticsPath === cosmeticsPath) {
    return cachedConfig.data;
  }

  const raw = JSON.parse(fs.readFileSync(cosmeticsPath, "utf8"));
  const result = CosmeticsSchema.safeParse(normalizeCosmeticsData(raw));

  if (!result.success) {
    throw new Error(`Invalid cosmetics config: ${result.error.message}`);
  }

  cachedConfig = { cosmeticsPath, data: result.data };
  return result.data;
}
