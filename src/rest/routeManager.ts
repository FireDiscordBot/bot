import { ErrorResponse } from "./interfaces";
import { Fire } from "../../lib/Fire";
import { sendError } from "./utils";
import { router } from "./router";
import * as useRateLimit from "express-rate-limit";
import * as express from "express";

const asyncHandler = (route: any) => {
  const asyncUtilWrap = (...args: any[]) => {
    const fnReturn = route(...args);
    const next = args[args.length - 1];
    return Promise.resolve(fnReturn).catch(next);
  };
  return asyncUtilWrap;
};

export const startRouteManager = (app: express.Application, client: Fire) => {
  router.forEach((route) => {
    route.methods.forEach((method) => {
      const friendlyMethod: string = method.toLowerCase();
      const endpoint = route.endpoint;
      let rateLimit: useRateLimit.RateLimit | undefined;

      if (
        route.rateLimit &&
        route.rateLimit.enabled &&
        route.rateLimit.maxRequests &&
        route.rateLimit.rateLimitMs &&
        process.env.NODE_ENV != "development"
      ) {
        const rateLimited: ErrorResponse = {
          success: false,
          error: "Too many requests, calm down!",
          code: 429,
        };
        rateLimit = useRateLimit({
          windowMs: route.rateLimit.rateLimitMs,
          max: route.rateLimit.maxRequests,
          skipFailedRequests: route.rateLimit.skipFailedRequests,
          handler: (req, res) => {
            res.setHeader("X-RateLimit-Remaining", route.rateLimit.rateLimitMs);
            sendError(res, rateLimited);
          },
        });
      }
      switch (friendlyMethod) {
        case "connect":
        case "options":
        case "head":
        case "trace":
        case "get":
        case "post":
        case "put":
        case "delete": {
          rateLimit
            ? app[friendlyMethod](
                endpoint,
                rateLimit,
                asyncHandler(route.route)
              )
            : app[friendlyMethod](endpoint, asyncHandler(route.route));
        }
        default: {
          rateLimit
            ? app["get"](endpoint, rateLimit, asyncHandler(route.route))
            : app["get"](endpoint, asyncHandler(route.route));
        }
      }
      client.console.log(`[Rest] Loaded route ${method} ${endpoint}`);
    });
  });
  client.console.log(`[Rest] Loaded ${router.length} routes.`);
  app.use(
    (
      err: Error,
      req: express.Request,
      res: express.Response,
      next: express.NextFunction
    ) => {
      const response: ErrorResponse = {
        success: false,
        error: err.message || "Internal Server Error",
        code: 500,
      };
      sendError(res, response);
    }
  );
  client.console.log(`[Rest] Loaded error handler.`);
};
