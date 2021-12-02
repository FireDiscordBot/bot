import { Language, LanguageKeys } from "@fire/lib/util/language";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageEmbed, Permissions } from "discord.js";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";

export default class Blacklist extends Command {
  constructor() {
    super("blacklist", {
      description: (language: Language) =>
        language.get("BLACKLIST_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
      ],
      args: [
        {
          id: "user",
          type: "user|member",
          required: true,
          default: undefined,
        },
        {
          id: "reason",
          type: "string",
          default: null,
          match: "rest",
        },
      ],
      enableSlashCommand: true,
      aliases: ["plonk", "unblacklist", "unplonk"],
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { user: FireMember | FireUser; reason: string }
  ) {
    if (!args.user && typeof args.user == "undefined")
      return await message.error("BLACKLIST_USER_REQUIRED");
    else if (!args.user) return;

    if (args.user instanceof FireMember ? args.user.user.bot : args.user.bot)
      return await message.error("BLACKLIST_BOT");
    if (
      !message.author.isSuperuser() &&
      !message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD)
    )
      return await message.error("BLACKLIST_FORBIDDEN", {
        manage: message.language.get(
          "PERMISSIONS.MANAGE_GUILD" as LanguageKeys
        ),
      });

    if (
      args.user.id == message.author.id ||
      (args.user instanceof FireMember &&
        (args.user.isModerator() || args.user.user.bot) &&
        message.author.id != message.guild.ownerId) ||
      (args.user.isSuperuser() && !this.client.util.isBlacklisted(args.user))
    )
      return await message.error("MODERATOR_ACTION_DISALLOWED");

    if (message.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
      await this.localBlacklist(message, args);
    else if (message.author.isSuperuser())
      await this.globalBlacklist(message, args);
    else
      return await message.error("BLACKLIST_FORBIDDEN", {
        manage: message.language.get(
          "PERMISSIONS.MANAGE_GUILD" as LanguageKeys
        ),
      });
  }

  async globalBlacklist(
    message: FireMessage,
    args: { user: FireMember | FireUser; reason: string }
  ) {
    if (this.client.util.isBlacklisted(args.user)) {
      const unblacklisted = await args.user.unblacklist();
      if (this.client.manager.ws && unblacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardId : 0,
              action: `${args.user} (${args.user.id}) was unblacklisted`,
            })
          )
        );
      return unblacklisted ? await message.success() : await message.error();
    } else {
      const blacklisted = await args.user.blacklist(args.reason);
      if (this.client.manager.ws && blacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${message.author} (${message.author.id})`,
              guild: message.guild
                ? `${message.guild} (${message.guild.id})`
                : "N/A",
              shard: message.guild ? message.guild.shardId : 0,
              action: `${args.user} (${args.user.id}) was blacklisted`,
            })
          )
        );
      return blacklisted ? await message.success() : await message.error();
    }
  }

  async localBlacklist(
    message: FireMessage,
    args: { user: FireMember | FireUser; reason?: string }
  ) {
    await message.delete().catch(() => {});
    let current = message.guild.settings.get<string[]>("utils.plonked", []);
    const isPlonked = current.includes(args.user.id);
    if (isPlonked) current = current.filter((id) => id != args.user.id);
    else current.push(args.user.id);

    if (current.length)
      message.guild.settings.set<string[]>("utils.plonked", current);
    else message.guild.settings.delete("utils.plonked");
    await message.guild.createModLogEntry(
      args.user,
      message.member,
      isPlonked ? "unblacklist" : "blacklist",
      args.reason ||
        (message.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string)
    );

    const embed = new MessageEmbed()
      .setColor(
        args.user instanceof FireMember
          ? args.user.displayColor || isPlonked
            ? "#2ECC71"
            : "#E74C3C"
          : isPlonked
          ? "#2ECC71"
          : "#E74C3C"
      )
      .setTimestamp()
      .setAuthor({
        name: isPlonked
          ? message.guild.language.get("UNBLACKLIST_LOG_AUTHOR", {
              user: args.user.toString(),
            })
          : message.guild.language.get("BLACKLIST_LOG_AUTHOR", {
              user: args.user.toString(),
            }),
        iconURL: args.user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addField(
        message.guild.language.get("MODERATOR"),
        message.author.toString()
      )
      .addField(
        message.guild.language.get("REASON"),
        args.reason ||
          (message.guild.language.get(
            "MODERATOR_ACTION_DEFAULT_REASON"
          ) as string)
      )
      .setFooter(`${args.user.id} | ${message.author.id}`);
    await message.guild.modLog(embed, isPlonked ? "unblacklist" : "blacklist");
    return await message.success(
      isPlonked ? "UNBLACKLIST_SUCCESS" : "BLACKLIST_SUCCESS",
      { user: args.user.toString(), guild: message.guild.name }
    );
  }
}
