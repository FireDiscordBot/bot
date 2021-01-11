import { FireGuild } from "../../lib/extensions/guild";
import { TextChannel, DMChannel } from "discord.js";
import { Listener } from "../../lib/util/listener";

export default class ChannelUpdate extends Listener {
  constructor() {
    super("channelUpdate", {
      emitter: "client",
      event: "channelUpdate",
    });
  }

  async exec(before: TextChannel | DMChannel, after: TextChannel | DMChannel) {
    if (after instanceof DMChannel) return;
    const guild = after.guild as FireGuild;
    const muteRole = guild.muteRole;
    if (
      muteRole &&
      (after.permissionsFor(muteRole).has("SEND_MESSAGES") ||
        after.permissionsFor(muteRole).has("ADD_REACTIONS"))
    )
      await after
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
