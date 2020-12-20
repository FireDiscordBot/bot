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
    // Ensures bot is cached so permission checks 'n' stuff work
    if (!this.client.users.cache.has(this.client.user?.id))
      await this.client.users.fetch(this.client.user.id);
    if (message.guild) await message.guild.members.fetch(this.client.user.id);
    return false;
  }
}
