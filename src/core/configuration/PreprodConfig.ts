import { GameEnv } from "./Config";
import { DefaultServerConfig } from "./DefaultConfig";
import { getRuntimeConfig } from "./RuntimeConfig";

export const preprodConfig = new (class extends DefaultServerConfig {
  env(): GameEnv {
    return GameEnv.Preprod;
  }
  numWorkers(): number {
    return 2;
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
    return "openfront.dev";
  }
  allowedFlares(): string[] | undefined {
    return undefined;
    // TODO: Uncomment this after testing.
    // Allow access without login for now to test
    // the new login flow.
    // return [
    //   // "access:openfront.dev"
    // ];
  }
})();
