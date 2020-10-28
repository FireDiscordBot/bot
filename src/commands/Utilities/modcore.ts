import { ModcoreProfile } from "../../../lib/interfaces/modcore";
import { FireMessage } from "../../../lib/extensions/message";
import { titleCase } from "../../../lib/util/constants";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

export default class Modcore extends Command {
  constructor() {
    super("modcore", {
      description: (language: Language) =>
        language.get("MODCORE_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "ign",
          type: /\w{1,16}/im,
          readableType: "ign",
          default: null,
          required: true,
        },
      ],
      restrictTo: "all",
    });
  }

  async exec(
    message: FireMessage,
    args: { ign?: { match: any[]; matches: any[] } }
  ) {
    if (!args.ign) return await message.error("MODCORE_INVALID_IGN");
    const ign: string = args.ign.match[0];
    let uuid = await this.client.util.nameToUUID(ign);
    if (!uuid) return await message.error("MCUUID_FETCH_FAIL");
    const profileReq = await centra(
      `https://api.modcore.sk1er.club/profile/${uuid}`
    ).send();
    if (profileReq.statusCode != 200)
      return await message.error("MODCORE_PROFILE_FETCH_FAIL");
    const profile: ModcoreProfile = await profileReq.json();
    let purchases = Object.entries(profile.purchase_profile)
      .filter((purchase) => purchase[1])
      .map((purchase) => this.cosmeticNameFormat(purchase[0]));
    for (const [cosmetic, settings] of Object.entries(
      profile.cosmetic_settings || {}
    )) {
      if (settings.enabled && settings.id) {
        purchases = purchases.map((purchase) =>
          purchase.replace(
            this.cosmeticNameFormat(cosmetic),
            `**[${this.cosmeticNameFormat(
              cosmetic
            )}](https://api.modcore.sk1er.club/serve/${
              cosmetic.includes("CAPE") ? "cape" : "skin"
            }/${cosmetic.includes("STATIC") ? "static" : "dynamic"}/${
              settings.id
            })**`
          )
        );
      }
    }
    const purchasesString = purchases.join(", ");
    const embed = new MessageEmbed()
      .setTitle(message.language.get("MODCORE_PROFILE_TITLE", ign))
      .setColor(message.member.displayColor || "#ffffff")
      .addField(message.language.get("UUID"), uuid)
      .addField(
        message.language.get("MODCORE_ENABLED_COSMETICS"),
        purchasesString || message.language.get("MODCORE_NO_COSMETICS")
      );
    if (profile.online && profile.status)
      embed.addField(message.language.get("STATUS"), profile.status);
    return await message.channel.send(embed);
  }

  cosmeticNameFormat(text: string) {
    return titleCase(
      text
        .replace("_", " ")
        .replace("_", " ") // for some reason it doesn't replace all underscores unless I have two .replace's
        .replace("STATIC", "(Static)")
        .replace("DYNAMIC", "(Dynamic)")
    );
  }
}
