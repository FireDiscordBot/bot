import { ModAnalytics, Sk1erMod } from "../../../lib/interfaces/sk1ermod";
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
      enableSlashCommand: true,
      aliases: ["mods"],
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage, args: { mod?: string }) {
    const modsReq = await centra("https://api.sk1er.club/mods")
      .send()
      .catch(() => {});
    if (!modsReq || modsReq.statusCode != 200) return await message.error();
    const mods: Sk1erMod[] = Object.values(
      await modsReq.json().catch(() => {
        return {};
      })
    );
    if (message.util?.parsed?.alias == "mods") {
      const names = mods.map((mod) => mod.display);
      const embed = new MessageEmbed()
        .setColor(message?.member?.displayColor || "#ffffff")
        .setTitle(message.language.get("MOD_LIST"))
        .setDescription(names.join(", "))
        .setTimestamp(new Date());
      return await message.channel.send(embed).catch(async () => {
        return await message.error("MOD_FETCH_FAIL");
      });
    }
    let arg = args.mod?.toLowerCase();
    let mod: Sk1erMod;
    if (arg)
      mod = mods.find(
        (mod) =>
          mod.display.toLowerCase() == arg.toLowerCase() ||
          mod.mod_ids.includes(arg)
      );
    else {
      this.client.util.shuffleArray(mods);
      mod = mods[0];
    }
    if (!mod) return await message.error("MOD_INVALID");
    const analyticsReq = await centra("https://api.sk1er.club/mods_analytics")
      .send()
      .catch(() => {});
    if (!analyticsReq || analyticsReq.statusCode != 200)
      return await message.error("MOD_FETCH_FAIL");
    const allAnalytics: {
      [mod_id: string]: ModAnalytics;
    } = await analyticsReq.json().catch(() => {
      return {};
    });
    const [id, analytics] = Object.entries(allAnalytics).find(
      ([id]) =>
        mod.mod_ids.includes(id.trim().toLowerCase()) ||
        mod.display.trim().toLowerCase() == id.trim().toLowerCase()
    ) || ["", 0];
    if (allAnalytics == {} || typeof analytics != "object")
      return await message.error("MOD_FETCH_FAIL");
    const embed = new MessageEmbed()
      .setTitle(mod.display)
      .setColor(message?.member?.displayColor || "#ffffff")
      .setURL(`https://sk1er.club/mods/${id}`)
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
