import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { NewsChannel, Permissions } from "discord.js";

export default class LogIgnore extends Command {
  constructor() {
    super("logignore", {
      description: (language: Language) =>
        language.get("LOGIGNORE_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "channel",
          type: "textChannelSilent",
          required: false,
          default: null,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: { channel?: FireTextChannel | NewsChannel }
  ) {
    let current: string[] = message.guild.settings.get("utils.logignore", []);
    const beforeSize = current.length;
    current = current.filter((id) => message.guild.channels.cache.has(id));
    // remove deleted channels
    if (current.length != beforeSize)
      message.guild.settings.set("utils.logignore", current);

    if (!args.channel) {
      current = current
        .map((id) => message.guild.channels.cache.get(id)?.toString())
        .filter((mention) => !!mention);
      return await message.send("LOGIGNORE_LIST_CURRENT", current);
    }

    if (current.includes(args.channel.id))
      current = current.filter((id) => id != args.channel.id);
    else current.push(args.channel.id);

    message.guild.settings.set("utils.logignore", current);
    current = current
      .map((id) => message.guild.channels.cache.get(id)?.toString())
      .filter((mention) => !!mention);
    return await message.success("LOGIGNORE_LIST_CURRENT", current);
  }
}
