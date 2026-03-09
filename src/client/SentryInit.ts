import * as Sentry from "@sentry/browser";

if (process.env.DEPLOY_ENV !== "dev") {
    Sentry.init({
        // Sentry-main
        // dsn: "https://9ca153276bb034baad9afdb5d1ef2851@o4504694679535616.ingest.us.sentry.io/4510965161066496",
        // Sentry-backup
        dsn: "https://ba75b6bed71331c2b28d5ab13a28ea2d@o4511015108345856.ingest.de.sentry.io/4511015117783120",
        environment: process.env.DEPLOY_ENV ?? "prod",
        release: process.env.GIT_COMMIT ?? "unknown",
    });
}
