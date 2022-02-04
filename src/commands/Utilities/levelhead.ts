import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import * as centra from "centra";

export default class Levelhead extends Command {
  removeColor: RegExp;

  constructor() {
    super("levelhead", {
      description: (language: Language) =>
        language.get("LEVELHEAD_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "player",
          type: "string",
          required: false,
        },
      ],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
    this.removeColor = /&[0-9A-FK-OR]/im;
  }

  async run(command: ApplicationCommandMessage, args: { player: string }) {
    if (!args.player) return await command.error("LEVELHEAD_NO_PLAYER");
    const language = command.language;
    let levelhead;
    try {
      levelhead = await (
        await centra(`https://api.sk1er.club/levelheadv5/${args.player}/LEVEL`)
          .header("User-Agent", this.client.manager.ua)
          .send()
      ).json();
    } catch {
      return await command.error("LEVELHEAD_FETCH_FAIL");
    }
    const uuid: string = levelhead.uuid;
    if (!uuid) {
      const embed = new MessageEmbed()
        .setTitle(
          language.get("LEVELHEAD_EMBED_TITLE", { player: args.player })
        )
        .setColor(command.member?.displayColor ?? "#FFFFFF")
        .setURL("https://purchase.sk1er.club/category/1050972")
        .setTimestamp()
        .setDescription(`Level: ${levelhead.level}`);
      return await command.channel.send({ embeds: [embed] });
    }
    if (uuid.length < 28)
      return await command.error("LEVELHEAD_MALFORMED_UUID");
    let purchase, proposal;
    try {
      purchase = await (
        await centra(`https://api.sk1er.club/levelhead_purchase_status/${uuid}`)
          .header("User-Agent", this.client.manager.ua)
          .send()
      ).json();
    } catch {
      return await command.error("LEVELHEAD_FETCH_FAIL");
    }
    try {
      proposal = await (
        await centra(`https://api.hyperium.cc/levelhead_propose/${uuid}`)
          .header("User-Agent", this.client.manager.ua)
          .send()
      ).json();
    } catch {
      proposal = null;
    }
    const header = ((levelhead.header as string) || "Level").replace(
      this.removeColor,
      ""
    );
    const footer = (levelhead.strlevel as string).replace(this.removeColor, "");
    const tab =
      purchase?.tab || false
        ? command.language.get("LEVELHEAD_PURCHASED")
        : command.language.get("LEVELHEAD_NOT_PURCHASED");
    const chat =
      purchase?.chat || false
        ? command.language.get("LEVELHEAD_PURCHASED")
        : command.language.get("LEVELHEAD_NOT_PURCHASED");
    const head = purchase?.head || 0;
    const embed = new MessageEmbed()
      .setTitle(language.get("LEVELHEAD_EMBED_TITLE", { player: args.player }))
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setURL("https://purchase.sk1er.club/category/1050972")
      .setTimestamp();
    embed.addField("IGN", args.player);
    embed.addField("Levelhead", `${header}:${footer}`);
    if (proposal && proposal.hasOwnProperty("denied")) {
      const nheader = ((proposal.header as string) || "Level").replace(
        this.removeColor,
        ""
      );
      const nfooter = (proposal.strlevel as string).replace(
        this.removeColor,
        ""
      );
      embed.addField(
        language.get("LEVELHEAD_PROPOSED"),
        `${nheader}:${nfooter}`
      );
      embed.addField(language.get("LEVELHEAD_DENIED"), proposal.denied);
    }
    embed.addField(
      language.get("LEVELHEAD_OTHER"),
      `${language.get("LEVELHEAD_TAB")}: ${tab}\n${language.get(
        "LEVELHEAD_CHAT"
      )}: ${chat}\n${language.get("LEVELHEAD_ADDON_LAYERS")}: ${head}`,
      false
    );
    return await command.channel.send({ embeds: [embed] });
  }
}
