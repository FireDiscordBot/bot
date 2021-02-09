import { MessageReaction, TextChannel, GuildEmoji } from "discord.js";
import { FireGuild } from "../../lib/extensions/guild";
import { FireUser } from "../../lib/extensions/user";
import { Listener } from "../../lib/util/listener";

export default class MessageReactionRemove extends Listener {
  constructor() {
    super("messageReactionRemove", {
      emitter: "client",
      event: "messageReactionRemove",
    });
  }

  async exec(messageReaction: MessageReaction, user: FireUser) {
    if (!messageReaction.message?.guild) return;
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
            guild.language.get(
              "REACTIONROLE_ROLE_REMOVE_REASON",
              emoji,
              messageReaction.message?.id,
              (messageReaction.message?.channel as TextChannel)?.name || "???"
            ) as string
          )
          .catch(() => {});
    }
  }
}
