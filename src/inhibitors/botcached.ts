import { FireMessage } from "../../lib/extensions/message";
import { Inhibitor } from "../../lib/util/inhibitor";

export default class BotCachedInhibitor extends Inhibitor {
  constructor() {
    super("botcached", {
      reason: "botcached",
      priority: 10,
      type: "all",
    });
  }

  async exec(message: FireMessage) {
    if (!message.guild.members.cache.has(this.client.user?.id))
      await message.guild.members.fetch(this.client.user.id); // Ensures bot is cached so permission checks work
    return false;
  }
}
