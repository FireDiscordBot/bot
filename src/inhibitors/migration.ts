import { FireMessage } from "@fire/lib/extensions/message";
import { Inhibitor } from "@fire/lib/util/inhibitor";

export default class MigrationInhibitor extends Inhibitor {
  constructor() {
    super("migration", {
      reason: "migration",
      priority: 11,
    });
  }

  async exec(message: FireMessage) {
    if (this.client.guildSettings.toMigrate?.includes(message.guild?.id)) {
      await message.error("CONFIG_GUILD_MIGRATION").catch(() => {});
      return true;
    } else if (
      this.client.userSettings.toMigrate?.includes(message.author?.id)
    ) {
      await message.error("CONFIG_USER_MIGRATION").catch(() => {});
      return true;
    }

    return false; // no migration needed
  }
}
