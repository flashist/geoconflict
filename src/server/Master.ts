import cluster from "cluster";
import express from "express";
import rateLimit from "express-rate-limit";
import fs from "fs";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { fetch, ProxyAgent } from "undici";
import { z } from "zod";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameID, GameInfo, ID } from "../core/Schemas";
import { generateID } from "../core/Util";
import { loadCosmeticsConfig } from "./CosmeticsConfig";
import { formatError, logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";
import { COSMETICS_JSON_PATH, MASTER_HTTP_PORT } from "./ServerEndpoints";
import { WorkerSupervisor } from "./WorkerSupervisor";

const config = getServerConfigFromServer();
const playlist = new MapPlaylist(false);

// Exported so tests can exercise the routes with supertest without calling
// startMaster() (which forks real workers). Not used elsewhere at runtime.
export const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

// Readiness gate + crash recovery policy (0056). Exported for tests, and as the seam
// 0192 reads (`readyIndices()`) to place games on live workers. Built here, driven
// from startMaster(); importing this module forks nothing.
export const workerSupervisor = new WorkerSupervisor({
  numWorkers: config.numWorkers(),
  fork: (index) => {
    const worker = cluster.fork({ WORKER_ID: index });
    // A spawn that fails with EAGAIN / EMFILE / ENFILE / EACCES / ENOENT does not throw
    // and never emits 'exit': Node reports it asynchronously as an 'error' event
    // (verified on v24.13.0). cluster's Worker forwards process 'error' to itself, and
    // with no listener that emit throws — the old handler at :565 would swallow it as an
    // opaque `uncaught exception` and the index would be lost. Listen on the Worker (not
    // worker.process: the forwarder runs first and its throw aborts later listeners) and
    // count it as a death of this index. The master sends nothing to workers, so a spawn
    // failure is the only source of this event.
    worker.once("error", (error: Error) => {
      workerSupervisor.handleExit({
        clusterId: worker.id,
        pid: worker.process.pid,
        code: null,
        signal: null,
        exitedAfterDisconnect: false,
        spawnError: error.message,
      });
    });
    return { clusterId: worker.id, pid: worker.process.pid };
  },
  setTimer: (fn, ms) => {
    setTimeout(fn, ms);
  },
  now: () => Date.now(),
  log,
  onSchedulingStart: startScheduling,
});

// Named moduleFilename/moduleDir, not __filename/__dirname: those identifiers already
// exist in the CommonJS scope that @swc/jest lowers this module into, and redeclaring
// them makes the file unimportable from a test. Same convention as CosmeticsConfig.ts.
const moduleFilename = fileURLToPath(import.meta.url);
const moduleDir = path.dirname(moduleFilename);

const buildVersion: string =
  JSON.parse(fs.readFileSync(path.join(moduleDir, "../../package.json"), "utf8"))
    .version ?? "0.0.0";

app.use(express.json());
app.use((req, res, next) => {
  if (req.path.endsWith(".map")) {
    res.status(404).end();
    return;
  }
  next();
});
app.use(
  express.static(path.join(moduleDir, "../../static"), {
    maxAge: "1y", // Set max-age to 1 year for all static assets
    setHeaders: (res, path) => {
      // You can conditionally set different cache times based on file types
      if (path.endsWith(".html")) {
        // Set HTML files to no-cache to ensure Express doesn't send 304s
        res.setHeader(
          "Cache-Control",
          "no-store, no-cache, must-revalidate, proxy-revalidate",
        );
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        // Prevent conditional requests
        res.setHeader("ETag", "");
      } else if (path.match(/\.(js|css|svg)$/)) {
        // JS, CSS, SVG get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      } else if (path.match(/\.(bin|dat|exe|dll|so|dylib)$/)) {
        // Binary files also get long cache with immutable
        res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      }
      // Other file types use the default maxAge setting
    },
  }),
);
app.use(express.json());

app.set("trust proxy", 3);
app.use(
  rateLimit({
    windowMs: 1000, // 1 second
    max: 20, // 20 requests per IP per second
  }),
);

// Must stay a valid document with the same top-level shape as the real assignment
// in fetchLobbies(), so a client that polls before the first fetch parses it on the
// same code path. An empty string here returns 200 with a zero-length body, which
// makes the client's response.json() throw (see the 2026-08-22 outage record).
let publicLobbiesJsonStr = JSON.stringify({ lobbies: [] });

// Exported for tests (seeding IDs). No runtime consumer outside this module.
export const publicLobbyIDs: Set<string> = new Set();
let lobbyPollInFlight = false;

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${config.numWorkers()} workers...`);

  cluster.on("message", (worker, message) => {
    if (message.type === "WORKER_READY") {
      workerSupervisor.markReady(message.workerId, worker.id);
    }
  });

  // Worker crashes: identity lookup, restart with cap + backoff, and the ready-set
  // bookkeeping all live in WorkerSupervisor. `worker.process.env` was never a thing.
  cluster.on("exit", (worker, code, signal) => {
    workerSupervisor.handleExit({
      clusterId: worker.id,
      pid: worker.process?.pid,
      code,
      signal,
      exitedAfterDisconnect: worker.exitedAfterDisconnect,
    });
  });

  workerSupervisor.start();

  const PORT = MASTER_HTTP_PORT;
  server.listen(PORT, () => {
    log.info(`Master HTTP server listening on port ${PORT}`);
  });
}

// Installed exactly once by the supervisor, at quorum or at the readiness deadline.
function startScheduling() {
  const scheduleLobbies = () => {
    schedulePublicGame(playlist).catch((error) => {
      log.error(`Error scheduling public game: ${formatError(error)}`);
    });
  };

  setInterval(() => void lobbyPollTick(scheduleLobbies), 100);
}

app.get("/api/env", async (req, res) => {
  const envConfig = {
    gameEnv: process.env.GAME_ENV,
    deploymentId: config.deploymentId(),
    publicHost: config.publicHost(),
    publicProtocol: config.publicProtocol(),
    publicPort: config.publicPort(),
    apiBaseUrl: config.apiBaseUrl(),
    // Resolved profile-backend URL for a later-sprint client UI; no in-T4
    // consumer by design. Only the resolved string is sent, never the raw env.
    profileApiUrl: config.profileApiUrl(),
    jwtIssuer: config.jwtIssuer(),
    jwtAudience: config.jwtAudience(),
  };
  if (!envConfig.gameEnv) return res.sendStatus(500);
  res.json(envConfig);
});

// Add lobbies endpoint to list public games for this worker
app.get("/api/public_lobbies", async (req, res) => {
  res.send(publicLobbiesJsonStr);
});

app.get("/api/version", (_req, res) => {
  res.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  res.json({ build: buildVersion });
});

const FEEDBACK_WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL ?? null;
const FEEDBACK_TELEGRAM_TOKEN = process.env.FEEDBACK_TELEGRAM_TOKEN ?? null;
const FEEDBACK_TELEGRAM_CHAT_ID = process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? null;
const TELEGRAM_PROXY_URL = process.env.TELEGRAM_PROXY_URL ?? null;
const telegramProxyAgent = TELEGRAM_PROXY_URL ? new ProxyAgent(TELEGRAM_PROXY_URL) : undefined;

const FeedbackSchema = z.object({
  category: z.enum(["Bug", "Suggestion", "Other"]),
  text: z.string().max(2000).optional(),
  platform: z.string().max(50),
  yandexStatus: z.string().max(50),
  version: z.string().max(100),
  matchId: z.string().max(100).optional(),
  screenSource: z.enum(["start", "battle", "staleBuild"]),
  username: z.string().max(100).optional(),
  deviceInfo: z.record(z.string(), z.union([z.string(), z.number()])).refine(r => Object.keys(r).length > 0, { message: "deviceInfo must not be empty" }).optional(),
  recentMatchIds: z.array(z.string().max(20)).max(3).optional(),
});

app.post(
  "/api/feedback",
  rateLimit({ windowMs: 60_000, max: 5 }),
  async (req, res) => {
    const parsed = FeedbackSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const d = parsed.data;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    const formatDeviceInfo = (info: Record<string, string | number>) =>
      Object.entries(info)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")
        .slice(0, 500);

    if (FEEDBACK_WEBHOOK_URL) {
      const body = JSON.stringify({
        embeds: [
          {
            title: `[${d.category}] Feedback`,
            description: d.text ? esc(d.text) : "_(no text)_",
            color:
              d.category === "Bug"
                ? 0xff4444
                : d.category === "Suggestion"
                  ? 0x4488ff
                  : 0x888888,
            fields: [
              { name: "Screen", value: d.screenSource, inline: true },
              { name: "Platform", value: d.platform, inline: true },
              { name: "Yandex", value: d.yandexStatus, inline: true },
              { name: "Username", value: d.username ? esc(d.username) : "n/a", inline: true },
              { name: "Version", value: d.version, inline: true },
              { name: "Match ID", value: d.matchId ?? "n/a", inline: true },
              { name: "Recent Matches", value: d.recentMatchIds?.map(esc).join(", ") ?? "n/a", inline: false },
              { name: "Time", value: new Date().toISOString(), inline: false },
              ...(d.deviceInfo
                ? [{ name: "Device Info", value: formatDeviceInfo(d.deviceInfo), inline: false }]
                : []),
            ],
          },
        ],
      });
      try {
        const webhookResp = await fetch(FEEDBACK_WEBHOOK_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body,
        });
        if (!webhookResp.ok) {
          log.warn(`[feedback] webhook responded with ${webhookResp.status}`);
        }
      } catch (err) {
        log.error(`[feedback] webhook delivery failed: ${formatError(err)}`);
      }
    }

    if (FEEDBACK_TELEGRAM_TOKEN && FEEDBACK_TELEGRAM_CHAT_ID) {
      const lines = [
        `<b>[${d.category}] Feedback</b>`,
        d.text ? `\n${esc(d.text)}` : "",
        `\n<b>Screen:</b> ${d.screenSource}  <b>Platform:</b> ${d.platform}`,
        `<b>Yandex:</b> ${d.yandexStatus}  <b>Username:</b> ${d.username ? esc(d.username) : "n/a"}`,
        `<b>Version:</b> ${esc(d.version)}`,
        `<b>Match:</b> ${d.matchId ? esc(d.matchId) : "n/a"}`,
        ...(d.recentMatchIds?.length ? [`<b>Recent matches:</b> ${d.recentMatchIds.map(esc).join(", ")}`] : []),
        `<b>Time:</b> ${new Date().toISOString()}`,
        ...(d.deviceInfo ? [`\n<b>Device:</b> ${esc(formatDeviceInfo(d.deviceInfo))}`] : []),
      ];
      const telegramBody = JSON.stringify({
        chat_id: FEEDBACK_TELEGRAM_CHAT_ID,
        text: lines.filter(Boolean).join("\n"),
        parse_mode: "HTML",
      });
      try {
        const telegramResp = await fetch(
          `https://api.telegram.org/bot${FEEDBACK_TELEGRAM_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: telegramBody,
            dispatcher: telegramProxyAgent,
          },
        );
        if (!telegramResp.ok) {
          log.warn(
            `[feedback] telegram responded with ${telegramResp.status}`,
          );
        }
      } catch (err) {
        log.error(`[feedback] telegram delivery failed: ${formatError(err)}`);
      }
    }

    if (!FEEDBACK_WEBHOOK_URL && !FEEDBACK_TELEGRAM_TOKEN) {
      log.info(`[feedback] ${JSON.stringify(d)}`);
    }

    res.json({ ok: true });
  },
);

