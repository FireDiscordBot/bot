import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class StarboardMinimum extends Command {
  constructor() {
    super("starboard-minimum", {
      description: (language: Language) =>
        language.get("STARBOARD_MINIMUM_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      restrictTo: "guild",
      args: [
        {
          id: "minimum",
          type: "number",
          required: false,
          default: 5,
        },
      ],
      parent: "starboard",
    });
  }

  async exec(message: FireMessage, args: { minimum?: number }) {
    if (args.minimum && args.minimum < 2)
      return await message.error("STARBOARD_MINIMUM_TOO_LOW");
    if (!args.minimum || args.minimum == 5) {
      message.guild.settings.delete("starboard.minimum");
      this.check(message, 5);
      return message.guild.settings.has("starboard.minimum")
        ? await message.error()
        : await message.success("STARBOARD_MINIMUM_RESET");
    }

    message.guild.settings.set("starboard.minimum", args.minimum);
    this.check(message, args.minimum);
    return await message.success("STARBOARD_MINIMUM_SET", args.minimum);
  }

  async check(message: FireMessage, minimum: number) {
    const starboard = message.guild.channels.cache.get(
      message.guild.settings.get("starboard.channel")
    ) as FireTextChannel;
    if (!starboard) return;
    for (const [id, reactions] of message.guild.starboardReactions) {
      if (reactions < minimum && message.guild.starboardMessages.has(id)) {
        const starboardId = message.guild.starboardMessages.get(id);
        const starboardMsg = await starboard.messages
          .fetch(starboardId)
          .catch(() => {});
        if (starboardMsg) await starboardMsg.delete();
        message.guild.starboardMessages.delete(starboardId);
      }
    }
  }
}
