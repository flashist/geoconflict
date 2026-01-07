import { AiPlayersConfig, GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";
import { getRuntimeConfig } from "./RuntimeConfig";

export const prodConfig = new (class extends DefaultServerConfig {
  numWorkers(): number {
    return 20;
  }
  env(): GameEnv {
    return GameEnv.Prod;
  }
  aiPlayersConfig(): AiPlayersConfig {
    return {
      ...super.aiPlayersConfig(),
      enabled: true,
    };
  }
  jwtAudience(): string {
    const runtime = getRuntimeConfig();
    if (runtime.jwtAudience && runtime.jwtAudience.trim().length > 0) {
      return runtime.jwtAudience.trim();
    }
    const envValue = process.env.JWT_AUDIENCE;
    if (envValue && envValue.trim().length > 0) {
      return envValue.trim();
    }
    return "openfront.io";
  }
})();
