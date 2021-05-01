import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Listener } from "@fire/lib/util/listener";
import { MessageEmbed } from "discord.js";

export default class MessageDelete extends Listener {
  constructor() {
    super("messageDelete", {
      emitter: "client",
      event: "messageDelete",
    });
  }

  async exec(message: FireMessage) {
    if (message.guild && message.guild.reactionRoles.has(message.id)) {
      message.guild.reactionRoles.delete(message.id);
      await this.client.db
        .query("DELETE FROM reactrole WHERE mid=$1;", [message.id])
        .catch(() => {});
    }

    if (
      message.guild &&
      (message.guild.starboardReactions.has(message.id) ||
        message.guild.starboardMessages.has(message.id) ||
        message.guild.starboardMessages.find((board) => board == message.id))
    ) {
      await this.client.db
        .query(
          "DELETE FROM starboard WHERE gid=$1 AND original=$2 OR gid=$1 AND board=$2;",
          [message.guild.id, message.id]
        )
        .catch(() => {});
      await this.client.db
        .query("DELETE FROM starboard_reactions WHERE gid=$1 AND mid=$2;", [
          message.guild.id,
          message.id,
        ])
        .catch(() => {});
      message.guild.starboardMessages.delete(message.id);
      message.guild.starboardReactions.delete(message.id);
      message.guild.starboardMessages.delete(
        message.guild.starboardMessages.findKey((board) => board == message.id)
      );
    }

    if (message.partial || message.author.bot) return;

    if (
      message.guild?.settings.has("log.action") &&
      !message.guild.logIgnored.includes(message.channel.id)
    ) {
      const description = message.guild.language.get(
        "MSGDELETELOG_DESCRIPTION",
        message.author.toMention(),
        message.channel.toString(),
        message.type == "REPLY"
          ? message.mentions.users.has(message.referencedMessage?.author?.id)
            ? (message.referencedMessage?.author as FireUser)?.toMention()
            : message.referencedMessage?.author?.toString()
          : null,
        `https://discord.com/channels/${message.reference?.guildID}/${message.reference?.channelID}/${message.reference?.messageID}`
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
