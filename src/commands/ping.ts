import { Command } from "../../lib/util/command";
import { Message } from "discord.js";
import { MessageEmbed } from "discord.js";

export default class extends Command {
  constructor() {
    super("ping", {
      description: "Shows you my ping to discord's servers",
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
    });
  }

  async exec(message: Message) {
    const m = await message.channel.send(`Pinging...`);
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${
          m.createdTimestamp -
          (message.editedAt
            ? message.editedTimestamp
            : message.createdTimestamp)
        }ms.\n:heartpulse: ${this.client.ws.ping}ms.`
      )
      .setColor(message.member?.displayColor || "#ffffff")
      .setTimestamp(new Date());
    await m.edit({ content: null, embed });
  }
}
