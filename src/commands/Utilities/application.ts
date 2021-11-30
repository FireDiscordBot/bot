import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { FireUser } from "@fire/lib/extensions/user";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Application extends Command {
  constructor() {
    super("application", {
      description: (language: Language) =>
        language.get("APPLICATION_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      args: [
        {
          id: "application",
          type: "snowflake",
          description: (language: Language) =>
            language.get("USER_SNOWFLAKE_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: true,
        },
      ],
      aliases: ["applicationinfo", "infoapplication", "appinfo", "infoapp", "app"],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
    });
  }

  async exec(
    message: FireMessage,
    args: { id: string }
  ) {
    const application = await this.client.req.applications(id).rpc.get().catch(() => {});
    if(!application)
      return await message.error("idk")

    const embed = new MessageEmbed()
      .setTimestamp()
      .setDescription(application.description)
      .setAuthor({
        name: application.name,
        iconUrl: this.client.http.cdn + '/app-icons/' + application.id + '/' + application.icon + '.png?size=4096'
      });

    return await message.channel.send({ embeds: [embed] });
  }
}
