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

  _log(bgHex: `#${string}`, ...args: any[]) {
    const formattedTimestamp = chalk.bgHex("#279AF1").hex("#FFFFFF")(
      this.timestamp
    );
    const formattedTag = chalk.bgHex(bgHex).hex("#000000")(` ${this.tag} `);
    let message: string =
      typeof args[0] == "string"
        ? args.shift()
        : inspect(args.shift(), { colors: true });
    // combine continuous strings into one
    while (typeof args[0] == "string")
      if (args[0].length) message += ` ${args.shift()}`;
      else args.shift();

    const formattedMessage = chalk.bgHex("#353A47").hex("#FFFFFF")(
      ` ${message} `
    );

    console.log(
      `${formattedTimestamp}${formattedTag}${formattedMessage}`,
      chalk.reset()
    );

    // we want extra args to be on a new line so we call it again
    if (args.length)
      console.log(
        ...args.map((arg) =>
          typeof arg == "string" ? arg : inspect(arg, { colors: true })
        )
      );
  }

  debug(...args: any[]) {
    if (this.level != "debug") return;
    this._log("#F5BDE6", ...args);
  }

  info(...args: any[]) {
    this._log("#9CFC97", ...args);
  }

  log(...args: any[]) {
    this.info(...args);
  }

  warn(...args: any[]) {
    this._log("#FFFD98", ...args);
  }

  oops(...args: any[]) {
    this.warn(...args);
  }

  error(...args: any[]) {
    this._log("#ED8796", ...args);
  }

  wtf(...args: any[]) {
    this.error(...args);
  }
}
