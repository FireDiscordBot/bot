import { KSoftClient } from "@aero/ksoft";
import { config } from "@fire/config/index";
import { attachmentTypeCaster } from "@fire/src/arguments/attachment";
import { booleanTypeCaster } from "@fire/src/arguments/boolean";
import {
  categoryChannelSilentTypeCaster,
  categoryChannelTypeCaster,
} from "@fire/src/arguments/category";
import { codeblockTypeCaster } from "@fire/src/arguments/codeblock";
import { commandTypeCaster } from "@fire/src/arguments/command";
import { emojiTypeCaster } from "@fire/src/arguments/emoji";
import {
  guildChannelSilentTypeCaster,
  guildChannelTypeCaster,
} from "@fire/src/arguments/guildChannel";
import { hasteTypeCaster } from "@fire/src/arguments/haste";
import { languageTypeCaster } from "@fire/src/arguments/language";
import { listenerTypeCaster } from "@fire/src/arguments/listener";
import {
  memberSilentTypeCaster,
  memberTypeCaster,
} from "@fire/src/arguments/member";
import { memberRoleTypeCaster } from "@fire/src/arguments/memberRole";
import { memberRoleChannelTypeCaster } from "@fire/src/arguments/memberRoleChannel";
import { messageTypeCaster } from "@fire/src/arguments/message";
import { moduleTypeCaster } from "@fire/src/arguments/module";
import {
  previewSilentTypeCaster,
  previewTypeCaster,
} from "@fire/src/arguments/preview";
import { roleSilentTypeCaster, roleTypeCaster } from "@fire/src/arguments/role";
import {
  textChannelSilentTypeCaster,
  textChannelTypeCaster,
} from "@fire/src/arguments/textChannel";
import { userSilentTypeCaster, userTypeCaster } from "@fire/src/arguments/user";
import { userMemberTypeCaster } from "@fire/src/arguments/userMember";
import { userMemberSnowflakeTypeCaster } from "@fire/src/arguments/userMemberSnowflake";
import GuildCheckEvent from "@fire/src/ws/events/GuildCheckEvent";
import * as Sentry from "@sentry/node";
import {
  AkairoClient,
  ArgumentTypeCaster,
  InhibitorHandler,
  ListenerHandler,
  version as akairover,
} from "discord-akairo";
import { APIGuildMember } from "discord-api-types";
import {
  ClientUser,
  Collection,
  Constants,
  GuildFeatures,
  SnowflakeUtil,
  version as djsver,
} from "discord.js";
import * as fuzz from "fuzzball";
import * as i18next from "i18next";
import { Client as PGClient, SSLMode } from "ts-postgres";
import { ApplicationCommandMessage } from "./extensions/appcommandmessage";
import { ComponentMessage } from "./extensions/componentmessage";
import { ContextCommandMessage } from "./extensions/contextcommandmessage";
import { FireGuild } from "./extensions/guild";
import { FireMember } from "./extensions/guildmember";
import { FireMessage } from "./extensions/message";
import { ModalMessage } from "./extensions/modalmessage";
import { FireUser } from "./extensions/user";
import { IPoint, IWriteOptions } from "./interfaces/aether";
import { GuildApplicationCommandsUpdate } from "./interfaces/discord";
import { Experiment } from "./interfaces/experiments";
import { Manager } from "./Manager";
import { PostgresProvider } from "./providers/postgres";
import { RESTManager } from "./rest/RESTManager";
import { ThreadMembersUpdateAction } from "./util/actions/ThreadMembersUpdate";
import { Util } from "./util/clientutil";
import { Command } from "./util/command";
import { CommandHandler } from "./util/commandhandler";
import { FireConsole } from "./util/console";
import { Inhibitor } from "./util/inhibitor";
import { Language, LanguageHandler } from "./util/language";
import { Listener } from "./util/listener";
import { Module, ModuleHandler } from "./util/module";
import { Message } from "./ws/Message";
import { EventType } from "./ws/util/constants";
import { MessageUtil } from "./ws/util/MessageUtil";
// this shit has some weird import fuckery, this is the only way I can use it
const i18n = i18next as unknown as typeof i18next.default;

