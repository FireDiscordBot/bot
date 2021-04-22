import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { MessageEmbed, TextChannel } from "discord.js";
const PornHub = require('pornhub.js')
const pornhub = new PornHub()

export default class Pornhub extends Command {
  constructor() {
    super("pornhub", {
      description: "Search PornHub! :)",
      clientPermissions: ["SEND_MESSAGES", "ATTACH_FILES", "EMBED_LINKS"],
      aliases: ["porn"],
      restrictTo: "all",
      args: [
        {
          id: "query",
          type: "string",
          default: "null",
          required: true,
        },
      ],
      enableSlashCommand: true,
      cooldown: 3000,
      lock: "user",
      typing: true,
      ownerOnly: false,
    });
  }

  async exec(message: FireMessage, args: { query: string }) {
    if (message.channel.isText && (message.channel as TextChannel).nsfw) {
      try {
        let x: any = null;
        const searchQuery = args.query == "null" ? [
          "japanese",
          "lesbian",
          "milf",
          "teen",
          "public",
          "threesome",
          "anal",
          "interracial",
          "amateur",
          "brunette"
        ][Math.floor(Math.random() * 10)] : args.query;
        await pornhub.search("Video", searchQuery).then(response => {
          const data = response.data.filter(it => !it.premium);
          x = data[Math.floor(Math.random() * data.length)];
        });
        if (x != null) {
          const embed = new MessageEmbed()
            .setColor("#ffa31a")
            .setTimestamp()
            .setTitle(x.title)
            .setURL(x.url)
            .setImage(x.preview);
          return await message.reply(embed);
        } else {
          return await message.reply("Could not find any porn. Try a different query.");
        }
      } catch (e) {
        return await message.reply(e.message);
      }
    } else {
      return await message.reply("Sorry, this command can only be used in NSFW channels :L")
    }
  }
}
