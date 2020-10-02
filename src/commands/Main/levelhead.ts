import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

export default class Levelhead extends Command {
  removeColor: RegExp;

  constructor() {
    super("levelhead", {
      description: (language: Language) =>
        language.get("LEVELHEAD_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "player",
          type: "string",
          required: false,
        },
      ],
    });
    this.removeColor = /&[0-9A-FK-OR]/im;
  }

  async exec(message: FireMessage, args: { player: string }) {
    if (!args.player) return await message.error("LEVELHEAD_NO_PLAYER");
    const language = message.language;
    let levelhead;
    try {
      levelhead = await (
        await centra(
          `https://api.sk1er.club/levelheadv5/${args.player}/LEVEL`
        ).send()
      ).json();
    } catch {
      return await message.error("LEVELHEAD_FETCH_FAIL");
    }
    const uuid: string = levelhead.uuid;
    if (!uuid) {
      const embed = new MessageEmbed()
        .setTitle(language.get("LEVELHEAD_EMBED_TITLE", args.player))
        .setColor(message?.member.displayColor || "#ffffff")
        .setURL("https://purchase.sk1er.club/category/1050972")
        .setTimestamp(new Date())
        .setDescription(`Level: ${levelhead.level}`);
      return await message.channel.send(embed);
    }
    if (uuid.length < 28)
      return await message.error("LEVELHEAD_MALFORMED_UUID");
    let purchase, proposal;
    try {
      purchase = await (
        await centra(
          `https://api.sk1er.club/levelhead_purchase_status/${uuid}`
        ).send()
      ).json();
    } catch {
      return await message.error("LEVELHEAD_FETCH_FAIL");
    }
    try {
      proposal = await (
        await centra(`https://api.hyperium.cc/levelhead_propose/${uuid}`).send()
      ).json();
    } catch {
      proposal = null;
    }
    const header = ((levelhead.header as string) || "Level").replace(
      this.removeColor,
      ""
    );
    const footer = (levelhead.strlevel as string).replace(this.removeColor, "");
    const level = levelhead.level;
    const nocustom = header == "Level" ? true : false;
    const tab =
      purchase?.tab || false
        ? message.language.get("LEVELHEAD_PURCHASED")
        : message.language.get("LEVELHEAD_NOT_PURCHASED");
    const chat =
      purchase?.chat || false
        ? message.language.get("LEVELHEAD_PURCHASED")
        : message.language.get("LEVELHEAD_NOT_PURCHASED");
    const head = purchase?.head || 0;
    const embed = new MessageEmbed()
      .setTitle(language.get("LEVELHEAD_EMBED_TITLE", args.player))
      .setColor(message?.member.displayColor || "#ffffff")
      .setURL("https://purchase.sk1er.club/category/1050972")
      .setTimestamp(new Date())
      .setFooter(language.get("LEVELHEAD_EMBED_FOOTER"));
  }
}
