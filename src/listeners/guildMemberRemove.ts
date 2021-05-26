import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { constants, humanize } from "@fire/lib/util/constants";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageEmbed, Permissions } from "discord.js";
import { Listener } from "@fire/lib/util/listener";
import Sk1er from "@fire/src/modules/sk1er";
import * as moment from "moment";

const {
  regexes: { joinleavemsgs },
} = constants;

export default class GuildMemberRemove extends Listener {
  constructor() {
    super("guildMemberRemove", {
      emitter: "client",
      event: "guildMemberRemove",
    });
  }

  async exec(member: FireMember) {
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (sk1erModule && member.guild.id == sk1erModule.guildId) {
      const removed = await sk1erModule
        .removeNitroPerks(member)
        .catch(() => false);
      if (typeof removed == "boolean" && removed)
        (sk1erModule.guild.channels.cache.get(
          "411620457754787841"
        ) as FireTextChannel).send(
          sk1erModule.guild.language.get(
            "SK1ER_NITRO_PERKS_REMOVED_LEFT",
            member.toString()
          )
        );
    }

    const tickets = member.guild.tickets;
    for (const channel of tickets) {
      if (
        channel &&
        (channel instanceof FireTextChannel
          ? channel.topic
          : channel.name
        ).startsWith(
          member.guild.language.get(
            "TICKET_CHANNEL_TOPIC",
            member.toString(),
            member.id,
            null
          ) as string
        )
      ) {
        const history = await channel.messages
          .fetch({ limit: 20 })
          .catch(() => {});
        if (
          history &&
          !history.filter((message) => message.author.id == member.id).size
        )
          await member.guild.closeTicket(
            channel,
            member.guild.me as FireMember,
            member.guild.language.get(
              "TICKET_AUTHOR_LEFT",
              member.toString()
            ) as string
          );
        else
          await channel.send(
            member.guild.language.get("TICKET_AUTHOR_LEFT", member.toString())
          );
      }
    }

    const language = member.guild.language;

    if (!member.user.bot) {
      let leaveMessage = member.guild.settings.get<string>("greet.leavemsg");
      const channel = member.guild.channels.cache.get(
        member.guild.settings.get<string>("greet.leavechannel")
      );
      if (leaveMessage && channel instanceof FireTextChannel) {
        const regexes = [
          [joinleavemsgs.user, member.toString()],
          [joinleavemsgs.mention, member.toMention()],
          [joinleavemsgs.name, member.user.username],
          [joinleavemsgs.discrim, member.user.discriminator],
          [joinleavemsgs.guild, member.guild.name],
          [
            joinleavemsgs.count,
            member.guild.memberCount.toLocaleString(member.guild.language.id),
          ],
        ];
        for (const [regex, replacement] of regexes)
          leaveMessage = leaveMessage.replace(
            regex as RegExp,
            replacement as string
          );
        await channel.send(leaveMessage).catch(() => {});
      }
    }

    if (member.guild.settings.has("log.members")) {
      let moderator: FireMember, action: string, reason: string;
      if (member.guild.me.permissions.has(Permissions.FLAGS.VIEW_AUDIT_LOG)) {
        const auditLogActions = await member.guild
          .fetchAuditLogs({ limit: 5 })
          .catch(() => {});
        if (auditLogActions) {
          const auditAction = auditLogActions.entries.find(
            (entry) =>
              ["MEMBER_BAN_ADD", "MEMBER_KICK"].includes(entry.action) &&
              // @ts-ignore
              entry.target?.id == member.id
          );
          if (auditAction) {
            moderator = (await member.guild.members
              .fetch(auditAction.executor)
              .catch(() => {})) as FireMember;
            action = language.get(
              `AUDIT_ACTION_${auditAction.action}`
            ) as string;
            reason =
              auditAction.reason ||
              (language.get("MODERATOR_ACTION_DEFAULT_REASON") as string);
          }
        }
      }
      const embed = new MessageEmbed()
        .setColor(
          member.partial ? "#E74C3C" : member.displayHexColor || "#E74C3C"
        )
        .setTimestamp()
        .setAuthor(
          language.get("MEMBERLEAVE_LOG_AUTHOR", member.toString()),
          member.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          "https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif"
        )
        .setFooter(member.id);
      if (moderator && action)
        embed.addField(
          language.get("AUDIT_ACTION_BY", action),
          `${moderator} (${moderator.id})`
        );
      if (action && reason) embed.addField(language.get("REASON"), reason);
      if (!member.partial) {
        const joinedDelta =
          humanize(
            moment(member.joinedAt).diff(moment()),
            language.id.split("-")[0]
          ) + language.get("AGO");
        embed.addField(language.get("JOINED"), joinedDelta);
        if (member.nickname)
          embed.addField(language.get("NICKNAME"), member.nickname);
        const roles = member.roles.cache
          .array()
          .filter((role) => role.id != member.guild.roles.everyone.id)
          .map((role) => role.toString())
          .join(", ");
        if (roles && roles.length <= 1024)
          embed.addField(language.get("ROLES"), roles);
      }
      await member.guild.memberLog(embed, "leave");
    }
  }
}
