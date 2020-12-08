import { Timestamp } from "@skyra/timestamp";
import * as Logger from "node-color-log";

export class FireConsole {
  logger: typeof Logger;
  template: Timestamp;

  constructor() {
    this.logger = Logger;
    this.logger.setLevel(
      process.env.NODE_ENV == "development" ? "debug" : "info"
    );
    this.template = new Timestamp("DD/MM/YYYY @ HH:mm:ss");
  }

  get timestamp() {
    return this.template.displayUTC(new Date());
  }

  debug(...args: any[]) {
    this.logger
      .bgColor("magenta")
      .bold()
      .log(`[${this.timestamp}]`)
      .joint()
      .log(" ")
      .joint()
      .log(...args);
  }

  info(...args: any[]) {
    this.logger
      .bgColor("green")
      .color("black")
      .bold()
      .log(`[${this.timestamp}]`)
      .joint()
      .log(" ")
      .joint()
      .log(...args);
  }

  log(...args: any[]) {
    this.info(...args);
  }

  warn(...args: any[]) {
    this.logger
      .bgColor("yellow")
      .color("black")
      .log(`[${this.timestamp}]`)
      .joint()
      .log(" ")
      .joint()
      .log(...args);
  }

  oops(...args: any[]) {
    this.warn(...args);
  }

  error(...args: any[]) {
    this.logger
      .bgColor("red")
      .bold()
      .log(`[${this.timestamp}]`)
      .joint()
      .log(" ")
      .joint()
      .log(...args);
  }

  wtf(...args: any[]) {
    this.error(...args);
  }
}