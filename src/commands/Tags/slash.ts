import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

const nameRegex =
  /^[-_\p{L}\p{N}\p{Script=Devanagari}\p{Script=Thai}]{1,32}$/gmu;

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
      cooldown: 600000,
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
      return !current
        ? await message.success("TAG_SLASH_EPHEMERAL_ENABLED")
        : await message.success("TAG_SLASH_EPHEMERAL_DISABLED");
    }

    const current = message.guild.settings.get<boolean>(
      "tags.slashcommands",
      false
    );
    if (current == null) return await message.error("ERROR_CONTACT_SUPPORT");
    message.guild.settings.set<boolean>("tags.slashcommands", !current);
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    if (message.guild.tags.names.some((name) => !nameRegex.test(name)))
      return await message.error("TAG_SLASH_NAME_INVALID");
    if (!current) {
      const prepared = await message.guild.tags?.prepareSlashCommands();
      if (prepared == null) {
        message.guild.settings.set<boolean>("tags.slashcommands", false);
        return await message.error("TAG_SLASH_MISSING_ACCESS");
      } else if (!prepared) return await message.error("ERROR_CONTACT_SUPPORT");
      else return await message.success("TAG_SLASH_ENABLED");
    } else {
      message.channel.sendTyping();
      const removed = await message.guild.tags?.removeSlashCommands();
      if (!removed) return await message.error("ERROR_CONTACT_SUPPORT");
      else return await message.success("TAG_SLASH_DISABLED");
    }
  }
}
