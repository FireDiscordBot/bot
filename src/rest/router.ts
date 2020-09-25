import { allCommandsRoute } from "./routes/allcommands";
import { commandsRoute } from "./routes/commands";
import { publicRoute } from "./routes/public";
import { avatarRoute } from "./routes/avatar";
import { ErrorResponse } from "./interfaces";
import { rootRoute } from "./routes/root";
import { sendError } from "./utils";
import * as express from "express";

export const router = [
  {
    name: "Root",
    description: "Gives information about the current shard",
    methods: ["GET"],
    endpoint: "/",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) => rootRoute(req, res),
  },
  {
    name: "Avatar",
    description: "Returns the current avatar of Fire",
    methods: ["GET"],
    endpoint: "/avatar",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) =>
      avatarRoute(req, res),
  },
  {
    name: "All Commands",
    description: "Returns a list of all loaded commands",
    methods: ["GET"],
    endpoint: "/allcommands",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) =>
      allCommandsRoute(req, res),
  },
  {
    name: "Commands",
    description: "Returns a list of all categories and their commands",
    methods: ["GET"],
    endpoint: "/commands",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) =>
      commandsRoute(req, res),
  },
  {
    name: "Public",
    description: "Returns a list of public guild ids",
    methods: ["GET"],
    endpoint: "/public",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) =>
      publicRoute(req, res),
  },
  {
    name: "Fallback",
    description: "Fallback endpoint so express doesn't complain",
    methods: [
      "CONNECT",
      "OPTIONS",
      "HEAD",
      "TRACE",
      "GET",
      "POST",
      "PUT",
      "DELETE",
    ],
    endpoint: "*",
    rateLimit: {
      enabled: false,
      maxRequests: 0,
      rateLimitMs: 0,
      skipFailedRequests: false,
    },
    requiresAuth: false,
    route: (req: express.Request, res: express.Response) => {
      const response: ErrorResponse = {
        success: false,
        error: "Not Found",
        code: 404,
      };
      sendError(res, response);
    },
  },
];
