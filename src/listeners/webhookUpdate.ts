import { FireGuild } from "@fire/lib/extensions/guild";
import { TextChannel, NewsChannel } from "discord.js";
import { Listener } from "@fire/lib/util/listener";

export default class WebhookUpdate extends Listener {
  constructor() {
    super("webhookUpdate", {
      emitter: "client",
      event: "webhookUpdate",
    });
  }

  async exec(channel: TextChannel | NewsChannel) {
    const guild = channel.guild as FireGuild;

    if (guild.logger?.hasWebhooks(channel.id))
      await guild.logger.refreshWebhooks().catch(() => {});
  }
}
