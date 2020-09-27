import {allCommandsRoute} from "./routes/allcommands";
import {commandsRoute} from "./routes/commands";
import {publicRoute} from "./routes/public";
import {avatarRoute} from "./routes/avatar";
import {rootRoute} from "./routes/root";
import {sendError} from "./utils";
import * as express from "express";

export type HttpMethod = "GET" | "POST" | "DELETE" | "PUT" | "CONNECT" |
  "OPTIONS" |
  "HEAD" |
  "TRACE";

export type RouteHandler = (req: express.Request, res: express.Response, next?: express.NextFunction) => void | Promise<void>;

export type Route = {
  name: string;
  description: string;
  methods: HttpMethod[];
  endpoint: string;
  rateLimit?: {
    maxRequests: number;
    rateLimitMs: number;
    skipFailedRequests: boolean;
  };
  requiresAuth?: boolean;
  route: RouteHandler
};

export const router: Route[] = [
  {
    name: "Root",
    description: "Gives information about the current shard",
    methods: ["GET"],
    endpoint: "/",
    route: rootRoute,
  },
  {
    name: "Avatar",
    description: "Returns the current avatar of Fire",
    methods: ["GET"],
    endpoint: "/avatar",
    route: avatarRoute,
  },
  {
    name: "All Commands",
    description: "Returns a list of all loaded commands",
    methods: ["GET"],
    endpoint: "/allcommands",
    requiresAuth: false,
    route: allCommandsRoute,
  },
  {
    name: "Commands",
    description: "Returns a list of all categories and their commands",
    methods: ["GET"],
    endpoint: "/commands",
    route: commandsRoute,
  },
  {
    name: "Public",
    description: "Returns a list of public guild ids",
    methods: ["GET"],
    endpoint: "/public",
    route: publicRoute,
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
    route: (req: express.Request, res: express.Response) => {
      sendError(res, {
        success: false,
        error: "Not Found",
        code: 404,
      });
    },
  },
];
