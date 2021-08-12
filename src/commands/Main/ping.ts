import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Ping extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      enableSlashCommand: true,
      restrictTo: "all",
    });
  }

  async exec(message: FireMessage) {
    let pingMessage: FireMessage;
    if (message instanceof FireMessage)
      pingMessage = (await message.send("PING_INITIAL_MESSAGE")) as FireMessage;
    const embed = new MessageEmbed()
      .setTitle(
        `:ping_pong: ${
          message instanceof ApplicationCommandMessage
            ? this.client.restPing
            : pingMessage.createdTimestamp -
              (message.editedAt
                ? message.editedTimestamp
                : message.createdTimestamp)
        }ms.\n:heartpulse: ${
          this.client.ws.shards.get(message.guild ? message.guild.shardId : 0)
            .ping
        }ms.`
      )
      .setColor(message.member?.displayColor ?? "#FFFFFF")
      .setFooter(
        message.language.get("PING_FOOTER", {
          shard: message.guild ? message.guild.shardId : 0,
          cluster: this.client.manager.id,
        })
      )
      .setTimestamp();

    return message instanceof ApplicationCommandMessage
      ? message.channel.send({ embeds: [embed] })
      : pingMessage.delete() &&
          (await message
            .reply({
              failIfNotExists: false,
              embeds: [embed],
            })
            .catch(() => {}));
  }
}
