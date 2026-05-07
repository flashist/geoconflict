export const MASTER_HTTP_PORT = 3000;
export const COSMETICS_JSON_PATH = "/cosmetics.json";

export function masterInternalOrigin(): string {
  return (
    process.env.MASTER_INTERNAL_ORIGIN?.replace(/\/+$/, "") ??
    `http://127.0.0.1:${MASTER_HTTP_PORT}`
  );
}

export function localMasterUrl(path: string): string {
  return `${masterInternalOrigin()}${path}`;
}

export function localCosmeticsJsonUrl(): string {
  return localMasterUrl(COSMETICS_JSON_PATH);
}
