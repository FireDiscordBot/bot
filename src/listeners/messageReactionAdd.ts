import { MessageReaction, GuildEmoji, Snowflake } from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Listener } from "@fire/lib/util/listener";
import Sk1er from "@fire/src/modules/sk1er";

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
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (message.id == sk1erModule?.supportMessageId)
      return await sk1erModule
        .handleSupport(messageReaction, user)
        .catch(() => {});

    if (
      message.guild?.premium &&
      message.guild?.reactionRoles.has(message.id)
    ) {
      const guild = message.guild;
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
              guild.roles.cache.has(role) && !member.roles.cache.has(role)
          );
        await member.roles
          .add(roles, guild.language.get("REACTIONROLE_ROLE_REASON"))
          .catch(() => {});
      }
    }

    if (
      message.guild?.settings.has("starboard.channel") &&
      user?.id != message.author?.id &&
      !user?.bot
    ) {
      const channel = message.guild.channels.cache.get(
        message.guild?.settings.get<Snowflake>("starboard.channel")
      ) as FireTextChannel;
      const starboardEmoji = message.guild?.settings.get<string>(
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
        await message.star(messageReaction, user, "add").catch(() => {});
      }
    }

    if (messageReaction.partial || message.partial) return;
    if (
      message.paginator?.ready &&
      Object.values(message.paginator.emojis).includes(
        messageReaction.emoji.name // ReactionEmoji.name returns unicode
      ) &&
      user.id == message.paginator.owner.id
    )
      await message.paginator.reactionHandler(
        messageReaction.emoji,
        messageReaction.users
      );
  }
}
