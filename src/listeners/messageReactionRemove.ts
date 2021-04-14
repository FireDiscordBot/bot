import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageReaction, GuildEmoji } from "discord.js";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";

export default class MessageReactionRemove extends Listener {
  constructor() {
    super("messageReactionRemove", {
      emitter: "client",
      event: "messageReactionRemove",
    });
  }

  async exec(messageReaction: MessageReaction, user: FireUser) {
    if (!messageReaction.message?.guild) return;
    const message = messageReaction.message as FireMessage;
    const guild = messageReaction.message?.guild as FireGuild;

    if (guild.reactionRoles.has(messageReaction.message?.id)) {
      const emoji =
        messageReaction.emoji instanceof GuildEmoji
          ? messageReaction.emoji.id
          : messageReaction.emoji.name;
      const roles = guild.reactionRoles
        .get(messageReaction.message?.id)
        .filter((data) => data.emoji == emoji)
        .map((data) => guild.roles.cache.get(data.role))
        .filter((role) => !!role);
      const member = await guild.members.fetch(user).catch(() => {});
      if (member)
        await member.roles
          .remove(
            roles,
            guild.language.get("REACTIONROLE_ROLE_REMOVE_REASON") as string
          )
          .catch(() => {});
    }

    if (
      guild.settings.has("starboard.channel") &&
      user?.id != message.author?.id &&
      !user?.bot
    ) {
      const channel = guild.channels.cache.get(
        guild.settings.get("starboard.channel")
      ) as FireTextChannel;
      const starboardEmoji = guild.settings.get("starboard.emoji", "⭐");
      const reactionEmoji =
        messageReaction.emoji instanceof GuildEmoji
          ? messageReaction.emoji.id
          : messageReaction.emoji.name;
      if (
        channel?.id != message.channel.id &&
        starboardEmoji.trim() == reactionEmoji.trim()
        // (starboardEmoji.trim() == reactionEmoji.trim() ||
        // reactionEmoji == constants.emojis.antistarId)
      ) {
        await message.fetch().catch(() => {}); // needed to get reaction counts
        if (!message.partial)
          await message.star(messageReaction, user, "remove");
      }
    }
  }
}
