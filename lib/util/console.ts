import { Instance } from "chalk";
import { inspect } from "util";

const chalk = new Instance({
  level: 3,
});

const format = new Intl.DateTimeFormat("en-GB", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  second: "numeric",
  hour12: false,
});

export class FireConsole {
  private readonly _tag?: string;

  constructor(tag?: string) {
    this._tag = tag;
  }

  get level() {
    return process.env.NODE_ENV == "development" ||
      process.env.NODE_ENV == "staging"
      ? "debug"
      : "info";
  }

  get timestamp() {
    const parts = format.formatToParts();
    const day = parts.find((part) => part.type === "day")?.value,
      month = parts.find((part) => part.type === "month")?.value,
      year = parts.find((part) => part.type === "year")?.value,
      hour = parts.find((part) => part.type === "hour")?.value,
      minute = parts.find((part) => part.type === "minute")?.value,
      second = parts.find((part) => part.type === "second")?.value;
    return ` ${day}/${month}/${year} @ ${hour}:${minute}:${second} `;
  }

  get tag() {
    if (this._tag) return this._tag;
    else {
      const stack = new Error().stack;
      return `${stack
        .split("\n")
        .find((v, i) => i != 0 && !v.includes(this.constructor.name))
        .split("/")
        .pop()
        .replaceAll(")", "")}`;
    }
  }

  _log(
    level: "info" | "warn" | "error" | "debug",
    bgHex: `#${string}`,
    ...args: any[]
  ) {
    const formattedTimestamp = chalk.bgHex("#279AF1").hex("#FFFFFF")(
      this.timestamp
    );
    const formattedTag = chalk.bgHex(bgHex).hex("#000000")(` ${this.tag} `);
    const formattedMessage = chalk.bgHex("#353A47").hex("#FFFFFF")(
      ` ${
        typeof args[0] == "string"
          ? args[0]
          : inspect(args[0], { colors: true })
      } `
    );

    console[level](
      `${formattedTimestamp}${formattedTag}${formattedMessage}`,
      chalk.reset(),
      ...args
        .slice(1)
        .map((arg) =>
          typeof arg == "string" ? arg : inspect(arg, { colors: true })
        )
    );
  }

  debug(...args: any[]) {
    if (this.level != "debug") return;
    this._log("debug", "#F5BDE6", ...args);
  }

  info(...args: any[]) {
    this._log("info", "#9CFC97", ...args);
  }

  log(...args: any[]) {
    this.info(...args);
  }

  warn(...args: any[]) {
    this._log("warn", "#FFFD98", ...args);
  }

  oops(...args: any[]) {
    this.warn(...args);
  }

  error(...args: any[]) {
    this._log("error", "#ED8796", ...args);
  }

  wtf(...args: any[]) {
    this.error(...args);
  }
}
