import {
  AkairoClient,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import * as moment from "moment";
import * as Sentry from "@sentry/node";
import * as Centra from "centra";
import { Client as PGClient } from "ts-postgres";
import { version as djsver } from "discord.js";
import { KlasaConsole } from "@klasa/console"; // Klasa console do be looking kinda nice doe
import { CommandHandler } from "./util/commandHandler";
import { PostgresProvider } from "./providers/postgres";
import { Module, ModuleHandler } from "./util/module";
import { LanguageHandler } from "./util/language";
import { Inhibitor } from "./util/inhibitor";
import { KSoftClient } from "@aero/ksoft";
import { Manager } from "./Manager";
import { Command } from "./util/command";
import { Util } from "./util/clientUtil";
import { config } from "../config";
import { booleanTypeCaster } from "../src/arguments/boolean";
import { userMemberTypeCaster } from "../src/arguments/userMember";
import { memberTypeCaster } from "../src/arguments/member";
import { userTypeCaster } from "../src/arguments/user";

import "./extensions";

export class Fire extends AkairoClient {
  launchTime: moment.Moment;
  started: boolean;

  // Sharding
  manager: Manager;

  // Logging
  console: KlasaConsole;
  sentry: typeof Sentry | undefined;

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
  ksoft?: KSoftClient;
  config: typeof config.fire;

  constructor(manager: Manager, sentry?: typeof Sentry) {
    super({ ...config.akairo, ...config.discord });

    this.launchTime = moment();
    this.started = false;

    this.manager = manager;
    this.console = new KlasaConsole();
    this.util = new Util(this);

    this.db = new PGClient({
      user: process.env.POSTGRES_USER || "postgres",
      password: process.env.POSTGRES_PASS,
      database: process.env.NODE_ENV === "production" ? "fire" : "dev",
    });

    this.console.log("[DB] Attempting to connect...");

    this.db
      .connect()
      .then(() => this.console.log("[DB] Connected"))
      .catch((err) => {
        this.console.error(`[DB] Failed to connect\n${err.stack}`);
        process.exit(-1);
      });

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
      automateCategories: true,
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

    this.commandHandler.resolver.addTypes({
      "user|member": userMemberTypeCaster,
      member: memberTypeCaster,
      user: userTypeCaster,
      boolean: booleanTypeCaster,
    });

    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: config.fire.dev
        ? "./src/inhibitors/"
        : "./dist/src/inhibitors/",
    });
    this.inhibitorHandler.on(
      "load",
      async (inhibitor: Inhibitor, isReload: boolean) => {
        await inhibitor?.init();
      }
    );
    this.inhibitorHandler.on("remove", async (inhibitor: Inhibitor) => {
      await inhibitor?.unload();
    });

    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
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

    this.ksoft = process.env.KSOFT_TOKEN
      ? new KSoftClient(process.env.KSOFT_TOKEN)
      : undefined;
  }

  async login() {
    this.console.log(
      `[Discord] Attempting to login on shard ${this.manager.id}/${this.options.shardCount}.`
    );
    this.options.shards = [this.manager.id];
    await this.settings.init();
    return super.login();
  }

  async haste(text: string, fallback = false) {
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
