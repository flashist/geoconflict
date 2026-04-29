import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const rootDir = path.resolve(path.dirname(__filename), "..");
const gameTsPath = path.join(rootDir, "src/core/game/Game.ts");
const outputPath = path.join(rootDir, "src/core/game/MapNationCounts.json");

const gameSource = fs.readFileSync(gameTsPath, "utf8");
const enumMatch = gameSource.match(/export enum GameMapType \{([\s\S]*?)\n\}/);

if (!enumMatch) {
  throw new Error("Could not find GameMapType enum in src/core/game/Game.ts");
}

const counts = {};

for (const line of enumMatch[1].split("\n")) {
  const match = line.match(/\s*(\w+)\s*=\s*"([^"]+)"/);
  if (!match) continue;

  const [, enumKey, mapId] = match;
  const manifestPath = path.join(
    rootDir,
    "resources/maps",
    enumKey.toLowerCase(),
    "manifest.json",
  );
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  counts[mapId] = Array.isArray(manifest.nations) ? manifest.nations.length : 0;
}

const output = `${JSON.stringify(counts, null, 2)}\n`;
fs.writeFileSync(outputPath, output);
