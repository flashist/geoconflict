const DEV_MODE_EVENT = "dev-mode-changed";

type DevModeEvent = CustomEvent<{ enabled: boolean }>;

let enabled = false;
const devModeEvents = new EventTarget();

export function isDevModeEnabled(): boolean {
  return enabled;
}

export function toggleDevMode(): boolean {
  enabled = !enabled;
  devModeEvents.dispatchEvent(
    new CustomEvent(DEV_MODE_EVENT, { detail: { enabled } }),
  );
  return enabled;
}

export function onDevModeChange(handler: (enabled: boolean) => void): () => void {
  const listener = (event: Event) => {
    const customEvent = event as DevModeEvent;
    handler(customEvent.detail.enabled);
  };
  devModeEvents.addEventListener(DEV_MODE_EVENT, listener);
  return () => devModeEvents.removeEventListener(DEV_MODE_EVENT, listener);
}
