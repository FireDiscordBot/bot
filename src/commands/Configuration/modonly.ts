import { textChannelConverter } from "../../../lib/util/converters";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Util } from "../../../lib/util/clientUtil";
import { TextChannel } from "discord.js";

export default class ModeratorOnly extends Command {
  constructor() {
    super("modonly", {
      description: (language: Language) =>
        language.get("MODONLY_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
      args: [
        {
          id: "channels",
          type: Util.greedyArg(textChannelConverter),
          readableType: "...channels",
          default: [],
          required: true,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { channels: TextChannel[] }) {
    let channels = args.channels;
    if (!channels.length) return message.error("MODONLY_NO_CHANNELS");
    let current = message.guild.settings.get(
      "commands.modonly",
      []
    ) as string[];
    let modonly = [...current];
    channels.forEach((channel) => {
      if (!modonly.includes(channel.id)) modonly.push(channel.id);
      if (current.includes(channel.id))
        modonly = modonly.filter((cid) => cid != channel.id);
    });
    message.guild.settings.set("commands.modonly", modonly);
    let mentions: string[] = [];
    modonly.forEach((cid) => {
      const channel = message.guild.channels.cache.get(cid);
      if (channel) mentions.push(channel.toString());
    });
    if (mentions.length) {
      const channelslist = mentions.join(", ");
      return message.success("MODONLY_SET", channelslist);
    }
    return message.success("MODONLY_RESET");
  }
}
