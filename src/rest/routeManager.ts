import * as useRateLimit from "express-rate-limit";
import * as express from "express";

import {Fire} from "../../lib/Fire";
import {sendError} from "./utils";
import {HttpMethod, Route, router} from "./router";

const RATE_LIMITED_ERROR = {
  success: false,
  error: "Too many requests, calm down!",
  code: 429,
};

const createRateLimit = ({rateLimit}: Route) => useRateLimit({
  windowMs: rateLimit.rateLimitMs,
  max: rateLimit.maxRequests,
  skipFailedRequests: rateLimit.skipFailedRequests,
  handler: (req, res) => {
    res.setHeader("X-RateLimit-Remaining", rateLimit.rateLimitMs);
    sendError(res, RATE_LIMITED_ERROR);
  },
});

export const startRouteManager = (app: express.Application, client: Fire) => {
  router.forEach((route) => {
    const handlers: express.RequestHandler[] = [];

    if (route.rateLimit && process.env.NODE_ENV != "development") {
      handlers.push(createRateLimit(route));
    }

    app.use(route.endpoint, handlers, (req: express.Request, res: express.Response) => {
      if (route.methods.includes(req.method.toUpperCase() as HttpMethod)) {
        return route.route(req, res);
      }
      throw new Error("Unhandled http method.");
    });

    client.console.log(`[Rest] Loaded route ${route.methods} ${route.endpoint}`);
  });

  client.console.log(`[Rest] Loaded ${router.length} routes.`);
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      sendError(res, {
        success: false,
        error: err.message || "Internal Server Error",
        code: 500,
      });
    }
  );
  client.console.log(`[Rest] Loaded error handler.`);
};
