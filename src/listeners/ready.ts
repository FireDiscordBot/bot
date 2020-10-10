import { Listener } from "../../lib/util/listener";

export default class Ready extends Listener {
  constructor() {
    super("ready", {
      emitter: "client",
      event: "ready",
    });
  }

  async exec() {
    if (!this.client.util.loadedData.premium)
      await this.client.util.sleep(5000);
    this.client.guilds.cache.forEach(async (guild) => {
      if (
        !this.client.util.premium.has(guild.id) &&
        this.client.config.premiumOnly
      )
        return await guild.leave();
    });
  }
}
