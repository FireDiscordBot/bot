import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { textChannelConverter } from "@fire/lib/util/converters";
import { FireMessage } from "@fire/lib/extensions/message";
import { Permissions, Snowflake } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Util } from "@fire/lib/util/clientutil";

export default class ModeratorOnly extends Command {
  constructor() {
    super("modonly", {
      description: (language: Language) =>
        language.get("MODONLY_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
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
    if (!channels.length) return message.error("MODONLY_NO_CHANNELS");
    let current = message.guild.settings.get<Snowflake[]>(
      "commands.modonly",
      []
    );
    let modonly = [...current];
    channels.forEach((channel) => {
      if (!modonly.includes(channel.id)) modonly.push(channel.id);
      if (current.includes(channel.id))
        modonly = modonly.filter((cid) => cid != channel.id);
    });
    if (modonly.length)
      message.guild.settings.set<string[]>("commands.modonly", modonly);
    else message.guild.settings.delete("commands.modonly");
    let mentions: string[] = [];
    modonly.forEach((cid) => {
      const channel = message.guild.channels.cache.get(cid);
      if (channel) mentions.push(channel.toString());
    });
    if (mentions.length)
      return message.success("MODONLY_SET", { channels: mentions.join(", ") });
    return message.success("MODONLY_RESET");
  }
}
