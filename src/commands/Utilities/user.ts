import {
  UserFlagsString,
  PermissionString,
  MessageEmbed,
  ClientUser,
} from "discord.js";
import { constants, humanize, zws } from "../../../lib/util/constants";
import { FireMember } from "../../../lib/extensions/guildmember";
import { FireMessage } from "../../../lib/extensions/message";
import { FireUser } from "../../../lib/extensions/user";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Ban } from "@aero/ksoft";
import * as moment from "moment";

const {
  emojis,
  emojis: { badges },
} = constants;
export default class User extends Command {
  constructor() {
    super("user", {
      description: (language: Language) =>
        language.get("USER_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "user",
          type: "user|member",
          default: null,
          required: false,
        },
      ],
      aliases: ["userinfo", "infouser", "whois", "u"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { user?: FireMember | FireUser }) {
    let member: FireMember, user: FireUser;
    if (args.user instanceof FireMember) {
      member = args.user;
      user = member.user;
    } else user = args.user;
    if (!user) {
      if (message.member) {
        member = message.member;
        user = member.user;
      } else user = message.author;
    }
    if (user instanceof FireMember) {
      member = user;
      user = user.user;
    }
    if (user instanceof ClientUser) {
      member = message.guild.members.cache.get(user.id) as FireMember;
      user = member.user;
    }
    const color = member
      ? member?.displayColor
      : message.member?.displayColor || "#ffffff";
    const badges = this.getBadges(user);
    const info = this.getInfo(message, member ? member : user);
    const embed = new MessageEmbed()
      .setColor(color)
      .setTimestamp(new Date())
      .setAuthor(
        user.toString(),
        user instanceof FireMember
          ? user.user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
          : user.displayAvatarURL({
              size: 2048,
              format: "png",
              dynamic: true,
            })
      )
      .addField(`» ${message.language.get("ABOUT")}`, info.join("\n"), false);
    if (badges.length) embed.setDescription(badges.join("  "));
    if (member) {
      const roles = member.roles.cache
        .filter((role) => role.id != message.guild.id)
        .sorted((roleA, roleB) => roleA.position - roleB.position)
        .map((role) => role.toString());
      if (roles.length)
        embed.addField(
          `» ${message.language.get("ROLES")} [${member.roles.cache.size - 1}]`,
          this.shorten(roles, 1000, " - "),
          false
        );
      const permissionsTranslated = message.language.get(
        "PERMISSIONS"
      ) as object;
      if (!member.hasPermission("ADMINISTRATOR")) {
        let perms = [];
        const keyPerms: PermissionString[] = [
          "BAN_MEMBERS",
          "CHANGE_NICKNAME",
          "KICK_MEMBERS",
          "MANAGE_CHANNELS",
          "MANAGE_GUILD",
          "MANAGE_EMOJIS",
          "MANAGE_MESSAGES",
          "MANAGE_NICKNAMES",
          "MANAGE_ROLES",
          "MANAGE_WEBHOOKS",
          "MENTION_EVERYONE",
          "VIEW_AUDIT_LOG",
          "VIEW_GUILD_INSIGHTS",
        ];
        Object.keys(permissionsTranslated)
          .filter((permission: PermissionString) =>
            keyPerms.includes(permission)
          )
          .forEach((permission: PermissionString) => {
            if (member.hasPermission(permission))
              perms.push(permissionsTranslated[permission]);
          });
        if (perms.length)
          embed.addField(
            `» ${message.language.get("KEY_PERMISSIONS")}`,
            perms.join(", "),
            false
          );
      } else
        embed.addField(
          `» ${message.language.get("PERMISSIONS_TEXT")}`,
          permissionsTranslated["ADMINISTRATOR"],
          false
        );
    }
    if (!user.bot) {
      const ksoftBan = await this.getKsoftBan(message, user);
      const notes = [ksoftBan].filter((note) => !!note);
      if (notes.length)
        embed.addField(
          `» ${message.language.get("NOTES")}`,
          notes.join("\n"),
          false
        );
    }
    embed.setFooter(user.id);
    return await message.channel.send(embed);
  }

  getBadges(user: FireUser) {
    const flags = user.flags?.toArray() || [];
    let emojis: string[] = Object.keys(badges)
      .filter((badge: UserFlagsString) => flags.includes(badge))
      .map((badge) => badges[badge]);
    if (this.client.util.admins.includes(user.id))
      emojis.push(badges.FIRE_ADMIN);
    if ([...this.client.util.premium.values()].includes(user.id))
      emojis.push(badges.FIRE_PREMIUM);
    if (emojis.length) emojis.push(zws);
    return emojis;
  }

  getInfo(message: FireMessage, member: FireMember | FireUser) {
    let user = member instanceof FireMember ? member.user : member;
    const created = user.createdAt.toLocaleString(message.language.id);
    const now = moment();
    const createdDelta =
      humanize(
        moment(user.createdAt).diff(now),
        message.language.id.split("-")[0]
      ) + " ago";
    let info = [
      `**${message.language.get("MENTION")}:** ${user.toMention()}`,
      `**${message.language.get("CREATED")}:** ${created} (${createdDelta})`,
    ];
    if (member instanceof FireMember) {
      const joined = member.joinedAt.toLocaleString(message.language.id);
      const joinedDelta =
        humanize(
          moment(member.joinedAt).diff(now),
          message.language.id.split("-")[0]
        ) + " ago";
      if (message.guild && message.guild.ownerID == member.id)
        // 99% of the time the guild will never be transferred so it'll make sense most of the time
        info.push(
          `**${message.language.get(
            "CREATED_GUILD"
          )}:** ${joined} (${joinedDelta})`
        );
      else
        info.push(
          `**${message.language.get("JOINED")}:** ${joined} (${joinedDelta})`
        );
      if (
        message.guild &&
        message.guild.members.cache.size / message.guild.memberCount > 0.98
      ) {
        const joinPos =
          message.guild.members.cache
            .sorted(
              (memberA, memberB) =>
                memberA.joinedTimestamp - memberB.joinedTimestamp // this may need to be reversed
            )
            .array()
            .indexOf(member) + 1;
        info.push(
          `**${message.language.get(
            "JOIN_POSITION"
          )}:** ${joinPos.toLocaleString(message.language.id)}`
        );
      }
      if (member && member.nickname && member.nickname != member.user.username)
        info.push(
          `**${message.language.get("NICKNAME")}:** ${member.nickname}`
        );
    }
    return info;
  }

  async getKsoftBan(message: FireMessage, user: FireUser) {
    if (!this.client.ksoft)
      return `${emojis.error} ${message.language.get("USER_NO_KSOFT")}`;
    const banned = await this.client.ksoft.bans.info(user.id);
    if (banned instanceof Ban)
      return `${emojis.error} ${message.language.get(
        "USER_KSOFT_BANNED",
        banned
      )}`;
    return "";
  }

  shorten(items: any[], max: number = 1000, sep: string = ", ") {
    let text = "";
    let next = 0;
    while (text.length < max && items.length) {
      text = text + `${items[0]}${sep}`;
      items.shift();
    }
    if (text.endsWith(sep)) text = text.slice(0, text.length - sep.length);
    if (items.length >= 1) return text + ` and ${items.length} more...`;
    return text;
  }
}
