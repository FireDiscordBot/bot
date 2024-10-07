import { Fire } from "@fire/lib/Fire";
import { ReactionRoleData } from "@fire/lib/interfaces/rero";
import {
  ActionLogTypes,
  constants,
  DEFAULT_ACTION_LOG_FLAGS,
  DEFAULT_MEMBER_LOG_FLAGS,
  DEFAULT_MOD_LOG_FLAGS,
  GuildTextChannel,
  MemberLogTypes,
  ModLogTypes,
  ModLogTypesEnumToString,
} from "@fire/lib/util/constants";
import { getIDMatch } from "@fire/lib/util/converters";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { GuildSettings } from "@fire/lib/util/settings";
import TicketName from "@fire/src/commands/Tickets/name";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  BaseFetchOptions,
  CategoryChannel,
  Collection,
  DiscordAPIError,
  EmbedFieldData,
  Formatters,
  Guild,
  GuildAuditLogs,
  GuildAuditLogsFetchOptions,
  GuildAuditLogsResolvable,
  GuildBasedChannel,
  GuildChannel,
  GuildFeatures,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageEmbed,
  MessageEmbedOptions,
  OverwriteType,
  PermissionOverwriteOptions,
  Role,
  Snowflake,
  StageChannel,
  Structures,
  ThreadChannel,
  Util,
  VoiceChannel,
  Webhook,
  WebhookClient,
} from "discord.js";
import { RawGuildData } from "discord.js/typings/rawDataTypes";
import { murmur3 } from "murmurhash-js";
import { nanoid } from "nanoid";
import Semaphore from "semaphore-async-await";
import { v4 as uuidv4 } from "uuid";
import { BaseFakeChannel } from "../interfaces/misc";
import { PermRolesData } from "../interfaces/permroles";
import { BadgeType, DiscoverableGuild } from "../interfaces/stats";
import { MessageIterator } from "../util/iterators";
import { LanguageKeys } from "../util/language";
import { GuildLogManager } from "../util/logmanager";
import { FakeChannel } from "./appcommandmessage";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireTextChannel } from "./textchannel";
import { FireUser } from "./user";

const BOOST_TIERS = {
  NONE: 0,
  TIER_1: 1,
  TIER_2: 2,
  TIER_3: 3,
};

const MUTE_DENY_PERMISSION_BITS =
  PermissionFlagsBits.CreatePrivateThreads |
  PermissionFlagsBits.CreatePublicThreads |
  PermissionFlagsBits.SendMessagesInThreads |
  PermissionFlagsBits.RequestToSpeak |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.AddReactions |
  PermissionFlagsBits.Speak;
const MUTE_DENY_PERMISSION_OPTIONS = {
  SEND_MESSAGES_IN_THREADS: false,
  CREATE_PRIVATE_THREADS: false,
  CREATE_PUBLIC_THREADS: false,
  REQUEST_TO_SPEAK: false,
  SEND_MESSAGES: false,
  ADD_REACTIONS: false,
  SPEAK: false,
};
const VIEW_AND_MANAGE_PERMISSION_BITS = (channel: GuildChannel) =>
  (channel.isVoice()
    ? PermissionFlagsBits.Connect
    : PermissionFlagsBits.ViewChannel) | PermissionFlagsBits.ManageRoles;

export class FireGuild extends Guild {
  quoteHooks: Collection<string, Webhook | WebhookClient>;
  reactionRoles: Collection<Snowflake, ReactionRoleData[]>;
  starboardMessages: Collection<Snowflake, Snowflake>;
  persistedRoles: Collection<Snowflake, Snowflake[]>;
  starboardReactions: Collection<Snowflake, number>;
  permRoles: Collection<Snowflake, PermRolesData>;
  ticketLock?: { lock: Semaphore; limit: any };
  inviteRoles: Collection<string, Snowflake>;
  vcRoles: Collection<Snowflake, Snowflake>;
  tempBans: Collection<Snowflake, number>;
  inviteUses: Collection<string, number>;
  mutes: Collection<Snowflake, number>;
  muteCheckTask: NodeJS.Timeout;
  banCheckTask: NodeJS.Timeout;
  settings: GuildSettings;
  logger: GuildLogManager;
  tags: GuildTagManager;
  declare client: Fire;

  constructor(client: Fire, data: RawGuildData) {
    super(client, data);

    this.settings = new GuildSettings(client, this);
    this.mutes = new Collection();
    this.loadMutes();
    this.loadBans();
  }

  get language() {
    return (
      this.client.getLanguage(
        this.settings.get<string>("utils.language", "en-US")
      ) ?? this.client.getLanguage("en-US")
    );
  }

  get premium() {
    return this.client.util?.premium.has(this.id);
  }

  get muteRole() {
    const id = this.settings.get<Snowflake>(
      "mod.mutedrole",
      this.roles.cache.find((role) => role.name == "Muted")?.id
    );
    if (!id) return null;
    return this.roles.cache.get(id);
  }

  get logIgnored() {
    return this.settings.get<string[]>("utils.logignore", []);
  }

  get regions() {
    let regions = this.channels.cache
      .filter(
        (channel) =>
          channel.type == "GUILD_VOICE" || channel.type == "GUILD_STAGE_VOICE"
      )
      .map((channel: VoiceChannel | StageChannel) => channel.rtcRegion);
    regions = regions.filter(
      // remove duplicates
      (region, index) => regions.indexOf(region) === index
    );
    if (regions.includes(null))
      regions.splice(0, 0, regions.splice(regions.indexOf(null), 1)[0]);
    return regions;
  }

  get guildChannels() {
    return {
      cache: this.channels.cache.filter(
        (channel) =>
          !(channel instanceof ThreadChannel) && !!channel.permissionOverwrites
      ) as Collection<Snowflake, Exclude<GuildBasedChannel, ThreadChannel>>,
    };
  }

  get discoverableInviteChannel() {
    return (
      this.systemChannel ||
      this.rulesChannel ||
      (this.guildChannels.cache
        .filter(
          (channel) =>
            channel.type == "GUILD_TEXT" &&
            channel
              .permissionsFor(this.roles.everyone, false)
              ?.has(PermissionFlagsBits.ViewChannel)
        )
        .first() as FireTextChannel)
    );
  }

  _patch(data) {
    if (data.members)
      data.members = data.members.filter(
        (m) => m.user?.id == this.client.user?.id
      );
    if (data.presences) delete data.presences;

    // @ts-ignore
    super._patch(data);
  }

  fetchOwner(options?: BaseFetchOptions) {
    return super.fetchOwner(options) as Promise<FireMember>;
  }

  async fetchAuditLogs<T extends GuildAuditLogsResolvable = "ALL">(
    options?: GuildAuditLogsFetchOptions<T>
  ) {
    // // litecord doesn't have audit logs so we don't even bother with the request
    if (process.env.USE_LITECORD == "true")
      return new GuildAuditLogs<"ALL">(this, {
        guild_scheduled_events: [],
        application_commands: [],
        audit_log_entries: [],
        integrations: [],
        webhooks: [],
        threads: [],
        users: [],
      });
    else return super.fetchAuditLogs<T>(options);
  }

