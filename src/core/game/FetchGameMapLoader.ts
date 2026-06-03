import { GameMapType } from "./Game";
import { GameMapLoader, MapData } from "./GameMapLoader";

// Number of extra attempts (on top of the first) for transient failures, plus
// the backoff before each retry. Kept short so a momentary network blip or a
// backend hiccup self-heals without a visible stall.
const RETRY_BACKOFFS_MS = [300, 600];

export class FetchGameMapLoader implements GameMapLoader {
  private maps: Map<GameMapType, MapData>;

  public constructor(
    private readonly prefix: string,
    private readonly cacheBuster?: string,
    // Injectable so tests can run retries without real timers.
    private readonly sleep: (ms: number) => Promise<void> = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms)),
  ) {
    this.maps = new Map<GameMapType, MapData>();
  }

  public getMapData(map: GameMapType): MapData {
    const cachedMap = this.maps.get(map);
    if (cachedMap) {
      return cachedMap;
    }

    const key = Object.keys(GameMapType).find(
      (k) => GameMapType[k as keyof typeof GameMapType] === map,
    );
    const fileName = key?.toLowerCase();

    if (!fileName) {
      throw new Error(`Unknown map: ${map}`);
    }

    const mapData = {
      mapBin: () => this.loadBinaryFromUrl(this.url(fileName, "map.bin")),
      map4xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map4x.bin")),
      map16xBin: () => this.loadBinaryFromUrl(this.url(fileName, "map16x.bin")),
      manifest: () => this.loadJsonFromUrl(this.url(fileName, "manifest.json")),
      webpPath: async () => this.url(fileName, "thumbnail.webp"),
    } satisfies MapData;

    this.maps.set(map, mapData);
    return mapData;
  }

  private url(map: string, path: string) {
    let url = `${this.prefix}/${map}/${path}`;

    if (this.cacheBuster) {
      url += `${url.includes("?") ? "&" : "?"}v=${this.cacheBuster}`;
    }

    return url;
  }

  private async loadBinaryFromUrl(url: string) {
    const response = await this.fetchWithRetry(url);
    const data = await response.arrayBuffer();
    return new Uint8Array(data);
  }

  private async loadJsonFromUrl(url: string) {
    const response = await this.fetchWithRetry(url);
    return response.json();
  }

  // Single fetch chokepoint for all map assets (manifest + bins). Retries
  // transient failures and produces error messages that name the URL and HTTP
  // status, so telemetry can distinguish a network abort from a 404 vs a 503.
  private async fetchWithRetry(url: string): Promise<Response> {
    for (let attempt = 0; ; attempt++) {
      let response: Response;
      try {
        response = await fetch(url);
      } catch (error) {
        // fetch() rejects on network-level failure (offline, CORS, connection
        // reset) with no status. These are usually transient — retry a few
        // times, then surface the URL (a bare "Failed to fetch" is unactionable).
        if (attempt < RETRY_BACKOFFS_MS.length) {
          await this.sleep(RETRY_BACKOFFS_MS[attempt]);
          continue;
        }
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Failed to fetch ${url}: ${reason}`);
      }

      if (response.ok) {
        return response;
      }

      // 5xx is a transient server/proxy problem worth retrying; 4xx (e.g. a
      // genuinely missing 404) is permanent, so fail fast.
      if (response.status >= 500 && attempt < RETRY_BACKOFFS_MS.length) {
        await this.sleep(RETRY_BACKOFFS_MS[attempt]);
        continue;
      }

      throw new Error(
        `Failed to load ${url}: ${response.status} ${response.statusText}`,
      );
    }
  }
}
