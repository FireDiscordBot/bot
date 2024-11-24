import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

const nameRegex =
  /^[-_\p{L}\p{N}\p{Script=Devanagari}\p{Script=Thai}]{1,32}$/gmu;

export default class TagSlash extends Command {
  constructor() {
    super("tag-slash", {
      description: (language: Language) =>
        language.get("TAG_SLASH_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageMessages],
      clientPermissions: [PermissionFlagsBits.SendMessages],
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
      await message.guild.settings.set<boolean>(
        "tags.ephemeral",
        !current,
        message.author
      );
      return !current
        ? await message.success("TAG_SLASH_EPHEMERAL_ENABLED")
        : await message.success("TAG_SLASH_EPHEMERAL_DISABLED");
    }

    const current = message.guild.settings.get<boolean>(
      "tags.slashcommands",
      false
    );
    if (current == null) return await message.error("ERROR_CONTACT_SUPPORT");
    await message.guild.settings.set<boolean>(
      "tags.slashcommands",
      !current,
      message.author
    );
    if (!message.guild.tags) {
      message.guild.tags = new GuildTagManager(this.client, message.guild);
      await message.guild.tags.init();
    }
    if (
      message.guild.tags.names.some((name) => {
        const test = !nameRegex.test(name);
        nameRegex.lastIndex = 0;
        return test;
      })
    )
      return await message.error("TAG_SLASH_NAME_INVALID");
    if (!current) {
      const prepared = await message.guild.tags?.prepareSlashCommands();
      if (prepared == null) {
        await message.guild.settings.set<boolean>(
          "tags.slashcommands",
          false,
          this.client.user
        );
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
