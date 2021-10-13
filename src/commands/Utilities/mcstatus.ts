import { MojangStatus } from "@fire/lib/interfaces/mojangstatus";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
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
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
    this.emotes = {
      green: emojis.statuspage.operational,
      yellow: emojis.statuspage.partial_outage,
      red: emojis.statuspage.major_outage,
    };
  }

  // TODO: clean this holy shit it is awful

  async exec(message: FireMessage) {
    const statusReq = await centra("https://status.mojang.com/check")
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (statusReq.statusCode != 200)
      return await message.send("MCSTATUS_FETCH_FAIL");
    const status: MojangStatus = await statusReq.json();
    let statuses: string[] = [];
    const statusDescriptions = message.language.get("MCSTATUS_STATUSES", {
      returnObjects: true,
    }) as unknown as {
      green: string;
      yellow: string;
      red: string;
    };
    const services = message.language.get("MCSTATUS_SERVICES", {
      returnObjects: true,
    }) as unknown as {
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
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setDescription(statuses.join("\n"));
    return await message.channel.send({ embeds: [embed] });
  }
}
