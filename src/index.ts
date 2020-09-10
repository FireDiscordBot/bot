require("dotenv").config({
  path: process.env.NODE_ENV === "production" ? ".env" : "dev.env",
});

import { Manager } from "../lib/Manager";
import * as sentry from "@sentry/node";

const version = process.env.npm_package_gitHead || "dev";

sentry.init({
  dsn: process.env.SENTRY_DSN,
  release: `fire@${version}`,
});

const manager = new Manager(sentry);
manager.init();

const exit = () => {
  manager.client.console.warn("Destroying client...");
  manager.client.user.setStatus("invisible");
  manager.client.destroy();
};

process.on("exit", () => {
  exit(), process.exit();
});
process.on("SIGINT", exit);
