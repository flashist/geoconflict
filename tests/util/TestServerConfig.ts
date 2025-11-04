import { JWK } from "jose";
import { GameEnv, ServerConfig } from "../../src/core/configuration/Config";
import { GameMapType } from "../../src/core/game/Game";
import { GameID } from "../../src/core/Schemas";

export class TestServerConfig implements ServerConfig {
  enableMatchmaking(): boolean {
    throw new Error("Method not implemented.");
  }
  apiKey(): string {
    throw new Error("Method not implemented.");
  }
  allowedFlares(): string[] | undefined {
    throw new Error("Method not implemented.");
  }
  stripePublishableKey(): string {
    throw new Error("Method not implemented.");
  }
  publicHost(): string {
    throw new Error("Method not implemented.");
  }
  deploymentId(): string {
    throw new Error("Method not implemented.");
  }
  publicProtocol(): string {
    throw new Error("Method not implemented.");
  }
  publicPort(): string {
    throw new Error("Method not implemented.");
  }
  jwtAudience(): string {
    throw new Error("Method not implemented.");
  }
  jwtIssuer(): string {
    throw new Error("Method not implemented.");
  }
  jwkPublicKey(): Promise<JWK> {
    throw new Error("Method not implemented.");
  }
  otelEnabled(): boolean {
    throw new Error("Method not implemented.");
  }
  otelEndpoint(): string {
    throw new Error("Method not implemented.");
  }
  otelAuthHeader(): string {
    throw new Error("Method not implemented.");
  }
  apiBaseUrl(): string {
    throw new Error("Method not implemented.");
  }
  turnIntervalMs(): number {
    throw new Error("Method not implemented.");
  }
  gameCreationRate(): number {
    throw new Error("Method not implemented.");
  }
  lobbyMaxPlayers(map: GameMapType): number {
    throw new Error("Method not implemented.");
  }
  numWorkers(): number {
    throw new Error("Method not implemented.");
  }
  workerIndex(gameID: GameID): number {
    throw new Error("Method not implemented.");
  }
  workerPath(gameID: GameID): string {
    throw new Error("Method not implemented.");
  }
  workerPort(gameID: GameID): number {
    throw new Error("Method not implemented.");
  }
  workerPortByIndex(workerID: number): number {
    throw new Error("Method not implemented.");
  }
  env(): GameEnv {
    throw new Error("Method not implemented.");
  }
  adminToken(): string {
    throw new Error("Method not implemented.");
  }
  adminHeader(): string {
    throw new Error("Method not implemented.");
  }
  gitCommit(): string {
    throw new Error("Method not implemented.");
  }
  storageBucket(): string {
    throw new Error("Method not implemented.");
  }
  storageEndpoint(): string {
    throw new Error("Method not implemented.");
  }
  storageAccessKey(): string {
    throw new Error("Method not implemented.");
  }
  storageSecretKey(): string {
    throw new Error("Method not implemented.");
  }
}
