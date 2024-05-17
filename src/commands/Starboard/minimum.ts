import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class StarboardMinimum extends Command {
  constructor() {
    super("starboard-minimum", {
      description: (language: Language) =>
        language.get("STARBOARD_MINIMUM_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
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
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage, args: { minimum?: number }) {
    if (args.minimum && args.minimum < 2)
      return await command.error("STARBOARD_MINIMUM_TOO_LOW");
    if (!args.minimum || args.minimum == 5) {
      await command.guild.settings.delete("starboard.minimum");
      this.check(command, 5);
      return command.guild.settings.has("starboard.minimum")
        ? await command.error("ERROR_CONTACT_SUPPORT")
        : await command.success("STARBOARD_MINIMUM_RESET");
    }

    command.guild.settings.set<number>("starboard.minimum", args.minimum);
    this.check(command, args.minimum);
    return await command.success("STARBOARD_MINIMUM_SET", {
      min: args.minimum,
    });
  }

  async check(command: ApplicationCommandMessage, minimum: number) {
    const starboard = command.guild.starboard;
    if (!starboard) return;
    if (!command.guild.starboardReactions)
      await command.guild.loadStarboardReactions();
    if (!command.guild.starboardMessages)
      await command.guild.loadStarboardMessages();
    for (const [id, reactions] of command.guild.starboardReactions) {
      if (reactions < minimum && command.guild.starboardMessages.has(id)) {
        const starboardId = command.guild.starboardMessages.get(id);
        const starboardMsg = await starboard.messages
          .fetch(starboardId)
          .catch(() => {});
        if (starboardMsg) await starboardMsg.delete();
        command.guild.starboardMessages.delete(starboardId);
      }
    }
  }
}
