import * as dotEnvExtended from "dotenv-extended";
import "source-map-support/register";
import "module-alias/register";

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

import { getCommitHash } from "@fire/lib/util/gitUtils";
import { Manager } from "@fire/lib/Manager";
import * as sentry from "@sentry/node";

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
