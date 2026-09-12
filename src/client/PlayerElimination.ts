import { GameView, PlayerView } from "../core/game/GameView";

/**
 * Task 0211. The one definition of "the local player's match is over because they
 * were eliminated".
 *
 * It was copied in three places before this existed — WinModal's analytics latch,
 * WinModal's death-modal latch, and (new) ClientGameRunner's XP participation
 * report. Two of those decide whether a player is PAID, so a silent drift between
 * copies would be a low-probability, high-cost bug. One definition costs nothing.
 *
 * The spawn-phase clause is load-bearing: every player is "not alive" before they
 * spawn, so without it the predicate is true for everyone at tick 0.
 */
export function isEliminated(
  game: GameView,
  player: PlayerView | null,
): boolean {
  return (
    player !== null &&
    !player.isAlive() &&
    !game.inSpawnPhase() &&
    player.hasSpawned()
  );
}
