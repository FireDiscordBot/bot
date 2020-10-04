import * as dotEnvExtended from "dotenv-extended";
import {getCommitHash} from "../lib/util/gitUtils";
import {Manager} from "../lib/Manager";
import * as sentry from "@sentry/node";

dotEnvExtended.load({
  path: process.env.NODE_ENV == "development" ? "dev.env" : ".env",
  errorOnRegex: true,
});

const version =
  process.env.NODE_ENV == "development" ? "dev" : getCommitHash().slice(0, 7);

const loadSentry =
  typeof process.env.SENTRY_DSN !== "undefined" &&
  process.env.SENTRY_DSN.length > 0;
if (loadSentry) {
  sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: `fire@${version}`,
  });
}

const manager = new Manager(loadSentry ? sentry : undefined);
manager.init();

const exit = () => {
  manager.client?.console.warn("Destroying client...");
  manager.client?.user?.setStatus("invisible");
  manager.client?.destroy();
  process.exit();
};

process.on("exit", () => {
  exit();
});
process.on("SIGINT", exit);
