import { GuildPreview, MessageEmbed, Permissions, DMChannel } from "discord.js";
import { humanize, zws, constants } from "@fire/lib/util/constants";
import { snowflakeConverter } from "@fire/lib/util/converters";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as moment from "moment";

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
    });
  }

  getBadges(guild: FireGuild | GuildPreview, author?: FireMember | FireUser) {
    const emojis: string[] = [];

    if (guild.id == "564052798044504084") emojis.push(badges.FIRE_ADMIN);
    if (this.client.util?.premium.has(guild.id))
      emojis.push(badges.FIRE_PREMIUM);
    if (guild.features.includes("PARTNERED")) emojis.push(badges.PARTNERED);
    if (guild.features.includes("VERIFIED")) emojis.push(badges.VERIFIED);

    if (emojis.length) {
      emojis.push(zws);
    }

    return emojis;
  }

  async getInfo(message: FireMessage, guild: FireGuild | GuildPreview) {
    if (guild instanceof FireGuild) await guild.fetch(); // gets approximatePresenceCount

    const language = message.language;
    const guildSnowflake = await snowflakeConverter(message, guild.id);
    const created =
      humanize(
        moment(
          guild instanceof FireGuild ? guild.createdAt : guildSnowflake.date
        ).diff(moment()),
        language.id.split("-")[0]
      ) + language.get("AGO");
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
      message.language.get(
        ownerString ? "GUILD_CREATED_BY" : "GUILD_CREATED_AT",
        { owner: ownerString, created }
      ),
      `**${message.language.get("MEMBERS")}:** ${(guild instanceof FireGuild
        ? guild.memberCount
        : guild.approximateMemberCount
      ).toLocaleString(message.language.id)}`,
      guild.approximatePresenceCount
        ? `**${message.language.get(
            "ONLINE"
          )}:** ${guild.approximatePresenceCount.toLocaleString(
            message.language.id
          )}`
        : null,
      (guild instanceof FireGuild && guild.emojis.cache.size) ||
      (guild instanceof GuildPreview && guild.emojis.size)
        ? `**${message.language.get("EMOJIS")}:** ${(guild instanceof FireGuild
            ? guild.emojis.cache.size
            : guild.emojis.size
          ).toLocaleString(message.language.id)}`
        : null,
      guild instanceof FireGuild
        ? `**${message.language.get(
            "CHANNELS"
          )}:** ${guild.channels.cache.size.toLocaleString(
            message.language.id
          )} (${channels.text} ${
            guild.channels.cache.filter((channel) => channel.type == "text")
              .size
          }, ${channels.voice} ${
            guild.channels.cache.filter((channel) => channel.type == "voice")
              .size
          }, ${channels.stage} ${
            guild.channels.cache.filter((channel) => channel.type == "stage")
              .size
          }, ${channels.news} ${
            guild.channels.cache.filter((channel) => channel.type == "news")
              .size
          })`
        : null,
      guild instanceof FireGuild
        ? `**${message.language.get(
            guild.regions.length > 1 ? "REGION_PLURAL" : "REGION"
          )}:** ${
            guild.regions.length > 1
              ? guild.regions
                  .map(
                    (region) =>
                      message.language.get(`REGIONS.${region}` as LanguageKeys) ||
                      message.language.get("REGION_AUTOMATIC")
                  )
                  .join(", ")
              : message.language.get("REGION_AUTOMATIC")
          }`
        : null,
    ];
    if (
      guild instanceof FireGuild &&
      guild.members.cache.size / guild.memberCount > 0.98
    )
      messages.push(
        message.language.get("GUILD_JOIN_POS", {
          pos: (
            guild.members.cache
              .array()
              .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
              .indexOf(message.member) + 1
          ).toLocaleString(message.language.id),
        })
      );
    return messages.filter((message) => !!message);
  }

  getSecurity(message: FireMessage, guild: FireGuild | GuildPreview) {
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
      `${emoji} ${message.language.get(
        `GUILD_VERIF_${guild.verificationLevel}`
      )}`
    );

    switch (guild.explicitContentFilter) {
      case "ALL_MEMBERS":
        info.push(
          `${constants.emojis.statuspage.operational} ${message.language.get(
            "GUILD_FILTER_ALL"
          )}`
        );
        break;
      case "MEMBERS_WITHOUT_ROLES":
        info.push(
          `${constants.emojis.statuspage.partial_outage} ${message.language.get(
            "GUILD_FILTER_NO_ROLE"
          )}`
        );
        break;
      case "DISABLED":
        info.push(
          `${constants.emojis.statuspage.major_outage} ${message.language.get(
            "GUILD_FILTER_NONE"
          )}`
        );
        break;
    }

    if (guild.defaultMessageNotifications == "ONLY_MENTIONS")
      info.push(
        `${constants.emojis.statuspage.operational} ${message.language.get(
          "GUILD_NOTIFS_MENTIONS"
        )}`
      );
    else
      info.push(
        `${constants.emojis.statuspage.partial_outage} ${message.language.get(
          "GUILD_NOTIFS_ALL"
        )}`
      );

    if (guild.mfaLevel)
      info.push(
        `${constants.emojis.statuspage.operational} ${message.language.get(
          "GUILD_MFA_ENABLED"
        )}`
      );
    else
      info.push(
        `${constants.emojis.statuspage.major_outage} ${message.language.get(
          "GUILD_MFA_NONE"
        )}`
      );

    return info;
  }

  shorten(items: any[], max = 1000, sep = ", ") {
    let text = "";

    while (text.length < max && items.length > 0) {
      text += `${items.shift()}${sep}`;
    }

    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);

    return items.length > 0 && text.length < 11 + items.toString().length
      ? `${text} and ${items.length} more...`
      : text;
  }

  async exec(message: FireMessage, args: { guild?: GuildPreview | FireGuild }) {
    if (message.channel instanceof DMChannel && !args.guild)
      return await message.error("COMMAND_GUILD_ONLY", {
        prefix: this.client.config.inviteLink,
      });
    if (!args.guild && typeof args.guild != "undefined") return;
    const guild = args.guild ? args.guild : message.guild;

    const badges = this.getBadges(guild, message.author);
    const info = await this.getInfo(message, guild);
    const security = this.getSecurity(message, guild);

    const featuresLocalization = (message.language.get("FEATURES", {
      returnObjects: true,
    }) as unknown) as Record<string, string>;
    const features: string[] = guild.features
      .filter((feature) => featuresLocalization.hasOwnProperty(feature))
      .map((feature) => featuresLocalization[feature]);

    const roles =
      guild instanceof FireGuild
        ? guild.roles.cache
            .sort((one, two) => (one.position > two.position ? 1 : -1))
            .filter((role) => guild.id != role.id)
            .map((role) =>
              guild == message.guild ? role.toString() : role.name
            )
        : null;

    const embed = new MessageEmbed()
      .setDescription(
        guild.description
          ? `${badges.join(" ")}\n\n${guild.description}`
          : badges.join(" ")
      )
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setAuthor(
        guild.name,
        guild.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(guild.id)
      .setTimestamp();
    if (info.length)
      embed.addField(message.language.get("GUILD_ABOUT"), info.join("\n"));
    if (security.length)
      embed.addField(
        message.language.get("GUILD_SECURITY"),
        security.join("\n")
      );

    if (features.length > 0) {
      embed.addField(
        message.language.get("GUILD_FEATURES"),
        features.join(", ")
      );
    }

    if (guild instanceof FireGuild && roles?.length)
      embed.addField(
        message.language.get("GUILD_ROLES") +
          ` [${guild.roles.cache.array().length - 1}]`,
        this.shorten(roles, 1000, " - ")
      );

    if (
      message.hasExperiment(4026299021, 1) &&
      this.client.manager.state.discordExperiments?.length
    ) {
      const experiments = await this.client.util.getFriendlyGuildExperiments(
        guild.id
      );
      if (experiments.length)
        embed.addField(
          message.language.get("GUILD_EXPERIMENTS"),
          experiments.join("\n")
        );
    }

    await message.channel.send({ embeds: [embed] });
  }
}
