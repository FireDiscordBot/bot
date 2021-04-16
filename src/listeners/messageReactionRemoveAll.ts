import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";

export default class MessageReactionRemoveAll extends Listener {
  constructor() {
    super("messageReactionRemoveAll", {
      emitter: "client",
      event: "messageReactionRemoveAll",
    });
  }

  async exec(message: FireMessage) {
    if (!message.guild) return;
    const guild = message.guild;

    if (!guild.starboardReactions.has(message.id)) return;
    else {
      const starboardEmoji = guild.settings.get("starboard.emoji", "⭐");

      // these two variables satisfy the needs for FireMessage#star
      // so they'll be used in place of an actual reaction and user
      const fakeReaction = {
        emoji: starboardEmoji,
      };
      const fakeUser = { id: "69420", bot: false };

      // we're setting the reaction count to zero in our cache
      // so that FireMessage#star will see it's below the minimum
      guild.starboardReactions.set(message.id, 0);

      // @ts-ignore (the fake reaction may satisfy the method's needs but not tsc's needs)
      await message.star(fakeReaction, fakeUser, "remove");
    }
  }
}
