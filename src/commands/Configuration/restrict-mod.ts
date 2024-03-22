import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import { CategoryChannel, Permissions, Snowflake } from "discord.js";

export default class RestrictModerator extends Command {
  constructor() {
    super("restrict-moderator", {
      description: (language: Language) =>
        language.get("RESTRICT_MODERATOR_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "category",
          type: "categorySilent",
          description: (language: Language) =>
            language.get("RESTRICT_MODERATOR_ARGUMENT_CATEGORY_DESCRIPTION"),
          slashCommandType: "category",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      parent: "restrict",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { category?: CategoryChannel }
  ) {
    let current = command.guild.settings.get<Snowflake[]>(
      "commands.modonly",
      []
    );
    const channelId = args.category ? args.category.id : command.channel.id;
    const suffix = args.category ? "_CATEGORY" : "_SINGLE";
    if (current.includes(channelId)) {
      current = current.filter((id) => id !== channelId);
      await command.guild.settings.set("commands.modonly", current);
      return await command.success(
        `RESTRICT_MODERATOR_REMOVED${suffix}` as LanguageKeys,
        {
          category: args.category?.name,
        }
      );
    } else {
      if (args.category)
        // avoid duplicates
        current = current.filter((id) => !args.category.children.has(id));
      else if (
        command.channel.parentId &&
        current.includes(command.channel.parentId)
      )
        return await command.error(
          "RESTRICT_MODERATOR_ALREADY_COVERED" as LanguageKeys
        );
      current.push(channelId);
      await command.guild.settings.set("commands.modonly", current);
      return await command.success(
        `RESTRICT_MODERATOR_ADDED${suffix}` as LanguageKeys,
        {
          category: args.category?.name,
        }
      );
    }
  }
}
