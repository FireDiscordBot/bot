import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { NewsChannel } from "discord.js";

export default class LogIgnore extends Command {
  constructor() {
    super("logignore", {
      description: (language: Language) =>
        language.get("LOGIGNORE_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { channel?: FireTextChannel | NewsChannel }
  ) {
    let current: Snowflake[] | string[] = command.guild.settings.get<
      Snowflake[]
    >("utils.logignore", []);
    const beforeSize = current.length;
    current = current.filter((id) =>
      command.guild.channels.cache.has(id as Snowflake)
    );
    // remove deleted channels
    if (current.length != beforeSize && current.length)
      await command.guild.settings.set<string[]>(
        "utils.logignore",
        current,
        command.author
      );
    else if (current.length != beforeSize)
      await command.guild.settings.delete("utils.logignore", command.author);

    if (!args.channel) {
      current = current
        .map((id) =>
          command.guild.channels.cache.get(id as Snowflake)?.toString()
        )
        .filter((mention) => !!mention);
      return await command.send(
        current.length ? "LOGIGNORE_LIST_CURRENT" : "LOGIGNORE_LIST_NONE",
        { current: current.join(", ") }
      );
    }

    if (current.includes(args.channel.id))
      current = current.filter((id) => id != args.channel.id);
    else current.push(args.channel.id);

    await command.guild.settings.set<Snowflake[]>(
      "utils.logignore",
      current as Snowflake[],
      command.author
    );
    current = current
      .map((id) =>
        command.guild.channels.cache.get(id as Snowflake)?.toString()
      )
      .filter((mention) => !!mention);
    return await command.success(
      current.length ? "LOGIGNORE_LIST_CURRENT" : "LOGIGNORE_LIST_NONE",
      { current: current.join(", ") }
    );
  }
}
