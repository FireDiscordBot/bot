import {
  GuildPreview,
  MessageEmbed,
  Permissions,
  Formatters,
  DMChannel,
} from "discord.js";
import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { snowflakeConverter } from "@fire/lib/util/converters";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { constants, zws } from "@fire/lib/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import * as centra from "centra";

type ShardInfo = { shardId: number; clusterId: number };

const {
  emojis: { badges, channels },
} = constants;

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "guild",
          type: "preview",
          default: undefined,
          required: false,
        },
      ],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  getBadges(guild: FireGuild | GuildPreview, author?: FireMember | FireUser) {
    const emojis: string[] = [];

    if (guild.id == "564052798044504084") emojis.push(badges.FIRE_ADMIN);
    if (this.client.util?.premium.has(guild.id))
      emojis.push(badges.FIRE_PREMIUM);
    if (guild.features.includes("PARTNERED")) emojis.push(badges.PARTNERED);
    if (guild.features.includes("VERIFIED")) emojis.push(badges.VERIFIED);

    if (emojis.length) emojis.push(zws);

    return emojis;
  }

  async getInfo(
    command: ApplicationCommandMessage,
    guild: FireGuild | GuildPreview
  ) {
    if (guild instanceof FireGuild) await guild.fetch(); // gets approximatePresenceCount

    const guildSnowflake = await snowflakeConverter(command, guild.id);
    let owner: FireMember;
    if (guild instanceof FireGuild) owner = await guild.fetchOwner();
    const ownerString =
      guild instanceof FireGuild &&
      owner &&
      owner.joinedTimestamp - guild.createdTimestamp < 5000
        ? owner?.user?.discriminator != null
          ? owner.toString()
          : "Unknown#0000"
        : null;
    let messages = [
      command.language.get(
        ownerString ? "GUILD_CREATED_BY" : "GUILD_CREATED_AT",
        {
          owner: ownerString,
          created: Formatters.time(
            guild instanceof FireGuild ? guild.createdAt : guildSnowflake.date,
            "R"
          ),
        }
      ),
      `**${command.language.get("MEMBERS")}:** ${(guild instanceof FireGuild
        ? guild.memberCount
        : guild.approximateMemberCount
      ).toLocaleString(command.language.id)}`,
      guild.approximatePresenceCount
        ? `**${command.language.get(
            "ONLINE"
          )}:** ${guild.approximatePresenceCount.toLocaleString(
            command.language.id
          )}`
        : null,
      guild instanceof GuildPreview && guild.emojis.size
        ? `**${command.language.get(
            "EMOJIS"
          )}:** ${guild.emojis.size.toLocaleString(command.language.id)}`
        : null,
      guild instanceof FireGuild
        ? `**${command.language.get(
            "CHANNELS"
          )}:** ${guild.channels.cache.size.toLocaleString(
            command.language.id
          )} (${channels.text} ${
            guild.channels.cache.filter(
              (channel) => channel.type == "GUILD_TEXT"
            ).size
          }, ${channels.voice} ${
            guild.channels.cache.filter(
              (channel) => channel.type == "GUILD_VOICE"
            ).size
          }, ${channels.stage} ${
            guild.channels.cache.filter(
              (channel) => channel.type == "GUILD_STAGE_VOICE"
            ).size
          }, ${channels.news} ${
            guild.channels.cache.filter(
              (channel) => channel.type == "GUILD_NEWS"
            ).size
          })`
        : null,
      guild instanceof FireGuild
        ? `**${command.language.get(
            guild.regions.length > 1 ? "REGION_PLURAL" : "REGION"
          )}:** ${
            guild.regions.length > 1
              ? guild.regions
                  .map((region) =>
                    region && command.language.has(`REGIONS.${region}`)
                      ? command.language.get(
                          `REGIONS.${region}` as LanguageKeys
                        )
                      : command.language.get("REGION_AUTOMATIC")
                  )
                  .join(", ")
              : command.language.get("REGION_AUTOMATIC")
          }`
        : null,
    ];
    if (
      guild instanceof FireGuild &&
      guild.members.cache.size / guild.memberCount > 0.98
    )
      messages.push(
        command.language.get("GUILD_JOIN_POS", {
          pos: (
            guild.members.cache
              .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
              .toJSON()
              .indexOf(command.member) + 1
          ).toLocaleString(command.language.id),
        })
      );
    return messages.filter((message) => !!message);
  }

  getSecurity(
    command: ApplicationCommandMessage,
    guild: FireGuild | GuildPreview
  ) {
    const info: string[] = [];
    if (!(guild instanceof FireGuild)) return info;

    const VERIFICATION_LEVEL_EMOJI = {
      VERY_HIGH: constants.emojis.statuspage.operational,
      HIGH: constants.emojis.statuspage.operational,
      MEDIUM: constants.emojis.statuspage.partial_outage,
      LOW: constants.emojis.statuspage.major_outage,
      NONE: constants.emojis.statuspage.major_outage,
    };

    const emoji = VERIFICATION_LEVEL_EMOJI[guild.verificationLevel];
    info.push(
      `${emoji} ${command.language.get(
        `GUILD_VERIF_${guild.verificationLevel}`
      )}`
    );

    switch (guild.explicitContentFilter) {
      case "ALL_MEMBERS":
        info.push(
          `${constants.emojis.statuspage.operational} ${command.language.get(
            "GUILD_FILTER_ALL"
          )}`
        );
        break;
      case "MEMBERS_WITHOUT_ROLES":
        info.push(
          `${constants.emojis.statuspage.partial_outage} ${command.language.get(
            "GUILD_FILTER_NO_ROLE"
          )}`
        );
        break;
      case "DISABLED":
        info.push(
          `${constants.emojis.statuspage.major_outage} ${command.language.get(
            "GUILD_FILTER_NONE"
          )}`
        );
        break;
    }

    if (guild.defaultMessageNotifications == "ONLY_MENTIONS")
      info.push(
        `${constants.emojis.statuspage.operational} ${command.language.get(
          "GUILD_NOTIFS_MENTIONS"
        )}`
      );
    else
      info.push(
        `${constants.emojis.statuspage.partial_outage} ${command.language.get(
          "GUILD_NOTIFS_ALL"
        )}`
      );

    if (guild.mfaLevel)
      info.push(
        `${constants.emojis.statuspage.operational} ${command.language.get(
          "GUILD_MFA_ENABLED"
        )}`
      );
    else
      info.push(
        `${constants.emojis.statuspage.major_outage} ${command.language.get(
          "GUILD_MFA_NONE"
        )}`
      );

    return info;
  }

  async run(
    command: ApplicationCommandMessage,
    args: { guild?: GuildPreview | FireGuild }
  ) {
    if (command.channel instanceof DMChannel && !args.guild)
      return await command.error("COMMAND_GUILD_ONLY", {
        invite: this.client.config.inviteLink,
      });
    if (!args.guild && typeof args.guild != "undefined") return;
    const guild = args.guild ? args.guild : command.guild;

    const badges = this.getBadges(guild, command.author);
    const info = await this.getInfo(command, guild);
    const security = this.getSecurity(command, guild);

    const features: string[] = guild.features.map((feature) =>
      this.client.util.cleanFeatureName(feature, command.language)
    );

    const roles =
      guild instanceof FireGuild
        ? guild.roles.cache
            .sort((one, two) => (one.position > two.position ? 1 : -1))
            .filter((role) => guild.id != role.id)
            .map((role) =>
              guild == command.guild ? role.toString() : role.name
            )
        : null;

    const embed = new MessageEmbed()
      .setDescription(
        guild.description
          ? `${badges.join(" ")}\n\n${guild.description}`
          : badges.join(" ")
      )
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setAuthor({
        name: guild.name,
        iconURL: guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(guild.id)
      .setTimestamp();
    if (info.length)
      embed.addField(command.language.get("GUILD_ABOUT"), info.join("\n"));
    if (security.length)
      embed.addField(
        command.language.get("GUILD_SECURITY"),
        security.join("\n")
      );

    if (features.length > 0) {
      embed.addField(
        command.language.get("GUILD_FEATURES"),
        features.join(", ")
      );
    }

    if (guild instanceof FireGuild && roles?.length)
      embed.addField(
        command.language.get("GUILD_ROLES") +
          ` [${guild.roles.cache.size - 1}]`,
        this.client.util.shorten(roles, 1000, " - ")
      );

    if (
      command.hasExperiment(4026299021, 1) &&
      this.client.manager.state.discordExperiments?.length
    ) {
      const experiments = await this.client.util.getFriendlyGuildExperiments(
        guild.id,
        guild
      );
      if (experiments.length)
        embed.addField(
          command.language.get("GUILD_EXPERIMENTS"),
          experiments.join("\n")
        );
    }

    if (command.author.isSuperuser() && this.client.manager.ws?.open) {
      // we make a request so we can get the cluster id too
      const shardReq: ShardInfo = await (
        await centra(
          process.env.REST_HOST
            ? `https://${process.env.REST_HOST}/v2/shard/${guild.id}`
            : `http://127.0.0.1:${process.env.REST_PORT}/v2/shard/${guild.id}`
        )
          .header("User-Agent", this.client.manager.ua)
          .send()
      )
        .json()
        .catch(() => ({ shardId: -1, clusterId: -1 }));
      if (shardReq.shardId != -1)
        embed.addField(
          command.language.get("SHARD"),
          shardReq.shardId.toString(),
          true
        );
      if (shardReq.clusterId != -1)
        embed.addField(
          command.language.get("CLUSTER"),
          shardReq.clusterId.toString(),
          true
        );
    }

    await command.channel.send({ embeds: [embed] });
  }
}
