import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { constants, zws } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import {
  APIApplication,
  APIChannel,
  ApplicationFlags,
} from "discord-api-types/v9";
import {
  ClientUser,
  DeconstructedSnowflake,
  DiscordAPIError,
  DMChannel,
  Formatters,
  GuildBasedChannel,
  GuildPreview,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  Permissions,
  PermissionString,
  Snowflake,
  SnowflakeUtil,
  ThreadChannel,
  UserFlagsString,
} from "discord.js";
import * as moment from "moment";

const {
  emojis,
  statusEmojis,
  emojis: { badges },
} = constants;

const isValidURL = (url: string) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

type InstallParams = {
  install_params?: {
    scopes: string[];
    permissions: string;
  };
  custom_install_url?: string;
};

export default class User extends Command {
  constructor() {
    super("user", {
      description: (language: Language) =>
        language.get("USER_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "user",
          type: "user|member|snowflake",
          description: (language: Language) =>
            language.get("USER_SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      context: ["user"],
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      user?:
        | FireMember
        | FireUser
        | ({ snowflake: string } & DeconstructedSnowflake);
    }
  ) {
    if (typeof args.user == "undefined")
      args.user = command.member || command.author;
    else if (
      args.user?.hasOwnProperty("snowflake") ||
      command.util?.parsed?.alias == "snowflake"
    )
      return await this.snowflakeInfo(
        command,
        args.user?.hasOwnProperty("snowflake")
          ? (args.user as { snowflake: string } & DeconstructedSnowflake)
          : (args.user as any)
      );
    else if (!args.user) return;
    let member: FireMember, user: FireUser;
    if (args.user instanceof FireMember) {
      member = args.user;
      user = member.user;
    } else user = args.user as FireUser;
    if (!user) {
      if (command.member) {
        member = command.member;
        user = member.user;
      } else user = command.author;
    }
    if (user instanceof FireMember) {
      member = user;
      user = user.user;
    }
    if (
      member?.presence?.clientStatus == null &&
      member?.presence?.status == "offline"
    )
      member = (await member.guild.members
        .fetch({
          user: member,
          withPresences: true,
        })
        .catch(() => {})) as FireMember;
    // revert back to message member if fetching w/presence fails
    if (!member && user.id == command.author.id) member = command.member;
    if (user instanceof ClientUser) {
      member = command.guild?.members.cache.get(user.id) as FireMember;
      user = member.user;
    }
    let color = member ? member.displayColor : command.member?.displayColor;
    const botConfig = this.client.config.bots[user.id];
    if (user.bot && botConfig) color = botConfig.color;
    const badges = this.getBadges(
      user,
      command.author,
      command.guild,
      command.content
    );
    const info = this.getInfo(command, member ? member : user);
    let application: Exclude<APIApplication, "rpc_origins" | "owner" | "team"> &
      InstallParams;
    if (user.bot)
      application = await this.getApplication(
        botConfig?.appId ?? user.id
      ).catch(() => null);
    const components: MessageActionRow[] = [];
    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp()
      .setAuthor({
        name: user.toString(),
        iconURL: user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
        url:
          application && application.bot_public
            ? `https://discord.com/oauth2/authorize?client_id=${
                application.id
              }&scope=bot%20applications.commands${
                application.id == this.client.user.id
                  ? "&permissions=1007021303"
                  : ""
              }`
            : null,
      })
      .addField(`» ${command.language.get("ABOUT")}`, info.join("\n"));
    if (badges.length)
      embed.setDescription(
        application
          ? `${badges.join("  ")}${
              user.settings.get("affiliates_highlighted_label.official", false)
                ? `\n${emojis.official} Official`
                : ""
            }\n\n${application.description}`
          : `${badges.join("  ")}${
              user.settings.get("affiliates_highlighted_label.official", false)
                ? `\n${emojis.official} Official`
                : ""
            }`
      );
    else if (application)
      embed.setDescription(
        `${
          user.settings.get("affiliates_highlighted_label.official", false)
            ? `\n${emojis.official} Official`
            : ""
        }\n\n${application.description}`
      );
    if (member) {
      if (member?.avatar && member?.avatar != user.avatar)
        embed.setThumbnail(
          member.avatarURL({ size: 2048, format: "png", dynamic: true })
        );
      const roles = member.roles.cache
        .filter((role) => role.id != command.guild.id)
        .sorted((roleA, roleB) => roleA.position - roleB.position)
        .map((role) => role.toString());
      if (roles.length)
        embed.addField(
          `» ${command.language.get("ROLES")} [${member.roles.cache.size - 1}]`,
          this.client.util.shorten(roles, 1000, " - "),
          false
        );
      if (!member.permissions.has(Permissions.FLAGS.ADMINISTRATOR)) {
        let perms = [];
        const keyPerms: PermissionString[] = [
          "BAN_MEMBERS",
          "CHANGE_NICKNAME",
          "KICK_MEMBERS",
          "MANAGE_CHANNELS",
          "MANAGE_GUILD",
          "MANAGE_EMOJIS_AND_STICKERS",
          "MANAGE_MESSAGES",
          "MANAGE_NICKNAMES",
          "MANAGE_ROLES",
          "MANAGE_WEBHOOKS",
          "MENTION_EVERYONE",
          "VIEW_AUDIT_LOG",
          "VIEW_GUILD_INSIGHTS",
          "MANAGE_THREADS",
          "MODERATE_MEMBERS",
        ];
        for (const permission of keyPerms)
          if (member.permissions.has(permission))
            perms.push(
              this.client.util.cleanPermissionName(permission, command.language)
            );
        if (perms.length)
          embed.addField(
            `» ${command.language.get("KEY_PERMISSIONS")}`,
            perms.join(", "),
            false
          );
      } else
        embed.addField(
          `» ${command.language.get("PERMISSIONS_TEXT")}`,
          this.client.util.cleanPermissionName(
            "ADMINISTRATOR",
            command.language
          ),
          false
        );
    }
    if (application) {
      components.push(new MessageActionRow());
      const appInfo: string[] = [];
      if (application.bot_public)
        appInfo.push(command.language.getSuccess("USER_BOT_PUBLIC"));
      else appInfo.push(command.language.getError("USER_BOT_PRIVATE"));
      if (
        (application.flags & ApplicationFlags.GatewayGuildMembers) ==
          ApplicationFlags.GatewayGuildMembers ||
        (application.flags & ApplicationFlags.GatewayGuildMembersLimited) ==
          ApplicationFlags.GatewayGuildMembersLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayGuildMembers
              ? emojis.success
              : emojis.warning
          } ${command.language.get("USER_BOT_MEMBERS_INTENT")}`
        );
      else appInfo.push(command.language.getError("USER_BOT_MEMBERS_INTENT"));
      if (
        (application.flags & ApplicationFlags.GatewayPresence) ==
          ApplicationFlags.GatewayPresence ||
        (application.flags & ApplicationFlags.GatewayPresenceLimited) ==
          ApplicationFlags.GatewayPresenceLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayPresence
              ? emojis.success
              : emojis.warning
          } ${command.language.get("USER_BOT_PRESENCE_INTENT")}`
        );
      else appInfo.push(command.language.getError("USER_BOT_PRESENCE_INTENT"));
      if (
        (application.flags & ApplicationFlags.GatewayMessageContent) ==
          ApplicationFlags.GatewayMessageContent ||
        (application.flags & ApplicationFlags.GatewayMessageContentLimited) ==
          ApplicationFlags.GatewayMessageContentLimited
      )
        appInfo.push(
          `${
            application.flags & ApplicationFlags.GatewayMessageContent
              ? emojis.success
              : emojis.warning
          } ${command.language.get("USER_BOT_MESSAGE_CONTENT_INTENT")}`
        );
      else
        appInfo.push(
          command.language.getError("USER_BOT_MESSAGE_CONTENT_INTENT")
        );
      if (user.bot && botConfig?.best)
        appInfo.push(command.language.getSuccess("USER_BOT_BEST"));

      if (
        application.privacy_policy_url &&
        isValidURL(application.privacy_policy_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_PRIVACY_POLICY"))
            .setURL(application.privacy_policy_url)
        );
      if (
        application.terms_of_service_url &&
        isValidURL(application.terms_of_service_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_TERMS"))
            .setURL(application.terms_of_service_url)
        );

      if (application.install_params?.scopes.length) {
        let addURL = `https://discord.com/oauth2/authorize?client_id=${
          application.id
        }&scope=${application.install_params.scopes.join("%20")}`;
        if (application.install_params.permissions)
          addURL += `&permissions=${application.install_params.permissions}`;
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_ADD_TO_SERVER"))
            .setURL(addURL)
        );
      } else if (
        application.custom_install_url &&
        isValidURL(application.custom_install_url)
      )
        components[0].addComponents(
          new MessageButton()
            .setStyle("LINK")
            .setLabel(command.language.get("USER_BOT_ADD_TO_SERVER"))
            .setURL(application.custom_install_url)
        );

      embed.addField(`» ${command.language.get("BOT")}`, appInfo.join("\n"));
      if (components.every((row) => !row.components.length))
        while (components.length) components.pop();
    }
    member?.presence?.clientStatus
      ? embed.setFooter(
          user.id,
          member.presence.activities.find(
            (activity) => activity.type == "STREAMING"
          )
            ? statusEmojis.streaming
            : statusEmojis[member.presence.status]
        )
      : embed.setFooter(user.id);
    return await command.channel.send({ embeds: [embed], components });
  }

  getBadges(
    user: FireUser,
    author: FireMember | FireUser,
    guild?: FireGuild,
    content?: string
  ) {
    const flags = user.flags?.toArray() || [];
    let emojis: string[] = [];
    if (guild && guild.ownerId == user.id) emojis.push(badges["OWNER"]);
    emojis.push(
      ...Object.keys(badges)
        .filter((badge: UserFlagsString) => flags.includes(badge))
        .map((badge) => badges[badge])
    );
    if (
      user.id == "190916650143318016" &&
      content?.toLowerCase().includes("staff")
    )
      emojis.push(badges.DISCORD_EMPLOYEE);
    if (user.isSuperuser()) emojis.push(badges.FIRE_ADMIN);
    if (user.premium) emojis.push(badges.FIRE_PREMIUM);
    if (user.id == "159985870458322944") emojis.push(badges.FUCK_MEE6);
    if (emojis.length) emojis.push(zws);
    return emojis;
  }

  getInfo(command: ApplicationCommandMessage, member: FireMember | FireUser) {
    let user = member instanceof FireMember ? member.user : member;
    const now = moment();
    const cakeDay =
      now.dayOfYear() == moment(user.createdAt).dayOfYear() &&
      now.year() != moment(user.createdAt).year();
    let info = [
      `**${command.language.get("MENTION")}:** ${user.toMention()}`,
      `**${command.language.get("CREATED")}** ${Formatters.time(
        user.createdAt,
        "R"
      )}${cakeDay ? " 🎂" : ""}`,
    ];
    if (member instanceof FireMember) {
      if (
        command.guild &&
        command.guild.ownerId == member.id &&
        member.joinedTimestamp - command.guild.createdTimestamp < 5000
      )
        info.push(
          `**${command.language.get("CREATED_GUILD")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );
      else
        info.push(
          `**${command.language.get("JOINED")}** ${Formatters.time(
            member.joinedAt,
            "R"
          )}`
        );
      if (
        command.guild &&
        command.guild.members.cache.size / command.guild.memberCount > 0.98
      ) {
        const joinPos =
          command.guild.members.cache
            .sorted(
              (memberA, memberB) =>
                memberA.joinedTimestamp - memberB.joinedTimestamp
            )
            .toJSON()
            .indexOf(member) + 1;
        info.push(
          `**${command.language.get(
            "JOIN_POSITION"
          )}:** ${joinPos.toLocaleString(command.language.id)}`
        );
      }
      if (member && member.nickname && member.nickname != member.user.username)
        info.push(
          `**${command.language.get("NICKNAME")}:** ${member.nickname}`
        );
    }
    return info;
  }

  async getApplication(id: string) {
    return await this.client.req
      .applications(id)
      .rpc.get<Exclude<APIApplication, "rpc_origins" | "owner" | "team">>();
  }

  async snowflakeInfo(
    command: ApplicationCommandMessage,
    snowflake: { snowflake: Snowflake } & DeconstructedSnowflake
  ) {
    let user: FireUser;
    if (snowflake instanceof FireUser) {
      user =
        // check cache for non reference user
        (this.client.users.cache.get(snowflake.id) as FireUser) ?? snowflake;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    } else if (snowflake instanceof FireMember) {
      user =
        // check cache for non reference member
        (command.guild?.members.cache.get(snowflake.id) as FireMember).user ??
        snowflake.user;
      snowflake = {
        snowflake: snowflake.id,
        ...SnowflakeUtil.deconstruct(snowflake.id),
      };
    }

    let info = [
      `**${command.language.get("CREATED")}** ${Formatters.time(
        snowflake.date,
        "R"
      )}`,
      `**${command.language.get("TIMESTAMP")}:** ${snowflake.timestamp}`,
      `**${command.language.get("WORKER_ID")}:** ${snowflake.workerId}`,
      `**${command.language.get("PROCESS_ID")}:** ${snowflake.processId}`,
      `**${command.language.get("INCREMENT")}:** ${snowflake.increment}`,
    ];

    if (user && !command.guild?.members.cache.has(snowflake.snowflake))
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("USER"),
          extra: user.toString(),
        })
      );
    else if (user)
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("MEMBER"),
          extra: user.toString(),
        })
      );

    if (this.client.guilds.cache.has(snowflake.snowflake)) {
      const guild = this.client.guilds.cache.get(snowflake.snowflake);
      const member = await guild.members.fetch(command.author).catch(() => {});
      info.push(
        !!member
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("GUILD"),
              extra: guild.name,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("GUILD"),
            })
      );
    }

    if (command.guild && command.guild.roles.cache.has(snowflake.snowflake))
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("ROLE"),
          extra: command.guild.roles.cache.get(snowflake.snowflake).toString(),
        })
      );

    const maybeEmoji = await centra(
      `https://cdn.discordapp.com/emojis/${snowflake.snowflake}`,
      "HEAD"
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (
      maybeEmoji.headers["content-type"] &&
      maybeEmoji.headers["content-type"].includes("image/")
    )
      info.push(
        command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
          type: command.language.get("EMOJI"),
          extra:
            maybeEmoji.headers["content-type"] == "image/gif"
              ? `<a:emoji:${snowflake.snowflake}>`
              : `<:emoji:${snowflake.snowflake}>`,
        })
      );

    if (this.client.channels.cache.has(snowflake.snowflake)) {
      const channel = this.client.channels.cache.get(snowflake.snowflake);
      if (channel.type == "DM") {
        if ((channel as DMChannel).recipient.id == command.author.id)
          info.push(
            command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("CHANNEL"),
              extra: command.language.get("DM_CHANNEL"),
            })
          );
        else
          info.push(
            command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("CHANNEL"),
            })
          );
      } else if (channel instanceof ThreadChannel) {
        const members = await channel.members.fetch(false).catch(() => {});
        info.push(
          members && members.has(command.author.id)
            ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: command.language.get("THREAD"),
                extra: channel.toString(),
              })
            : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: command.language.get("THREAD"),
              })
        );
        members && members.sweep(() => true);
      } else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        info.push(
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
            ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
                type: command.language.get("CHANNEL"),
                extra: channel.toString(),
              })
            : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
                type: command.language.get("CHANNEL"),
              })
        );
      }
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((m) => m.has(snowflake.snowflake))
        .get(snowflake.snowflake) as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "DM" &&
        (channel as DMChannel).recipient.id == command.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        )
          viewable = true;
      }
      info.push(
        viewable
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("MESSAGE"),
              extra: `[${command.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.url
              })`,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("MESSAGE"),
            })
      );
    }

    if (
      this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
    ) {
      let viewable = false;
      const snowflakeMessage = this.client.channels.cache
        .filter((c) => c.type == "GUILD_TEXT")
        .map((c: FireTextChannel) => c.messages.cache)
        .find((c) => c.find((m) => m.attachments.has(snowflake.snowflake)))
        .first() as FireMessage;
      const channel = snowflakeMessage.channel;
      if (
        channel.type == "DM" &&
        (channel as DMChannel).recipient.id == command.author.id
      )
        viewable = true;
      else {
        const member = (channel as GuildBasedChannel).guild.members.cache.get(
          command.author.id
        );
        if (
          member
            ?.permissionsIn(channel as GuildBasedChannel)
            .has(Permissions.FLAGS.VIEW_CHANNEL)
        )
          viewable = true;
      }
      info.push(
        viewable && snowflakeMessage.attachments.get(snowflake.snowflake)?.url
          ? command.language.get("USER_SNOWFLAKE_BELONGS_TO_EXTRA", {
              type: command.language.get("ATTACHMENT"),
              extra: `[${command.language.get("CLICK_TO_VIEW")}](${
                snowflakeMessage.attachments.get(snowflake.snowflake).url
              })`,
            })
          : command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
              type: command.language.get("ATTACHMENT"),
            })
      );
    }

    let maybeGuild: boolean;
    if (!this.client.guilds.cache.has(snowflake.snowflake)) {
      maybeGuild = await this.client.req
        .guilds(snowflake.snowflake)
        .channels.get<APIChannel[]>()
        .then((c) => Array.isArray(c))
        .catch((e) => e instanceof DiscordAPIError && e.code == 50001);
      if (maybeGuild == true) {
        info.push(
          command.language.get("USER_SNOWFLAKE_BELONGS_TO", {
            type: command.language.get("GUILD"),
          })
        );
      }
    }

    const embed = new MessageEmbed()
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setTimestamp(snowflake.date)
      .setAuthor({
        name: command.author.toString(),
        iconURL: command.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setDescription(command.language.get("USER_SNOWFLAKE_DESCRIPTION"))
      .addField(`» ${command.language.get("ABOUT")}`, info.join("\n"));

    if (user || command.util?.parsed?.command?.id == "snowflake")
      embed.description = embed.description.split("\n").slice(2).join("\n");

    if (
      (this.client.guilds.cache.has(snowflake.snowflake) || maybeGuild) &&
      command.hasExperiment(4026299021, 1) &&
      this.client.manager.state.discordExperiments?.length
    ) {
      let guild: FireGuild | GuildPreview = this.client.guilds.cache.get(
        snowflake.snowflake
      ) as FireGuild;
      if (maybeGuild)
        guild = await this.client
          .fetchGuildPreview(snowflake.snowflake)
          .catch(() => null);
      const experiments = await this.client.util.getFriendlyGuildExperiments(
        snowflake.snowflake,
        guild
      );
      if (experiments.length)
        embed.addField(
          command.language.get("GUILD_EXPERIMENTS"),
          experiments.join("\n")
        );
    }

    return await command.channel.send({ embeds: [embed] });
  }
}
