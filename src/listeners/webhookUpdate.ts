import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { GuildLogManager } from "@fire/lib/util/logmanager";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { NewsChannel } from "discord.js";

export default class WebhookUpdate extends Listener {
  constructor() {
    super("webhookUpdate", {
      emitter: "client",
      event: "webhookUpdate",
    });
  }

  async exec(channel: FireTextChannel | NewsChannel) {
    const guild = channel.guild as FireGuild;

    if (!guild.logger) guild.logger = new GuildLogManager(this.client, guild);

    if (guild.logger?.hasWebhooks(channel.id))
      await guild.logger.refreshWebhooks().catch(() => {});
  }
}
