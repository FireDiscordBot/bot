import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
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

    if (guild.premium && !guild.inviteUses) await guild.loadInvites();
    guild.inviteUses?.set(invite.code, 0);

    if (guild.settings.has("log.action")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor({
          name: language.get("INVCREATE_LOG_AUTHOR", { guild: guild.name }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .addField(language.get("FILTER_INVITE_LOG_CODE"), invite.code)
        .addField(language.get("CHANNEL"), invite.channel.name)
        .addField(
          language.get("CREATED_BY"),
          invite.inviter?.toString() || "¯\\\\_(ツ)_/¯"
        )
        .setFooter(`${invite.channel.id} | ${invite.inviter?.id || ""}`);
      await guild.actionLog(embed, "invite_create").catch(() => {});
    }
  }
}
