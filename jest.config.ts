// One Jest config, two modes. The default run (`npm test`) executes the unit suite
// and EXCLUDES the DB-backed integration tests. `npm run test:integration` sets
// RUN_DB_TESTS=1, which flips this config to run ONLY tests/integration/**.*.it.test.ts
// against a real Postgres (see TEST_DATABASE_URL in those tests). Kept as a single
// file (not a second root config) so it stays inside typescript-eslint's
// allowDefaultProject list rather than tripping the default-project file cap.

const runDbTests = process.env.RUN_DB_TESTS === "1";

const shared = {
  testEnvironment: "node",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  extensionsToTreatAsEsm: [".ts"],
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$":
      "<rootDir>/__mocks__/fileMock.js",
    "\\.(css|less)$": "<rootDir>/__mocks__/fileMock.js",
  },
  transform: {
    "^.+\\.tsx?$": [
      "@swc/jest",
      {
        jsc: {
          parser: {
            syntax: "typescript",
            decorators: true,
          },
          transform: {
            legacyDecorator: true,
            decoratorMetadata: false,
          },
        },
      },
    ],
    "^.+\\.mjs$": ["@swc/jest"],
    "^.+\\.js$": ["@swc/jest"],
  },
  transformIgnorePatterns: [
    "node_modules/(?!(nanoid|@jsep|fastpriorityqueue|@datastructures-js|lit|lit-html|lit-element|@lit|jose)/)",
  ],
  coverageReporters: ["text", "lcov", "html"],
};

const unitConfig = {
  ...shared,
  testRegex: "/tests/.*\\.(test|spec)?\\.(ts|tsx)$",
  // One worker (owner ruling 2026-10-08). The owner's Mac kernel-panicked twice
  // (WindowServer watchdog, 2026-10-06 and 2026-10-08), both during full
  // `npm test` runs. Cause unproven. With one worker jest runs all suites one
  // after another in its main process, the same as `--runInBand`.
  // History: task 0399 had capped it at 4 workers. With some apps in front
  // (seen with a game; not with Telegram/Safari), macOS appears to move the
  // whole Terminal process tree onto the efficiency cores (4 on the owner's
  // Mac), and jest's default (cores - 1) then starved the shell harnesses past
  // their 150 s deadline. Likely, not proven.
  // `npm test` also passes --detectOpenHandles (task 0427), which forces
  // in-band, so `npm test -- --maxWorkers=N` no longer changes anything there.
  // Several runs side by side are stopped by the project lock in
  // scripts/run-jest-with-project-lock.mjs, not by this setting.
  // Not a supertest-flake fix (0200) and not a SIGSEGV fix (0197).
  maxWorkers: 1,
  // Integration tests (real Postgres) run only via `npm run test:integration`;
  // keep them out of the default DB-less run.
  testPathIgnorePatterns: ["/node_modules/", "/tests/integration/"],
  collectCoverageFrom: ["src/**/*.ts", "!src/**/*.d.ts"],
  coverageThreshold: {
    global: {
      statements: 21,
      branches: 16,
      lines: 21.0,
      functions: 20.5,
    },
  },
};

const integrationConfig = {
  ...shared,
  testMatch: ["<rootDir>/tests/integration/**/*.it.test.ts"],
  testPathIgnorePatterns: ["/node_modules/"],
  // Single choke point: fails the run with an explicit message when
  // TEST_DATABASE_URL is unset, instead of letting every suite fail on
  // connection and look like a code regression.
  globalSetup: "<rootDir>/tests/integration/globalSetup.ts",
};

export default runDbTests ? integrationConfig : unitConfig;
