import { MessageReaction, GuildEmoji, Snowflake } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Listener } from "@fire/lib/util/listener";

export default class MessageReactionRemove extends Listener {
  constructor() {
    super("messageReactionRemove", {
      emitter: "client",
      event: "messageReactionRemove",
    });
  }

  async exec(messageReaction: MessageReaction, user: FireUser) {
    if (
      !messageReaction.message?.guild ||
      user.bot ||
      this.client.util.isBlacklisted(
        user,
        messageReaction.message?.guild as FireGuild
      )
    )
      return;
    const message = messageReaction.message as FireMessage;
    const guild = messageReaction.message?.guild as FireGuild;

    if (message.guild?.premium && !message.guild.reactionRoles)
      await message.guild.loadReactionRoles();

    if (guild.reactionRoles.has(messageReaction.message?.id)) {
      const emoji =
        messageReaction.emoji instanceof GuildEmoji
          ? messageReaction.emoji.id
          : messageReaction.emoji.name;
      const member = await guild.members.fetch(user).catch(() => {});
      if (member) {
        const roles = guild.reactionRoles
          .get(messageReaction.message?.id)
          .filter((data) => data.emoji == emoji)
          .map((data) => data.role)
          .filter(
            (role) =>
              guild.roles.cache.has(role) && member.roles.cache.has(role)
          );
        await member.roles
          .remove(roles, guild.language.get("REACTIONROLE_ROLE_REMOVE_REASON"))
          .catch(() => {});
      }
    }

    if (guild.starboard && user?.id != message.author?.id && !user?.bot) {
      const channel = guild.starboard;
      const starboardEmoji = guild.settings.get<string>(
        "starboard.emoji",
        "⭐"
      );
      const reactionEmoji =
        messageReaction.emoji instanceof GuildEmoji
          ? messageReaction.emoji.id
          : messageReaction.emoji.name;
      if (
        channel?.id != message.channel.id &&
        starboardEmoji.trim() == reactionEmoji.trim()
      ) {
        await message.star(messageReaction, user, "remove").catch(() => {});
      }
    }
  }
}
