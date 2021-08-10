import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
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
    const member = await guild.members.fetch(after.id).catch(() => {});
    if (!member || member.user.bot) return;

    if (!guild.vcRoles) await guild.loadVcRoles();

    if (before.channelId && !after.channelId) {
      if (guild.vcRoles.has(before.channelId)) {
        const role = guild.roles.cache.get(guild.vcRoles.get(before.channelId));
        if (role)
          await member.roles
            .remove(role, guild.language.get("VCROLE_REMOVE_REASON"))
            .catch(() => {});
      }
    }

    if (
      guild.vcRoles.has(before.channelId) &&
      !guild.vcRoles.has(after.channelId)
    ) {
      const role = guild.roles.cache.get(guild.vcRoles.get(before.channelId));
      if (role)
        await member.roles
          .remove(role, guild.language.get("VCROLE_REMOVE_REASON"))
          .catch(() => {});
    }

    if (guild.vcRoles.has(after.channelId)) {
      const role = guild.roles.cache.get(guild.vcRoles.get(after.channelId));
      if (role)
        await member.roles
          .add(role, guild.language.get("VCROLE_ADD_REASON"))
          .catch(() => {});
    }
  }
}
