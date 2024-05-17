import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Listener } from "@fire/lib/util/listener";
import { MessageReaction } from "discord.js";

export default class MessageReactionAdd extends Listener {
  constructor() {
    super("messageReactionAdd", {
      emitter: "client",
      event: "messageReactionAdd",
    });
  }

  async exec(messageReaction: MessageReaction, user: FireUser) {
    if (
      user.bot ||
      this.client.util.isBlacklisted(
        user,
        messageReaction.message?.guild as FireGuild
      )
    )
      return;

    const message = messageReaction.message as FireMessage;
    const guild = messageReaction.message?.guild as FireGuild;

    if (guild?.premium && !guild.reactionRoles) await guild.loadReactionRoles();

    if (guild?.premium && guild?.reactionRoles.has(message.id)) {
      const emoji = messageReaction.emoji.id || messageReaction.emoji.name;
      const member = await guild.members.fetch(user).catch(() => {});
      if (member) {
        const roles = guild.reactionRoles
          .get(messageReaction.message?.id)
          .filter((data) => data.emoji == emoji)
          .map((data) => data.role)
          .filter(
            (role) =>
              guild.roles.cache.has(role) && !member.roles.cache.has(role)
          );
        await member.roles
          .add(roles, guild.language.get("REACTIONROLE_ROLE_REASON"))
          .catch(() => {});
      }
    }

    if (
      message.guild?.starboard &&
      user?.id != message.author?.id &&
      !user?.bot
    ) {
      const channel = message.guild.starboard;
      const starboardEmoji = message.guild?.settings.get<string>(
        "starboard.emoji",
        "⭐"
      );
      const reactionEmoji =
        messageReaction.emoji.id || messageReaction.emoji.name;
      if (
        channel?.id != message.channelId &&
        starboardEmoji.trim() == reactionEmoji.trim()
      )
        await message.star(messageReaction, user, "add").catch(() => {});
    }

    if (messageReaction.partial || message.partial) return;
  }
}
