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
};

export default runDbTests ? integrationConfig : unitConfig;
