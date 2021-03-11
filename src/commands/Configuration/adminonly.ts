import { FireTextChannel} from "@fire/lib/extensions/textchannel";
import { textChannelConverter } from "@fire/lib/util/converters";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Util } from "@fire/lib/util/clientutil";

export default class AdminOnly extends Command {
  constructor() {
    super("adminonly", {
      description: (language: Language) =>
        language.get("ADMINONLY_COMMAND_DESCRIPTION"),
      userPermissions: ["ADMINISTRATOR"],
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
    });
  }

  async exec(message: FireMessage, args: { channels: FireTextChannel[] }) {
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
