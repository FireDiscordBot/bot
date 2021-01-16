import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";
import { MessageEmbed, Invite } from "discord.js";

export default class InviteCreate extends Listener {
  constructor() {
    super("inviteCreate", {
      emitter: "client",
      event: "inviteCreate",
    });
  }

  async exec(invite: Invite) {
    const guild = invite.guild as FireGuild;
    const language = guild.language;
    if (guild.premium) guild.invites.set(invite.code, 0);

    if (guild.settings.has("temp.log.action")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(new Date())
        .setAuthor(
          language.get("INVCREATE_LOG_AUTHOR", guild.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .addField(language.get("FILTER_INVITE_LOG_CODE"), invite.code)
        .addField(language.get("CHANNEL"), invite.channel.name)
        .addField(language.get("CREATED_BY"), invite.inviter.toString())
        .setFooter(`${invite.channel.id} | ${invite.inviter.id}`);
      await guild.actionLog(embed, "invite_create").catch(() => {});
    }
  }
}
