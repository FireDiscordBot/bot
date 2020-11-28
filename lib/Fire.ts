import {
  AkairoClient,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import {
  categoryChannelSilentTypeCaster,
  categoryChannelTypeCaster,
} from "../src/arguments/category";
import {
  textChannelSilentTypeCaster,
  textChannelTypeCaster,
} from "../src/arguments/textChannel";
import {
  guildChannelSilentTypeCaster,
  guildChannelTypeCaster,
} from "../src/arguments/guildChannel";
import {
  memberSilentTypeCaster,
  memberTypeCaster,
} from "../src/arguments/member";
import { roleSilentTypeCaster, roleTypeCaster } from "../src/arguments/role";
import { userSilentTypeCaster, userTypeCaster } from "../src/arguments/user";
import { memberRoleTypeCaster } from "../src/arguments/memberRole";
import { userMemberTypeCaster } from "../src/arguments/userMember";
import { Experiment, Treatment } from "./interfaces/experiments";
import { codeblockTypeCaster } from "../src/arguments/codeblock";
import { languageTypeCaster } from "../src/arguments/language";
import { listenerTypeCaster } from "../src/arguments/listener";
import { booleanTypeCaster } from "../src/arguments/boolean";
import { commandTypeCaster } from "../src/arguments/command";
import { Language, LanguageHandler } from "./util/language";
import { moduleTypeCaster } from "../src/arguments/module";
import { PostgresProvider } from "./providers/postgres";
import { CommandHandler } from "./util/commandhandler";
import { Module, ModuleHandler } from "./util/module";
import { FireMessage } from "./extensions/message";
import { Client as PGClient } from "ts-postgres";
import { version as djsver } from "discord.js";
import { KlasaConsole } from "@klasa/console"; // Klasa console do be looking kinda nice doe
import { Inhibitor } from "./util/inhibitor";
import { Listener } from "./util/listener";
import { KSoftClient } from "@aero/ksoft";
import { Command } from "./util/command";
import { Util } from "./util/clientutil";
import * as Sentry from "@sentry/node";
import { Manager } from "./Manager";
import { config } from "../config";
import * as moment from "moment";

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
  guildSettings: PostgresProvider;
  userSettings: PostgresProvider;
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
  conversationStates: Map<string, Buffer>; // Google Command conversation states
  events: number;
  experiments: Map<string, Experiment>;
  userSweepTask?: NodeJS.Timeout;

  constructor(manager: Manager, sentry?: typeof Sentry) {
    super({ ...config.akairo, ...config.discord });

    this.launchTime = moment();
    this.started = false;

    this.manager = manager;
    this.console = new KlasaConsole(); // TODO make custom console that works in pm2 logs
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

    this.db
      .query("SELECT count FROM socketstats WHERE cluster=$1;", [
        this.manager.id,
      ])
      .then(
        (result) =>
          (this.events = result.rows.length ? (result.rows[0][0] as number) : 0)
      );

    this.experiments = new Map();

    this.on("warn", (warning) => this.console.warn(`[Discord] ${warning}`));
    this.on("error", (error) =>
      this.console.error(`[Discord]\n${error.stack}`)
    );
    this.on("ready", () => config.fire.readyMessage(this));
    this.on("raw", () => this.events++);

    if (!this.manager.ws)
      setInterval(async () => {
        await this.db
          .query(
            "INSERT INTO socketstats (cluster, count) VALUES ($1, $2) ON CONFLICT (cluster) DO UPDATE SET count = $2;",
            [this.manager.id, this.events]
          )
          .catch(() => {});
      }, 1500);

    if (sentry) {
      this.sentry = sentry;
      this.sentry.setTag("cluster", this.manager.id.toString());
      this.sentry.setTag("discord.js", djsver);
      this.sentry.setTag("discord-akairo", akairover);
      this.console.log("[Sentry] Connected.");
    }

    this.config = config.fire;

    this.guildSettings = new PostgresProvider(this.db, "guildconfig", {
      idColumn: "gid",
      dataColumn: "data",
    });

    this.userSettings = new PostgresProvider(this.db, "userconfig", {
      idColumn: "uid",
      dataColumn: "data",
    });

    this.commandHandler = new CommandHandler(this, {
      directory: __dirname.includes("/dist/")
        ? "./dist/src/commands/"
        : "./src/commands/",
      commandUtil: true,
      handleEdits: true,
      storeMessages: true,
      automateCategories: true,
      prefix: (message: FireMessage) => {
        return config.fire.dev
          ? "dev "
          : [message.guild.settings.get("config.prefix", "$"), "fire "];
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
      memberSilent: memberSilentTypeCaster,
      user: userTypeCaster,
      userSilent: userSilentTypeCaster,
      role: roleTypeCaster,
      roleSilent: roleSilentTypeCaster,
      textChannel: textChannelTypeCaster,
      textChannelSilent: textChannelSilentTypeCaster,
      category: categoryChannelTypeCaster,
      categorySilent: categoryChannelSilentTypeCaster,
      guildChannel: guildChannelTypeCaster,
      guildChannelSilent: guildChannelSilentTypeCaster,
      boolean: booleanTypeCaster,
      command: commandTypeCaster,
      language: languageTypeCaster,
      listener: listenerTypeCaster,
      module: moduleTypeCaster,
      codeblock: codeblockTypeCaster,
    });

    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: __dirname.includes("/dist/")
        ? "./dist/src/inhibitors/"
        : "./src/inhibitors/",
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
      directory: __dirname.includes("/dist/")
        ? "./dist/src/listeners/"
        : "./src/listeners/",
    });

    this.commandHandler.useListenerHandler(this.listenerHandler);
    this.listenerHandler.setEmitters({
      commandHandler: this.commandHandler,
      inhibitorHandler: this.inhibitorHandler,
      listenerHandler: this.listenerHandler,
    });
    this.listenerHandler.loadAll();

    this.languages = new LanguageHandler(this, {
      directory: __dirname.includes("/dist/")
        ? "./dist/src/languages/"
        : "./src/languages/",
    });
    this.languages.loadAll();

    this.modules = new ModuleHandler(this, {
      directory: __dirname.includes("/dist/")
        ? "./dist/src/modules/"
        : "./src/modules/",
    });
    this.modules.on("load", async (module: Module, isReload: boolean) => {
      await module?.init();
    });
    this.modules.on("remove", async (module: Module) => {
      await module?.unload();
    });
    this.modules.loadAll();

    this.userSweepTask = setInterval(() => this.sweepUsers(), 60000);

    this.conversationStates = new Map();
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
    await this.loadExperiments();
    await this.guildSettings.init();
    await this.userSettings.init();
    return super.login();
  }

  async loadExperiments() {
    this.experiments = new Map();
    const experiments = await this.db.query("SELECT * FROM experiments;");
    for await (const experiment of experiments) {
      const data: Experiment = {
        id: experiment.get("id") as string,
        kind: experiment.get("kind") as "user" | "guild",
        label: experiment.get("label") as string,
        defaultConfig: experiment.get("defaultconfig") as {
          [key: string]: any;
        },
        treatments: (experiment.get("treatments") as unknown) as Treatment[],
      };
      this.experiments.set(data.id, data);
    }
  }

  sweepUsers() {
    this.guilds.cache.forEach((guild) =>
      guild.members.cache.sweep((member) => member.presence.status == "offline")
    );
    this.users.cache.sweep((user) =>
      this.guilds.cache.every((guild) => !guild.members.cache.has(user.id))
    );
  }

  getCommand(id: string) {
    id = id.toLowerCase();
    if (this.commandHandler.modules.has(id))
      return this.commandHandler.modules.get(id) as Command;
    else {
      const command = this.commandHandler.modules.find((command) =>
        command.aliases.includes(id)
      );
      if (command) return command as Command;
    }
  }

  getLanguage(id: string) {
    return this.languages.modules.get(id) as Language;
  }

  getModule(id: string) {
    return this.modules.modules.get(id.toLowerCase()) as Module;
  }

  getListener(id: string) {
    return this.listenerHandler.modules.get(id) as Listener;
  }
}
