import { FireGuild } from "@fire/lib/extensions/guild";
import { ActionLogTypes } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Invite, MessageEmbed } from "discord.js";

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

    if (guild.premium && !guild.inviteUses) await guild.loadInvites();
    guild.inviteUses?.delete(invite.code);

    if (guild.settings.has("log.action")) {
      const embed = new MessageEmbed()
        .setColor("#E74C3C")
        .setTimestamp()
        .setAuthor({
          name: language.get("INVDELETE_LOG_AUTHOR", { guild: guild.name }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .addFields([
          {
            name: language.get("FILTER_INVITE_LOG_CODE"),
            value: invite.code,
          },
          {
            name: language.get("CHANNEL"),
            value: invite.channel.name,
          },
        ])
        .setFooter({ text: invite.channel.id });
      await guild
        .actionLog(embed, ActionLogTypes.INVITE_DELETE)
        .catch(() => {});
    }
  }
}
