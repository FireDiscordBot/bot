import { humanize, zws, constants } from "../../lib/util/constants";
import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import { Guild } from "discord.js";
import * as moment from "moment";

export default class GuildCommand extends Command {
  constructor() {
    super("guild", {
      description: (language: Language) =>
        language.get("GUILD_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["guildinfo", "infoguild", "serverinfo", "infoserver", "server"],
    });
  }

  getBadges(guild: Guild) {
    let badges: string[] = [];
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
    return badges
      ? () => {
          badges.push(zws);
          return badges;
        }
      : [];
  }

  getInfo(message: FireMessage, guild: Guild) {
    const created = humanize(moment(guild.createdAt).diff(moment())) + " ago";
    return [
      `**Created by ${
        guild.owner.user.username + guild.owner.user.discriminator ||
        "Unknown#0000"
      } ${created}**`,
      `**Members:** ${guild.memberCount.toLocaleString()}`,
      `**Region:** ${
        constants.discord.regions[guild.region] || "❓ Deprecated Region"
      }`,
      `**Your Join Position:** ${(
        guild.members.cache
          .array()
          .sort((one, two) => (one.joinedAt > two.joinedAt ? 1 : -1))
          .indexOf(message.member) + 1
      ).toLocaleString()}`,
    ];
  }

  getSecurity(guild: Guild) {
    let info: string[] = [];
    switch (guild.verificationLevel) {
      case "VERY_HIGH":
        info.push(`${constants.emojis.green} **Extreme Verification Level**`);
        break;
      case "HIGH":
        info.push(`${constants.emojis.green} **High Verification Level**`);
        break;
      case "MEDIUM":
        info.push(`${constants.emojis.yellow} **Medium Verification Level**`);
        break;
      case "LOW":
        info.push(`${constants.emojis.red} **Low Verification Level**`);
        break;
      case "NONE":
        info.push(`${constants.emojis.red} **No Verfification!**`);
        break;
    }
    switch (guild.explicitContentFilter) {
      case "ALL_MEMBERS":
        info.push(`${constants.emojis.green} **Content Filter:** All Members`);
        break;
      case "MEMBERS_WITHOUT_ROLES":
        info.push(
          `${constants.emojis.yellow} **Content Filter:** Without Role`
        );
        break;
      case "DISABLED":
        info.push(`${constants.emojis.red} **Content Filter:** Disabled`);
        break;
    }
    if (guild.defaultMessageNotifications == "MENTIONS")
      info.push(
        `${constants.emojis.green} **Default Notifications:** Only @Mentions`
      );
    else
      info.push(
        `${constants.emojis.yellow} **Default Notifications:** All Messages`
      );
    if (guild.mfaLevel)
      info.push(`${constants.emojis.green} **Two-Factor Auth:** Enabled`);
    else info.push(`${constants.emojis.red} **Two-Factor Auth:** Disabled`);
    return info;
  }

  shorten(items: Array<any>, max: number = 1000, sep: string = ", ") {
    let text = "";
    while (text.length < max && items.length) {
      text += `${items[0]}${sep}`;
      items = items.slice(1);
    }
    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);
    if (items.length && text.length < 11 + items.toString().length)
      return text + ` and ${items.length} more...`;
    return text;
  }

  async exec(message: FireMessage) {
    const badges = this.getBadges(message.guild);
    const info = this.getInfo(message, message.guild);
    const security = this.getSecurity(message.guild);
    let features = [];
    message.guild.features.forEach((value) => {
      if (constants.discord.features.hasOwnProperty(value))
        features.push(constants.discord.features[value]);
    });
    let roles = [];
    message.guild.roles.cache
      .sort((one, two) => (one.position > two.position ? 1 : -1))
      .forEach((value) => {
        if (!(message.guild.id == value.id)) roles.push(value.toString());
      });
    const embed = {
      description: badges,
      color: message.member?.displayColor || "#ffffff",
      author: {
        name: message.guild.name,
        icon_url: message.guild.iconURL({
          size: 2048,
          format: message.guild.icon.startsWith("a_") ? "gif" : "png",
        }),
      },
      fields: [
        {
          value: info,
          name: "» About",
          inline: false,
        },
        {
          value: security,
          name: "» Security",
          inline: false,
        },
        {
          value: features.join(", "),
          name: "» Features",
          inline: false,
        },
        {
          value: this.shorten(roles, 1000, " - "),
          name: `» Roles [${message.guild.roles.cache.array().length}]`,
          inline: false,
        },
      ],
      footer: {
        text: message.guild.id,
      },
      timestamp: new Date(),
    };
    await message.channel.send({ embed });
  }
}
