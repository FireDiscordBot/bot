import { FireMessage } from "../../lib/extensions/message";
import { FireUser } from "../../lib/extensions/user";
import { Listener } from "../../lib/util/listener";
import { MessageReaction } from "discord.js";
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
      const ticket = await sk1erModule.handleSupportReaction(
        messageReaction,
        message,
        user
      );
      if (typeof ticket == "string")
        this.client.console.error(
          `[Sk1er] Failed to make ticket for ${user} due to ${ticket}`
        );
      return;
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
