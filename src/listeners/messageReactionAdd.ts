import { FireMessage } from "../../lib/extensions/message";
import { FireUser } from "../../lib/extensions/user";
import { Listener } from "../../lib/util/listener";
import { MessageReaction } from "discord.js";

export default class MessageReactionAdd extends Listener {
  constructor() {
    super("messageReactionAdd", {
      emitter: "client",
      event: "messageReactionAdd",
    });
  }

  async exec(messageReaction: MessageReaction, user: FireUser) {
    const message = messageReaction.message as FireMessage;
    if (messageReaction.partial || message.partial) return;
    if (
      message.paginator &&
      message.paginator.ready &&
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
