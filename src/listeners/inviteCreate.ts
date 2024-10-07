import { FireGuild } from "@fire/lib/extensions/guild";
import { ActionLogTypes, constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Invite, MessageEmbed } from "discord.js";

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
        .addFields(
          [
            {
              name: language.get("FILTER_INVITE_LOG_CODE"),
              value: invite.code,
            },
            {
              name: language.get("CHANNEL"),
              value: invite.channel.name,
            },
            invite.inviter
              ? {
                  name: language.get("CREATED_BY"),
                  value: invite.inviter.toString(),
                }
              : null,
          ].filter((f) => !!f)
        )
        .setFooter({
          text: `${invite.channel.id} | ${invite.inviter?.id || ""}`,
        });
      await guild
        .actionLog(embed, ActionLogTypes.INVITE_CREATE)
        .catch(() => {});
    }
  }
}
