import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { MessageEmbed, Invite } from "discord.js";

export default class InviteDelete extends Listener {
  constructor() {
    super("inviteDelete", {
      emitter: "client",
      event: "inviteDelete",
    });
  }

  async exec(invite: Invite) {
    const guild = invite.guild as FireGuild;
    const language = guild.language;
    guild.inviteUses?.delete(invite.code);

    if (guild.settings.has("log.action")) {
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp()
        .setAuthor(
          language.get("INVDELETE_LOG_AUTHOR", { guild: guild.name }),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("FILTER_INVITE_LOG_CODE"), invite.code)
        .addField(language.get("CHANNEL"), invite.channel.name)
        .setFooter(invite.channel.id);
      await guild.actionLog(embed, "invite_delete").catch(() => {});
    }
  }
}
