import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions, Role } from "discord.js";

export default class MuteRole extends Command {
  constructor() {
    super("muterole", {
      description: (language: Language) =>
        language.get("MUTEROLE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "role",
          type: "role",
          default: null,
          required: true,
        },
      ],
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES_IN_THREADS,
        Permissions.FLAGS.CREATE_PRIVATE_THREADS,
        Permissions.FLAGS.CREATE_PUBLIC_THREADS,
        Permissions.FLAGS.REQUEST_TO_SPEAK,
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.MANAGE_ROLES,
        Permissions.FLAGS.SPEAK,
      ],
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
      typing: true,
    });
  }

  async exec(message: FireMessage, args: { role: Role }) {
    if (!args.role) return;
    const settingUp = await message.send("MUTE_ROLE_CREATE_REASON");
    const changed = await message.guild.changeMuteRole(args.role).catch((e) => {
      this.client.console.error(e.stack);
    });
    settingUp.delete();
    return changed ? await message.success() : await message.error();
  }
}
