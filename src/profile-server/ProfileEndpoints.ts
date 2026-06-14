// Endpoint constants for the dedicated player-profile backend.
// Mirrors src/server/ServerEndpoints.ts. The profile API runs on its own VPS
// (api.geoconflict.ru), separate from the game servers, behind host nginx that
// terminates TLS and reverse-proxies to this port on 127.0.0.1.

export const DEFAULT_PROFILE_HTTP_PORT = 8080;

// Container/runtime port for the profile API. Overridable via PROFILE_PORT so the
// compose service, nginx proxy target, and the process all agree on one value.
export function profileHttpPort(): number {
  const raw = process.env.PROFILE_PORT;
  if (raw && raw.trim().length > 0) {
    const parsed = Number.parseInt(raw.trim(), 10);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }
  return DEFAULT_PROFILE_HTTP_PORT;
}