type ButtonHandler = (button: ComponentMessage) => Promise<any> | any;
type ModalHandler = (modal: ModalMessage) => Promise<any> | any;
type NonceHandler = (data: unknown) => Promise<any> | any;
type SelectHandler = (data: unknown) => void;

// Rewrite completed - 15:10 17/1/2021 :)
export class Fire extends AkairoClient {
  launchTime: number;
  started: boolean;
  restPing: number;

  // i18n
  i18n: typeof i18next.default;

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

  // Modals
  modalHandlers: Collection<string, ModalHandler>;
  modalHandlersOnce: Collection<string, ModalHandler>;

  // Gateway Events
  nonceHandlers: Collection<string, NonceHandler>;

  // /select Handlers
  selectHandlers: Collection<string, SelectHandler>;

  // Private Utilities
  private readyWait: Promise<Fire>;

  // temp until akairo stops being weird and reverting itself
  clearInterval: typeof clearInterval;
  clearTimeout: typeof clearTimeout;
  setInterval: typeof setInterval;
  setTimeout: typeof setTimeout;

  // Common Attributes
  experiments: Collection<number, Experiment>;
  aliases: Collection<string, string[]>;
  declare user: FireUser & ClientUser;
  config: typeof config.fire;
  ksoft?: KSoftClient;
  useCanary: boolean;
  declare util: Util;
  db: PGClient;

