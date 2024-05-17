import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";

export default class Note extends Command {
  constructor() {
    super("note", {
      description: (language: Language) =>
        language.get("NOTE_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "user",
          type: "member",
          description: (language: Language) =>
            language.get("NOTE_ARGUMENT_USER_DESCRIPTION"),
          required: true,
        },
        {
          id: "text",
          type: "string",
          description: (language: Language) =>
            language.get("NOTE_ARGUMENT_TEXT_DESCRIPTION"),
          required: true,
        },
      ],
      restrictTo: "guild",
      moderatorOnly: true,
      deferAnyways: true,
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { user: FireMember; text: string }
  ) {
    if (!args.user) return;
    else if (
      (args.user.isModerator(command.channel) || args.user.user.bot) &&
      command.author.id != command.guild.ownerId
    )
      return await command.error("MODERATOR_ACTION_DISALLOWED");
    const noted = await args.user.note(
      args.text,
      command.member,
      command.channel
    );
    if (noted == "forbidden")
      return await command.error("COMMAND_MODERATOR_ONLY");
    else if (typeof noted == "string")
      return await command.error(
        `NOTE_FAILED_${noted.toUpperCase()}` as LanguageKeys
      );
  }
}
