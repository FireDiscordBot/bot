import { FireGuild } from "@fire/lib/extensions/guild";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Listener } from "@fire/lib/util/listener";
import { ThreadChannel } from "discord.js";

// Totally not copied from channelCreate lol
export default class ThreadCreate extends Listener {
  constructor() {
    super("threadCreate", {
      emitter: "client",
      event: "threadCreate",
    });
  }

  async exec(channel: ThreadChannel) {
    const guild = channel.guild as FireGuild,
      language = guild.language;

    if (!channel.parent) return; // something probably broke, details in FIRE-7BX

    const parent = channel.parent;

    if (
      parent.type == "GUILD_TEXT" &&
      guild.settings.get("slowmode.sync", false) &&
      (parent as FireTextChannel).rateLimitPerUser > 0
    )
      await channel
        .setRateLimitPerUser(
          parent.rateLimitPerUser,
          language.get("SLOWMODE_SYNC_REASON")
        )
        .catch(() => {});
  }
}
