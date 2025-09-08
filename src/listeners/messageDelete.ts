import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { ActionLogTypes } from "@fire/lib/util/constants";
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
    if (!message.guild) return;

    if (message.guild.premium && !message.guild.reactionRoles)
      await message.guild.loadReactionRoles();
    if (message.guild.premium && message.guild.reactionRoles.has(message.id)) {
      message.guild.reactionRoles.delete(message.id);
      await this.client.db
        .query("DELETE FROM reactrole WHERE mid=$1;", [message.id])
        .catch(() => {});
    }

    if (message.guild.starboard && !message.guild.starboardReactions)
      await message.guild.loadStarboardReactions();
    if (message.guild.starboard && !message.guild.starboardMessages)
      await message.guild.loadStarboardMessages();
    if (
      message.guild.starboard &&
      (message.guild.starboardReactions.has(message.id) ||
        message.guild.starboardMessages.has(message.id) ||
        // idk what this is but I'm scared to remove it so it shall stay for now
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
      if (message.guild.starboardMessages.has(message.id))
        // Attempt to delete starboard message before we remove the data
        await this.client.req
          .channels(message.guild.starboard.id)
          .messages(message.guild.starboardMessages.get(message.id))
          .delete()
          .then(() => message.guild.starboardMessages.delete(message.id))
          .catch(() => {});
      message.guild.starboardReactions.delete(message.id);
    }

    if (message.partial || message.author.bot) return;

    if (
      message.guild.settings.has("log.action") &&
      !message.guild.logIgnored.includes(message.channelId)
    ) {
      let reference: FireMessage;
      if (message.type == "REPLY")
        reference = (await message
          .fetchReference()
          .catch(() => {})) as FireMessage;
      const description = message.guild.language.get(
        message.type == "REPLY" && reference
          ? "MSGDELETELOG_DESCRIPTION_REPLY"
          : "MSGDELETELOG_DESCRIPTION",
        {
          author: message.author.toMention(),
          channel: message.channel.toString(),
          reply:
            message.type == "REPLY" && reference
              ? message.mentions.users.has(reference?.author?.id)
                ? (reference?.author as FireUser)?.toMention()
                : reference?.author?.toString()
              : null,
          replyURL: `https://discord.com/channels/${message.reference?.guildId}/${message.reference?.channelId}/${message.reference?.messageId}`,
        }
      );
      const content = message.content
        ? message.content.length > 4047 - description.length
          ? `\n${message.content.slice(0, 4040 - description.length)}...`
          : "\n" + message.content.slice(0, 4040)
        : "";
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#FFFFFF")
        .setTimestamp(message.createdAt)
        .setAuthor({
          name: message.author.toString(),
          iconURL: message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setDescription(description + content)
        .addFields(
          [
            message.attachments.size
              ? {
                  name: message.guild.language.get("ATTACHMENTS"),
                  value:
                    message.attachments
                      .map((attach) => attach.name)
                      .join("\n") +
                    "\n\n" +
                    message.guild.language.get("MSGDELETELOG_ATTACH_WARN"),
                }
              : null,
            message.activity
              ? {
                  name: message.guild.language.get("ACTIVITY"),
                  value:
                    (message.activity.partyId?.startsWith("spotify:")
                      ? message.guild.language.get(
                          "MSGDELETELOG_SPOTIFY_ACTIVITY"
                        ) + "\n"
                      : "") +
                    message.guild.language.get("MSGDELETELOG_ACTIVITY", {
                      partyID: message.activity.partyId,
                      type: message.guild.language.get(
                        `ACTIVITY_TYPES.${message.activity.type}`
                      ),
                    }),
                }
              : null,
            message.selfDelete
              ? {
                  name: message.guild.language.get("DELETED_BY"),
                  value:
                    message.guild.members.me?.toString() ??
                    this.client.user.toString(),
                }
              : null,
            message.deleteReason
              ? {
                  name: message.guild.language.get("REASON"),
                  value: message.deleteReason,
                }
              : null,
          ].filter((field) => !!field)
        )
        .setFooter({
          text: `${message.author.id} | ${message.id} | ${message.channelId}`,
        });
      if (embed.description != description || embed.fields.length)
        await message.guild.actionLog(embed, ActionLogTypes.MESSAGE_DELETE);
    }
  }
}
