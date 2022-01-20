import {
  Formatters,
  MessageEmbed,
  Permissions,
  Snowflake,
  ThreadChannel,
} from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import EssentialNitro from "../modules/essentialnitro";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";

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
    if (member.guild.isPublic() && this.client.manager.ws?.open)
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.SYNC,
            guilds: [member.guild.getDiscoverableData()],
          })
        )
      );

    const essentialModule = this.client.getModule(
      "essentialnitro"
    ) as EssentialNitro;
    if (
      essentialModule &&
      (member.guild.hasExperiment(223827992, 1) ||
        member.guild.hasExperiment(223827992, 2))
    ) {
      const exists = await essentialModule.getUUID(member);
      if (exists) {
        const removed = await essentialModule
          .removeNitroCosmetic(member)
          .catch(() => false);
        if (removed != true)
          this.client.console.error(
            `[Essential] Failed to remove nitro perks from ${member}${
              typeof removed == "number" ? ` with status code ${removed}` : ""
            }`
          );
      }
    }

    const tickets = member.guild.tickets;
    for (const channel of tickets) {
      if (
        channel &&
        (channel instanceof FireTextChannel
          ? channel.topic
          : channel.name
        ).includes(member.id)
      ) {
        if (channel instanceof ThreadChannel && channel.archived) continue;
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
            member.guild.language.get("TICKET_AUTHOR_LEFT", {
              author: member.toString(),
            }) as string
          );
        else
          await channel.send(
            member.guild.language.get("TICKET_AUTHOR_LEFT", {
              author: member.toString(),
            })
          );
      }
    }

    const language = member.guild.language;

    if (!member.user.bot) {
      let leaveMessage = member.guild.settings.get<string>("greet.leavemsg");
      const channel = member.guild.channels.cache.get(
        member.guild.settings.get<Snowflake>("greet.leavechannel")
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
          [
            joinleavemsgs.countSuffix,
            this.client.util.numberWithSuffix(member.guild.memberCount),
          ],
        ];
        for (const [regex, replacement] of regexes)
          leaveMessage = leaveMessage.replace(
            regex as RegExp,
            replacement as string
          );
        await channel.send({ content: leaveMessage }).catch(() => {});
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
              `AUDIT_ACTION_${auditAction.action}` as LanguageKeys
            ) as string;
            reason =
              auditAction.reason ||
              language.get("MODERATOR_ACTION_DEFAULT_REASON");
          }
        }
      }
      const embed = new MessageEmbed()
        .setColor(member.partial ? "#E74C3C" : member.displayColor || "#E74C3C")
        .setTimestamp()
        .setAuthor({
          name: language.get("MEMBERLEAVE_LOG_AUTHOR", {
            member: member.toString(),
          }),
          iconURL: member.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          url: "https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif",
        })
        .setFooter(member.id);
      if (moderator && action)
        embed.addField(
          language.get("AUDIT_ACTION_BY", { action }),
          `${moderator} (${moderator.id})`
        );
      if (action && reason) embed.addField(language.get("REASON"), reason);
      if (!member.partial) {
        embed.addField(
          language.get("JOINED_FIELD"),
          Formatters.time(member.joinedAt, "R")
        );
        if (member.nickname)
          embed.addField(language.get("NICKNAME"), member.nickname);
        const roles = member.roles.cache
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
