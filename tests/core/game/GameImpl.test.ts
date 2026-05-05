import { AttackExecution } from "../../../src/core/execution/AttackExecution";
import { SpawnExecution } from "../../../src/core/execution/SpawnExecution";
//import { TransportShipExecution } from "../../../src/core/execution/TransportShipExecution";
import { AllianceRequestExecution } from "../../../src/core/execution/alliance/AllianceRequestExecution";
import { AllianceRequestReplyExecution } from "../../../src/core/execution/alliance/AllianceRequestReplyExecution";
import {
  ColoredTeams,
  Duos,
  Game,
  GameMode,
  Player,
  PlayerInfo,
  PlayerType,
  Quads,
  Trios,
} from "../../../src/core/game/Game";
import { TileRef } from "../../../src/core/game/GameMap";
import { setup } from "../../util/Setup";

let game: Game;
let attacker: Player;
let defender: Player;
let defenderSpawn: TileRef;
let attackerSpawn: TileRef;

describe("GameImpl", () => {
  beforeEach(async () => {
    game = await setup("ocean_and_land", {
      infiniteGold: true,
      instantBuild: true,
      infiniteTroops: true,
    });
    const attackerInfo = new PlayerInfo(
      "attacker dude",
      PlayerType.Human,
      null,
      "attacker_id",
    );
    game.addPlayer(attackerInfo);
    const defenderInfo = new PlayerInfo(
      "defender dude",
      PlayerType.Human,
      null,
      "defender_id",
    );
    game.addPlayer(defenderInfo);

    defenderSpawn = game.ref(0, 15);
    attackerSpawn = game.ref(0, 14);

    game.addExecution(
      new SpawnExecution(game.player(attackerInfo.id).info(), attackerSpawn),
      new SpawnExecution(game.player(defenderInfo.id).info(), defenderSpawn),
    );

    while (game.inSpawnPhase()) {
      game.executeNextTick();
    }

    attacker = game.player(attackerInfo.id);
    defender = game.player(defenderInfo.id);
  });

  test("Don't become traitor when betraying inactive player", async () => {
    jest.spyOn(attacker, "canSendAllianceRequest").mockReturnValue(true);
    game.addExecution(new AllianceRequestExecution(attacker, defender.id()));

    game.executeNextTick();
    game.executeNextTick();

    game.addExecution(
      new AllianceRequestReplyExecution(attacker.id(), defender, true),
    );

    game.executeNextTick();
    game.executeNextTick();

    expect(attacker.allianceWith(defender)).toBeTruthy();
    expect(defender.allianceWith(attacker)).toBeTruthy();

    //Defender is marked disconnected
    defender.markDisconnected(true);

    game.executeNextTick();
    game.executeNextTick();

    // STEP 1: First betray (manually break alliance)
    const alliance = attacker.allianceWith(defender);
    expect(alliance).toBeTruthy();
    attacker.breakAlliance(alliance!);

    // STEP 2: Then attack after betrayal
    game.addExecution(new AttackExecution(100, attacker, defender.id()));

    do {
      game.executeNextTick();
    } while (attacker.outgoingAttacks().length > 0);

    expect(attacker.isTraitor()).toBe(false);
    expect(attacker.allianceWith(defender)).toBeFalsy();
  });

  test("Do become traitor when betraying active player", async () => {
    jest.spyOn(attacker, "canSendAllianceRequest").mockReturnValue(true);
    game.addExecution(new AllianceRequestExecution(attacker, defender.id()));

    game.executeNextTick();
    game.executeNextTick();

    game.addExecution(
      new AllianceRequestReplyExecution(attacker.id(), defender, true),
    );

    game.executeNextTick();
    game.executeNextTick();

    expect(attacker.allianceWith(defender)).toBeTruthy();
    expect(defender.allianceWith(attacker)).toBeTruthy();

    //Defender is NOT marked disconnected

    game.executeNextTick();
    game.executeNextTick();

    // First betray (manually break alliance)
    const alliance = attacker.allianceWith(defender);
    expect(alliance).toBeTruthy();
    attacker.breakAlliance(alliance!);

    game.executeNextTick();

    game.addExecution(new AttackExecution(100, attacker, defender.id()));

    do {
      game.executeNextTick();
    } while (attacker.outgoingAttacks().length > 0);

    expect(attacker.isTraitor()).toBe(true);
    expect(attacker.allianceWith(defender)).toBeFalsy();
  });
});

describe("GameImpl team-size modes", () => {
  const aiPlayers = (count: number): PlayerInfo[] =>
    Array.from(
      { length: count },
      (_, index) =>
        new PlayerInfo(
          `AI ${index}`,
          PlayerType.AiPlayer,
          `ai${index}`,
          `ai-${index}`,
        ),
    );

  test.each([
    [
      Duos,
      10,
      [
        ColoredTeams.Bot,
        ColoredTeams.Red,
        ColoredTeams.Blue,
        ColoredTeams.Yellow,
        ColoredTeams.Green,
        ColoredTeams.Purple,
      ],
    ],
    [
      Trios,
      10,
      [
        ColoredTeams.Bot,
        ColoredTeams.Red,
        ColoredTeams.Blue,
        ColoredTeams.Yellow,
        ColoredTeams.Green,
      ],
    ],
    [
      Quads,
      10,
      [
        ColoredTeams.Bot,
        ColoredTeams.Red,
        ColoredTeams.Blue,
        ColoredTeams.Yellow,
      ],
    ],
  ])(
    "%s derives teams from AI-filled participant count",
    async (mode, participants, expectedTeams) => {
      const game = await setup(
        "plains",
        {
          gameMode: GameMode.Team,
          playerTeams: mode,
          disableNPCs: true,
        },
        aiPlayers(participants),
      );

      expect(game.teams()).toEqual(expectedTeams);
      expect(game.allPlayers()).toHaveLength(participants);
      expect(game.allPlayers().every((player) => player.team() !== null)).toBe(
        true,
      );
    },
  );

  test.each([
    [Duos, 1],
    [Trios, 2],
    [Quads, 3],
  ])("%s still rejects too few participants", async (mode, participants) => {
    await expect(
      setup(
        "plains",
        {
          gameMode: GameMode.Team,
          playerTeams: mode,
          disableNPCs: true,
        },
        aiPlayers(participants),
      ),
    ).rejects.toThrow("Too few teams: 1");
  });
});
