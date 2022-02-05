import EssentialNitro from "@fire/src/modules/essentialnitro";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class NitroPerks extends Command {
  constructor() {
    super("nitroperks", {
      description: (language: Language) =>
        language.get("NITROPERKS_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "ign",
          type: /\w{1,16}/im,
          readableType: "username",
          default: null,
          required: true,
          description: (language: Language) =>
            language.get("NITROPERKS_IGN_DESCRIPTION"),
        },
      ],
      requiresExperiment: { id: 223827992, bucket: 1 },
      enableSlashCommand: true,
      hidden: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { ign?: { match: RegExpMatchArray; matches: RegExpExecArray[] } }
  ) {
    const essentialModule = this.client.getModule(
      "essentialnitro"
    ) as EssentialNitro;
    if (!essentialModule) return await message.error("NITROPERKS_MODULE_ERROR");
    const boosterId = message.guild.roles.cache.find(
      (r) => r.tags?.premiumSubscriberRole
    )?.id;
    if (!boosterId) return await message.error("NITROPERKS_ROLE_ERROR");
    if (
      !message.member?.roles.cache.has(boosterId) &&
      !message.author.isSuperuser()
    )
      return await message.error("NITROPERKS_NOT_BOOSTING");
    if (!args.ign) return await message.error("NITROPERKS_INVALID_IGN");
    const ign: string = args.ign.match[0];
    const hasAlready = await essentialModule.getUUID(message.author);
    if (hasAlready) {
      this.client.console.warn(
        `[Essential] User ${message.author} (${message.author.id}) is requesting the booster cosmetic on ${ign} but already has them on ${hasAlready}, attempting to remove...`
      );
      const successOld = await essentialModule.removeNitroCosmetic(
        message.author
      );
      successOld == true
        ? this.client.console.info(
            `[Essential] Successfully removed cosmetic from ${hasAlready}!`
          )
        : this.client.console.error(
            `[Essential] Failed to remove cosmetic from ${hasAlready}!`
          );
      if (successOld != true)
        return await message.error("ERROR_CONTACT_SUPPORT");
    }
    this.client.console.info(
      `[Essential] User ${message.author} (${message.author.id}) is requesting the booster cosmetic on ${ign}`
    );
    const success = await essentialModule.giveNitroCosmetic(
      message.author,
      ign
    );
    return success
      ? await message.success("NITROPERKS_SUCCESS")
      : await message.error("NITROPERKS_FAILED");
  }
}
