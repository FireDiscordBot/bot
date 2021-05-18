import { FireMessage } from "@fire/lib/extensions/message";
import VanityURLs from "@fire/src/modules/vanityurls";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";
import * as moment from "moment";

export default class Public extends Command {
  constructor() {
    super("public", {
      description: (language: Language) =>
        language.get("PUBLIC_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      enableSlashCommand: true,
      restrictTo: "guild",
    });
  }

  async exec(message: FireMessage) {
    if (message.guild.memberCount <= 20)
      return await message.error("PUBLIC_MEMBER_COUNT_TOO_SMALL");
    else if (moment(new Date()).diff(message.guild.createdAt) < 2629800000)
      return await message.error("PUBLIC_GUILD_TOO_YOUNG");

    const current = message.guild.settings.get<boolean>("utils.public", false);
    const vanityurls = this.client.getModule("vanityurls") as VanityURLs;
    if (vanityurls.blacklisted.includes(message.guild.id))
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
    await message.guild.settings.set<boolean>("utils.public", !current);
    if (!current) {
      await message.success("PUBLIC_ENABLED", vanitys.rows[0][0]);
      await message.guild.actionLog(
        message.language.get("PUBLIC_ENABLED_LOG", message.author.toString()),
        "public_toggle"
      );
    } else {
      await message.success("PUBLIC_DISABLED");
      await message.guild.actionLog(
        message.language.get("PUBLIC_DISABLED_LOG", message.author.toString()),
        "public_toggle"
      );
    }
  }
}
