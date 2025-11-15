#!/usr/bin/env node
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const rootDir = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + "\n", "utf8");
}

function bumpPatch(version) {
  const segments = version.split(".").map((segment) => parseInt(segment, 10));
  if (segments.some(Number.isNaN)) {
    throw new Error(`Invalid semver version: ${version}`);
  }
  segments[2] += 1;
  return segments.join(".");
}

const packageJson = readJson(packageJsonPath);
const nextVersion = bumpPatch(packageJson.version ?? "0.0.0");
packageJson.version = nextVersion;
writeJson(packageJsonPath, packageJson);

if (fs.existsSync(packageLockPath)) {
  const packageLock = readJson(packageLockPath);
  packageLock.version = nextVersion;
  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].version = nextVersion;
  }
  writeJson(packageLockPath, packageLock);
}

console.log(nextVersion);
