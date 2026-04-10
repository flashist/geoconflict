# HF-11e — Stale Build Sessions: BUILD_NUMBER Automation

## Priority
Medium. No dependency on other HF-11 tasks — can ship any time after HF-11a confirms Hypothesis 4 (manual BUILD_NUMBER update) is a contributing factor. If HF-11a rules out Hypothesis 4, this task remains worth doing as a quality-of-life improvement to eliminate a class of human error permanently.

## Context

`BUILD_NUMBER` is currently updated manually before each deploy. This was flagged as a risk in the HF-7 brief — forgetting to update it causes two different code versions to report the same build number in GameAnalytics, corrupting build segmentation data. HF-11a will confirm whether this has already happened.

This task automates the injection so `BUILD_NUMBER` is always correct without any manual step.

## What to Build

Inject `BUILD_NUMBER` from the build pipeline rather than a manually maintained constant.

**Vite:**
```typescript
// vite.config.ts
import { defineConfig } from 'vite';

const buildNumber = process.env.BUILD_NUMBER
  ?? `${process.env.npm_package_version}-${Date.now()}`;

export default defineConfig({
  define: {
    __BUILD_NUMBER__: JSON.stringify(buildNumber)
  }
});
```

**In the deploy process**, set the `BUILD_NUMBER` environment variable before running the build:
```bash
export BUILD_NUMBER="0.0.119"
npm run build
```

Or derive it automatically from `package.json` version + a timestamp/commit SHA if a CI/CD pipeline is in place.

**Remove the manual constant** from wherever `BUILD_NUMBER` is currently defined in the codebase. Replace all references with `__BUILD_NUMBER__` (or whichever constant name the build tool injects).

**GameAnalytics custom dimension** (HF-7) must still be pre-registered in the GA dashboard before deploy — this cannot be automated without GA API access. Update the deploy checklist to note that `BUILD_NUMBER` no longer needs a manual code change, but the GA dashboard registration step remains.

## Verification

1. Run a build without setting `BUILD_NUMBER` env var — confirm the fallback (`package.json version + timestamp`) is used and appears correctly in GameAnalytics
2. Run a build with `BUILD_NUMBER` set — confirm the injected value appears in GameAnalytics
3. Confirm the old manual constant is removed from the codebase — no hardcoded build string remains
4. Confirm the deploy checklist is updated to remove the "update BUILD_NUMBER in code" step

## Notes

- The fallback (`package.json version + Date.now()`) ensures the build never silently uses a wrong value even if the env var is forgotten — every build gets a unique string
- If a CI/CD pipeline exists or is added in the future, `BUILD_NUMBER` can be derived from the git tag or commit SHA automatically, making the GA dashboard pre-registration the only remaining manual step
