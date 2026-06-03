import { FetchGameMapLoader } from "../../../src/core/game/FetchGameMapLoader";
import { GameMapType } from "../../../src/core/game/Game";

// World -> key "World" -> filename "world"
const MAP = GameMapType.World;
const MANIFEST_URL = "/maps/world/manifest.json?v=test";
const MAP_BIN_URL = "/maps/world/map.bin?v=test";

type FakeResponse = Partial<Response> & { ok: boolean; status: number };

function jsonResponse(body: unknown): FakeResponse {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    json: async () => body,
  };
}

function binaryResponse(bytes: Uint8Array): FakeResponse {
  return {
    ok: true,
    status: 200,
    statusText: "OK",
    arrayBuffer: async () => bytes.buffer,
  };
}

function errorResponse(status: number, statusText: string): FakeResponse {
  return { ok: false, status, statusText };
}

// No-op sleep so retries don't wait on real timers.
const noSleep = () => Promise.resolve();

function makeLoader(): FetchGameMapLoader {
  return new FetchGameMapLoader("/maps", "test", noSleep);
}

let fetchMock: jest.Mock;

beforeEach(() => {
  fetchMock = jest.fn();
  global.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  jest.resetAllMocks();
});

describe("FetchGameMapLoader.fetchWithRetry", () => {
  it("loads a manifest on first success without retrying", async () => {
    const manifest = { name: "world" };
    fetchMock.mockResolvedValueOnce(jsonResponse(manifest));

    const result = await makeLoader().getMapData(MAP).manifest();

    expect(result).toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(MANIFEST_URL);
  });

  it("loads a binary asset and returns a Uint8Array", async () => {
    const bytes = new Uint8Array([1, 2, 3, 4]);
    fetchMock.mockResolvedValueOnce(binaryResponse(bytes));

    const result = await makeLoader().getMapData(MAP).mapBin();

    expect(result).toEqual(bytes);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(MAP_BIN_URL);
  });

  it("does not retry a 404 and reports the status code and URL", async () => {
    fetchMock.mockResolvedValue(errorResponse(404, "Not Found"));

    await expect(makeLoader().getMapData(MAP).manifest()).rejects.toThrow(
      `Failed to load ${MANIFEST_URL}: 404 Not Found`,
    );
    // 4xx is permanent — fail fast, no retry.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries a 503 then throws with the status code and URL", async () => {
    fetchMock.mockResolvedValue(errorResponse(503, "Service Unavailable"));

    await expect(makeLoader().getMapData(MAP).manifest()).rejects.toThrow(
      `Failed to load ${MANIFEST_URL}: 503 Service Unavailable`,
    );
    // initial attempt + 2 retries
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("retries a network abort then throws with the URL", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(makeLoader().getMapData(MAP).manifest()).rejects.toThrow(
      `Failed to fetch ${MANIFEST_URL}: Failed to fetch`,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("recovers when a transient failure succeeds on retry", async () => {
    const manifest = { name: "world" };
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(jsonResponse(manifest));

    const result = await makeLoader().getMapData(MAP).manifest();

    expect(result).toEqual(manifest);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
