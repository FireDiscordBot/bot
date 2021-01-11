import { FireGuild } from "../../lib/extensions/guild";
import { TextChannel, DMChannel } from "discord.js";
import { Listener } from "../../lib/util/listener";

export default class ChannelCreate extends Listener {
  constructor() {
    super("channelCreate", {
      emitter: "client",
      event: "channelCreate",
    });
  }

  async exec(channel: TextChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild;
    const muteRole = guild.muteRole;
    if (muteRole)
      await channel
        .updateOverwrite(
          muteRole,
          {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
          },
          guild.language.get("MUTE_ROLE_CREATE_REASON") as string
        )
        .catch(() => {});
  }
}
