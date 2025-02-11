import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import VanityURLs from "@fire/src/modules/vanityurls";
import { PermissionFlagsBits } from "discord-api-types/v9";

export default class VanityDescription extends Command {
  module: VanityURLs;

  constructor() {
    super("vanity-description", {
      description: (language: Language) =>
        language.get("VANITY_DESCRIPTION_COMMAND_DESCRIPTION"),
      userPermissions: [PermissionFlagsBits.ManageGuild],
      args: [
        {
          id: "description",
          description: (language: Language) =>
            language.get("VANITY_DESCRIPTION_DESCRIPTION_ARGUMENT_DESCRIPTION"),
          type: "string",
          match: "rest",
          required: true,
        },
      ],
      enableSlashCommand: true,
      parent: "vanity",
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
    this.module.requestFetch(guild.id);
  }

  async run(command: ApplicationCommandMessage, args: { desc: string }) {
    const vanity = await this.client.db.query(
      "SELECT * FROM vanity WHERE gid=$1;",
      [command.guild.id]
    );

    if (!vanity.rows.length) {
      return await command.error("VANITY_DESCRIPTION_NO_VANITY", {
        prefix: command.util?.parsed?.prefix,
      });
    }

    try {
      await this.setDesc(command.guild, args.desc);
      return args.desc
        ? await command.success("VANITY_DESCRIPTION_SUCCESS")
        : await command.success("VANITY_DESCRIPTION_RESET");
    } catch (e) {
      return await command.error("VANITY_DESCRIPTION_FAILED");
    }
  }
}
