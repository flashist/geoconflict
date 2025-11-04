import { decodeJwt } from "jose";
import { z } from "zod";
import {
  PlayerProfile,
  PlayerProfileSchema,
  RefreshResponseSchema,
  TokenPayload,
  TokenPayloadSchema,
  UserMeResponse,
  UserMeResponseSchema,
} from "../core/ApiSchemas";
import { getServerConfigFromClient } from "../core/configuration/ConfigLoader";
import { getRuntimeConfig } from "../core/configuration/RuntimeConfig";

const ipv4Regex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;

function isIpAddress(hostname: string): boolean {
  if (!hostname) return false;
  return ipv4Regex.test(hostname) || hostname.includes(":");
}

function stripProtocol(value: string | undefined): string {
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) {
    try {
      return new URL(value).host;
    } catch {
      return value;
    }
  }
  return value;
}

function normalizeProtocol(protocol: string | undefined): string {
  if (!protocol || protocol.length === 0) {
    return "http";
  }
  return protocol.replace(/:$/, "").toLowerCase();
}

function buildUrl(protocol: string, host: string, port?: string): string {
  const normalizedProtocol = normalizeProtocol(protocol);
  const defaultPort = normalizedProtocol === "https" ? "443" : "80";
  const trimmedHost = host.replace(/\/$/, "");
  const portSegment = port && port.length > 0 && port !== defaultPort ? `:${port}` : "";
  return `${normalizedProtocol}://${trimmedHost}${portSegment}`;
}

function ensureAbsoluteUrl(value: string | undefined, fallbackProtocol: string): string | undefined {
  if (!value || value.length === 0) {
    return undefined;
  }
  if (/^https?:\/\//i.test(value)) {
    return value;
  }
  return `${normalizeProtocol(fallbackProtocol)}://${value}`;
}


function getAudience() {
  const runtime = getRuntimeConfig();
  const runtimeAudience = stripProtocol(runtime.jwtAudience);
  if (runtimeAudience) {
    return runtimeAudience;
  }
  const runtimeHost = stripProtocol(runtime.publicHost);
  if (runtimeHost) {
    return runtimeHost;
  }

  const hostname = window.location.hostname;
  if (!hostname || hostname.length === 0) {
    return "localhost";
  }
  if (hostname === "localhost") {
    return "localhost";
  }
  if (isIpAddress(hostname)) {
    return hostname;
  }
  const parts = hostname.split(".");
  if (parts.length >= 2) {
    return `${parts[parts.length - 2]}.${parts[parts.length - 1]}`;
  }
  return hostname;
}

export function getApiBase() {
  const runtime = getRuntimeConfig();
  const preferredProtocol = normalizeProtocol(runtime.publicProtocol ?? window.location.protocol);

  const runtimeUrl =
    ensureAbsoluteUrl(runtime.apiBaseUrl, preferredProtocol) ??
    ensureAbsoluteUrl(runtime.jwtIssuer, preferredProtocol);

  if (runtimeUrl) {
    return runtimeUrl;
  }

  const { hostname, port, protocol: locationProtocol } = window.location;
  const normalizedLocationProtocol = normalizeProtocol(locationProtocol);

  if (hostname === "localhost") {
    const apiDomain = process?.env?.API_DOMAIN;
    if (apiDomain) {
      const absolute = ensureAbsoluteUrl(apiDomain, "https");
      if (absolute) {
        return absolute;
      }
    }
    return localStorage.getItem("apiHost") ?? "http://localhost:8787";
  }

  if (isIpAddress(hostname)) {
    return buildUrl(preferredProtocol, hostname, port);
  }

  const domainname = getAudience();
  if (domainname && domainname !== hostname && domainname !== "localhost") {
    return `https://api.${domainname}`;
  }

  return buildUrl(preferredProtocol || normalizedLocationProtocol, hostname, port);
}

function getToken(): string | null {
  // Check window hash
  const { hash } = window.location;
  if (hash.startsWith("#")) {
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      params.delete("token");
      params.toString();
    }
    // Clean the URL
    history.replaceState(
      null,
      "",
      window.location.pathname +
        window.location.search +
        (params.size > 0 ? "#" + params.toString() : ""),
    );
  }

  // Check cookie
  const cookie = document.cookie
    .split(";")
    .find((c) => c.trim().startsWith("token="))
    ?.trim()
    .substring(6);
  if (cookie !== undefined) {
    return cookie;
  }

  // Check local storage
  return localStorage.getItem("token");
}

async function clearToken() {
  localStorage.removeItem("token");
  __isLoggedIn = false;
  const config = await getServerConfigFromClient();
  const audience = stripProtocol(config.jwtAudience());
  const isSecure = window.location.protocol === "https:";
  const cookieParts = ["token=logged_out", "Path=/", "Max-Age=0", "SameSite=Lax"];
  if (audience && audience.length > 0 && !isIpAddress(audience) && audience !== "localhost") {
    cookieParts.push(`Domain=${audience}`);
  }
  if (isSecure) {
    cookieParts.push("Secure");
  }
  document.cookie = cookieParts.join("; ");
}

export function discordLogin() {
  window.location.href = `${getApiBase()}/login/discord?redirect_uri=${window.location.href}`;
}

