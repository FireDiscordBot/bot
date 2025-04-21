import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class Migration extends Inhibitor {
  constructor() {
    super("migration", {
      reason: "migration",
      priority: 11,
    });
  }

  async exec(message: FireMessage, command: Command) {
    // bypass for admin/owner commands so they're always available
    // (plus they should never require migration to be complete)
    if (command.categoryID == "Admin" || command.ownerOnly) return false;

    // TODO: perhaps we should call runMigration here instead of just checking?

    if (message.guild?.settings.unmigrated) {
      await message.error("CONFIG_GUILD_MIGRATION").catch(() => {});
      return true;
    } else if (message.author.settings.unmigrated) {
      await message.error("CONFIG_USER_MIGRATION").catch(() => {});
      return true;
    }

    return false; // no migration needed
  }
}
