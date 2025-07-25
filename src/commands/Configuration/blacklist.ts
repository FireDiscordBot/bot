import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { ModLogTypes, ModLogTypeString } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";

export default class Blacklist extends Command {
  constructor() {
    super("blacklist", {
      description: (language: Language) =>
        language.get("BLACKLIST_COMMAND_DESCRIPTION"),
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
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser; reason: string }
  ) {
    if (!args.user && typeof args.user == "undefined")
      return await command.error("BLACKLIST_USER_REQUIRED");
    else if (!args.user) return;

    if (args.user instanceof FireMember ? args.user.user.bot : args.user.bot)
      return await command.error("BLACKLIST_BOT");
    if (
      !command.author.isSuperuser() &&
      !command.member?.permissions.has(PermissionFlagsBits.ManageGuild)
    )
      return await command.error("BLACKLIST_FORBIDDEN", {
        manage: this.client.util.cleanPermissionName(
          PermissionFlagsBits.ManageGuild
        ),
      });

    if (
      args.user.id == command.author.id ||
      (args.user instanceof FireMember &&
        (args.user.isModerator() || args.user.user.bot) &&
        command.author.id != command.guild.ownerId) ||
      (args.user.isSuperuser() && !this.client.util.isBlacklisted(args.user))
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");

    if (command.member?.permissions.has(PermissionFlagsBits.ManageGuild))
      await this.localBlacklist(command, args);
    else if (command.author.isSuperuser())
      await this.globalBlacklist(command, args);
    else
      return await command.error("BLACKLIST_FORBIDDEN", {
        manage: this.client.util.cleanPermissionName(
          PermissionFlagsBits.ManageGuild
        ),
      });
  }

  async globalBlacklist(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser; reason: string }
  ) {
    if (this.client.util.isBlacklisted(args.user)) {
      const unblacklisted = await args.user.unblacklist();
      if (this.client.manager.ws && unblacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${command.author} (${command.author.id})`,
              user_id: command.author.id,
              // TODO: possibly rename to "source" rather than guild?
              guild: command.source,
              shard: command.shard,
              action: `${args.user} (${args.user.id}) was unblacklisted`,
            })
          )
        );
      return unblacklisted
        ? await command.success("UNBLACKLIST_SUCCESS", {
            user: args.user.toString(),
            guild: "Fire (Global Blacklist)",
          })
        : await command.error("ERROR_CONTACT_SUPPORT");
    } else {
      const blacklisted = await args.user.blacklist(args.reason);
      if (this.client.manager.ws && blacklisted)
        this.client.manager.ws.send(
          MessageUtil.encode(
            new Message(EventType.ADMIN_ACTION, {
              user: `${command.author} (${command.author.id})`,
              user_id: command.author.id,
              // TODO: possibly rename to "source" rather than guild?
              guild: command.source,
              shard: command.shard,
              action: `${args.user} (${args.user.id}) was blacklisted`,
            })
          )
        );
      return blacklisted
        ? await command.success("BLACKLIST_SUCCESS", {
            user: args.user.toString(),
            guild: "Fire (Global Blacklist)",
          })
        : await command.error("ERROR_CONTACT_SUPPORT");
    }
  }

  async localBlacklist(
    command: ApplicationCommandMessage,
    args: { user: FireMember | FireUser; reason?: string }
  ) {
    let current = command.guild.settings.get<string[]>("utils.plonked", []);
    const isPlonked = current.includes(args.user.id);
    if (isPlonked) current = current.filter((id) => id != args.user.id);
    else current.push(args.user.id);

    const user = args.user instanceof FireMember ? args.user.user : args.user;

    if (current.length)
      await command.guild.settings.set<string[]>(
        "utils.plonked",
        current,
        command.author
      );
    else await command.guild.settings.delete("utils.plonked", command.author);
    await command.guild.createModLogEntry(
      args.user,
      command.member,
      isPlonked ? ModLogTypes.UNBLACKLIST : ModLogTypes.BLACKLIST,
      args.reason ||
        (command.guild.language.get(
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
          ? command.guild.language.get("UNBLACKLIST_LOG_AUTHOR", {
              user: args.user.display,
            })
          : command.guild.language.get("BLACKLIST_LOG_AUTHOR", {
              user: args.user.display,
            }),
        iconURL: args.user.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .addFields([
        {
          name: command.guild.language.get("MODERATOR"),
          value: command.author.toString(),
        },

        {
          name: command.guild.language.get("REASON"),
          value:
            args.reason ||
            (command.guild.language.get(
              "MODERATOR_ACTION_DEFAULT_REASON"
            ) as string),
        },
      ])
      .setFooter({ text: `${user.id} | ${command.author.id}` });
    await command.guild.modLog(
      embed,
      isPlonked ? ModLogTypes.UNBLACKLIST : ModLogTypes.BLACKLIST
    );
    const stats = await user.getModLogStats(command.guild);
    const nonZeroTypes = Object.entries(stats)
      .filter(
        ([type, count]) =>
          count > 0 && type != (isPlonked ? "unblacklist" : "blacklist")
      )
      .map(([type, count]: [ModLogTypeString, number]) =>
        command.guild.language.get("MODLOGS_ACTION_LINE", {
          action: type,
          count,
        })
      )
      .join("\n");
    return await command.channel.send(
      command.guild.language.getSuccess(
        isPlonked ? "UNBLACKLIST_SUCCESS" : "BLACKLIST_SUCCESS",
        { user: user.toString(), guild: command.guild.name }
      ) +
        (nonZeroTypes
          ? `\n\n${command.guild.language.get("MODLOGS_ACTION_FOOTER", {
              entries: nonZeroTypes,
            })}`
          : "")
    );
  }
}
