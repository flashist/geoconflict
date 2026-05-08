jest.mock("jose", () => ({
  base64url: {
    decode: (value: string) => Buffer.from(value, "base64url"),
  },
}));

import { archiveFailureContext } from "../../src/server/Archive";

describe("archiveFailureContext", () => {
  test("includes status, safe URL, and a short response body excerpt", async () => {
    const response = new Response(
      "<!doctype html>\n<html><body>archive route not found</body></html>",
      {
        status: 404,
        statusText: "Not Found",
      },
    );

    await expect(
      archiveFailureContext(
        "https://api.example.test/game/abc123?api_key=secret",
        response,
      ),
    ).resolves.toBe(
      'status=404 Not Found url=https://api.example.test/game/abc123 body="<!doctype html> <html><body>archive route not found</body></html>"',
    );
  });

  test("truncates long response bodies", async () => {
    const response = new Response("x".repeat(400), { status: 500 });

    await expect(
      archiveFailureContext("https://api.example.test/game/abc123", response),
    ).resolves.toContain(`${"x".repeat(300)}...`);
  });
});
