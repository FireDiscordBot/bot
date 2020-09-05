import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import { Guild } from "discord.js";

export default class Ping extends Command {
  constructor() {
    super("description", {
      aliases: ["desc"],
      description: (language: Language) =>
        language.get("DESC_COMMAND_DESCRIPTION"),
      userPermissions: ["MANAGE_GUILD"],
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      args: [
        {
          id: "desc",
          type: "string",
          match: "rest",
          default: null,
        },
      ],
    });
  }

  async setDesc(guild: Guild, desc: string) {
    await this.client.db.query(
      'UPDATE vanity SET "description" = $2 WHERE gid = $1;',
      [guild.id, desc]
    );
    // TODO Add Vanity Fetch
  }

  async exec(message: FireMessage, args: { desc: string }) {
    const vanity = await this.client.db.query(
      "SELECT * FROM vanity WHERE gid=$1;",
      [message.guild.id]
    );
    if (!vanity.rows.length)
      return await message.error("DESC_NO_VANITY", message.util.parsed.prefix);
    this.setDesc(message.guild, args.desc)
      .catch(async () => {
        return await message.error("DESC_FAILED");
      })
      .then(async () =>
        args.desc
          ? await message.success("DESC_SET")
          : await message.success("DESC_RESET")
      );
  }
}
