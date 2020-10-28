import { MojangStatus } from "../../../lib/interfaces/mojangstatus";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

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
      restrictTo: "all",
    });
    this.emotes = {
      green: "<:check:674359197378281472>",
      yellow: "<a:fireWarning:660148304486727730>",
      red: "<:xmark:674359427830382603>",
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
