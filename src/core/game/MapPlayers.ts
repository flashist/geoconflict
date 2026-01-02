import { GameMapType } from "./Game";

export const mapPlayerCounts = {
  [GameMapType.Africa]: [100, 70, 50],
  [GameMapType.Asia]: [50, 40, 30],
  [GameMapType.Australia]: [70, 40, 30],
  [GameMapType.Achiran]: [40, 36, 30],
  [GameMapType.Baikal]: [100, 70, 50],
  [GameMapType.BaikalNukeWars]: [100, 70, 50],
  [GameMapType.BetweenTwoSeas]: [70, 50, 40],
  [GameMapType.BlackSea]: [50, 30, 30],
  [GameMapType.Britannia]: [50, 30, 20],
  [GameMapType.DeglaciatedAntarctica]: [50, 40, 30],
  [GameMapType.EastAsia]: [50, 30, 20],
  [GameMapType.Europe]: [100, 70, 50],
  [GameMapType.EuropeClassic]: [50, 30, 30],
  [GameMapType.FalklandIslands]: [50, 30, 20],
  [GameMapType.FaroeIslands]: [20, 15, 10],
  [GameMapType.GatewayToTheAtlantic]: [100, 70, 50],
  [GameMapType.GiantWorldMap]: [100, 70, 50],
  [GameMapType.Halkidiki]: [100, 50, 40],
  [GameMapType.Iceland]: [50, 40, 30],
  [GameMapType.Italia]: [50, 30, 20],
  [GameMapType.Japan]: [20, 15, 10],
  [GameMapType.Mars]: [70, 40, 30],
  [GameMapType.Mena]: [70, 50, 40],
  [GameMapType.Montreal]: [60, 40, 30],
  [GameMapType.NorthAmerica]: [70, 40, 30],
  [GameMapType.Oceania]: [10, 10, 10],
  [GameMapType.Pangaea]: [20, 15, 10],
  [GameMapType.Pluto]: [100, 70, 50],
  [GameMapType.SouthAmerica]: [70, 50, 40],
  [GameMapType.StraitOfGibraltar]: [100, 70, 50],
  [GameMapType.World]: [50, 30, 20],
  [GameMapType.Yenisei]: [150, 100, 70],
} as const satisfies Record<GameMapType, [number, number, number]>;

export function mapMaxPlayers(map: GameMapType): number {
  return mapPlayerCounts[map]?.[0] ?? 50;
}
