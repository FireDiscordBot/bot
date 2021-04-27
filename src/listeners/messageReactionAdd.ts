import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageReaction, GuildEmoji } from "discord.js";
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
    const message = messageReaction.message as FireMessage;
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (message.id == sk1erModule?.supportMessageId) {
      const ticket = await sk1erModule
        .handleSupport(messageReaction, user)
        .catch((e: Error) => e);
      if (!(ticket instanceof FireTextChannel))
        this.client.console.error(
          `[Sk1er] Failed to make ticket for ${user} due to ${ticket}`
        );
      return;
    }

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
          .add(roles, guild.language.get("REACTIONROLE_ROLE_REASON") as string)
          .catch(() => {});
      }
    }

    if (
      message.guild?.settings.has("starboard.channel") &&
      user?.id != message.author?.id &&
      !user?.bot
    ) {
      const channel = message.guild.channels.cache.get(
        message.guild?.settings.get("starboard.channel")
      ) as FireTextChannel;
      const starboardEmoji = message.guild?.settings.get(
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
        // (starboardEmoji.trim() == reactionEmoji.trim() ||
        //   reactionEmoji == constants.emojis.antistarId)
      ) {
        await message.fetch().catch(() => {}); // needed to get reaction counts and author
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
