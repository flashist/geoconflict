// Endpoint constants for the dedicated player-profile backend.
// Mirrors src/server/ServerEndpoints.ts. The profile API runs on its own VPS
// (api.geoconflict.ru), separate from the game servers, behind host nginx that
// terminates TLS and reverse-proxies to this port on 127.0.0.1.

export const DEFAULT_PROFILE_HTTP_PORT = 8080;

// Container/runtime port for the profile API. Overridable via PROFILE_PORT so the
// compose service, nginx proxy target, and the process all agree on one value.
export function profileHttpPort(): number {
  const raw = process.env.PROFILE_PORT?.trim();
  // Accept only a full decimal integer in the valid TCP port range; anything
  // else (decimals, numeric suffixes, out-of-range, non-numeric) falls back.
  // parseInt alone is too lenient: "3000abc" -> 3000 (wrong port) and "65536"
  // -> a value Node rejects at listen() with ERR_SOCKET_BAD_PORT (startup crash).
  if (raw && /^\d+$/.test(raw)) {
    const parsed = Number.parseInt(raw, 10);
    if (parsed >= 1 && parsed <= 65535) {
      return parsed;
    }
  }
  return DEFAULT_PROFILE_HTTP_PORT;
}
