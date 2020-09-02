import {
  AkairoClient,
  CommandHandler,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import { version as djsver } from "discord.js";
import { KlasaConsole } from "@klasa/console"; // Klasa console do be looking kinda nice doe
import { KSoftClient } from "@aero/ksoft";
import { Manager } from "../lib/Manager";
import { Command } from "./util/command";
import { config } from "../config";
import * as moment from "moment";

export class Fire extends AkairoClient {
  launchTime: moment.Moment;
  started: boolean;
  manager: Manager;
  console: KlasaConsole;
  sentry: any;
  config: typeof config.fire;
  commandHandler: CommandHandler;
  inhibitorHandler: InhibitorHandler;
  listenerHandler: ListenerHandler;
  ksoft: KSoftClient | boolean;
  // chatwatch;

  constructor(manager: Manager, sentry: any) {
    super({ ...config.akairo, ...config.discord });
    this.launchTime = moment();
    this.started = false;

    this.manager = manager;
    this.console = new KlasaConsole();

    this.on("warn", (warning) => this.console.warn(`[Discord] ${warning}`));
    this.on("error", (error) => this.console.error(`[Discord] ${error}`));
    this.on("ready", () => config.fire.readyMessage(this));

    if (sentry) {
      this.sentry = sentry;
      this.sentry.setTag("shard", this.manager.id);
      this.sentry.setTag("discord.js", djsver);
      this.sentry.setTag("discord-akairo", akairover);
      this.console.log("[Sentry] Connected.");
    }

    this.config = config.fire;

    this.commandHandler = new CommandHandler(this, {
      directory: "./src/commands/",
      commandUtil: true,
      handleEdits: true,
      storeMessages: true,
      prefix: (message) => {
        return "dev ";
      },
    });
    this.commandHandler.on("load", async (command: Command) => {
      await command?.init();
    });
    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: "./src/inhibitors/",
    });
    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
    this.inhibitorHandler.loadAll();

    this.listenerHandler = new ListenerHandler(this, {
      directory: "./src/listeners/",
    });
    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      inhibitorHandler: this.inhibitorHandler,
      listenerHandler: this.listenerHandler,
    });
    this.listenerHandler.loadAll();

    if (process.env.KSOFT_TOKEN)
      this.ksoft = new KSoftClient(process.env.KSOFT_TOKEN);
    else this.ksoft = false;
  }

  login() {
    this.console.log(
      `[Discord] Attempting to login on shard ${this.manager.id}/${this.options.shardCount}.`
    );
    this.options.shards = [this.manager.id];
    return super.login();
  }
}
