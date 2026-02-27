import cluster from "cluster";
import express from "express";
import rateLimit from "express-rate-limit";
import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import { z } from "zod";
import { getServerConfigFromServer } from "../core/configuration/ConfigLoader";
import { GameInfo, ID } from "../core/Schemas";
import { generateID } from "../core/Util";
import { logger } from "./Logger";
import { MapPlaylist } from "./MapPlaylist";

const config = getServerConfigFromServer();
// Auto-created public games should be FFA-only.
const playlist = new MapPlaylist(true);
const readyWorkers = new Set();

const app = express();
const server = http.createServer(app);

const log = logger.child({ comp: "m" });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use(express.json());
app.use(
  express.static(path.join(__dirname, "../../static"), {
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

let publicLobbiesJsonStr = "";

const publicLobbyIDs: Set<string> = new Set();

// Start the master process
export async function startMaster() {
  if (!cluster.isPrimary) {
    throw new Error(
      "startMaster() should only be called in the primary process",
    );
  }

  log.info(`Primary ${process.pid} is running`);
  log.info(`Setting up ${config.numWorkers()} workers...`);

  // Fork workers
  for (let i = 0; i < config.numWorkers(); i++) {
    const worker = cluster.fork({
      WORKER_ID: i,
    });

    log.info(`Started worker ${i} (PID: ${worker.process.pid})`);
  }

  cluster.on("message", (worker, message) => {
    if (message.type === "WORKER_READY") {
      const workerId = message.workerId;
      readyWorkers.add(workerId);
      log.info(
        `Worker ${workerId} is ready. (${readyWorkers.size}/${config.numWorkers()} ready)`,
      );
      // Start scheduling when all workers are ready
      if (readyWorkers.size === config.numWorkers()) {
        log.info("All workers ready, starting game scheduling");

        const scheduleLobbies = () => {
          schedulePublicGame(playlist).catch((error) => {
            log.error("Error scheduling public game:", error);
          });
        };

        setInterval(
          () =>
            fetchLobbies().then((lobbies) => {
              if (lobbies === 0) {
                scheduleLobbies();
              }
            }),
          100,
        );
      }
    }
  });

  // Handle worker crashes
  cluster.on("exit", (worker, code, signal) => {
    const workerId = (worker as any).process?.env?.WORKER_ID;
    if (!workerId) {
      log.error(`worker crashed could not find id`);
      return;
    }

    log.warn(
      `Worker ${workerId} (PID: ${worker.process.pid}) died with code: ${code} and signal: ${signal}`,
    );
    log.info(`Restarting worker ${workerId}...`);

    // Restart the worker with the same ID
    const newWorker = cluster.fork({
      WORKER_ID: workerId,
    });

    log.info(
      `Restarted worker ${workerId} (New PID: ${newWorker.process.pid})`,
    );
  });

  const PORT = 3000;
  server.listen(PORT, () => {
    log.info(`Master HTTP server listening on port ${PORT}`);
  });
}

app.get("/api/env", async (req, res) => {
  const envConfig = {
    gameEnv: process.env.GAME_ENV,
    deploymentId: config.deploymentId(),
    publicHost: config.publicHost(),
    publicProtocol: config.publicProtocol(),
    publicPort: config.publicPort(),
    apiBaseUrl: config.apiBaseUrl(),
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

const FEEDBACK_WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL ?? null;
const FEEDBACK_TELEGRAM_TOKEN = process.env.FEEDBACK_TELEGRAM_TOKEN ?? null;
const FEEDBACK_TELEGRAM_CHAT_ID = process.env.FEEDBACK_TELEGRAM_CHAT_ID ?? null;

const FeedbackSchema = z.object({
  category: z.enum(["Bug", "Suggestion", "Other"]),
  text: z.string().max(2000).optional(),
  contact: z.string().max(200).optional(),
  platform: z.string().max(50),
  yandexStatus: z.string().max(50),
  version: z.string().max(100),
  matchId: z.string().max(100).optional(),
  screenSource: z.enum(["start", "battle"]),
  username: z.string().max(100).optional(),
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
              { name: "Contact", value: d.contact ? esc(d.contact) : "n/a", inline: true },
              { name: "Time", value: new Date().toISOString(), inline: false },
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
        log.error("[feedback] webhook delivery failed:", err);
      }
    }

    if (FEEDBACK_TELEGRAM_TOKEN && FEEDBACK_TELEGRAM_CHAT_ID) {
      const lines = [
        `<b>[${d.category}] Feedback</b>`,
        d.text ? `\n${esc(d.text)}` : "",
        `\n<b>Screen:</b> ${d.screenSource}  <b>Platform:</b> ${d.platform}`,
        `<b>Yandex:</b> ${d.yandexStatus}  <b>Username:</b> ${d.username ? esc(d.username) : "n/a"}`,
        `<b>Version:</b> ${esc(d.version)}`,
        `<b>Match:</b> ${d.matchId ? esc(d.matchId) : "n/a"}  <b>Contact:</b> ${d.contact ? esc(d.contact) : "n/a"}`,
        `<b>Time:</b> ${new Date().toISOString()}`,
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
          },
        );
        if (!telegramResp.ok) {
          log.warn(
            `[feedback] telegram responded with ${telegramResp.status}`,
          );
        }
      } catch (err) {
        log.error("[feedback] telegram delivery failed:", err);
      }
    }

    if (!FEEDBACK_WEBHOOK_URL && !FEEDBACK_TELEGRAM_TOKEN) {
      log.info(`[feedback] ${JSON.stringify(d)}`);
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
    log.error(`Error kicking player from game ${gameID}:`, error);
    res.status(500).send("Failed to kick player");
  }
});

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
        log.error(`Error fetching game ${gameID}:`, error);
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

// Function to schedule a new public game
async function schedulePublicGame(playlist: MapPlaylist) {
  const gameID = generateID();
  publicLobbyIDs.add(gameID);

  const workerPath = config.workerPath(gameID);

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
      },
    );

    if (!response.ok) {
      throw new Error(`Failed to schedule public game: ${response.statusText}`);
    }
  } catch (error) {
    log.error(`Failed to schedule public game on worker ${workerPath}:`, error);
    throw error;
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

// SPA fallback route
app.get("*", function (req, res) {
  res.sendFile(path.join(__dirname, "../../static/index.html"));
});
