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

if (process.env.POD_NAME)
  process.env.INSTANCE_ID = process.env.POD_NAME.split("-").at(1);

import { Manager } from "@fire/lib/Manager";
import { constants } from "@fire/lib/util/constants";
import { getCommitHash } from "@fire/lib/util/gitUtils";
import * as sentry from "@sentry/node";

const {
  regexes: {
    discord: { webhookPartialWithId },
  },
} = constants;

const commit = getCommitHash().slice(0, 7);
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

for (const event of ["exit", "SIGINT", "SIGTERM"])
  process.on(event, () => manager.kill(event));
