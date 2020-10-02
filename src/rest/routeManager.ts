import * as useRateLimit from "express-rate-limit";
import * as express from "express";

import { sendError } from "./utils";
import { Route, router } from "./router";

const asyncHandler = (
  handler: express.RequestHandler
): express.RequestHandler => (req, res, next) => {
  const response = handler(req, res, next);
  if (response instanceof Promise) {
    response.catch(next);
  }
};

const createRateLimit = ({ rateLimit }: Route) =>
  useRateLimit({
    windowMs: rateLimit.rateLimitMs,
    max: rateLimit.maxRequests,
    skipFailedRequests: rateLimit.skipFailedRequests,
    handler: (req, res) => {
      res.setHeader("X-RateLimit-Remaining", rateLimit.rateLimitMs);
      sendError(res, {
        success: false,
        error: "Too many requests, calm down!",
        code: 429,
      });
    },
  });

export const setupRoutes = (app: express.Application) => {
  router.forEach((route) => {
    const handlers: express.RequestHandler[] = [];

    if (route.rateLimit && process.env.NODE_ENV != "development") {
      handlers.push(createRateLimit(route));
    }

    const routeHandler = asyncHandler(route.handler);
    if (route.methods === "ALL") {
      app.all(route.endpoint, handlers, routeHandler);
    } else {
      route.methods.forEach((method) => {
        app[method.toLowerCase()](route.endpoint, handlers, routeHandler);
      });
    }

    app.client.console.log(
      `[Rest] Loaded route ${route.methods} ${route.endpoint}`
    );
  });

  app.client.console.log(`[Rest] Loaded ${router.length} routes.`);
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
  app.client.console.log(`[Rest] Loaded error handler.`);
};
