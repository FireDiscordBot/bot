import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import {APIApplication} from 'discord-api-types'
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
          type: "string",
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
  {id}: { id: string }
  ) {
    const application: APIApplication = await this.client.req.applications(id).rpc.get().catch(() => {});
    if(!application)
      return await message.error("INVALID_SNOWFLAKE_APPLICATION")

    const embed = new MessageEmbed()
      .setTimestamp()
      .setDescription(application.description)
      .setAuthor({
        name: application.name,
        iconUrl: this.client.options.http.cdn + '/app-icons/' + application.id + '/' + application.icon + '.png?size=4096'
      });

    return await message.channel.send({ embeds: [embed] });
  }
}