// Schemas -> CosmeticSchemas uses `jose` at runtime (untransformed ESM under jest); mock it
// the same way Archive.test.ts does.
jest.mock("jose", () => ({
  base64url: { decode: jest.fn() },
}));

// Master.ts -> Logger.ts pulls in winston + the OpenTelemetry SDK. Stub it so the test
// stays isolated to the HTTP contract.
jest.mock("../../src/server/Logger", () => ({
  logger: {
    child: () => ({
      error: jest.fn(),
      info: jest.fn(),
      warn: jest.fn(),
    }),
  },
  formatError: (error: unknown) => String(error),
}));

import request from "supertest";
import { app } from "../../src/server/Master";

// Importing Master.ts registers its routes but starts nothing: startMaster() is never
// called here, so no worker is forked and the lobby-fetch interval that assigns
// publicLobbiesJsonStr never installs. That is precisely the 2026-08-22 outage state,
// reproduced deterministically — see
// ai-agents/knowledge-base/incidents/2026-08-22-prod-public-lobbies-empty-outage.md
describe("GET /api/public_lobbies before any lobby fetch has run", () => {
  it("responds 200 with a non-empty body", async () => {
    const response = await request(app).get("/api/public_lobbies");

    expect(response.status).toBe(200);
    expect(response.text.length).toBeGreaterThan(0);
  });

  // Regression guard for incident defect #5. Before the fix this body was "", and the
  // client's response.json() (src/client/PublicLobby.ts:138) threw on it.
  it("responds with a body that JSON.parse accepts", async () => {
    const response = await request(app).get("/api/public_lobbies");

    expect(() => JSON.parse(response.text)).not.toThrow();
  });

  // Pins the placeholder to { lobbies: [] }, which is the shape fetchLobbies() assigns
  // today (JSON.stringify({ lobbies: lobbyInfos })).
  // This does NOT detect drift in fetchLobbies() itself: the test never reads that
  // function, so changing the real top-level key would leave this green. Genuine parity
  // coverage needs fetchLobbies exported, which is out of 0055's scope — carried to 0056.
  it("responds with the same top-level shape as a real lobbies response", async () => {
    const response = await request(app).get("/api/public_lobbies");
    const body = JSON.parse(response.text);

    expect(Object.keys(body)).toEqual(["lobbies"]);
    expect(Array.isArray(body.lobbies)).toBe(true);
    expect(body.lobbies).toHaveLength(0);
  });
});
