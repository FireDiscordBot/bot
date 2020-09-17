require("dotenv").config({
  path: process.env.NODE_ENV == "development" ? "dev.env" : ".env",
});

import { getCommitHash } from "../lib/util/gitUtils";
import { Manager } from "../lib/Manager";
import * as sentry from "@sentry/node";

const version =
  process.env.NODE_ENV == "development" ? "dev" : getCommitHash().slice(0, 7);

sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: `fire@${version}`,
});

const manager = new Manager(sentry);
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
