import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class MinecraftUUID extends Command {
  constructor() {
    super("minecraft-uuid", {
      description: (language: Language) =>
        language.get("MINECRAFT_UUID_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "ign",
          type: /\w{1,16}/im,
          readableType: "ign",
          default: null,
          required: true,
        },
        {
          id: "dashed",
          flag: "--dashed",
          match: "flag",
          required: false,
        },
      ],
      enableSlashCommand: false,
      parent: "minecraft",
      restrictTo: "all",
      ephemeral: true,
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { ign?: { match: any[]; matches: any[] }; dashed?: string }
  ) {
    if (!args.ign) return await message.error("MINECRAFT_UUID_INVALID_IGN");
    const ign: string = args.ign.match[0];
    const dashed = Boolean(args.dashed);
    let uuid = await this.client.util.nameToUUID(ign);
    if (!uuid) return await message.error("MINECRAFT_UUID_FETCH_FAIL");
    if (dashed) uuid = this.client.util.addDashesToUUID(uuid);
    return await message.send("MINECRAFT_UUID", { ign, uuid });
  }
}
