import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";
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
    if (guild.premium) guild.invites.set(invite.code, 0);

    if (guild.settings.has("temp.log.action")) {
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp(new Date())
        .setAuthor(
          language.get("INVDELETE_LOG_AUTHOR", guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("FILTER_INVITE_LOG_CODE"), invite.code)
        .addField(language.get("CHANNEL"), invite.channel.name)
        .setFooter(invite.channel.id);
      await guild.actionLog(embed, "invite_delete").catch(() => {});
    }
  }
}
