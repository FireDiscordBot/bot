import { SlashCommandMessage } from "@fire/lib/extensions/slashCommandMessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { MessageEmbed } from "discord.js";

export default class Ping extends Command {
  constructor() {
    super("ping", {
      description: (language: Language) =>
        language.get("PING_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
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
          message instanceof SlashCommandMessage
            ? this.client.restPing
            : pingMessage.createdTimestamp -
              (message.editedAt
                ? message.editedTimestamp
                : message.createdTimestamp)
        }ms.\n:heartpulse: ${
          this.client.ws.shards.get(message.guild ? message.guild.shardID : 0)
            .ping
        }ms.`
      )
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setFooter(
        message.language.get(
          "PING_FOOTER",
          message.guild ? message.guild.shardID : 0,
          this.client.manager.id
        )
      )
      .setTimestamp();

    return message instanceof SlashCommandMessage
      ? await message.channel.send(embed)
      : await this.replyEmbedPing(message, pingMessage, embed);
  }

  async replyEmbedPing(
    message: FireMessage,
    pingMsg: FireMessage,
    embed: MessageEmbed
  ) {
    pingMsg.delete();
    return (
      // @ts-ignore
      this.client.api
        // @ts-ignore
        .channels(message.channel.id)
        .messages.post({
          data: {
            embed: embed.toJSON(),
            message_reference: { message_id: message.id },
            allowed_mentions: {
              ...this.client.options.allowedMentions,
              replied_user: false,
            },
          },
        })
        .then(
          // @ts-ignore
          (m: object) => this.client.actions.MessageCreate.handle(m).message
        )
        .catch(() => {
          return message.channel.send(embed);
        })
    );
  }
}
