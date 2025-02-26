import { Instance } from "chalk";

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
    return `[${day}/${month}/${year} @ ${hour}:${minute}:${second}]`;
  }

  get tag() {
    if (this._tag) return `[${this._tag}]`;
    else {
      const stack = new Error().stack;
      return `[${stack
        .split("\n")
        .find((v, i) => i != 0 && !v.includes(this.constructor.name))
        .split("/")
        .pop()
        .replace(")", "")}]`;
    }
  }

  get prefix() {
    return `${this.timestamp} ${this.tag}`;
  }

  debug(...args: any[]) {
    if (this.level != "debug") return;
    console.debug(
      chalk.bgMagenta.bold(this.timestamp),
      chalk.bgMagenta.bold(this.tag),
      ...args
    );
  }

  info(...args: any[]) {
    console.log(
      chalk.bgGreen.bold(this.timestamp),
      chalk.bgGreen.bold(this.tag),
      ...args
    );
  }

  log(...args: any[]) {
    this.info(...args);
  }

  warn(...args: any[]) {
    console.warn(
      chalk.bgYellow.bold(this.timestamp),
      chalk.bgYellow.bold(this.tag),
      ...args
    );
  }

  oops(...args: any[]) {
    this.warn(...args);
  }

  error(...args: any[]) {
    console.error(
      chalk.bgRed.bold(this.timestamp),
      chalk.bgRed.bold(this.tag),
      ...args
    );
  }

  wtf(...args: any[]) {
    this.error(...args);
  }
}
