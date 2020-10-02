import { humanize, zws, constants } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { FireGuild } from "../../../lib/extensions/guild";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as moment from "moment";
import { MessageEmbed } from "discord.js";

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
    });
  }

  getBadges(guild: FireGuild) {
    const badges: string[] = [];

    if (guild.id == "564052798044504084")
      badges.push(
        this.client.emojis.cache.get("671243744774848512").toString()
      );
    if (guild.features.includes("PARTNERED"))
      badges.push(
        this.client.emojis.cache.get("748876805011931188").toString()
      );
    if (guild.features.includes("VERIFIED"))
      badges.push(
        this.client.emojis.cache.get("751196492517081189").toString()
      );
    // TODO add premium badge

    if (badges.length > 0) {
      badges.push(zws);
    }

    return badges;
  }

  getInfo(message: FireMessage, guild: FireGuild) {
    const created =
      humanize(
        moment(guild.createdAt).diff(moment()),
        guild.language.id.split("-")[0]
      ) + " ago";
    return [
      message.language.get("GUILD_CREATED_AT", guild, created),
      `**${message.language.get(
        "MEMBERS"
      )}:** ${guild.memberCount.toLocaleString()}`,
      `**${message.language.get("REGION")}:** ${
        message.language.get("REGIONS")[guild.region] ||
        message.language.get("REGION_DEPRECATED")
      }`,
      message.language.get(
        "GUILD_JOIN_POS",
        (
          guild.members.cache
            .array()
            .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
            .indexOf(message.member) + 1
        ).toLocaleString()
      ),
    ];
  }

  getSecurity(guild: FireGuild) {
    const info: string[] = [];

    const VERIFICATION_LEVEL_EMOJI = {
      VERY_HIGH: constants.emojis.green,
      HIGH: constants.emojis.green,
      MEDIUM: constants.emojis.yellow,
      LOW: constants.emojis.red,
      NONE: constants.emojis.red,
    };

    const emoji = VERIFICATION_LEVEL_EMOJI[guild.verificationLevel];
    info.push(
      `${emoji} ${guild.language.get(`GUILD_VERIF_${guild.verificationLevel}`)}`
    );

    switch (guild.explicitContentFilter) {
      case "ALL_MEMBERS":
        info.push(
          `${constants.emojis.green} ${guild.language.get("GUILD_FILTER_ALL")}`
        );
        break;
      case "MEMBERS_WITHOUT_ROLES":
        info.push(
          `${constants.emojis.yellow} ${guild.language.get(
            "GUILD_FILTER_NO_ROLE"
          )}`
        );
        break;
      case "DISABLED":
        info.push(
          `${constants.emojis.red} ${guild.language.get("GUILD_FILTER_NONE")}`
        );
        break;
    }

    if (guild.defaultMessageNotifications == "MENTIONS")
      info.push(
        `${constants.emojis.green} ${guild.language.get(
          "GUILD_NOTIFS_MENTIONS"
        )}`
      );
    else
      info.push(
        `${constants.emojis.yellow} ${guild.language.get("GUILD_NOTIFS_ALL")}`
      );

    if (guild.mfaLevel)
      info.push(
        `${constants.emojis.green} ${guild.language.get("GUILD_MFA_ENABLED")}`
      );
    else
      info.push(
        `${constants.emojis.red} ${guild.language.get("GUILD_MFA_DISABLED")}`
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

  async exec(message: FireMessage) {
    const badges = this.getBadges(message.guild);
    const info = this.getInfo(message, message.guild);
    const security = this.getSecurity(message.guild);

    const featuresLocalization = message.language.get("FEATURES");
    const features: string[] = message.guild.features
      .filter((feature) => featuresLocalization.hasOwnProperty(feature))
      .map((feature) => featuresLocalization[feature]);

    const roles = message.guild.roles.cache
      .sort((one, two) => (one.position > two.position ? 1 : -1))
      .filter((role) => message.guild.id !== role.id)
      .map((role) => role.toString());

    const embed = new MessageEmbed()
      .setDescription(badges.join(" "))
      .setColor(message.member?.displayColor || "#ffffff")
      .setAuthor(
        message.guild.name,
        message.guild.iconURL({
          size: 2048,
          format: message.guild.icon?.startsWith("a_") ? "gif" : "png",
        })
      )
      .addField(message.language.get("GUILD_ABOUT"), info)
      .addField(message.language.get("GUILD_SECURITY"), security);

    if (features.length > 0) {
      embed.addField(
        message.language.get("GUILD_FEATURES"),
        features.join(", ")
      );
    }

    embed
      .addField(
        message.language.get("GUILD_ROLES") +
          `[${message.guild.roles.cache.array().length}]`,
        this.shorten(roles, 1000, " - ")
      )
      .setFooter(message.guild.id)
      .setTimestamp(new Date());

    await message.channel.send(embed);
  }
}
