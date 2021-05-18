import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class TagSlash extends Command {
  constructor() {
    super("tag-slash", {
      description: (language: Language) =>
        language.get("TAG_SLASH_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      clientPermissions: [Permissions.FLAGS.SEND_MESSAGES],
      args: [
        {
          id: "ephemeral",
          type: "boolean",
          default: null,
          required: false,
        },
      ],
      aliases: ["tags-slash", "dtag-slash", "dtags-slash"],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { ephemeral?: boolean }) {
    if (typeof args.ephemeral == "boolean") {
      const current = message.guild.settings.get<boolean>(
        "tags.ephemeral",
        true
      );
      message.guild.settings.set<boolean>("tags.ephemeral", !current);
      message.guild.tags.ephemeral = !current;
      return !current
        ? await message.success("TAG_SLASH_EPHEMERAL_ENABLED")
        : await message.success("TAG_SLASH_EPHEMERAL_DISABLED");
    }

    const current = message.guild.settings.get<boolean>(
      "tags.slashcommands",
      false
    );
    message.guild.settings.set<boolean>("tags.slashcommands", !current);
    if (!current) {
      message.channel.startTyping(5);
      const prepared = await message.guild.tags?.prepareSlashCommands();
      message.channel.stopTyping(true);
      if (prepared == null) {
        message.guild.settings.set<boolean>("tags.slashcommands", false);
        return await message.error("TAG_SLASH_MISSING_ACCESS");
      } else if (!prepared) return await message.error();
      else return await message.success("TAG_SLASH_ENABLED");
    } else {
      message.channel.startTyping(5);
      const removed = await message.guild.tags?.removeSlashCommands();
      message.channel.stopTyping(true);
      if (!removed) return await message.error();
      else return await message.success("TAG_SLASH_DISABLED");
    }
  }
}
