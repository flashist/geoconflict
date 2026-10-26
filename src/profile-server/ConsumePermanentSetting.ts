// The consume-permanent safety setting (task 0506, ADR-126 §4.3). Owner ruling
// 2026-10-26: a setting in this committed file, not an env var. To change it, edit
// the value below, commit, and redeploy the profile box; the boot log prints it.
//
// ⚠️ ONE-WAY DOOR, per purchase. `true` makes the box tell game clients to CONSUME
// citizenship and durable items again, and Yandex deletes a consumed purchase for
// good: setting it back to `false` brings none of them back. It is an emergency
// lever for the owner (a defect in the held-elsewhere path, or purchase lists
// turning out per device), never something to flip for a test on the live box.

export const CONSUME_PERMANENT_PURCHASES: boolean = false;

/** The boot log line, so the setting in force is visible in the container log. */
export function consumePermanentBootLine(consumePermanent: boolean): string {
  return consumePermanent
    ? "payments consume-permanent: ON — clients consume permanent purchases; ONE-WAY per purchase (ConsumePermanentSetting.ts)"
    : "payments consume-permanent: OFF (ConsumePermanentSetting.ts)";
}