  async initMuteRole() {
    if (!this.available) return;
    if (this.muteRole) return this.muteRole;
    const muteCommand = this.client.getCommand("mute");
    if (
      this.members.me.permissions.missing(muteCommand.clientPermissions).length
    )
      return;
    const role = await this.roles
      .create({
        position: this.members.me.roles.highest.rawPosition - 2, // -1 seems to fail a lot more than -2 so just do -2 to be safe
        mentionable: false,
        color: "#24242c",
        permissions: [],
        name: "Muted",
        hoist: false,
        reason: this.language.get("MUTE_ROLE_CREATE_REASON"),
      })
      .catch((e) => {
        this.client.console.warn(
          `[Guilds] Failed to create mute role in ${this.name} due to\n${e.stack}`
        );
      });
    if (!role) return false;
    this.settings.set<string>("mod.mutedrole", role.id);
    for (const [, channel] of this.guildChannels.cache) {
      if (
        !this.members.me
          .permissionsIn(channel)
          .has(VIEW_AND_MANAGE_PERMISSION_BITS(channel))
      )
        continue;
      const denied = channel.permissionOverwrites.cache.get(role.id)?.deny;
      if (
        typeof denied == "undefined" ||
        !denied.has(MUTE_DENY_PERMISSION_BITS)
      )
        await channel.permissionOverwrites
          .edit(role, MUTE_DENY_PERMISSION_OPTIONS, {
            reason: this.language.get("MUTE_ROLE_CREATE_REASON"),
            type: 0,
          })
          .catch(() => {});
    }
    return role;
  }

  async changeMuteRole(role: Role) {
    if (!this.available) return;
    let changed: Role | void = role;
    const muteCommand = this.client.getCommand("mute");
    if (
      this.members.me.permissions.missing(muteCommand.clientPermissions).length
    )
      return;
    if (
      role.rawPosition != this.members.me.roles.highest.rawPosition - 2 ||
      role.permissions.bitfield != 0n
    ) {
      changed = await role
        .edit(
          {
            position: this.members.me.roles.highest.rawPosition - 2,
            permissions: [],
          },
          this.language.get("MUTE_ROLE_CREATE_REASON")
        )
        .catch(() => {});
      if (!changed) return false;
    }
    this.settings.set<string>("mod.mutedrole", role.id);
    for (const [, channel] of this.guildChannels.cache) {
      if (
        !this.members.me
          .permissionsIn(channel)
          .has(VIEW_AND_MANAGE_PERMISSION_BITS(channel))
      )
        continue;
      const denied = channel.permissionOverwrites.cache.get(role.id)?.deny;
      if (
        typeof denied == "undefined" ||
        !denied.has(MUTE_DENY_PERMISSION_BITS)
      )
        await channel.permissionOverwrites
          .edit(role, MUTE_DENY_PERMISSION_OPTIONS, {
            reason: this.language.get("MUTE_ROLE_CREATE_REASON"),
            type: 0,
          })
          .catch(() => (changed = void 0));
    }
    return changed;
  }

  async syncMuteRolePermissions() {
    if (!this.muteRole) return;
    const muteCommand = this.client.getCommand("mute");
    if (
      this.members.me.permissions.missing(muteCommand.clientPermissions).length
    )
      return;
    const role = this.muteRole;
    for (const [, channel] of this.guildChannels.cache) {
      if (
        !this.members.me
          .permissionsIn(channel)
          .has(VIEW_AND_MANAGE_PERMISSION_BITS(channel))
      )
        continue;
      const denied = channel.permissionOverwrites.cache.get(role.id)?.deny;
      if (
        typeof denied == "undefined" ||
        !denied.has(MUTE_DENY_PERMISSION_BITS)
      )
        await channel.permissionOverwrites
          .edit(role, MUTE_DENY_PERMISSION_OPTIONS, {
            reason: this.language.get("MUTE_ROLE_CREATE_REASON"),
            type: 0,
          })
          .catch(() => {});
    }
  }

