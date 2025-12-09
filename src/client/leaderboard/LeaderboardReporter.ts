import { PlayerType } from "../../core/game/Game";
import { PlayerView } from "../../core/game/GameView";
import { FlashistGameSettings } from "../flashist-game/FlashistGameSettings";
import { FlashistFacade } from "../flashist/FlashistFacade";

type ParticipationParams = {
  gameId: string;
  player: PlayerView;
};

type PlacementParams = {
  gameId: string;
  player: PlayerView;
  placement: number;
  points: number;
};

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

  let result: boolean = await FlashistFacade.instance.increaseCurPlayerLeaderboardScore(FlashistGameSettings.leaderboardPoints.participation);

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

  let result: boolean = await FlashistFacade.instance.increaseCurPlayerLeaderboardScore(params.points);

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
