import * as Sentry from "@sentry/browser";

if (process.env.GAME_ENV !== "dev") {
    Sentry.init({
        dsn: "https://9ca153276bb034baad9afdb5d1ef2851@o4504694679535616.ingest.us.sentry.io/4510965161066496",
        environment: process.env.GAME_ENV ?? "production",
        release: process.env.GIT_COMMIT ?? "unknown",
    });
}
