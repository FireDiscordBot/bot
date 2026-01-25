import * as dotEnvExtended from "dotenv-extended";
import "module-alias/register";

import * as dayjs from "dayjs";
import * as calendar from "dayjs/plugin/calendar";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as timezone from "dayjs/plugin/timezone";
import * as utc from "dayjs/plugin/utc";

dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(relativeTime);
dayjs.extend(calendar);

import "@fire/lib/extensions";

const env = {
  development: "dev.env",
  staging: "stg.env",
  production: ".env",
  litecord: "lc.env",
};

dotEnvExtended.load({
  path: env[process.env.NODE_ENV],
  errorOnRegex: true,
});

if (process.env.NODE_ENV == "litecord") process.env.NODE_ENV = "development";

import { Manager } from "@fire/lib/Manager";
import { constants } from "@fire/lib/util/constants";
import * as sentry from "@sentry/node";
import { execSync } from "child_process";

const {
  regexes: {
    discord: { webhookPartialWithId },
  },
} = constants;

if (!process.env.GIT_COMMIT)
  try {
    process.env.GIT_COMMIT = execSync("git rev-parse HEAD").toString().trim();
  } catch {
    process.env.GIT_COMMIT = "unknown";
  }
if (!process.env.GIT_BRANCH)
  try {
    process.env.GIT_BRANCH = execSync("git rev-parse --abbrev-ref HEAD")
      .toString()
      .trim();
  } catch {
    process.env.GIT_BRANCH = "unknown";
  }

const commit = process.env.GIT_COMMIT.slice(0, 7);
export const version =
  process.env.NODE_ENV == "development"
    ? `dev-${commit}`
    : process.env.NODE_ENV == "staging"
      ? `stg-${commit}`
      : commit;

const loadSentry =
  typeof process.env.SENTRY_DSN != "undefined" &&
  process.env.SENTRY_DSN.length > 0;
if (loadSentry) {
  sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: `fire@${version}`,
    environment: process.env.NODE_ENV,
    integrations: [
      sentry.extraErrorDataIntegration({
        depth: 3,
      }),
    ],
    beforeBreadcrumb: (breadcrumb) => {
      if (breadcrumb.type != "http") return breadcrumb;
      else if (breadcrumb.data?.url?.includes("/webhooks/")) {
        breadcrumb.data.url = breadcrumb.data.url.replace(
          webhookPartialWithId,
          "/webhooks/:id/:token"
        );
        return breadcrumb;
      }

      return breadcrumb;
    },
  });
}

const manager = new Manager(version, loadSentry ? sentry : undefined);
global.manager = manager;
manager.init();

process.on("exit", () => {
  manager.kill("exit");
});
process.on("SIGINT", () => {
  manager.kill("SIGINT");
});