export async function tokenLogin(token: string): Promise<string | null> {
  const response = await fetch(
    `${getApiBase()}/login/token?login-token=${token}`,
  );
  if (response.status !== 200) {
    console.error("Token login failed", response);
    return null;
  }
  const json = await response.json();
  const { jwt, email } = json;
  const payload = decodeJwt(jwt);
  const result = TokenPayloadSchema.safeParse(payload);
  if (!result.success) {
    console.error("Invalid token", result.error, result.error.message);
    return null;
  }
  clearToken();
  localStorage.setItem("token", jwt);
  return email;
}

export function getAuthHeader(): string {
  const token = getToken();
  if (!token) return "";
  return `Bearer ${token}`;
}

export async function logOut(allSessions: boolean = false) {
  const token = getToken();
  if (token === null) return;
  clearToken();

  const response = await fetch(
    getApiBase() + (allSessions ? "/revoke" : "/logout"),
    {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
  );

  if (response.ok === false) {
    console.error("Logout failed", response);
    return false;
  }
  return true;
}

export type IsLoggedInResponse =
  | { token: string; claims: TokenPayload }
  | false;
let __isLoggedIn: IsLoggedInResponse | undefined = undefined;
export function isLoggedIn(): IsLoggedInResponse {
  __isLoggedIn ??= _isLoggedIn();

  return __isLoggedIn;
}
function _isLoggedIn(): IsLoggedInResponse {
  try {
    const token = getToken();
    if (!token) {
      // console.log("No token found");
      return false;
    }

    // Verify the JWT (requires browser support)
    // const jwks = createRemoteJWKSet(
    //   new URL(getApiBase() + "/.well-known/jwks.json"),
    // );
    // const { payload, protectedHeader } = await jwtVerify(token, jwks, {
    //   issuer: getApiBase(),
    //   audience: getAudience(),
    // });

    // Decode the JWT
    const payload = decodeJwt(token);
    const { iss, aud, exp, iat } = payload;

    const expectedIssuer = getApiBase().replace(/\/$/, "");
    const tokenIssuer = typeof iss === "string" ? iss.replace(/\/$/, "") : "";
    if (tokenIssuer !== expectedIssuer) {
      // JWT was not issued by the correct server
      console.error(
        'unexpected "iss" claim value',
      );
      logOut();
      return false;
    }
    const myAud = getAudience();
    const audValues = Array.isArray(aud) ? aud : aud ? [aud] : [];
    const normalizedAudiences = audValues.map((value) => stripProtocol(String(value)));
    if (
      myAud !== "localhost" &&
      !normalizedAudiences.includes(myAud)
    ) {
      // JWT was not issued for this website
      console.error(
        'unexpected "aud" claim value',
      );
      logOut();
      return false;
    }
    const now = Math.floor(Date.now() / 1000);
    if (exp !== undefined && now >= exp) {
      // JWT expired
      console.error(
        'after "exp" claim value',
        // JSON.stringify(payload, null, 2),
      );
      logOut();
      return false;
    }
    const refreshAge: number = 3 * 24 * 3600; // 3 days
    if (iat !== undefined && now >= iat + refreshAge) {
      console.log("Refreshing access token...");
      postRefresh().then((success) => {
        if (success) {
          console.log("Refreshed access token successfully.");
        } else {
          console.error("Failed to refresh access token.");
          // TODO: Update the UI to show logged out state
        }
      });
    }

    const result = TokenPayloadSchema.safeParse(payload);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      // Invalid response
      console.error("Invalid payload", error);
      return false;
    }

    const claims = result.data;
    return { token, claims };
  } catch (e) {
    console.log(e);
    return false;
  }
}

export async function postRefresh(): Promise<boolean> {
  try {
    const token = getToken();
    if (!token) return false;

    // Refresh the JWT
    const response = await fetch(getApiBase() + "/refresh", {
      method: "POST",
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401) {
      clearToken();
      return false;
    }
    if (response.status !== 200) return false;
    const body = await response.json();
    const result = RefreshResponseSchema.safeParse(body);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid response", error);
      return false;
    }
    localStorage.setItem("token", result.data.token);
    return true;
  } catch (e) {
    __isLoggedIn = false;
    return false;
  }
}

export async function getUserMe(): Promise<UserMeResponse | false> {
  try {
    const token = getToken();
    if (!token) return false;

    // Get the user object
    const response = await fetch(getApiBase() + "/users/@me", {
      headers: {
        authorization: `Bearer ${token}`,
      },
    });
    if (response.status === 401) {
      clearToken();
      return false;
    }
    if (response.status !== 200) return false;
    const body = await response.json();
    const result = UserMeResponseSchema.safeParse(body);
    if (!result.success) {
      const error = z.prettifyError(result.error);
      console.error("Invalid response", error);
      return false;
    }
    return result.data;
  } catch (e) {
    __isLoggedIn = false;
    return false;
  }
}

export async function fetchPlayerById(
  playerId: string,
): Promise<PlayerProfile | false> {
  try {
    const base = getApiBase();
    const token = getToken();
    if (!token) return false;
    const url = `${base}/player/${encodeURIComponent(playerId)}`;

    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (res.status !== 200) {
      console.warn(
        "fetchPlayerById: unexpected status",
        res.status,
        res.statusText,
      );
      return false;
    }

    const json = await res.json();
    const parsed = PlayerProfileSchema.safeParse(json);
    if (!parsed.success) {
      console.warn("fetchPlayerById: Zod validation failed", parsed.error);
      return false;
    }

    return parsed.data;
  } catch (err) {
    console.warn("fetchPlayerById: request failed", err);
    return false;
  }
}
