import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Public extends Command {
  constructor() {
    super("public", {
      description: (language: Language) =>
        language.get("PUBLIC_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES"],
      userPermissions: ["MANAGE_GUILD"],
    });
  }

  async exec(message: FireMessage) {
    const current = message.guild.settings.get("utils.public", false);
    const isBlacklisted = await this.client.db.query(
      "SELECT * FROM vanitybl WHERE gid=$1;",
      [message.guild.id]
    );
    if (isBlacklisted.rows.length)
      return await message.error("PUBLIC_VANITY_BLACKLIST");
    const vanitys = await this.client.db.query(
      "SELECT code FROM vanity WHERE gid=$1 AND redirect IS NULL",
      [message.guild.id]
    );
    if (!vanitys.rows.length)
      return await message.error(
        "PUBLIC_VANITY_REQUIRED",
        message.util.parsed.prefix
      );
    await message.guild.settings.set("utils.public", !current);
    if (!current) {
      await message.success("PUBLIC_ENABLED", vanitys.rows[0][0]);
      await message.guild.actionLog(
        message.language.get("PUBLIC_ENABLED_LOG", message.author.toString())
      );
    } else {
      await message.success("PUBLIC_DISABLED");
      await message.guild.actionLog(
        message.language.get("PUBLIC_DISABLED_LOG", message.author.toString())
      );
    }
  }
}
