import { RESTManager } from "./RESTManager";

const noop = () => {};
const methods = ["get", "post", "delete", "patch", "put"];
const reflectors = [
  "toString",
  "valueOf",
  "inspect",
  "constructor",
  Symbol.toPrimitive,
  Symbol.for("nodejs.util.inspect.custom"),
];

export interface RequestOptions {
  dontUsePayloadJSON?: boolean;
  query?:
    | string[][]
    | Record<string, string | number | boolean>
    | string
    | URLSearchParams;
  files?: { name: string; key?: string; file: any }[];
  headers?: Record<string, any>;
  versioned?: boolean;
  debug?: boolean;
  reason?: string;
  auth?: boolean;
  route?: string;
  data?: any;
}

// below is a hot mess but it allows cool things
type RequestMethod = "get" | "post" | "delete" | "patch" | "put";
type Handler = <T>(options?: RequestOptions) => Promise<T>;
type Execute = Record<RequestMethod, Handler> &
  Record<string, Executor> &
  ((...args: string[]) => Executor);
// @ts-ignore
interface Executor extends Execute {}

const CHANNELS_OR_GUILDS = /channels|guilds/;
const SNOWFLAKE = /\d{15,21}/g;

const routeBuilder = (manager: RESTManager) => {
  const route = [""];
  const handler = {
    get(target: any, name: string) {
      if (reflectors.includes(name)) return () => route.join("/");
      if (methods.includes(name)) {
        const routeBucket: string[] = [];
        for (let i = 0; i < route.length; i++) {
          // Reactions routes and sub-routes all share the same bucket
          if (route[i - 1] === "reactions") break;
          // Literal IDs should only be taken account if they are the Major ID (the Channel/Guild ID)
          if (
            SNOWFLAKE.test(route[i]) &&
            !CHANNELS_OR_GUILDS.test(route[i - 1])
          )
            routeBucket.push(":id");
          // All other parts of the route should be considered as part of the bucket identifier
          else routeBucket.push(route[i]);
        }
        return (options: RequestOptions) =>
          manager.request(
            name,
            route.join("/"),
            Object.assign(
              {
                versioned: manager.versioned,
                route: routeBucket.join("/"),
              },
              options
            )
          );
      }
      route.push(name);
      return new Proxy(noop, handler);
    },
    apply(target: any, _: any, args: any[]) {
      route.push(...args.filter((x) => x != null));
      return new Proxy(noop, handler) as Execute;
    },
  };
  return new Proxy(noop, handler) as Execute;
};

export default routeBuilder;
