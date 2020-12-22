import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";

export default class GuildMemberAdd extends Listener {
  constructor() {
    super("guildMemberAdd", {
      emitter: "client",
      event: "guildMemberAdd",
    });
  }

  async exec(member: FireMember) {
    // Both of these will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    await member.dehoist();
    await member.decancer();

    if (
      this.client.util.premium.has(member.guild.id) &&
      // @ts-ignore
      !member.guild.features.includes("PREVIEW_ENABLED")
    ) {
      let autoroleId: string;
      const delay = member.guild.settings.get("mod.autorole.waitformsg", false);
      if (member.user.bot)
        autoroleId = member.guild.settings.get("mod.autobotrole", null);
      else autoroleId = member.guild.settings.get("mod.autorole", null);

      if (
        autoroleId &&
        (member.user.bot || !delay) &&
        !member.roles.cache.has(autoroleId)
      ) {
        const role = member.guild.roles.cache.get(autoroleId);
        if (role && member.guild.me.hasPermission("MANAGE_ROLES"))
          await member.roles.add(role).catch(() => {});
      }
    }
  }
}
