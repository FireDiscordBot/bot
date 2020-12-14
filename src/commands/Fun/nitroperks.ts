import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import Sk1er from "../../modules/sk1er";

export default class NitroPerks extends Command {
  constructor() {
    super("nitroperks", {
      description: (language: Language) =>
        language.get("NITROPERKS_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "ign",
          type: /\w{1,16}/im,
          readableType: "ign",
          default: null,
          required: true,
        },
      ],
      guilds: ["411619823445999637"],
      hidden: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { ign?: { match: any[]; matches: any[] }; dashed?: string }
  ) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (!sk1erModule) return await message.error("NITROPERKS_MODULE_ERROR");
    if (
      !message.member?.roles.cache.has(sk1erModule.nitroId) &&
      !message.author.isSuperuser()
    )
      return await message.channel.send("no.");
    if (!args.ign) return await message.error("NITROPERKS_INVALID_IGN");
    const ign: string = args.ign.match[0];
    const hasAlready = await sk1erModule.getUUID(message.author);
    const successOld = await sk1erModule.removeNitroPerks(message.author);
    if (hasAlready && !successOld) return await message.error();
    const success = await sk1erModule.giveNitroPerks(message.author, ign);
    return success
      ? await message.success()
      : await message.error("NITROPERKS_FAILED");
  }
}
