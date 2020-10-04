import * as express from "express";

import { allCommandsRoute } from "./routes/allcommands";
import { commandsRoute } from "./routes/commands";
import { publicRoute } from "./routes/public";
import { avatarRoute } from "./routes/avatar";
import { rootRoute } from "./routes/root";
import { sendError } from "./utils";

export type HttpMethod =
  | "GET"
  | "POST"
  | "DELETE"
  | "PUT"
  | "CONNECT"
  | "OPTIONS"
  | "HEAD"
  | "TRACE";

export type Route = {
  name: string;
  description: string;
  methods: HttpMethod[] | "ALL";
  endpoint: string;
  rateLimit?: {
    maxRequests: number;
    rateLimitMs: number;
    skipFailedRequests: boolean;
  };
  requiresAuth?: boolean;
  handler: express.RequestHandler;
};

export const router: Route[] = [
  {
    name: "Root",
    description: "Gives information about the current shard",
    methods: ["GET"],
    endpoint: "/",
    handler: rootRoute,
  },
  {
    name: "Avatar",
    description: "Returns the current avatar of Fire",
    methods: ["GET"],
    endpoint: "/avatar",
    handler: avatarRoute,
  },
  {
    name: "All Commands",
    description: "Returns a list of all loaded commands",
    methods: ["GET"],
    endpoint: "/allcommands",
    handler: allCommandsRoute,
  },
  {
    name: "Commands",
    description: "Returns a list of all categories and their commands",
    methods: ["GET"],
    endpoint: "/commands",
    handler: commandsRoute,
  },
  {
    name: "Public",
    description: "Returns a list of public guild ids",
    methods: ["GET"],
    endpoint: "/public",
    handler: publicRoute,
  },
  {
    name: "Fallback",
    description: "Fallback endpoint so express doesn't complain",
    methods: "ALL",
    endpoint: "*",
    handler: (req, res) => {
      sendError(res, {
        success: false,
        error: "Not Found",
        code: 404,
      });
    },
  },
];
