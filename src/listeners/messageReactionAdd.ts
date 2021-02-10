import { MessageReaction, TextChannel, GuildEmoji } from "discord.js";
import { FireMessage } from "../../lib/extensions/message";
import { FireUser } from "../../lib/extensions/user";
import { Listener } from "../../lib/util/listener";
import Sk1er from "../modules/sk1er";

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
    if (message.id == sk1erModule.supportMessageId) {
      const ticket = await sk1erModule
        .handleSupportReaction(messageReaction, user)
        .catch((e: Error) => e);
      if (!(ticket instanceof TextChannel))
        this.client.console.error(
          `[Sk1er] Failed to make ticket for ${user} due to ${ticket}`
        );
      return;
    }

    if (
      message.guild?.premium &&
      message.guild?.reactionRoles.has(message.id)
    ) {
      if (message.partial) await message.fetch();
      const guild = message.guild;
      const emoji =
        messageReaction.emoji instanceof GuildEmoji
          ? messageReaction.emoji.id
          : messageReaction.emoji.name;
      const rero = guild.reactionRoles
        .get(message.id)
        .find((data) => data.emoji == emoji);
      if (rero) {
        const role = guild.roles.cache.get(rero.role);
        const member = await guild.members.fetch(user).catch(() => {});
        if (member)
          await member.roles
            .add(role, guild.language.get("REACTIONROLE_ROLE_REASON") as string)
            .catch(() => {});
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
      await message.paginator.handler(
        messageReaction.emoji,
        messageReaction.users
      );
  }
}
