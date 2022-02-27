import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { textChannelConverter } from "@fire/lib/util/converters";
import { FireMessage } from "@fire/lib/extensions/message";
import { Permissions, Snowflake } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Util } from "@fire/lib/util/clientutil";

// TODO: rewrite this hot mess

export default class AdminOnly extends Command {
  constructor() {
    super("adminonly", {
      description: (language: Language) =>
        language.get("ADMINONLY_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.ADMINISTRATOR],
      args: [
        {
          id: "channels",
          type: Util.greedyArg(textChannelConverter),
          slashCommandType: "textchannel",
          readableType: "...channels",
          default: [],
          required: true,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(message: FireMessage, args: { channels: FireTextChannel[] }) {
    let channels = args.channels;
    if (channels instanceof FireTextChannel) channels = [channels];
    if (!channels?.length) return message.error("ADMINONLY_NO_CHANNELS");
    let current = message.guild.settings.get<Snowflake[]>(
      "commands.adminonly",
      []
    );
    let adminonly = [...current];
    channels.forEach((channel) => {
      if (!adminonly.includes(channel.id)) adminonly.push(channel.id);
      if (current.includes(channel.id))
        adminonly = adminonly.filter((cid) => cid != channel.id);
    });
    if (adminonly.length)
      message.guild.settings.set<Snowflake[]>("commands.adminonly", adminonly);
    else message.guild.settings.delete("commands.adminonly");
    let mentions: string[] = [];
    adminonly.forEach((cid) => {
      const channel = message.guild.channels.cache.get(cid);
      if (channel) mentions.push(channel.toString());
    });
    if (mentions.length)
      return message.success("ADMINONLY_SET", {
        channels: mentions.join(", "),
      });
    return message.success("ADMINONLY_RESET");
  }
}
