import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { MessageEmbed } from "discord.js";

export default class MessageDelete extends Listener {
  constructor() {
    super("messageDelete", {
      emitter: "client",
      event: "messageDelete",
    });
  }

  async exec(message: FireMessage) {
    if (message.partial) return;

    if (message.guild?.settings.has("temp.log.action")) {
      const description = message.guild.language.get(
        "MSGDELETELOG_DESCRIPTION",
        message.author.toMention(),
        message.channel.toString()
      ) as string;
      const content = message.content
        ? message.content.length > 1023 - description.length
          ? `\n${message.content.slice(0, 1020 - description.length)}...`
          : "\n" + message.content
        : "";
      const embed = new MessageEmbed()
        .setColor(message.member?.displayHexColor || "#ffffff")
        .setTimestamp(message.createdAt)
        .setAuthor(
          message.author.toString(),
          message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
        .setDescription(description + content)
        .setFooter(
          `${message.author.id} | ${message.id} | ${message.channel.id}`
        );
      if (message.attachments.size)
        embed.addField(
          message.guild.language.get("ATTACHMENTS"),
          message.attachments.map((attach) => attach.name).join("\n") +
            "\n\n" +
            message.guild.language.get("MSGDELETELOG_ATTACH_WARN")
        );
      if (message.activity)
        embed.addField(
          message.guild.language.get("ACTIVITY"),
          (message.activity.partyID.startsWith("spotify:")
            ? message.guild.language.get("MSGDELETELOG_SPOTIFY_ACTIVITY") + "\n"
            : "") +
            message.guild.language.get(
              "MSGDELETELOG_ACTIVITY",
              message.activity.partyID,
              message.activity.type
            )
        );
      if (embed.description != description || embed.fields.length)
        await message.guild.actionLog(embed, "message_delete");
    }
  }
}
