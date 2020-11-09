import {
  ModAnalytics,
  Sk1erMod,
  Sk1erMods,
} from "../../../lib/interfaces/sk1ermod";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import * as centra from "centra";

export default class Mod extends Command {
  constructor() {
    super("mod", {
      description: (language: Language) =>
        language.get("MOD_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "mod",
          type: "string",
          default: null,
          required: false,
        },
      ],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { mod?: string }) {
    const mods: Sk1erMods = await (
      await centra("https://api.sk1er.club/mods").send()
    ).json();
    let arg = args.mod?.toLowerCase();
    const modIds = Object.keys(mods);
    let modNames = {};
    if (arg) {
      Object.values(mods).forEach((mod) => {
        modNames[mod.display.toLowerCase()] = mod.mod_ids[0];
        mod.mod_ids.forEach((mid) => (modNames[mid] = mod.mod_ids[0]));
      });
      if (!Object.keys(modNames).includes(arg.toLowerCase()))
        return await message.error("MOD_INVALID");
      else arg = modNames[arg.toLowerCase()];
    }
    let mod: Sk1erMod = mods[arg];
    if (!mod) {
      mod = mods[modIds[0]];
    }
    const analytics: ModAnalytics = (
      await (
        await centra("https://api.sk1er.club/mods_analytics").send()
      ).json()
    )[mod.mod_ids[0]];
    const embed = new MessageEmbed()
      .setTitle(mod.display)
      .setColor(message?.member?.displayColor || "#ffffff")
      .setURL(`https://sk1er.club/mods/${mod.mod_ids[0]}`)
      .setDescription(mod.short)
      .setTimestamp(new Date());
    let versions: string[] = [];
    Object.keys(mod.latest).forEach((version) => {
      versions.push(`**${version}**: ${mod.latest[version]}`);
    });
    if (versions.length) embed.addField("Versions", versions.join("\n"));
    embed.addField(
      "Creator",
      `**__${mod.vendor.name}__**
[Website](${mod.vendor.website})
[Twitter](${
        mod.vendor.twitter.includes("twitter.com")
          ? mod.vendor.twitter
          : `https://twitter.com/${mod.vendor.twitter}`
      })
[YouTube](${mod.vendor.youtube})`,
      false
    );
    if (analytics)
      embed.addField(
        "Analytics",
        `Total: ${analytics.total.toLocaleString(message.language.id)}
Online: ${analytics.online.toLocaleString(message.language.id)}
Last Day: ${analytics.day.toLocaleString(message.language.id)}
Last Week: ${analytics.week.toLocaleString(message.language.id)}`
      );
    return await message.channel.send(embed);
    // TODO Rectrate Jishaku paginators and send changelogs
  }
}
