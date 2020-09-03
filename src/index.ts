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

new Manager(sentry).init();
