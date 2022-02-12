import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import VanityURLs from "@fire/src/modules/vanityurls";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Permissions } from "discord.js";

export default class Description extends Command {
  module: VanityURLs;

  constructor() {
    super("description", {
      description: (language: Language) =>
        language.get("DESC_COMMAND_DESCRIPTION"),
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "desc",
          type: "string",
          match: "rest",
          required: true,
        },
      ],
      enableSlashCommand: true,
      slashOnly: true,
    });
  }

  async setDesc(guild: FireGuild, desc: string) {
    if (!this.module)
      this.module = this.client.getModule("vanityurls") as VanityURLs;
    await this.client.db.query(
      "UPDATE vanity SET description=$2 WHERE gid=$1;",
      [guild.id, desc]
    );
    await this.module
      ?.requestFetch(`Guild ${guild.name} updated it's description`)
      .catch(() => {});
  }

  async run(command: ApplicationCommandMessage, args: { desc: string }) {
    const vanity = await this.client.db.query(
      "SELECT * FROM vanity WHERE gid=$1;",
      [command.guild.id]
    );

    if (!vanity.rows.length) {
      return await command.error("DESC_NO_VANITY", {
        prefix: command.util?.parsed?.prefix,
      });
    }

    try {
      await this.setDesc(command.guild, args.desc);
      return args.desc
        ? await command.success("DESC_SET")
        : await command.success("DESC_RESET");
    } catch (e) {
      return await command.error("DESC_FAILED");
    }
  }
}
