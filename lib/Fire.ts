import {
  AkairoClient,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import { memberConverter, userConverter } from "./util/converters";
import { CommandHandler } from "./util/commandHandler";
import { PostgresProvider } from "./providers/postgres";
import { Module, ModuleHandler } from "./util/module";
import { FireMessage } from "./extensions/message";
import { LanguageHandler } from "./util/language";
import { Client as PGClient } from "ts-postgres";
import { version as djsver } from "discord.js";
import { KlasaConsole } from "@klasa/console"; // Klasa console do be looking kinda nice doe
import { Inhibitor } from "./util/inhibitor";
import { KSoftClient } from "@aero/ksoft";
import { Manager } from "../lib/Manager";
import { Command } from "./util/command";
import { Util } from "./util/clientUtil";
import * as Sentry from "@sentry/node";
import { config } from "../config";
import * as moment from "moment";
import * as Centra from "centra";
require("./extensions");

export class Fire extends AkairoClient {
  launchTime: moment.Moment;
  started: boolean;

  // Sharding
  manager: Manager;

  // Logging
  console: KlasaConsole;
  sentry: typeof Sentry;

  // Handlers
  settings: PostgresProvider;
  commandHandler: CommandHandler;
  inhibitorHandler: InhibitorHandler;
  listenerHandler: ListenerHandler;
  languages: LanguageHandler;
  modules: ModuleHandler;

  // Common Attributes
  db: PGClient;
  util: Util;
  ksoft: KSoftClient | boolean;
  config: typeof config.fire;

  constructor(manager: Manager, sentry: any) {
    super({ ...config.akairo, ...config.discord });
    this.launchTime = moment();
    this.started = false;

    this.manager = manager;
    this.console = new KlasaConsole();
    this.util = new Util(this);

    this.db = new PGClient({
      user: "postgres",
      password: process.env.POSTGRES_PASS,
      database: process.env.NODE_ENV === "production" ? "fire" : "dev",
    });
    this.console.log("[DB] Attempting to connect...");
    this.db
      .connect()
      .catch((err) => {
        this.console.error(`[DB] Failed to connect\n${err.stack}`);
        process.exit(-1);
      })
      .then(() => this.console.log("[DB] Connected"));

    this.on("warn", (warning) => this.console.warn(`[Discord] ${warning}`));
    this.on("error", (error) => this.console.error(`[Discord] ${error}`));
    this.on("ready", () => config.fire.readyMessage(this));

    if (sentry) {
      this.sentry = sentry;
      this.sentry.setTag("shard", this.manager.id.toString());
      this.sentry.setTag("discord.js", djsver);
      this.sentry.setTag("discord-akairo", akairover);
      this.console.log("[Sentry] Connected.");
    }

    this.config = config.fire;

    this.settings = new PostgresProvider(this.db, "guildconfig", {
      idColumn: "gid",
      dataColumn: "data",
    });

    this.commandHandler = new CommandHandler(this, {
      directory: config.fire.dev ? "./src/commands/" : "./dist/src/commands/",
      commandUtil: true,
      handleEdits: true,
      storeMessages: true,
      prefix: (message) => {
        return this.settings.get(
          message.guild.id,
          "config.prefix",
          config.fire.dev ? "dev " : "$"
        );
      },
    });
    this.commandHandler.on(
      "load",
      async (command: Command, isReload: boolean) => {
        await command?.init();
      }
    );
    this.commandHandler.on("remove", async (command: Command) => {
      await command?.unload();
    });
    this.commandHandler.resolver.addType(
      "user|member",
      async (message: FireMessage, phrase: any) => {
        if (!phrase) return message.member || message.author;
        else {
          const user = await userConverter(message, phrase);
          if (user) {
            const member = message.guild.members.cache.get(user.id);
            if (member) return member;
            else return user;
          }
        }
      }
    );
    this.commandHandler.resolver.addType(
      "member",
      async (message: FireMessage, phrase: any) => {
        if (!phrase) return message.member || message.author;
        return await memberConverter(message, phrase);
      }
    );
    this.commandHandler.resolver.addType(
      "user",
      async (message: FireMessage, phrase: any) => {
        if (!phrase) return message.member || message.author;
        return await userConverter(message, phrase);
      }
    );
    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: config.fire.dev
        ? "./src/inhibitors/"
        : "./dist/src/inhibitors/",
    });
    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
    this.inhibitorHandler.on(
      "load",
      async (inhibitor: Inhibitor, isReload: boolean) => {
        await inhibitor?.init();
      }
    );
    this.inhibitorHandler.on("remove", async (inhibitor: Inhibitor) => {
      await inhibitor?.unload();
    });
    this.inhibitorHandler.loadAll();

    this.listenerHandler = new ListenerHandler(this, {
      directory: config.fire.dev ? "./src/listeners/" : "./dist/src/listeners/",
    });
    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      inhibitorHandler: this.inhibitorHandler,
      listenerHandler: this.listenerHandler,
    });
    this.listenerHandler.loadAll();

    this.languages = new LanguageHandler(this, {
      directory: config.fire.dev ? "./src/languages/" : "./dist/src/languages/",
    });
    this.languages.loadAll();

    this.modules = new ModuleHandler(this, {
      directory: config.fire.dev ? "./src/modules/" : "./dist/src/modules/",
    });
    this.modules.on("load", async (module: Module, isReload: boolean) => {
      await module?.init();
    });
    this.modules.on("remove", async (module: Module) => {
      await module?.unload();
    });
    this.modules.loadAll();

    if (process.env.KSOFT_TOKEN)
      this.ksoft = new KSoftClient(process.env.KSOFT_TOKEN);
    else this.ksoft = false;
  }

  async login() {
    this.console.log(
      `[Discord] Attempting to login on shard ${this.manager.id}/${this.options.shardCount}.`
    );
    this.options.shards = [this.manager.id];
    await this.settings.init();
    return super.login();
  }

  async haste(text: string, fallback: boolean = false) {
    const url = fallback ? "https://h.inv.wtf/" : "https://hst.sh/";
    try {
      const h: { key: string } = await (
        await Centra(url, "POST")
          .path("/documents")
          .body(text, "buffer")
          .header("User-Agent", "Fire Discord Bot")
          .send()
      ).json();
      return url + h.key;
    } catch {
      return await this.haste(text, true);
    }
  }

  public getCommand(id: string) {
    return this.commandHandler.modules.get(id);
  }

  public getLanguage(id: string) {
    return this.languages.modules.get(id);
  }

  public getModule(id: string) {
    return this.modules.modules.get(id);
  }
}
