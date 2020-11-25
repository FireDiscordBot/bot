import { textChannelConverter } from "../../../lib/util/converters";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Util } from "../../../lib/util/clientutil";
import { TextChannel } from "discord.js";

export default class AdminOnly extends Command {
  constructor() {
    super("adminonly", {
      description: (language: Language) =>
        language.get("ADMINONLY_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      userPermissions: ["ADMINISTRATOR"],
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
    if (!channels.length) return message.error("ADMINONLY_NO_CHANNELS");
    let current = message.guild.settings.get(
      "commands.adminonly",
      []
    ) as string[];
    let adminonly = [...current];
    channels.forEach((channel) => {
      if (!adminonly.includes(channel.id)) adminonly.push(channel.id);
      if (current.includes(channel.id))
        adminonly = adminonly.filter((cid) => cid != channel.id);
    });
    message.guild.settings.set("commands.adminonly", adminonly);
    let mentions: string[] = [];
    adminonly.forEach((cid) => {
      const channel = message.guild.channels.cache.get(cid);
      if (channel) mentions.push(channel.toString());
    });
    if (mentions.length) {
      const channelslist = mentions.join(", ");
      return message.success("ADMINONLY_SET", channelslist);
    }
    return message.success("ADMINONLY_RESET");
  }
}
