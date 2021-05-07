import {
  AkairoClient,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import {
  categoryChannelSilentTypeCaster,
  categoryChannelTypeCaster,
} from "@fire/src/arguments/category";
import {
  textChannelSilentTypeCaster,
  textChannelTypeCaster,
} from "@fire/src/arguments/textChannel";
import {
  guildChannelSilentTypeCaster,
  guildChannelTypeCaster,
} from "@fire/src/arguments/guildChannel";
import {
  memberSilentTypeCaster,
  memberTypeCaster,
} from "@fire/src/arguments/member";
import { memberRoleChannelCategoryTypeCaster } from "@fire/src/arguments/memberRoleChannelCategory";
import {
  previewSilentTypeCaster,
  previewTypeCaster,
} from "@fire/src/arguments/preview";
import { userMemberSnowflakeTypeCaster } from "@fire/src/arguments/userMemberSnowflake";
import { memberRoleChannelTypeCaster } from "@fire/src/arguments/memberRoleChannel";
import { roleSilentTypeCaster, roleTypeCaster } from "@fire/src/arguments/role";
import { userSilentTypeCaster, userTypeCaster } from "@fire/src/arguments/user";
import { Collection, ClientUser, version as djsver } from "discord.js";
import { SlashCommandMessage } from "./extensions/slashCommandMessage";
import { memberRoleTypeCaster } from "@fire/src/arguments/memberRole";
import { userMemberTypeCaster } from "@fire/src/arguments/userMember";
import { codeblockTypeCaster } from "@fire/src/arguments/codeblock";
import { languageTypeCaster } from "@fire/src/arguments/language";
import { listenerTypeCaster } from "@fire/src/arguments/listener";
import GuildCheckEvent from "@fire/src/ws/events/GuildCheckEvent";
import { Experiment, Treatment } from "./interfaces/experiments";
import { booleanTypeCaster } from "@fire/src/arguments/boolean";
import { commandTypeCaster } from "@fire/src/arguments/command";
import { messageTypeCaster } from "@fire/src/arguments/message";
import { moduleTypeCaster } from "@fire/src/arguments/module";
import { PresenceUpdateAction } from "./util/PresenceUpdate";
import { Language, LanguageHandler } from "./util/language";
import { hasteTypeCaster } from "@fire/src/arguments/haste";
import { ButtonMessage } from "./extensions/buttonMessage";
import { PostgresProvider } from "./providers/postgres";
import { CommandHandler } from "./util/commandhandler";
import { Module, ModuleHandler } from "./util/module";
import { FireMember } from "./extensions/guildmember";
import { MessageUtil } from "./ws/util/MessageUtil";
import { APIGuildMember } from "discord-api-types";
import { FireMessage } from "./extensions/message";
import { Client as PGClient } from "ts-postgres";
import { RESTManager } from "./rest/RESTManager";
import { EventType } from "./ws/util/constants";
import { FireUser } from "./extensions/user";
import { Inhibitor } from "./util/inhibitor";
import { FireConsole } from "./util/console";
import { config } from "@fire/config/index";
import { Listener } from "./util/listener";
import { KSoftClient } from "@aero/ksoft";
import { Command } from "./util/command";
import { Util } from "./util/clientutil";
import * as Sentry from "@sentry/node";
import { Message } from "./ws/Message";
import { Manager } from "./Manager";
import * as moment from "moment";

type ButtonHandler = (button: ButtonMessage) => Promise<any> | any;

import "./extensions";
import { Constants } from "discord.js";

// Rewrite completed - 15:10 17/1/2021
export class Fire extends AkairoClient {
  launchTime: moment.Moment;
  started: boolean;
  restPing: number;

  // Sharding
  manager: Manager;

  // Logging
  console: FireConsole;
  sentry: typeof Sentry | undefined;

  // Handlers
  guildSettings: PostgresProvider;
  userSettings: PostgresProvider;
  commandHandler: CommandHandler;
  inhibitorHandler: InhibitorHandler;
  listenerHandler: ListenerHandler;
  languages: LanguageHandler;
  modules: ModuleHandler;

  // Buttons
  buttonHandlersOnce: Collection<string, ButtonHandler>;
  buttonHandlers: Collection<string, ButtonHandler>;

  // Common Attributes
  experiments: Collection<string, Experiment>;
  aliases: Collection<string, string[]>;
  declare user: FireUser & ClientUser;
  cacheSweepTask: NodeJS.Timeout;
  config: typeof config.fire;
  cacheSweep: () => void;
  ksoft?: KSoftClient;
  useCanary: boolean;
  declare util: Util;
  db: PGClient;

  constructor(manager: Manager, sentry?: typeof Sentry) {
    super({ ...config.akairo, ...config.discord });

    // @ts-ignore
    this.rest = new RESTManager(this);
    this.useCanary = true; // use canary api by default

    // @ts-ignore
    this.actions["PresenceUpdate"] = new PresenceUpdateAction(this);

    this.launchTime = moment();
    this.started = false;
    this.restPing = 0;

    this.manager = manager;
    this.console = new FireConsole();
    this.util = new Util(this);

    this.initDB();

    this.experiments = new Collection();
    this.aliases = new Collection();

    this.on("warn", (warning) => this.console.warn(`[Discord] ${warning}`));
    this.on("error", (error) =>
      this.console.error(`[Discord]\n${error.stack}`)
    );
    this.on("ready", () => config.fire.readyMessage(this));
    this.on("raw", (r) => {
      if (r.t == Constants.WSEvents.GUILD_CREATE) {
        const member = r.d.members.find(
          (member: APIGuildMember) => member.user.id == this.user.id
        ) as APIGuildMember;
        this.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.GUILD_CREATE, {
              id: r.d.id,
              member: GuildCheckEvent.getMemberJSON(member),
            })
          )
        );
      } else if (r.t == Constants.WSEvents.GUILD_DELETE)
        this.manager.ws?.send(
          MessageUtil.encode(
            new Message(EventType.GUILD_DELETE, { id: r.d.id })
          )
        );

      if (
        r.t == Constants.WSEvents.GUILD_MEMBER_ADD &&
        this.manager.ws?.subscribed.includes(r.d?.user?.id)
      )
        this.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.DISCORD_GUILD_MEMBER_ADD, r.d)
          )
        );
      else if (
        r.t == Constants.WSEvents.GUILD_MEMBER_REMOVE &&
        this.manager.ws?.subscribed.includes(r.d?.user?.id)
      )
        this.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.DISCORD_GUILD_MEMBER_REMOVE, r.d)
          )
        );
    });

    if (sentry) {
      this.sentry = sentry;
      this.sentry.setTag("cluster", process.pid.toString());
      this.sentry.setTag("discord.js", djsver);
      this.sentry.setTag("discord-akairo", akairover);
      this.console.log("[Sentry] Connected.");
    }

    this.config = config.fire;

    this.guildSettings = new PostgresProvider(this.db, this, "guildconfig", {
      idColumn: "gid",
      dataColumn: "data",
    });

    this.userSettings = new PostgresProvider(this.db, this, "userconfig", {
      idColumn: "uid",
      dataColumn: "data",
    });

    this.commandHandler = new CommandHandler(this, {
      directory: __dirname.includes("/dist/")
        ? "./dist/src/commands/"
        : "./src/commands/",
      commandUtil: true,
      handleEdits: true,
      fetchMembers: true,
      defaultCooldown: 5000,
      aliasReplacement: /-/im,
      automateCategories: true,
      commandUtilLifetime: 30000,
      prefix: (message: FireMessage) => {
        if (message instanceof SlashCommandMessage) return ["/"];
        const prefixes = message.guild?.settings.get("config.prefix", [
          "$",
        ]) as string[];
        return process.env.SPECIAL_PREFIX
          ? [process.env.SPECIAL_PREFIX, process.env.SPECIAL_PREFIX + " "]
          : message.guild
          ? [
              ...prefixes,
              ...prefixes.map((prefix) => prefix + " "),
              "fire",
              "fire ",
            ]
          : ["$", "fire "];
      },
      ignoreCooldown: (message: FireMessage) => message.author?.isSuperuser(),
    });

    this.commandHandler.on(
      "load",
      async (command: Command, isReload: boolean) => {
        await command?.init();
        if (
          command.guilds.length &&
          !command.guilds.some((guild) =>
            (this.options.shards as number[]).includes(
              this.util.getShard(guild)
            )
          )
        ) {
          this.console.warn(
            `[Commands] Removing ${command.id} due to being locked to ${
              command.guilds.length > 1 ? "guilds" : "a guild"
            } on a different cluster`
          );
          return command.remove();
        }
      }
    );

    this.commandHandler.on("remove", async (command: Command) => {
      await command?.unload();
    });

    this.commandHandler.resolver.addTypes({
      "member|role|channel|category": memberRoleChannelCategoryTypeCaster,
      "user|member|snowflake": userMemberSnowflakeTypeCaster,
      "member|role|channel": memberRoleChannelTypeCaster,
      categorySilent: categoryChannelSilentTypeCaster,
      textChannelSilent: textChannelSilentTypeCaster,
      guildChannelSilent: guildChannelSilentTypeCaster,
      previewSilent: previewSilentTypeCaster,
      memberSilent: memberSilentTypeCaster,
      guildChannel: guildChannelTypeCaster,
      "user|member": userMemberTypeCaster,
      "member|role": memberRoleTypeCaster,
      category: categoryChannelTypeCaster,
      textChannel: textChannelTypeCaster,
      roleSilent: roleSilentTypeCaster,
      userSilent: userSilentTypeCaster,
      codeblock: codeblockTypeCaster,
      language: languageTypeCaster,
      listener: listenerTypeCaster,
      preview: previewTypeCaster,
      boolean: booleanTypeCaster,
      command: commandTypeCaster,
      message: messageTypeCaster,
      member: memberTypeCaster,
      module: moduleTypeCaster,
      haste: hasteTypeCaster,
      role: roleTypeCaster,
      user: userTypeCaster,
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
      gateway: this.ws,
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

    this.ksoft = process.env.KSOFT_TOKEN
      ? new KSoftClient(process.env.KSOFT_TOKEN)
      : undefined;

    this.buttonHandlers = new Collection();
    this.buttonHandlersOnce = new Collection();
  }

  get req(): any {
    // @ts-ignore
    return this.api;
  }

  private async initDB(reconnect: boolean = false) {
    if (this.db && !this.db.closed) await this.db.end();
    delete this.db;
    if (reconnect) await this.util.sleep(2500); // delay reconnect
    this.db = new PGClient({
      host: process.env.POSTGRES_HOST,
      user: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASS,
      database: process.env.POSTGRES_DB,
    });
    this.db.on("error", (err) =>
      this.console.error(`[DB] An error occured, ${err}`)
    );
    this.db.on("connect", () => this.console.log("[DB] Connected"));
    this.db.on("end", (end) => {
      this.console.error(`[DB] Connection ended, attempting to reconnect...`);
      this.initDB(true);
    });

    this.console.warn("[DB] Attempting to connect...");
    this.db.connect().catch((err) => {
      this.console.error(`[DB] Failed to connect\n${err.stack}`);
      this.manager.kill("db_error");
    });

    return this.db;
  }

  async login() {
    if (!this.options.shards) this.options.shards = [this.manager.id || 0];
    this.console.warn(
      `[Discord] Attempting to login on cluster ${
        this.manager.id
      } with shards [${(this.options.shards as number[]).join(", ")}] (Total: ${
        this.options.shardCount
      }).`
    );
    await Promise.all([
      this.loadExperiments(),
      this.loadAliases(),
      this.guildSettings.init(),
      this.userSettings.init(),
    ]);
    this.commandHandler.modules.forEach((command: Command) => {
      if (
        command.guilds.length &&
        !command.guilds.some((guild) =>
          (this.options.shards as number[]).includes(this.util.getShard(guild))
        )
      ) {
        this.console.warn(
          `[Commands] Removing ${command.id} due to being locked to ${
            command.guilds.length > 1 ? "guilds" : "a guild"
          } on a different cluster`
        );
        return command.remove();
      }
    });
    this.cacheSweep = () => {
      this.guilds.cache.forEach((guild) => {
        guild.members.cache.sweep(
          (member: FireMember) =>
            member.id != this.user?.id && !this.isRunningCommand(member)
        );
        guild.presences.cache.sweep(() => true);
      });
      this.users.cache.sweep((user) => user.id != this.user?.id);
    };
    this.cacheSweepTask = setInterval(this.cacheSweep, 120000);
    return super.login();
  }

  private isRunningCommand(member: FireMember) {
    const hasCommandUtil = this.commandHandler.commandUtils.find(
      (util) =>
        util.message.guild?.id == member.guild.id &&
        util.message.author?.id == member.id
    );
    return !!hasCommandUtil;
  }

  async loadExperiments() {
    this.experiments = new Collection();
    const experiments = await this.db
      .query("SELECT * FROM experiments;")
      .catch(() => {});
    if (!experiments) return;
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

  async loadAliases() {
    this.aliases = new Collection();
    const aliases = await this.db
      .query("SELECT * FROM aliases;")
      .catch(() => {});
    if (!aliases) return;
    for await (const alias of aliases) {
      this.aliases.set(
        alias.get("uid") as string,
        (alias.get("aliases") as string[]).map((a) => a.toLowerCase())
      );
    }
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

  getInhibitor(id: string) {
    return this.inhibitorHandler.modules.get(id) as Inhibitor;
  }
}
