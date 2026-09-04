import { GameType, PlayerType, Team } from "../../core/game/Game";
import { PlayerView } from "../../core/game/GameView";
import { Winner } from "../../core/Schemas";
import { FlashistGameSettings } from "../flashist-game/FlashistGameSettings";
import {
  FlashistFacade,
  flashist_logEventAnalytics,
  flashistConstants,
} from "../flashist/FlashistFacade";

type ParticipationParams = {
  gameId: string;
  player: PlayerView;
  gameType: GameType;
  isTutorial: boolean;
};

type PlacementParams = {
  gameId: string;
  player: PlayerView;
  placement: number;
  points: number;
  gameType: GameType;
  isTutorial: boolean;
  humanWon: boolean;
};

type LeaderboardAwardKind = "Participation" | "PlacementWon" | "PlacementLost";

/**
 * Did the local human's side take the match?
 *
 * ⚠️ Enumerate EVERY shape `GameImpl.makeWinner()` can emit, never just the
 * common one. It produces three tuples plus `undefined`:
 *
 * - `["player", clientID, ...]` — a client-backed winner.
 * - `["team", teamName, ...clientIDs]` — a team win. **Singleplayer Team mode
 *   is user-selectable** (`SinglePlayerModal` renders the Team card and passes
 *   `gameMode` straight through), so this shape reaches Solo, not only
 *   multiplayer. Reading only the `"player"` branch reported a solo team win as
 *   a loss, carrying the first-place point value.
 * - `["opponent", name]` — a clientless winner in non-tutorial Solo. Never a
 *   human win.
 * - `undefined` — a clientless winner everywhere else.
 *
 * The tuple branches mirror `WinModal.isSoloOpponentWin()`. Its extra
 * `isAlive()` / `!hasShownDeathModal` conditions are deliberately **not**
 * reused: they are the bias that makes `Match:Loss:OpponentWon` a lower bound,
 * and importing it here would import that bias into the measurement.
 */
export function humanWonPlacement(
  winner: Winner,
  clientID: string,
  team: Team | null,
): boolean {
  if (winner === undefined) {
    return false;
  }
  if (winner[0] === "player") {
    return winner[1] === clientID;
  }
  if (winner[0] === "team") {
    return team !== null && winner[1] === team;
  }
  return false;
}

/**
 * Task 0208 Part B. Measures how often Singleplayer awards platform
 * leaderboard points, at the site where the award actually happens.
 *
 * This counts ATTEMPTS, platform failures included: the caller emits after the
 * platform call has settled, whatever it returned and even if it rejected. The
 * value is the points the attempt carried, not points confirmed as banked.
 *
 * Multiplayer emits nothing — a leaked multiplayer row would pollute the
 * numbers task 0208 Part A produces. Tutorials are NOT dropped; they are
 * marked `SoloTutorial` so the split stays readable, because `Game:Mode:Solo`
 * covers solo, missions and tutorials together and cannot be split after the
 * fact.
 *
 * `Match:Leaderboard:Award` is 3 segments and GameAnalytics allows at most 5,
 * which is why won/lost is fused into the award-kind segment rather than
 * carried as a sixth dimension.
 */
function logLeaderboardAwardAnalytics(
  kind: LeaderboardAwardKind,
  points: number,
  gameType: GameType,
  isTutorial: boolean,
): void {
  if (gameType !== GameType.Singleplayer) {
    return;
  }
  const modeSegment = isTutorial ? "SoloTutorial" : "Solo";
  flashist_logEventAnalytics(
    `${flashistConstants.analyticEvents.MATCH_LEADERBOARD_AWARD}:${kind}:${modeSegment}`,
    points,
  );
}

/**
 * Placeholder: call your platform leaderboard API to award participation (e.g., +1 point).
 * Runs once per player when a game starts.
 */
export async function reportParticipation(
  params: ParticipationParams,
): Promise<void> {
  if (params.player.type() !== PlayerType.Human) {
    return;
  }

  const points = FlashistGameSettings.leaderboardPoints.participation;

  let result: boolean = false;
  try {
    result =
      await FlashistFacade.instance.increaseCurPlayerLeaderboardScore(points);
  } finally {
    // Task 0208 Part B: emitted whether the platform call returned true,
    // returned false, or rejected. A rejection IS a platform failure, and the
    // owner's ruling is that platform failures are counted.
    logLeaderboardAwardAnalytics(
      "Participation",
      points,
      params.gameType,
      params.isTutorial,
    );
  }

  // TODO: integrate platform leaderboard API (participation)
  console.debug(
    "[Leaderboard] reportParticipation",
    params.gameId,
    params.player.clientID(),
    "result: ", result
  );
}

/**
 * Placeholder: call your platform leaderboard API to award placement points (e.g., +10/+5/+2).
 * Runs once per player when the game ends.
 */
export async function reportPlacement(
  params: PlacementParams,
): Promise<void> {
  if (params.player.type() !== PlayerType.Human) return;

  let result: boolean = false;
  try {
    result = await FlashistFacade.instance.increaseCurPlayerLeaderboardScore(
      params.points,
    );
  } finally {
    // Task 0208 Part B — see reportParticipation for why this sits in finally.
    logLeaderboardAwardAnalytics(
      params.humanWon ? "PlacementWon" : "PlacementLost",
      params.points,
      params.gameType,
      params.isTutorial,
    );
  }

  // TODO: integrate platform leaderboard API (placement)
  console.debug(
    "[Leaderboard] reportPlacement",
    params.gameId,
    params.placement,
    params.points,
    params.player.clientID(),
    "result: ", result
  );
}