  private async loadMutes() {
    this.mutes = new Collection();
    const mutes = await this.client.db
      .query("SELECT * FROM mutes WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!mutes)
      return this.client.console.error(
        `[Guild] Failed to load mutes for ${this.name} (${this.id})`
      );
    for await (const mute of mutes) {
      this.mutes.set(
        mute.get("uid") as Snowflake,
        parseInt(mute.get("until") as string)
      );
    }
    if (this.muteCheckTask) clearInterval(this.muteCheckTask);
    this.muteCheckTask = setInterval(this.checkMutes.bind(this), 60000);
  }

  private async loadBans() {
    this.tempBans = new Collection();
    const bans = await this.client.db
      .query("SELECT * FROM bans WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!bans)
      return this.client.console.error(
        `[Guild] Failed to load bans for ${this.name} (${this.id})`
      );
    for await (const ban of bans) {
      this.tempBans.set(
        ban.get("uid") as Snowflake,
        parseInt(ban.get("until") as string)
      );
    }
    if (this.banCheckTask) clearInterval(this.banCheckTask);
    this.banCheckTask = setInterval(this.checkBans.bind(this), 90000);
  }

  private async checkMutes() {
    if (!this.client.user || !this.available) return; // likely not ready yet or guild is unavailable
    const me =
      this.members.me instanceof FireMember
        ? this.members.me
        : ((await this.members
            .fetch({ user: this.client.user.id, cache: true })
            .catch(() => {})) as FireMember);
    if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) return;
    const now = +new Date();
    for (const [id] of this.mutes.filter(
      // likely never gonna be equal but if somehow it is then you're welcome
      (time) => !!time && now >= time
    )) {
      const member = (await this.members
        .fetch(id)
        .catch(() => {})) as FireMember;
      if (member) {
        const unmuted = await member.unmute(
          this.language.get("UNMUTE_AUTOMATIC"),
          this.members.me as FireMember
        );
        this.mutes.delete(id); // ensures id is removed from cache even if above fails to do so
        if (typeof unmuted == "string") {
          this.client.console.warn(
            `[Guild] Failed to remove mute for ${member} (${id}) in ${this.name} (${this.id}) due to ${unmuted}`
          );
          await this.modLog(
            this.language.get("UNMUTE_AUTO_FAIL", {
              member: `${member} (${id})`,
              reason: this.language.get(
                `UNMUTE_FAILED_${unmuted.toUpperCase()}` as LanguageKeys
              ),
            }),
            ModLogTypes.UNMUTE
          );
        } else continue;
      } else {
        this.mutes.delete(id);
        const dbremove = await this.client.db
          .query("DELETE FROM mutes WHERE gid=$1 AND uid=$2;", [this.id, id])
          .catch(() => {});
        const embed = new MessageEmbed()
          .setColor(me.displayColor || "#FFFFFF")
          .setTimestamp(now)
          .setAuthor({
            name: this.language.get("UNMUTE_LOG_AUTHOR", { user: id }),
            iconURL: this.iconURL({ size: 2048, format: "png", dynamic: true }),
          })
          .addFields({
            name: this.language.get("MODERATOR"),
            value: me.toString(),
          })
          .setFooter({ text: id.toString() });
        if (!dbremove)
          embed.addFields({
            name: this.language.get("ERROR"),
            value: this.language.get("UNMUTE_FAILED_DB_REMOVE"),
          });
        await this.modLog(embed, ModLogTypes.UNMUTE).catch(() => {});
      }
    }
  }

  private async checkBans() {
    if (!this.client.user || !this.available) return; // likely not ready yet or guild is unavailable
    const me =
      this.members.me instanceof FireMember
        ? this.members.me
        : ((await this.members
            .fetch({ user: this.client.user.id, cache: true })
            .catch(() => {})) as FireMember);
    if (!me || !me.permissions.has(PermissionFlagsBits.BanMembers)) return;
    const now = +new Date();
    for (const [id] of this.tempBans.filter(
      // likely never gonna be equal but if somehow it is then you're welcome
      (time) => !!time && now >= time
    )) {
      const user = (await this.client.users
        .fetch(id)
        .catch(() => {})) as FireUser; // todo check error code
      if (!user) continue;
      await this.unban(
        user,
        this.language.get("UNBAN_AUTOMATIC"),
        this.members.me as FireMember
      );
    }
  }

  get starboard() {
    return this.channels.cache.get(
      this.settings.get<Snowflake>("starboard.channel")
    ) as FireTextChannel;
  }

  async loadStarboardMessages() {
    this.starboardMessages = new Collection();
    const messages = await this.client.db
      .query("SELECT * FROM starboard WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!messages)
      return this.client.console.error(
        `[Guild] Failed to load starboard messages for ${this.name} (${this.id})`
      );
    for await (const message of messages)
      this.starboardMessages.set(
        message.get("original") as Snowflake,
        message.get("board") as Snowflake
      );
  }

  async loadStarboardReactions() {
    this.starboardReactions = new Collection();
    const reactions = await this.client.db
      .query("SELECT * FROM starboard_reactions WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!reactions)
      return this.client.console.error(
        `[Guild] Failed to load starboard reactions for ${this.name} (${this.id})`
      );
    for await (const reaction of reactions)
      this.starboardReactions.set(
        reaction.get("mid") as Snowflake,
        reaction.get("reactions") as number
      );
  }

  async loadInviteRoles() {
    this.inviteRoles = new Collection();
    if (!this.premium || !this.available) return;
    const invroles = await this.client.db
      .query("SELECT * FROM invrole WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!invroles)
      return this.client.console.error(
        `[Guild] Failed to load invite roles for ${this.name} (${this.id})`
      );
    for await (const invrole of invroles)
      this.inviteRoles.set(
        invrole.get("inv") as string,
        invrole.get("rid") as Snowflake
      );
  }

  async loadPersistedRoles() {
    this.persistedRoles = new Collection();
    if (!this.premium || !this.available) return;
    const persisted = await this.client.db
      .query("SELECT * FROM rolepersists WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!persisted)
      return this.client.console.error(
        `[Guild] Failed to load persisted roles for ${this.name} (${this.id})`
      );
    for await (const role of persisted)
      this.persistedRoles.set(
        role.get("uid") as Snowflake,
        role.get("roles") as Snowflake[]
      );
  }

  async loadVcRoles() {
    this.vcRoles = new Collection();
    if (!this.premium || !this.available) return;
    const voiceroles = await this.client.db
      .query("SELECT * FROM vcroles WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!voiceroles)
      return this.client.console.error(
        `[Guild] Failed to load voice roles for ${this.name} (${this.id})`
      );
    for await (const vcrole of voiceroles) {
      this.vcRoles.set(
        vcrole.get("cid") as Snowflake,
        vcrole.get("rid") as Snowflake
      );
      await this.client.waitUntilReady(); // this will resolve when ready or if already ready
      const channel = this.channels.cache.get(
        vcrole.get("cid") as Snowflake
      ) as VoiceChannel | StageChannel;
      if (!channel) continue;
      const role = this.roles.cache.get(vcrole.get("rid") as Snowflake);
      if (!role) continue;
      const members = await this.members
        .fetch({
          user: this.voiceStates.cache.map((state) => state.id),
        })
        .catch(() => {});
      if (!members) return;
      for (const [, state] of this.voiceStates.cache.filter(
        (state) =>
          state.channelId == channel.id &&
          !members.get(state.id)?.roles.cache.has(role.id) &&
          !members.get(state.id)?.user.bot
      ))
        await members
          .get(state.id)
          ?.roles.add(role, this.language.get("VCROLE_ADD_REASON"))
          .catch(() => {});
    }
  }

  async loadReactionRoles() {
    this.reactionRoles = new Collection();
    if (!this.premium || !this.available) return;
    const reactRoles = await this.client.db
      .query("SELECT * FROM reactrole WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!reactRoles)
      return this.client.console.error(
        `[Guild] Failed to load reaction roles for ${this.name} (${this.id})`
      );
    for await (const rero of reactRoles) {
      const mid = rero.get("mid") as Snowflake;
      if (!this.reactionRoles.has(mid)) this.reactionRoles.set(mid, []);
      this.reactionRoles.get(mid).push({
        role: rero.get("rid") as Snowflake,
        emoji: rero.get("eid") as Snowflake | string,
      });
    }
  }

  async loadPermRoles() {
    this.permRoles = new Collection();
    const permRoles = await this.client.db
      .query("SELECT * FROM permroles WHERE gid=$1;", [this.id])
      .catch(() => {});
    if (!permRoles)
      return this.client.console.error(
        `[Guild] Failed to load permission roles for ${this.name} (${this.id})`
      );
    for await (const role of permRoles) {
      if (!this.roles.cache.has(role.get("rid") as Snowflake)) continue;
      this.permRoles.set(role.get("rid") as Snowflake, {
        allow: BigInt(role.get("allow") as string),
        deny: BigInt(role.get("deny") as string),
      });
    }
    await this.client.waitUntilReady();
    if (this.guildChannels.cache.size >= 100 && !this.premium) return;
    for (const [, channel] of this.guildChannels.cache.filter(
      (channel) =>
        channel
          .permissionsFor(this.members.me)
          .has(
            PermissionFlagsBits.ViewChannel | PermissionFlagsBits.ManageRoles
          ) &&
        this.permRoles
          .filter((_, rid) => this.roles.cache.has(rid))
          .some(
            (data, role) =>
              !channel.permissionOverwrites.cache.has(role) ||
              channel.permissionOverwrites.cache.get(role).allow.bitfield !=
                data.allow ||
              channel.permissionOverwrites.cache.get(role).deny.bitfield !=
                data.deny
          )
    ))
      await channel.permissionOverwrites
        .set(
          [
            ...channel.permissionOverwrites.cache
              .filter(
                // ensure the overwrites below are used instead
                (overwrite) => !this.permRoles.has(overwrite.id)
              )
              .toJSON(),
            ...this.permRoles
              .filter((_, rid) => this.roles.cache.has(rid))
              .map((data, role) => ({
                allow: data.allow,
                deny: data.deny,
                id: role,
                type: "role" as OverwriteType, // idk why this is necessary but whatever
              })),
          ],
          this.language.get("PERMROLES_REASON")
        )
        .catch(() => {});
  }

  async loadInvites() {
    if (
      !this.premium ||
      !this.available ||
      !this.members.me.permissions.has(PermissionFlagsBits.ManageGuild)
    )
      return;
    this.inviteUses = new Collection();
    const invites = await this.invites.fetch({ cache: false }).catch(() => {});
    if (!invites) return this.inviteUses;
    for (const [code, invite] of invites)
      this.inviteUses.set(code, invite.uses);
    if (this.features.includes("VANITY_URL")) {
      const vanity = await this.fetchVanityData().catch(() => {});
      if (vanity) this.inviteUses.set(vanity.code, vanity.uses);
    }
    return this.inviteUses;
  }

  isPublic() {
    if (!this.available || this.features.includes("INVITES_DISABLED"))
      return false;
    // node_env is only "development" for local testing, it's "staging" for fire beta
    if (process.env.NODE_ENV == "development") return true;
    // allow forcing public to false for guilds in discord's discovery
    if (this.settings.get<boolean>("utils.public", null) == false) return false;
    return (
      !this.features.includes("DISCOVERABLE_DISABLED" as GuildFeatures) &&
      ((this.settings.get<boolean>("utils.public", false) &&
        this.memberCount >= 20 &&
        +new Date() - this.createdTimestamp > 2629800000) ||
        (this.features &&
          this.features.includes("DISCOVERABLE") &&
          this.members.me
            ?.permissionsIn(this.discoverableInviteChannel)
            ?.has(PermissionFlagsBits.CreateInstantInvite)))
    );
  }

  get guildBadge(): BadgeType {
    if (!this.features.length) return null;
    if (this.features.includes("VERIFIED")) return "VERIFIED";
    else if (this.features.includes("PARTNERED")) return "PARTNERED";
    else if (this.premiumTier == "TIER_1") return "BOOST_FRIENDS";
    else if (this.premiumTier == "TIER_2") return "BOOST_GROUPS";
    else if (this.premiumTier == "TIER_3") return "BOOST_COMMUNITIES";
    return null;
  }

  getDiscoverableData(): DiscoverableGuild {
    let splash = "";
    if (!this.available)
      return {
        name: this.name || "Unavailable Guild",
        id: this.id,
        icon: "https://cdn.discordapp.com/emojis/293495010719170560.png?v=1",
        splash,
        members: 0,
        badge: this.guildBadge,
        featured: false,
        shard: this.shardId,
        cluster: this.client.manager.id,
      };
    if (this.splash)
      splash = this.splashURL({
        size: 16,
        format: "png",
      }).replace("size=16", "size=320");
    else if (this.discoverySplash)
      splash = this.discoverySplashURL({
        size: 16,
        format: "png",
      }).replace("size=16", "size=320");
    const icon =
      this.iconURL({
        format: "png",
        size: 128,
        dynamic: true,
      }) ||
      `https://cdn.discordapp.com/embed/avatars/${BigInt(this.id) % 5n}.png`;
    return {
      name: this.name,
      id: this.id,
      icon,
      splash,
      members: this.memberCount,
      badge: this.guildBadge,
      featured: this.settings.get<boolean>(
        "utils.featured",
        this.features.includes("FEATURABLE")
      ),
      shard: this.shardId,
      cluster: this.client.manager.id,
    };
  }

  isAnyLogTypeEnabled() {
    return (
      (
        this.settings.has("log.action") &&
        this.channels.cache.get(this.settings.get<Snowflake>("log.action"))
      )?.type == "GUILD_TEXT" ||
      (this.settings.has("log.moderation") &&
        this.channels.cache.get(this.settings.get<Snowflake>("log.moderation"))
          ?.type == "GUILD_TEXT") ||
      (this.settings.has("log.members") &&
        this.channels.cache.get(this.settings.get<Snowflake>("log.members"))
          ?.type == "GUILD_TEXT")
    );
  }

  async actionLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: ActionLogTypes
  ) {
    if (this.isAnyLogTypeEnabled() && !this.logger)
      this.logger = new GuildLogManager(this.client, this);
    if (!this.logger?.isActionEnabled()) return;

    const channel = this.channels.cache.get(
      this.settings.get<Snowflake>("log.action")
    );

    const flags = this.settings.get(
      "logging.action.flags",
      DEFAULT_ACTION_LOG_FLAGS
    );
    if (type != ActionLogTypes.SYSTEM && (flags & type) != type) return;

    if (
      channel &&
      !this.members.me
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ManageWebhooks)
    )
      return await (channel as FireTextChannel)
        .send({
          content: typeof log == "string" ? log : null,
          embeds: typeof log != "string" ? [log] : null,
        })
        .catch(() => {});
    else {
      return await this.logger.handleAction(log, type);
    }
  }

  async modLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: ModLogTypes
  ) {
    if (this.isAnyLogTypeEnabled() && !this.logger)
      this.logger = new GuildLogManager(this.client, this);
    if (!this.logger?.isModerationEnabled()) return;

    const channel = this.channels.cache.get(
      this.settings.get<Snowflake>("log.moderation")
    );

    const flags = this.settings.get(
      "logging.moderation.flags",
      DEFAULT_MOD_LOG_FLAGS
    );
    if (type != ModLogTypes.SYSTEM && (flags & type) != type) return;

    if (
      channel &&
      !this.members.me
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ManageWebhooks)
    )
      return await (channel as FireTextChannel)
        .send({
          content: typeof log == "string" ? log : null,
          embeds: typeof log != "string" ? [log] : null,
        })
        .catch(() => {});
    else {
      if (!this.logger) this.logger = new GuildLogManager(this.client, this);
      return await this.logger.handleModeration(log, type);
    }
  }

  async memberLog(
    log: string | MessageEmbed | MessageEmbedOptions,
    type: MemberLogTypes
  ) {
    if (this.isAnyLogTypeEnabled() && !this.logger)
      this.logger = new GuildLogManager(this.client, this);
    if (!this.logger?.isMembersEnabled()) return;

    const channel = this.channels.cache.get(
      this.settings.get<Snowflake>("log.members")
    );

    const flags = this.settings.get(
      "logging.members.flags",
      DEFAULT_MEMBER_LOG_FLAGS
    );
    if (type != MemberLogTypes.SYSTEM && (flags & type) != type) return;

    if (
      channel &&
      !this.members.me
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ManageWebhooks)
    )
      return await (channel as FireTextChannel)
        .send({
          content: typeof log == "string" ? log : null,
          embeds: typeof log != "string" ? [log] : null,
        })
        .catch(() => {});
    else {
      if (!this.logger) this.logger = new GuildLogManager(this.client, this);
      return await this.logger.handleMembers(log, type);
    }
  }

  hasExperiment(id: number, bucket: number | number[]): boolean {
    // if (this.client.config.dev) return true;
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild") return false;
    if (!experiment.active) return true;
    if (Array.isArray(bucket))
      return bucket
        .map((b) => this.hasExperiment(id, b))
        .some((hasexp) => !!hasexp);
    if (bucket == 0)
      return experiment.buckets
        .slice(1)
        .map((b) => this.hasExperiment(id, b))
        .every((hasexp) => hasexp == false);
    if (!!experiment.data.find(([i, b]) => i == this.id && b == bucket))
      // override
      return true;
    else if (!!experiment.data.find(([i, b]) => i == this.id && b != bucket))
      // override for another bucket, stop here and ignore filters
      return false;
    const filters = experiment.filters.find(
      (filter) => filter.bucket == bucket
    );
    if (!filters) return false;
    if (
      filters.features.length &&
      !filters.features.every((feature) => this.features.includes(feature))
    )
      return false;
    if (
      typeof filters.min_range == "number" &&
      murmur3(`${experiment.id}:${this.id}`) % 1e4 < filters.min_range
    )
      return false;
    if (
      typeof filters.max_range == "number" &&
      murmur3(`${experiment.id}:${this.id}`) % 1e4 >= filters.max_range
    )
      return false;
    if (
      typeof filters.min_members == "number" &&
      this.memberCount < filters.min_members
    )
      return false;
    if (
      typeof filters.max_members == "number" &&
      this.memberCount >= filters.max_members
    )
      return false;
    if (
      typeof filters.min_id == "string" &&
      BigInt(this.id) < BigInt(filters.min_id)
    )
      return false;
    if (
      typeof filters.max_id == "string" &&
      BigInt(this.id) >= BigInt(filters.max_id)
    )
      return false;
    if (
      typeof filters.min_boosts == "number" &&
      this.premiumSubscriptionCount < filters.min_boosts
    )
      return false;
    if (
      typeof filters.max_boosts == "number" &&
      this.premiumSubscriptionCount >= filters.max_boosts
    )
      return false;
    if (
      typeof filters.boost_tier == "number" &&
      BOOST_TIERS[this.premiumTier] != filters.boost_tier
    )
      return false;
    return true;
  }

  async giveExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    if (!experiment.buckets.includes(bucket)) throw new Error("Invalid Bucket");
    experiment.data = experiment.data.filter(([i]) => i != this.id);
    experiment.data.push([this.id, bucket]);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return this.hasExperiment(id, bucket);
  }

  async removeExperiment(id: number, bucket: number) {
    const experiment = this.client.experiments.get(id);
    if (!experiment || experiment.kind != "guild")
      throw new Error("Experiment is not a guild experiment");
    const b = experiment.data.length;
    experiment.data = experiment.data.filter(
      ([i, b]) => i != this.id && b != bucket
    );
    if (b == experiment.data.length) return !this.hasExperiment(id, bucket);
    await this.client.db.query("UPDATE experiments SET data=$1 WHERE id=$2;", [
      experiment.data?.length ? experiment.data : null,
      BigInt(experiment.hash),
    ]);
    this.client.experiments.set(experiment.hash, experiment);
    this.client.refreshExperiments([experiment]);
    return !this.hasExperiment(id, bucket);
  }

  areTicketsEnabled() {
    const parents = this.settings.get<Snowflake[]>("tickets.parent", []);
    if (!parents.length || !this.channels.cache.has(parents[0])) return false;
    return true;
  }

  get tickets() {
    const textChannelsAndThreads = [
      ...this.channels.cache
        .filter((channel) => channel.type == "GUILD_TEXT")
        .toJSON(),
      ...this.channels.cache
        .filter((channel) => channel.type == "GUILD_TEXT")
        .flatMap((channel: FireTextChannel) => channel.threads.cache)
        .toJSON(),
    ] as (FireTextChannel | ThreadChannel)[];
    return this.settings
      .get<Snowflake[]>("tickets.channels", [])
      .map((id) => textChannelsAndThreads.find((channel) => channel.id == id))
      .filter((channel) => !!channel);
  }

  get ticketIds() {
    return this.settings.get<Snowflake[]>("tickets.channels", []);
  }

  getTickets(user?: Snowflake) {
    if (!user) return this.tickets;
    let channels = this.settings
      .get<Snowflake[]>("tickets.channels", [])
      .map((id) =>
        this.channels.cache
          .filter(
            (channel) =>
              (channel.type == "GUILD_TEXT" ||
                channel instanceof ThreadChannel) &&
              channel.id == id
          )
          .get(id)
      ) as (FireTextChannel | ThreadChannel)[];

    return channels.filter((channel: FireTextChannel | ThreadChannel) =>
      channel instanceof FireTextChannel
        ? channel.topic.includes(user)
        : channel?.name.includes(user) && !channel?.archived
    );
  }

  async createTicket(
    author: FireMember,
    subject: string,
    channel?: FireTextChannel,
    category?: CategoryChannel,
    descriptionOverride?: string,
    additionalFields: EmbedFieldData[] = []
  ) {
    if (channel instanceof BaseFakeChannel)
      channel = channel.real as FireTextChannel;

    if (author?.guild?.id != this.id) return "author";
    if (this.client.util.isBlacklisted(author.id, this)) return "blacklisted";
    const limit = this.settings.get<number>("tickets.limit", 1);
    if (!this.ticketLock?.lock || this.ticketLock?.limit != limit)
      this.ticketLock = { lock: new Semaphore(limit), limit };
    const permits = this.ticketLock.lock.getPermits();
    if (!permits) return "lock";

    // we need this parents var so we have a duplicate of FireGuild#areTicketsEnabled
    const parents = this.settings.get<Snowflake[]>("tickets.parent", []);
    if (!parents.length || !this.channels.cache.has(parents[0]))
      return "disabled";
    const toggled = this.settings.has("tickets.togglemsg");
    if (toggled) return "toggled";

    const useThreads =
      this.hasExperiment(1651882237, 1) &&
      this.channels.cache.get(parents[0]).type != "GUILD_CATEGORY";

    category =
      category ||
      (this.channels.cache.find(
        (chan) =>
          chan.type == "GUILD_CATEGORY" &&
          parents.includes(chan.id) &&
          chan.children.size < 50
      ) as CategoryChannel);
    if (!category && !useThreads) {
      const originalParent = this.channels.cache.get(
        parents[0]
      ) as CategoryChannel;
      const overflowCategory = await originalParent
        .clone({
          name: `${originalParent.name} ${parents.length + 1}`,
          position: originalParent.position + 1,
          reason: this.language.get("TICKET_OVERFLOW_CREATE_REASON"),
        })
        .catch((e) => {
          // prevent capturing permission errors
          if (!(e instanceof DiscordAPIError && e.httpStatus == 403))
            this.client.sentry.captureException(e);
        });
      if (!overflowCategory) return "overflow";
      else {
        parents.push(overflowCategory.id);
        this.settings.set<Snowflake[]>("tickets.parent", parents);
        category = overflowCategory;
      }
    }

    let locked = false;
    setTimeout(() => {
      if (locked) this.ticketLock.lock.release();
    }, 15000);
    await this.ticketLock.lock.acquire().then(() => (locked = true));
    if (this.getTickets(author.id).length >= limit) {
      locked = false;
      this.ticketLock.lock.release();
      return "limit";
    }

    let channels = this.tickets;
    const words = (this.client.getCommand("ticket-name") as TicketName).words;
    let increment = this.settings.get<number>("tickets.increment", 0);
    const variables = {
      "{increment}": increment.toString(),
      "{name}": author.user.username,
      "{id}": author.id,
      "{word}": this.client.util.randomItem<string>(words),
      "{uuid}": uuidv4().slice(0, 4),
      "{crab}": "🦀", // CRAB IN DA CODE
    };
    let name = useThreads
      ? `${author} (${author.id})`
      : this.settings.get<string>("tickets.name", "ticket-{increment}");
    for (const [key, value] of Object.entries(variables)) {
      name = name.replace(key, value);
    }
    name = name.replace(/crab/gim, "🦀");
    this.settings.set<number>("tickets.increment", ++increment);
    const overwriteTheOverwrites = [
      author.id,
      this.members.me.id,
      this.roles.everyone.id,
    ];

    let ticket: FireTextChannel | ThreadChannel;

    if (useThreads) {
      const threadParent = this.channels.cache.get(parents[0]);
      if (
        !threadParent.isText() ||
        // the following should not be possible
        // and are purely for typings
        threadParent.isVoice() ||
        threadParent.isThread() ||
        threadParent.type == "GUILD_NEWS"
      )
        return "disabled";
      ticket = (await threadParent.threads
        .create({
          name,
          autoArchiveDuration: this.settings.get("tickets.autoarchive", 10080),
          reason: this.language.get(
            subject
              ? ("TICKET_SUBJECT_CHANNEL_TOPIC" as LanguageKeys)
              : ("TICKET_CHANNEL_TOPIC" as LanguageKeys),
            { author: author.toString(), id: author.id, subject }
          ),
          invitable: this.settings.get("tickets.invitable", true),
          type: "GUILD_PRIVATE_THREAD",
        })
        .catch((e: Error) => e)) as ThreadChannel;
      if (ticket instanceof ThreadChannel) {
        await ticket.members.add(author).catch(() => {});
        if (
          threadParent.permissionOverwrites.cache.filter(
            (overwrite) =>
              overwrite.type == "member" &&
              overwrite.allow.has(PermissionFlagsBits.ManageThreads)
          ).size
        ) {
          const members = await this.members
            .fetch({
              user: threadParent.permissionOverwrites.cache
                .filter(
                  (overwrite) =>
                    overwrite.type == "member" &&
                    overwrite.allow.has(PermissionFlagsBits.ManageThreads)
                )
                .map((overwrite) => overwrite.id),
            })
            .catch(() => {});
          if (members)
            for (const [, member] of members)
              await ticket.members.add(member).catch(() => {});
        }
      }
    } else
      ticket = (await this.channels
        .create(name.slice(0, 50), {
          parent: category,
          permissionOverwrites: [
            ...category.permissionOverwrites.cache
              .filter(
                // ensure the overwrites below are used instead
                (overwrite) => !overwriteTheOverwrites.includes(overwrite.id)
              )
              .map((overwrite) => {
                // we can't set manage roles without admin so just remove it
                if (overwrite.allow.has(PermissionFlagsBits.ManageRoles))
                  overwrite.allow = overwrite.allow.remove(
                    PermissionFlagsBits.ManageRoles
                  );
                if (overwrite.deny.has(PermissionFlagsBits.ManageRoles))
                  overwrite.deny = overwrite.deny.remove(
                    PermissionFlagsBits.ManageRoles
                  );
                return overwrite;
              }),
            {
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
              ],
              type: "member",
              id: author.id,
            },
            {
              allow: [
                PermissionFlagsBits.ViewChannel,
                PermissionFlagsBits.SendMessages,
                PermissionFlagsBits.ManageChannels,
              ],
              type: "member",
              id: this.members.me.id,
            },
            {
              id: this.roles.everyone.id,
              deny: [PermissionFlagsBits.ViewChannel],
              type: "role",
            },
          ],
          topic: this.language.get(
            subject
              ? ("TICKET_SUBJECT_CHANNEL_TOPIC" as LanguageKeys)
              : ("TICKET_CHANNEL_TOPIC" as LanguageKeys),
            { author: author.toString(), id: author.id, subject }
          ),
          reason: this.language.get(
            subject
              ? ("TICKET_SUBJECT_CHANNEL_TOPIC" as LanguageKeys)
              : ("TICKET_CHANNEL_TOPIC" as LanguageKeys),
            { author: author.toString(), id: author.id, subject }
          ),
        })
        .catch((e: Error) => e)) as unknown as FireTextChannel;
    if (ticket instanceof Error) {
      locked = false;
      this.ticketLock.lock.release();
      return ticket;
    }
    let authorInfo = `${this.language.get("CREATED")} ${Formatters.time(
      author.user.createdAt,
      "R"
    )}
${this.language.get("JOINED")} ${Formatters.time(author.joinedAt, "R")}`;
    const roles = author.roles.cache
      .sort((one, two) => (one.position > two.position ? 1 : -1))
      .filter((role) => this.id != role.id)
      .map((role) => role.toString());
    if (roles.length)
      authorInfo += `\n${this.language.get(
        "ROLES"
      )}: ${this.client.util.shorten(roles, 1000 - authorInfo.length, " - ")}`;
    const embed = new MessageEmbed()
      .setTitle(
        this.language.get("TICKET_OPENER_TILE", {
          author: Util.escapeMarkdown(author.toString()),
        })
      )
      .setTimestamp()
      .setColor(author.displayColor || "#FFFFFF")
      .addFields([
        { name: this.language.get("SUBJECT"), value: subject },
        { name: this.language.get("USER"), value: authorInfo },
        ...additionalFields,
      ]);
    const description =
      descriptionOverride ?? this.settings.get<string>("tickets.description");
    if (description) embed.setDescription(description);
    const alertId = this.settings.get<Snowflake>("tickets.alert");
    const alert = this.roles.cache.get(alertId);
    await ticket
      .send({
        content: alert && !author.isModerator() ? alert.toString() : null,
        allowedMentions: { roles: [alertId] },
        embeds: [embed],
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setStyle("DANGER")
              .setCustomId(`!ticket_close_${ticket.id}`)
              .setLabel(this.language.get("TICKET_CLOSE_BUTTON_TEXT"))
              .setEmoji("534174796938870792")
          ),
        ],
      })
      .catch(() => {});
    channels.push(ticket);
    this.settings.set<string[]>(
      "tickets.channels",
      channels.filter((chan) => !!chan).map((chan) => chan.id)
    );
    locked = false;
    this.ticketLock.lock.release();
    return ticket;
  }

  async canCloseTicket(
    channel: FireTextChannel | ThreadChannel,
    author: FireMember
  ) {
    if (channel instanceof BaseFakeChannel)
      channel = channel.real as FireTextChannel;
    else if (channel instanceof ThreadChannel && channel.archived) return;
    if (author instanceof FireUser)
      author = (await this.members.fetch(author).catch(() => {})) as FireMember;
    if (!author) return "forbidden";
    if (!this.tickets.includes(channel)) return "nonticket";
    if (
      !author.permissions.has(PermissionFlagsBits.ManageChannels) &&
      (channel instanceof FireTextChannel
        ? !channel.topic.includes(author.id)
        : !channel.name.includes(author.id))
    )
      return "forbidden";
    return true;
  }

  async closeTicket(
    channel: FireTextChannel | ThreadChannel,
    author: FireMember,
    reason: string
  ) {
    const canClose = await this.canCloseTicket(channel, author);
    if (typeof canClose == "string") return canClose;
    if (channel instanceof BaseFakeChannel)
      channel = channel.real as FireTextChannel;

    let channels = this.tickets.filter((c) => c && c.id != channel.id);
    // threads don't get closed, they get archived and can be reopened so we don't remove it
    if (channels.length && channel.type == "GUILD_TEXT")
      this.settings.set<string[]>(
        "tickets.channels",
        channels.map((c) => c.id)
      );
    else if (channel.type == "GUILD_TEXT")
      this.settings.delete("tickets.channels");
    const id = getIDMatch(
      channel instanceof FireTextChannel ? channel.topic : channel.name,
      true
    );
    let creator: FireMember;
    if (id)
      creator = (await this.members.fetch(id).catch(() => {})) as FireMember;
    if (creator) this.client.emit("ticketClose", creator);
    if (channel instanceof FireTextChannel) {
      let transcript: string[] = [];
      const iterator = new MessageIterator(channel, {
        oldestFirst: true,
      });
      for await (const message of iterator.iterate()) {
        transcript.push(
          `${message.author} (${
            message.author.id
          }) at ${message.createdAt.toLocaleString(
            this.language.id
          )}\n${this.getTranscriptContent(message)}`
        );
      }
      transcript.push(`${transcript.length} messages, closed by ${author}`);
      const buffer = Buffer.from(transcript.join("\n\n"), "utf-8");
      if (creator)
        await creator
          .send({
            content: creator.language.get("TICKET_CLOSE_TRANSCRIPT", {
              guild: this.name,
              reason,
            }),
            files: [
              new MessageAttachment(buffer, `${channel.name}-transcript.txt`),
            ],
          })
          .catch(() => {});
      const log =
        (this.channels.cache.get(
          this.settings.get<Snowflake>("tickets.transcript_logs")
        ) as FireTextChannel) ||
        (this.channels.cache.get(
          this.settings.get<Snowflake>("log.action")
        ) as FireTextChannel);
      const embed = new MessageEmbed()
        .setTitle(
          this.language.get("TICKET_CLOSER_TITLE", { channel: channel.name })
        )
        .setTimestamp()
        .setColor(author.displayColor || "#FFFFFF")
        .addFields([
          {
            name: this.language.get("TICKET_CLOSER_CLOSED_BY"),
            value: `${author} (${author.id})`,
          },
          { name: this.language.get("REASON"), value: reason },
        ]);
      await log
        ?.send({
          embeds: [embed],
          files:
            channel.parentId == "755796036198596688"
              ? []
              : [
                  new MessageAttachment(
                    buffer,
                    `${channel.name}-transcript.txt`
                  ),
                ],
        })
        .catch(() => {});
      return (await channel
        .delete(
          this.language.get("TICKET_CLOSED_REASON", {
            user: author.toString(),
            reason,
          })
        )
        .catch((e: Error) => e)) as FireTextChannel | Error;
    } else if (channel instanceof ThreadChannel) {
      await channel.send(
        this.language.get(
          author.isModerator()
            ? "TICKET_CLOSE_ARCHIVE_MODERATOR"
            : "TICKET_CLOSE_ARCHIVE"
        )
      );
      if (author.isModerator())
        await channel.setLocked(
          true,
          this.language.get("TICKET_CLOSED_REASON", {
            user: author.toString(),
            reason,
          })
        );
      await channel.setArchived(
        true,
        this.language.get("TICKET_CLOSED_REASON", {
          user: author.toString(),
          reason,
        })
      );
      if (creator)
        await creator
          .send({
            content: creator.language.get(
              author.isModerator()
                ? "TICKET_THREAD_CLOSED_MODERATOR"
                : "TICKET_THREAD_CLOSED",
              {
                guild: this.name,
                reason,
              }
            ),
            components: [
              new MessageActionRow().addComponents(
                new MessageButton()
                  .setStyle("LINK")
                  .setLabel(creator.language.get("TICKET_VIEW_THREAD"))
                  // why doesn't ThreadChannel have a url property????
                  .setURL(
                    `https://discord.com/channels/${this.id}/${channel.id}`
                  )
              ),
            ],
          })
          .catch(() => {});
      return channel;
    }
  }

  private getTranscriptContent(message: FireMessage) {
    if (message.type == "RECIPIENT_ADD")
      return this.language.get("TICKET_RECIPIENT_ADD", {
        author: message.author.toString(),
        added: message.mentions.users.first().toString(),
      });
    else if (message.type == "RECIPIENT_REMOVE")
      return this.language.get("TICKET_RECIPIENT_REMOVE", {
        author: message.author.toString(),
        removed: message.mentions.users.first().toString(),
      });
    else if (message.type == "CHANNEL_NAME_CHANGE")
      return this.language.get("TICKET_THREAD_RENAME", {
        author: message.author.toString(),
        name: message.cleanContent,
      });
    let text = message.cleanContent ?? "";
    if (message.embeds.length)
      for (const embed of message.embeds) {
        if (embed.description) text += `\n${embed.description}`;
        if (embed.fields.length)
          for (const field of embed.fields)
            text += `\n${field.name} | ${field.value}`;
      }
    if (message.attachments.size)
      for (const [, attachment] of message.attachments)
        text += `\n${attachment.proxyURL}`;
    if (message.stickers.size)
      text += `\n${this.language.get("TICKET_CLOSE_TRANSCRIPT_STICKER", {
        name: message.stickers.map((sticker) => sticker.name)[0],
      })}`;
    for (const row of message.components) {
      if (!(row instanceof MessageActionRow)) continue;
      const links = row.components.filter(
        (c): c is MessageButton => c.type == "BUTTON" && c.style == "LINK"
      );
      if (links.length)
        text += `\n${links
          .map((button) => `${button.label}: ${button.url}`)
          .join(" | ")}`;
    }

    return text.trim() || constants.escapedShruggie;
  }

  async createModLogEntry(
    user: FireUser | FireMember,
    moderator: FireMember,
    type: ModLogTypes,
    reason: string
  ) {
    if (
      (user instanceof FireUser && user.bot) ||
      (user instanceof FireMember && user.user.bot)
    )
      return false;
    const typeString = ModLogTypesEnumToString[type];
    const date = new Date().toLocaleString(this.language.id);
    const caseID = nanoid();
    const entryResult = await this.client.db
      .query(
        "INSERT INTO modlogs (gid, uid, modid, reason, date, type, caseid) VALUES ($1, $2, $3, $4, $5, $6, $7);",
        [this.id, user.id, moderator.id, reason, date, typeString, caseID]
      )
      .catch(() => {});
    if (!entryResult) return false;
    // amazing success detection
    else if (entryResult.status.startsWith("INSERT")) return caseID;
    return false;
  }

  async deleteModLogEntry(caseID: string) {
    const entryResult = await this.client.db
      .query("DELETE FROM modlogs WHERE gid=$1 AND caseid=$2;", [
        this.id,
        caseID,
      ])
      .catch(() => {});
    if (!entryResult) return false;
    else if (entryResult.status.startsWith("DELETE")) return true;
    return false;
  }

  async unban(
    user: FireUser,
    reason: string,
    moderator: FireMember,
    channel?: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    const ban = await this.bans.fetch(user).catch(() => {});
    if (!ban) return "no_ban";
    const logEntry = await this.createModLogEntry(
      user,
      moderator,
      ModLogTypes.UNBAN,
      reason
    ).catch(() => {});
    if (!logEntry) return "entry";
    const unbanned = await this.members
      .unban(user, `${moderator} | ${reason}`)
      .catch(() => {});
    if (!unbanned) {
      const deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "unban" : "unban_and_entry";
    }
    if (this.tempBans.has(user.id)) {
      await this.client.db
        .query("DELETE FROM bans WHERE gid=$1 AND uid=$2;", [this.id, user.id])
        .catch(() => {});
      this.tempBans.delete(user.id);
    }
    const embed = new MessageEmbed()
      .setColor(moderator.displayColor || "#FFFFFF")
      .setTimestamp()
      .setAuthor({
        name: this.language.get("UNBAN_LOG_AUTHOR", { user: user.display }),
        iconURL: user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields([
        {
          name: this.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${user.id} | ${moderator.id}` });
    await this.modLog(embed, ModLogTypes.UNBAN).catch(() => {});
    if (channel)
      return await channel
        .send({
          content: this.language.getSuccess("UNBAN_SUCCESS", {
            user: Util.escapeMarkdown(user.toString()),
            guild: Util.escapeMarkdown(this.name),
          }),
        })
        .catch(() => {});
  }

  async block(
    blockee: FireMember | Role,
    reason: string,
    moderator: FireMember,
    channel: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    if (!channel.permissionOverwrites) return "block";
    let logEntry: string | false | void;
    if (blockee instanceof FireMember) {
      logEntry = await this.createModLogEntry(
        blockee,
        moderator,
        ModLogTypes.BLOCK,
        `#${channel.name} | ${reason}`
      ).catch(() => {});
      if (!logEntry) return "entry";
    }
    const overwrite: PermissionOverwriteOptions = {
      SEND_MESSAGES_IN_THREADS: false,
      SEND_MESSAGES: false,
      ADD_REACTIONS: false,
    };
    const blocked = await channel.permissionOverwrites
      .edit(blockee, overwrite, {
        reason: `${moderator} | ${reason}`,
      })
      .catch(() => {});
    if (!blocked) {
      let deleted = true; // ensures "block" is used if logEntry doesn't exist
      if (logEntry)
        deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "block" : "block_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor(
        blockee instanceof FireMember ? blockee.displayColor : null || "#E74C3C"
      )
      .setTimestamp()
      .setAuthor({
        name: this.language.get("BLOCK_LOG_AUTHOR", {
          blockee:
            blockee instanceof FireMember ? blockee.display : blockee.name,
        }),
        iconURL:
          blockee instanceof FireMember
            ? blockee.displayAvatarURL({
                size: 2048,
                format: "png",
                dynamic: true,
              })
            : this.iconURL({ size: 2048, format: "png", dynamic: true }),
        url: "https://static.inv.wtf/blocked.gif", // hehe
      })
      .addFields([
        {
          name: this.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    await this.modLog(embed, ModLogTypes.BLOCK).catch(() => {});
    return await channel
      .send({
        content: this.language.getSuccess("BLOCK_SUCCESS", {
          blockee: Util.escapeMarkdown(
            blockee instanceof FireMember ? blockee.toString() : blockee.name
          ),
        }),
      })
      .catch(() => {});
  }

  async unblock(
    unblockee: FireMember | Role,
    reason: string,
    moderator: FireMember,
    channel: FakeChannel | GuildTextChannel
  ) {
    if (!reason || !moderator) return "args";
    if (!moderator.isModerator(channel)) return "forbidden";
    let logEntry: string | false | void;
    if (unblockee instanceof FireMember) {
      logEntry = await this.createModLogEntry(
        unblockee,
        moderator,
        ModLogTypes.UNBLOCK,
        `#${channel.name} | ${reason}`
      ).catch(() => {});
      if (!logEntry) return "entry";
    }
    const overwrite: PermissionOverwriteOptions = {
      SEND_MESSAGES_IN_THREADS: null,
      SEND_MESSAGES: null,
      ADD_REACTIONS: null,
    };
    const unblocked = await channel.permissionOverwrites
      .edit(unblockee, overwrite, {
        reason: `${moderator} | ${reason}`,
      })
      .catch(() => {});
    if (
      channel.permissionOverwrites?.cache.get(unblockee.id)?.allow.bitfield ==
        0n &&
      channel.permissionOverwrites?.cache.get(unblockee.id)?.deny.bitfield ==
        0n &&
      unblockee.id != this.roles.everyone.id
    )
      await channel.permissionOverwrites.cache
        .get(unblockee.id)
        .delete()
        .catch(() => {}); // this doesn't matter *too* much
    if (!unblocked) {
      let deleted = true; // ensures "unblock" is used if logEntry doesn't exist
      if (logEntry)
        deleted = await this.deleteModLogEntry(logEntry).catch(() => false);
      return deleted ? "unblock" : "unblock_and_entry";
    }
    const embed = new MessageEmbed()
      .setColor(
        unblockee instanceof FireMember
          ? unblockee.displayColor
          : null || "#2ECC71"
      )
      .setTimestamp()
      .setAuthor({
        name: this.language.get("UNBLOCK_LOG_AUTHOR", {
          unblockee:
            unblockee instanceof FireMember
              ? unblockee.display
              : unblockee.name,
        }),
        iconURL:
          unblockee instanceof FireMember
            ? unblockee.displayAvatarURL({
                size: 2048,
                format: "png",
                dynamic: true,
              })
            : this.iconURL({ size: 2048, format: "png", dynamic: true }),
      })
      .addFields([
        {
          name: this.language.get("MODERATOR"),
          value: moderator.toString(),
        },
        { name: this.language.get("REASON"), value: reason },
      ])
      .setFooter({ text: `${this.id} | ${moderator.id}` });
    await this.modLog(embed, ModLogTypes.UNBLOCK).catch(() => {});
    return await channel
      .send({
        content: this.language.getSuccess("UNBLOCK_SUCCESS", {
          unblockee: Util.escapeMarkdown(
            unblockee instanceof FireMember
              ? unblockee.toString()
              : unblockee.name
          ),
        }),
      })
      .catch(() => {});
  }
}

Structures.extend("Guild", () => FireGuild);
