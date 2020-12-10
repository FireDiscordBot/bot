import { MojangStatus } from "../../../lib/interfaces/mojangstatus";
import { FireMessage } from "../../../lib/extensions/message";
import { constants } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import * as centra from "centra";

const { emojis } = constants;

export default class MinecraftStatus extends Command {
  emotes: {
    green: string;
    yellow: string;
    red: string;
  };
  constructor() {
    super("mcstatus", {
      description: (language: Language) =>
        language.get("MCSTATUS_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      enableSlashCommand: true,
      restrictTo: "all",
    });
    this.emotes = {
      green: emojis.green,
      yellow: emojis.yellow,
      red: emojis.red,
    };
  }

  async exec(message: FireMessage) {
    const statusReq = await centra("https://status.mojang.com/check").send();
    if (statusReq.statusCode != 200)
      return await message.send("MCSTATUS_FETCH_FAIL");
    const status: MojangStatus = await statusReq.json();
    let statuses: string[] = [];
    const statusDescriptions = message.language.get("MCSTATUS_STATUSES") as {
      green: string;
      yellow: string;
      red: string;
    };
    const services = message.language.get("MCSTATUS_SERVICES") as {
      "minecraft.net": string;
      "sessionserver.mojang.com": string;
      "authserver.mojang.com": string;
      "textures.minecraft.net": string;
      "api.mojang.com": string;
    };
    const serviceNames = Object.keys(services);
    Object.values(status).forEach((service) => {
      let name = Object.keys(service)[0];
      if (serviceNames.includes(name)) {
        let currentStatus = Object.values(service)[0] as string;
        statuses.push(
          `${this.emotes[currentStatus]} ${services[name]}: ${statusDescriptions[currentStatus]}`
        );
      }
    });
    const embed = new MessageEmbed()
      .setColor(message?.member?.displayColor || "#ffffff")
      .setDescription(statuses.join("\n"));
    return await message.channel.send(embed);
  }
}
