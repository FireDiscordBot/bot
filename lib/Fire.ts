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
import { memberRoleTypeCaster } from "../src/arguments/memberRole";
import { userMemberTypeCaster } from "../src/arguments/userMember";
import { codeblockTypeCaster } from "../src/arguments/codeblock";
import { booleanTypeCaster } from "../src/arguments/boolean";
import { commandTypeCaster } from "../src/arguments/command";
import { memberTypeCaster } from "../src/arguments/member";
import { userTypeCaster } from "../src/arguments/user";
import { roleTypeCaster } from "../src/arguments/role";

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
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASS,
      database: process.env.POSTGRES_DB,
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
    this.on("error", (error) =>
      this.console.error(`[Discord]\n${error.stack}`)
    );
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
      "member|role": memberRoleTypeCaster,
      member: memberTypeCaster,
      user: userTypeCaster,
      role: roleTypeCaster,
      boolean: booleanTypeCaster,
      command: commandTypeCaster,
      codeblock: codeblockTypeCaster,
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
    if (!this.options.shards) this.options.shards = [this.manager.id];
    this.console.log(
      `[Discord] Attempting to login on cluster ${
        this.manager.id
      } with shards [${(this.options.shards as number[]).join(", ")}] (Total: ${
        this.options.shardCount
      }).`
    );
    await this.settings.init();
    return super.login();
  }

  public getCommand(id: string) {
    id = id.toLowerCase();
    if (this.commandHandler.modules.has(id))
      return this.commandHandler.modules.get(id);
    else {
      const command = this.commandHandler.modules.find((command) =>
        command.aliases.includes(id)
      );
      if (command) return command;
    }
  }

  public getLanguage(id: string) {
    return this.languages.modules.get(id);
  }

  public getModule(id: string) {
    return this.modules.modules.get(id.toLowerCase());
  }

  public getListener(id: string) {
    return this.listenerHandler.modules.get(id.toLowerCase());
  }
}
