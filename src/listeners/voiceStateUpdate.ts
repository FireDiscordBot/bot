import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";
import { VoiceState } from "discord.js";

export default class VoiceStateUpdate extends Listener {
  constructor() {
    super("voiceStateUpdate", {
      emitter: "client",
      event: "voiceStateUpdate",
    });
  }

  async exec(before: VoiceState, after: VoiceState) {
    const guild = after.guild as FireGuild;

    if (before.channelID && !after.channelID) {
      if (guild.vcRoles.has(before.channelID)) {
        const role = guild.roles.cache.get(guild.vcRoles.get(before.channelID));
        if (role)
          await after.member.roles
            .remove(
              role,
              guild.language.get(
                "VCROLE_REMOVE_REASON",
                before.channel?.name || "???"
              ) as string
            )
            .catch(() => {});
      }
    }

    if (guild.vcRoles.has(after.channelID)) {
      const role = guild.roles.cache.get(guild.vcRoles.get(after.channelID));
      if (role)
        await after.member.roles
          .add(
            role,
            guild.language.get(
              "VCROLE_ADD_REASON",
              after.channel?.name || "???"
            ) as string
          )
          .catch(() => {});
    }
  }
}
