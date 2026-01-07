export interface RuntimeConfigData {
  publicHost?: string;
  publicProtocol?: string;
  publicPort?: string;
  deploymentId?: string;
  apiBaseUrl?: string;
  jwtIssuer?: string;
  jwtAudience?: string;
}

const runtimeConfig: RuntimeConfigData = {};

export function setRuntimeConfig(overrides: RuntimeConfigData): void {
  Object.assign(runtimeConfig, overrides);
}

export function getRuntimeConfig(): RuntimeConfigData {
  return runtimeConfig;
}