  constructor(manager: Manager, sentry?: typeof Sentry) {
    super({ ...config.akairo, ...config.discord });

    // temp until akairo stops being weird and reverting itself
    this.clearInterval = clearInterval;
    this.clearTimeout = clearTimeout;
    this.setInterval = setInterval;
    this.setTimeout = setTimeout;

    this.i18n = i18n;

    // @ts-ignore
    this.rest = new RESTManager(this);
    this.useCanary = true; // use canary api by default

    // @ts-ignore
    this.actions["ThreadMembersUpdate"] = new ThreadMembersUpdateAction(this);

    this.launchTime = +new Date();
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
    this.nonceHandlers = new Collection();
    this.on("raw", (r: any, shard: number) => {
      if (r.d?.nonce && this.nonceHandlers.has(r.d.nonce)) {
        this.nonceHandlers.get(r.d.nonce)(r.d);
        this.nonceHandlers.delete(r.d.nonce);
      }

      if (
        r.t == Constants.WSEvents.GUILD_CREATE &&
        !r.d?.unavailable &&
        !!this.readyAt
      ) {
        const member =
          (this.guilds.cache.get(r.d.id)?.me as FireMember) ??
          (r.d.members.find(
            (member: APIGuildMember) => member.user.id == this.user.id
          ) as APIGuildMember);
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
      this.sentry.setTag("process", process.pid.toString());
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
      directory: this.isDist ? "./dist/src/commands/" : "./src/commands/",
      commandUtil: true,
      handleEdits: true,
      fetchMembers: true,
      defaultCooldown: 5000,
      aliasReplacement: /-/im,
      automateCategories: true,
      commandUtilLifetime: 30000,
      prefix: (message: FireMessage) => {
        if (
          message instanceof ApplicationCommandMessage ||
          message instanceof ContextCommandMessage
        )
          return ["/"];
        const prefixes = message.guild?.settings.get<string[]>(
          "config.prefix",
          ["$"]
        );
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
      "user|member|snowflake":
        userMemberSnowflakeTypeCaster as ArgumentTypeCaster,
      "member|role|channel": memberRoleChannelTypeCaster,
      guildChannelSilent: guildChannelSilentTypeCaster,
      categorySilent: categoryChannelSilentTypeCaster,
      textChannelSilent: textChannelSilentTypeCaster,
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
      image: attachmentTypeCaster,
      preview: previewTypeCaster,
      boolean: booleanTypeCaster,
      command: commandTypeCaster,
      message: messageTypeCaster,
      member: memberTypeCaster,
      module: moduleTypeCaster,
      haste: hasteTypeCaster,
      emoji: emojiTypeCaster,
      role: roleTypeCaster,
      user: userTypeCaster,
    });

    this.commandHandler.loadAll();

    this.inhibitorHandler = new InhibitorHandler(this, {
      directory: this.isDist ? "./dist/src/inhibitors/" : "./src/inhibitors/",
    });
    this.inhibitorHandler.on("load", async (inhibitor) => {
      if (inhibitor instanceof Inhibitor) await inhibitor?.init();
    });
    this.inhibitorHandler.on("remove", async (inhibitor) => {
      if (inhibitor instanceof Inhibitor) await inhibitor?.unload();
    });

    this.commandHandler.useInhibitorHandler(this.inhibitorHandler);
    this.inhibitorHandler.loadAll();

    this.listenerHandler = new ListenerHandler(this, {
      directory: this.isDist ? "./dist/src/listeners/" : "./src/listeners/",
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
      directory: this.isDist ? "./dist/src/languages/" : "./src/languages/",
    });
    this.languages.loadAll();
    i18n
      .init({
        fallbackLng: "en-US",
        fallbackNS: "fire",
        resources: {},
        lng: "en-US",
      })
      .then(() => {
        this.languages.modules.forEach((language: Language) => language.init());
      });

    this.modules = new ModuleHandler(this, {
      directory: this.isDist ? "./dist/src/modules/" : "./src/modules/",
    });
    this.modules.on("load", async (module: Module, isReload: boolean) => {
      await module?.init();
    });
    this.modules.on("remove", async (module: Module) => {
      await module?.unload();
    });
    this.modules.loadAll();

    // this.ksoft = process.env.KSOFT_TOKEN
    //   ? new KSoftClient(process.env.KSOFT_TOKEN)
    //   : undefined;

    this.buttonHandlers = new Collection();
    this.buttonHandlersOnce = new Collection();
    this.selectHandlers = new Collection();
    this.modalHandlers = new Collection();
    this.modalHandlersOnce = new Collection();
  }

  get req() {
    return this.restManager.api;
  }

  get restManager(): RESTManager {
    // @ts-ignore
    return this.rest;
  }

  get isDist() {
    return __dirname.includes("/dist/") || __dirname.includes("\\dist\\");
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
      ssl: SSLMode.Disable, // we're connecting locally
    });
    this.db.on("error", (err) =>
      this.console.error(`[DB] An error occured\n${err.stack}`)
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
    return super.login();
  }

  waitUntilReady() {
    if (this.readyWait) return this.readyWait;
    this.readyWait = new Promise((resolve) => {
      if (!!this.readyAt) return resolve(this);
      this.once("ready", () => resolve(this));
    });
    return this.readyWait;
  }

  isRunningCommand(user: FireMember | FireUser) {
    const hasCommandUtil = this.commandHandler.commandUtils.find(
      (util) =>
        (user instanceof FireMember
          ? util.message.guild?.id == user.guild.id
          : true) && util.message.author?.id == user.id
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
        hash: Number(experiment.get("id")),
        kind: experiment.get("kind") as "user" | "guild",
        id: experiment.get("label") as string,
        buckets: experiment.get("buckets") as number[],
        active: experiment.get("active") as boolean,
        data: (experiment.get("data") ?? []) as [string, number][],
        filters: [],
      };
      data.buckets.unshift(0); // control bucket
      this.experiments.set(data.hash, data);
    }
    const filters = await this.db.query("SELECT * FROM experimentfilters;");
    for await (const filter of filters) {
      const id = Number(filter.get("id"));
      const data = this.experiments.get(id);
      data.filters.push({
        bucket: filter.get("bucket") as number,
        features: (filter.get("features") ?? []) as GuildFeatures[],
        min_range: (filter.get("min_range") ?? null) as number,
        max_range: (filter.get("max_range") ?? null) as number,
        min_members: (filter.get("min_members") ?? null) as number,
        max_members: (filter.get("max_members") ?? null) as number,
        min_id: (filter.get("min_id")?.toString() ?? null) as string,
        max_id: (filter.get("max_id")?.toString() ?? null) as string,
        min_boosts: (filter.get("min_boosts") ?? null) as number,
        max_boosts: (filter.get("max_boosts") ?? null) as number,
        boost_tier: (filter.get("boost_tier") ?? null) as number,
      });
    }
  }

