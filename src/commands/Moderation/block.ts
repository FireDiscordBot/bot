import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireVoiceChannel } from "@fire/lib/extensions/voicechannel";
import { Command } from "@fire/lib/util/command";
import { GuildTextChannel } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { NewsChannel, Permissions, Role, ThreadChannel } from "discord.js";

export default class Block extends Command {
  constructor() {
    super("block", {
      description: (language: Language) =>
        language.get("BLOCK_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_ROLES],
      args: [
        {
          id: "who",
          type: "member|role",
          readableType: "member/role",
          slashCommandType: "member-or-role",
          description: (language: Language) =>
            language.get("BLOCK_ARGUMENT_WHO_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "reason",
          type: "string",
          description: (language: Language) =>
            language.get("BLOCK_ARGUMENT_REASON_DESCRIPTION"),
          required: false,
          default: null,
          match: "rest",
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { who: FireMember | Role; reason?: string }
  ) {
    if (!args.who) return await command.error("BLOCK_ARG_REQUIRED");
    else if (
      args.who instanceof FireMember &&
      args.who.isModerator(command.channel) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    else if (
      args.who instanceof FireMember &&
      args.who.roles.highest.rawPosition >=
        command.member?.roles?.highest?.rawPosition
    )
      return await command.error("BLOCK_GOD");
    else if (
      args.who instanceof Role &&
      args.who.rawPosition >= command.member?.roles?.highest?.rawPosition
    )
      return await command.error("BLOCK_ROLE_HIGH");

    let channel = command.channel.real as GuildTextChannel | ThreadChannel;
    if (channel instanceof ThreadChannel)
      channel = channel.parent as GuildTextChannel;

    const blocked = await command.guild.block(
      args.who,
      args.reason?.trim() ||
        (command.guild.language.get(
          "MODERATOR_ACTION_DEFAULT_REASON"
        ) as string),
      command.member,
      channel
    );
    if (blocked == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof blocked == "string")
      return await command.error(
        `BLOCK_FAILED_${blocked.toUpperCase()}` as LanguageKeys
      );
  }
}
