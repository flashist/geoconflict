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

// Parses versions of the form:
//   0.0.121
//   0.0.121-dev.3
//   0.0.121-staging.2
function bumpVersion(currentVersion, env) {
  const match = currentVersion.match(
    /^(\d+)\.(\d+)\.(\d+)(?:-(dev|staging)\.(\d+))?$/,
  );
  if (!match) {
    throw new Error(`Invalid version format: ${currentVersion}`);
  }

  const major = parseInt(match[1], 10);
  const minor = parseInt(match[2], 10);
  const patch = parseInt(match[3], 10);
  const preType = match[4]; // 'dev', 'staging', or undefined
  const preCounter = match[5] ? parseInt(match[5], 10) : 0;
  const base = `${major}.${minor}.${patch}`;

  if (env === "prod") {
    // Strip any pre-release suffix and bump the patch number.
    return `${major}.${minor}.${patch + 1}`;
  } else if (env === "dev" || env === "staging") {
    if (preType === env) {
      // Same pre-release type: increment the counter.
      return `${base}-${env}.${preCounter + 1}`;
    } else {
      // Switching type (e.g. dev → staging) or no pre-release yet: start at 1.
      return `${base}-${env}.1`;
    }
  } else {
    throw new Error(
      `Unknown environment: "${env}". Expected one of: dev, staging, prod.`,
    );
  }
}

const env = process.argv[2];
if (!env) {
  console.error(
    "Error: environment argument required.\nUsage: bump-version.js [dev|staging|prod]",
  );
  process.exit(1);
}

const packageJson = readJson(packageJsonPath);
const nextVersion = bumpVersion(packageJson.version ?? "0.0.0", env);
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
