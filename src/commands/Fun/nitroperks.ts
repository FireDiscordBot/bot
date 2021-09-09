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
    args: { ign?: { match: any[]; matches: any[] } }
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
      const successOld = await essentialModule.removeNitroCosmetic(
        message.author
      );
      if (!successOld) return await message.error();
    }
    const success = await essentialModule.giveNitroCosmetic(
      message.author,
      ign
    );
    return success
      ? await message.success("NITROPERKS_SUCCESS")
      : await message.error("NITROPERKS_FAILED");
  }
}