const SubscribeSchema = z.object({
  email: z.string().email().max(200),
});

app.post(
  "/api/subscribe",
  rateLimit({ windowMs: 60_000, max: 3 }),
  async (req, res) => {
    const parsed = SubscribeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid payload" });
      return;
    }

    const { email } = parsed.data;
    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

    if (FEEDBACK_TELEGRAM_TOKEN && FEEDBACK_TELEGRAM_CHAT_ID) {
      const telegramBody = JSON.stringify({
        chat_id: FEEDBACK_TELEGRAM_CHAT_ID,
        text: [
          `<b>[Subscription] Email</b>`,
          `<b>Email:</b> ${esc(email)}`,
          `<b>Time:</b> ${new Date().toISOString()}`,
        ].join("\n"),
        parse_mode: "HTML",
      });
      try {
        const telegramResp = await fetch(
          `https://api.telegram.org/bot${FEEDBACK_TELEGRAM_TOKEN}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: telegramBody,
            dispatcher: telegramProxyAgent,
          },
        );
        if (!telegramResp.ok) {
          log.error(
            `[subscribe] telegram responded with ${telegramResp.status}`,
          );
          res.status(500).json({ error: "Delivery failed" });
          return;
        }
      } catch (err) {
        log.error(`[subscribe] telegram delivery failed: ${formatError(err)}`);
        res.status(500).json({ error: "Delivery failed" });
        return;
      }
    } else {
      log.info(`[subscribe] ${email}`);
    }

    res.json({ ok: true });
  },
);

app.post("/api/kick_player/:gameID/:clientID", async (req, res) => {
  if (req.headers[config.adminHeader()] !== config.adminToken()) {
    res.status(401).send("Unauthorized");
    return;
  }

  const { gameID, clientID } = req.params;

  if (!ID.safeParse(gameID).success || !ID.safeParse(clientID).success) {
    res.sendStatus(400);
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:${config.workerPort(gameID)}/api/kick_player/${gameID}/${clientID}`,
      {
        method: "POST",
        headers: {
          [config.adminHeader()]: config.adminToken(),
        },
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to kick player: ${response.statusText}`);
    }

    res.status(200).send("Player kicked successfully");
  } catch (error) {
    log.error(`Error kicking player from game ${gameID}: ${formatError(error)}`);
    res.status(500).send("Failed to kick player");
  }
});

// Exported for tests. One poll outstanding at a time: a tick that finds the
// previous poll still pending is a no-op. See 0057 findings §2.2.
export async function lobbyPollTick(onEmpty: () => void): Promise<void> {
  if (lobbyPollInFlight) return;
  lobbyPollInFlight = true;
  try {
    const lobbies = await fetchLobbies();
    if (lobbies === 0) onEmpty();
  } finally {
    lobbyPollInFlight = false;
  }
}

async function fetchLobbies(): Promise<number> {
  const fetchPromises: Promise<GameInfo | null>[] = [];

  for (const gameID of new Set(publicLobbyIDs)) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 5000); // 5 second timeout
    const port = config.workerPort(gameID);
    const promise = fetch(`http://localhost:${port}/api/game/${gameID}`, {
      headers: { [config.adminHeader()]: config.adminToken() },
      signal: controller.signal,
    })
      .then((resp) => resp.json())
      .then((json) => {
        return json as GameInfo;
      })
      .catch((error) => {
        log.error(`Error fetching game ${gameID}: ${formatError(error)}`);
        // Return null or a placeholder if fetch fails
        publicLobbyIDs.delete(gameID);
        return null;
      });

    fetchPromises.push(promise);
  }

  // Wait for all promises to resolve
  const results = await Promise.all(fetchPromises);

  // Filter out any null results from failed fetches
  const validResults = results.filter(
    (result): result is GameInfo => result !== null,
  );

  const lobbyInfos: GameInfo[] = validResults.map((gi: GameInfo) => {
    return {
      gameID: gi.gameID,
      numClients: gi.numClients ?? gi?.clients?.length ?? 0,
      aiPlayersCount: gi.aiPlayersCount ?? 0,
      gameConfig: gi.gameConfig,
      msUntilStart: (gi.msUntilStart ?? Date.now()) - Date.now(),
    } as GameInfo;
  });

  lobbyInfos.forEach((l, index) => {
    if (
      "msUntilStart" in l &&
      l.msUntilStart !== undefined &&
      l.msUntilStart <= 250
    ) {
      publicLobbyIDs.delete(l.gameID);
      return;
    }

    const humanClients = validResults[index]?.clients?.length ?? 0;
    if (
      "gameConfig" in l &&
      l.gameConfig !== undefined &&
      "maxPlayers" in l.gameConfig &&
      l.gameConfig.maxPlayers !== undefined &&
      l.gameConfig.maxPlayers <= humanClients
    ) {
      publicLobbyIDs.delete(l.gameID);
      return;
    }
  });

  // Update the JSON string
  publicLobbiesJsonStr = JSON.stringify({
    lobbies: lobbyInfos,
  });

  return publicLobbyIDs.size;
}

// 0192 / ADR-109: the worker index is a fixed placement contract (client, worker and
// nginx all derive it from the game ID), so to avoid a dead index we move the ID, not
// the index — the Worker.ts generateGameIdForWorker pattern, same cap.
export const PICK_GAME_ID_MAX_ATTEMPTS = 1000;
// Matches the lobby poll's 5 s abort in fetchLobbies(): that poll drops the new ID at
// ~5.1 s, so a create that succeeds later than that is an orphan by construction.
export const CREATE_GAME_TIMEOUT_MS = 5_000;

export interface GameIDPick {
  gameID: GameID;
  attempts: number;
  // false only when the cap was exhausted: gameID is then the last, unfiltered draw.
  onReadyIndex: boolean;
}

// Pure. Returns null without drawing when nothing is ready (nothing can be scheduled).
// With every index ready the first draw always hits, so the filter is a no-op there.
export function pickGameID(
  readyIndices: ReadonlySet<number>,
  workerIndexOf: (gameID: GameID) => number,
  draw: () => GameID = generateID,
  maxAttempts: number = PICK_GAME_ID_MAX_ATTEMPTS,
): GameIDPick | null {
  if (readyIndices.size === 0) return null;
  let gameID = draw();
  let attempts = 1;
  while (!readyIndices.has(workerIndexOf(gameID))) {
    if (attempts >= maxAttempts) {
      return { gameID, attempts, onReadyIndex: false };
    }
    gameID = draw();
    attempts++;
  }
  return { gameID, attempts, onReadyIndex: true };
}

// Injected so the scheduler is testable without forking workers; the live values
// read the supervisor's ready set (0056's seam) and the real ID generator.
export interface ScheduleDeps {
  readyIndices(): number[];
  draw(): GameID;
  maxAttempts?: number;
}
const liveScheduleDeps: ScheduleDeps = {
  readyIndices: () => workerSupervisor.readyIndices(),
  draw: generateID,
};
// Set while the ready set is empty: one error per empty episode, one info on resume.
let noReadyWorkersLogged = false;

// Function to schedule a new public game. Exported for tests.
export async function schedulePublicGame(
  playlist: MapPlaylist,
  deps: ScheduleDeps = liveScheduleDeps,
) {
  const readyList = deps.readyIndices();
  const numWorkers = config.numWorkers();
  const pick = pickGameID(
    new Set(readyList),
    (id) => config.workerIndex(id),
    deps.draw,
    deps.maxAttempts ?? PICK_GAME_ID_MAX_ATTEMPTS,
  );
  if (pick === null) {
    if (!noReadyWorkersLogged) {
      noReadyWorkersLogged = true;
      log.error(
        `No ready workers (0/${numWorkers}); skipping public game scheduling until a worker reports ready`,
        { readyCount: 0, numWorkers },
      );
    }
    return; // skip the tick; nothing added to publicLobbyIDs
  }
  if (noReadyWorkersLogged) {
    noReadyWorkersLogged = false;
    log.info(
      `Ready workers available again ([${readyList.join(", ")}]); public game scheduling resumed`,
      { readyWorkerIndices: readyList, readyCount: readyList.length, numWorkers },
    );
  }

  const gameID = pick.gameID;
  const workerPath = config.workerPath(gameID);
  if (!pick.onReadyIndex) {
    log.warn(
      `Public game ID draw hit no ready worker in ${pick.attempts} attempts (ready: [${readyList.join(", ")}]); scheduling ${gameID} unfiltered on worker ${workerPath}`,
      {
        attempts: pick.attempts,
        readyWorkerIndices: readyList,
        workerIndex: config.workerIndex(gameID),
        gameID,
      },
    );
  }
  publicLobbyIDs.add(gameID);

  // Bounded like the lobby poll (fetchLobbies): a wedged worker accepts the connection
  // and never answers, and undici's own default is ~300 s. Cleared on every exit so a
  // healthy create leaves no timer behind.
  const controller = new AbortController();
  const abortTimer = setTimeout(() => controller.abort(), CREATE_GAME_TIMEOUT_MS);

  // Send request to the worker to start the game
  try {
    const response = await fetch(
      `http://localhost:${config.workerPort(gameID)}/api/create_game/${gameID}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          [config.adminHeader()]: config.adminToken(),
        },
        body: JSON.stringify(playlist.gameConfig()),
        signal: controller.signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to schedule public game: ${response.statusText}`);
    }
  } catch (error) {
    // A create that failed is not a lobby: drop it here so the next tick reschedules
    // without a poll round-trip. fetchLobbies deleting the same ID later is a no-op.
    publicLobbyIDs.delete(gameID);
    // Message text is a grep target (0057 §6.3) — keep it byte-identical; the meta is
    // what Uptrace filters on.
    log.error(
      `Failed to schedule public game on worker ${workerPath}: ${formatError(error)}`,
      {
        gameID,
        workerIndex: config.workerIndex(gameID),
        workerPath,
        timeoutMs: CREATE_GAME_TIMEOUT_MS,
      },
    );
    throw error;
  } finally {
    clearTimeout(abortTimer);
  }
}

app.get("/api/game/:id/active", async (req, res) => {
  const gameID = req.params.id;

  if (!ID.safeParse(gameID).success) {
    return res.status(400).json({ active: false });
  }

  try {
    const response = await fetch(
      `http://localhost:${config.workerPort(gameID)}/api/game/${gameID}/active`,
    );
    if (!response.ok) {
      return res.json({ active: false });
    }
    res.json(await response.json());
  } catch {
    res.json({ active: false });
  }
});

app.get(COSMETICS_JSON_PATH, (_req, res) => {
  try {
    res
      .type("application/json")
      .set("Cache-Control", "public, max-age=300")
      .json(loadCosmeticsConfig());
  } catch (error) {
    log.error(`Failed to serve cosmetics config: ${formatError(error)}`);
    res.status(500).json({ error: "Invalid cosmetics config" });
  }
});

// SPA fallback route
app.get("*", function (req, res) {
  res.sendFile(path.join(moduleDir, "../../static/index.html"));
});

// Process-level error handlers
process.on("uncaughtException", (err) => {
  log.error(`uncaught exception: ${formatError(err)}`);
});

process.on("unhandledRejection", (reason) => {
  log.error(`unhandled rejection at: ${formatError(reason)}`);
});
