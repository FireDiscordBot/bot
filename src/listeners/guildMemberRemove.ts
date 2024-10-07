import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { constants, MemberLogTypes } from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { Formatters, MessageEmbed, Snowflake, ThreadChannel } from "discord.js";

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

    if (
      member.guild?.id == this.client.config.fireguildId &&
      member.settings.has("premium.coupon")
    )
      this.client.util.deleteSpecialCoupon(member);

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
            member.guild.members.me as FireMember,
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
          [joinleavemsgs.displayName, member.user.globalName],
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
        .setFooter({ text: member.id });
      if (!member.partial) {
        embed.addFields({
          name: language.get("JOINED_FIELD"),
          value: Formatters.time(member.joinedAt, "R"),
        });
        if (member.nickname)
          embed.addFields({
            name: language.get("NICKNAME"),
            value: member.nickname,
          });
        const roles = member.roles.cache
          .filter((role) => role.id != member.guild.roles.everyone.id)
          .map((role) => role.toString())
          .join(", ");
        if (roles && roles.length <= 1024)
          embed.addFields({ name: language.get("ROLES"), value: roles });
      }
      await member.guild.memberLog(embed, MemberLogTypes.LEAVE);
    }
  }
}
