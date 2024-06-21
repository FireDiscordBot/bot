import * as dotEnvExtended from "dotenv-extended";
import "module-alias/register";
import "source-map-support/register";

import * as dayjs from "dayjs";
import * as timezone from "dayjs/plugin/timezone";
import * as utc from "dayjs/plugin/utc";
import * as relativeTime from "dayjs/plugin/relativeTime";
import * as calendar from "dayjs/plugin/calendar";

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
import { getCommitHash } from "@fire/lib/util/gitUtils";
import * as sentry from "@sentry/node";

const {
  regexes: {
    discord: { webhookPartialWithId },
  },
} = constants;

const version =
  process.env.NODE_ENV == "development"
    ? `dev-${getCommitHash().slice(0, 7)}`
    : process.env.NODE_ENV == "staging"
    ? `stg-${getCommitHash().slice(0, 7)}`
    : getCommitHash().slice(0, 7);

const loadSentry =
  typeof process.env.SENTRY_DSN != "undefined" &&
  process.env.SENTRY_DSN.length > 0;
if (loadSentry) {
  sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: `fire@${version}`,
    environment: process.env.NODE_ENV,
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