  refreshExperiments(experiments: Experiment[]) {
    this.manager.ws?.send(
      MessageUtil.encode(new Message(EventType.RELOAD_EXPERIMENTS, experiments))
    );
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

  influx(points: IPoint[], options?: IWriteOptions) {
    this.manager.ws?.send(
      MessageUtil.encode(
        new Message(
          EventType.WRITE_INFLUX_POINTS,
          { points, options },
          // nonce is used to allow returning errors, but we don't currently care about them
          (+new Date()).toString()
        )
      )
    );
  }

  setReadyPresence() {
    // if disconnected, it should fallback to this
    this.options.presence = {
      activities: [
        {
          name: "#StandWithUkraine 🇺🇦",
          // name: "with fire",
          type: "PLAYING",
        },
      ],
      status: "dnd",
    };
    this.ws.shards.forEach((shard) =>
      // @ts-ignore
      this.presence.set({
        activities: [
          {
            name: "#StandWithUkraine 🇺🇦",
            // name:
            //   this.manager.ws && this.options.shardCount != 1
            //     ? `with fire | ${shard.id + 1}/${this.options.shardCount}`
            //     : "with fire",
            type: "PLAYING",
          },
        ],
        status: "dnd",
        shardId: shard.id,
      })
    );
  }

  setPartialOutageStatus() {
    // @ts-ignore
    this.presence.set({
      activities: [
        {
          name: "a potential outage",
          type: "WATCHING",
        },
      ],
      status: "idle",
    });
  }

  requestSlashCommands(
    guild: FireGuild
  ): Promise<GuildApplicationCommandsUpdate> {
    return new Promise((resolve, reject) => {
      let hasResolved = false;
      setTimeout(() => {
        if (!hasResolved) reject("timeout");
      }, 10000);
      const nonce = SnowflakeUtil.generate();
      this.nonceHandlers.set(nonce, (data) => {
        hasResolved = true;
        resolve(data as GuildApplicationCommandsUpdate);
      });
      guild.shard.send({
        op: 24,
        d: {
          applications: true,
          guild_id: guild.id,
          offset: 0,
          type: 1,
          nonce,
        },
      });
    });
  }

  getFuzzyCommands(command: string, limit = 20, forceRatio?: number) {
    let ratio = forceRatio ?? 90;
    let fuzzy: Command[] = [];
    const commands = this.commandHandler.modules.toJSON();
    while (!fuzzy.length && ratio >= (forceRatio ?? 60)) {
      fuzzy = commands.filter(
        (cmd) =>
          fuzz.ratio(
            command.trim().toLowerCase(),
            cmd.id.trim().toLowerCase()
          ) >= ratio--
      );
    }
    if (!fuzzy.length)
      fuzzy = commands.filter((cmd) => cmd.id.startsWith(command));
    if (fuzzy.find((cmd) => cmd.id == command || cmd.aliases.includes(command)))
      fuzzy = [this.getCommand(command)];
    return fuzzy.slice(0, limit);
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
    return null;
  }

  getContextCommand(id: string) {
    id = id.toLowerCase();
    const command = this.commandHandler.modules.find((command) =>
      command.context.includes(id)
    );
    if (command) return command as Command;
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
