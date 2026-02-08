import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import {
  ActionLogTypes,
  MemberLogTypes,
  ModLogTypes,
  constants,
} from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";
import {
  PermissionFlagsBits,
  RESTAPIPartialCurrentUserGuild,
} from "discord-api-types/v9";
import { Formatters, MessageEmbed } from "discord.js";

const {
  regexes: { joinleavemsgs },
} = constants;

const logTypes = ["moderation", "action", "members"];

export default class GuildMemberAdd extends Listener {
  constructor() {
    super("guildMemberAdd", {
      emitter: "client",
      event: "guildMemberAdd",
    });
  }

  async exec(member: FireMember) {
    if (member.guild.isPublic() && this.client.manager.ws?.open)
      // send discovery update for realtime member counts
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.SYNC,
            guilds: [member.guild.getDiscoverableData()],
          })
        )
      );

    if (this.client.manager.state.subscribed.includes(member.id))
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.SUBSCRIBED_GUILD_CREATE, {
            id: member.id,
            guild: {
              id: member.guild.id,
              name: member.guild.name,
              icon: member.guild.icon,
              banner: member.guild.banner,
              owner: false,
              features: member.guild.features,
              permissions: member.permissions.bitfield.toString(),
              approximate_member_count: member.guild.memberCount,
              approximate_presence_count:
                member.guild.approximatePresenceCount ?? 2,
            } as RESTAPIPartialCurrentUserGuild,
          })
        )
      );

    // This will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    member.dehoistAndDecancer();

    let usedInvite: string;
    if (
      member.guild.premium &&
      !member.user.bot &&
      member.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageGuild
      ) &&
      member.guild.inviteUses
    ) {
      const before = member.guild.inviteUses.clone();
      const after = await member.guild.loadInvites();
      if (before.size && after.size) {
        for (const [code, uses] of before) {
          if (
            after.has(code) &&
            after.get(code) != uses &&
            after.get(code) > uses
          ) {
            usedInvite = code;
            break;
          }
        }
        if (usedInvite) {
          if (!member.guild.inviteRoles) await member.guild.loadInviteRoles();
          const roleId = member.guild.inviteRoles.get(usedInvite);
          if (roleId) {
            const role = member.guild.roles.cache.get(roleId);
            await member.roles.add(
              role,
              member.guild.language.get("INVITE_ROLE_REASON", {
                invite: usedInvite,
              }) as string
            );
          }
        } else if (member.guild.features.includes("DISCOVERABLE"))
          usedInvite = member.guild.language.get(
            "JOINED_WITHOUT_INVITE"
          ) as string;
      }
    } else if (
      member.guild.premium &&
      member.guild.members.me.permissions.has(
        PermissionFlagsBits.ManageGuild
      ) &&
      !member.guild.inviteUses
    )
      await member.guild.loadInvites();

    if (
      member.guild.mutes.has(member.id) &&
      !member.communicationDisabledUntilTimestamp
    )
      await member.roles.add(member.guild.muteRole).catch(() => {});

    if (!member.guild.persistedRoles) await member.guild.loadPersistedRoles();
    if (member.guild.persistedRoles.has(member.id)) {
      const roles = member.guild.persistedRoles
        .get(member.id)
        .map((id) => member.guild.roles.cache.get(id))
        .filter((role) => !!role);
      if (roles.length)
        await member.roles
          .add(roles, member.guild.language.get("ROLEPERSIST_REASON"))
          .catch(() => {});
    }

    if (member.user.bot) {
      const role = member.guild.roles.cache.get(
        member.guild.settings.get<Snowflake>("mod.autobotrole", null)
      );
      if (
        role &&
        member.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles)
      )
        await member.roles
          .add(role, member.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    } else {
      const autoroleId = member.guild.settings.get<Snowflake>(
        "mod.autorole",
        null
      );
      const delay = member.guild.settings.get<boolean>(
        "mod.autorole.waitformsg",
        false
      );

      if (
        autoroleId &&
        !delay &&
        !member.roles.cache.has(autoroleId) &&
        // roles with high member counts seem to make discord unhappy
        // with requests taking a long time (looking at you Essential Mod server)
        // so we're going to force a delay on these large servers
        member.guild.memberCount <= 250_000
      ) {
        const role = member.guild.roles.cache.get(autoroleId);
        if (
          role &&
          member.guild.members.me.permissions.has(
            PermissionFlagsBits.ManageRoles
          )
        )
          await member.roles
            .add(role, member.guild.language.get("AUTOROLE_REASON"))
            .catch(() => {});
      }
    }

    if (member.premium && member.guild.id == this.client.config.fireGuildId)
      await member.roles.add("564060922688176139").catch(() => {});

    if (member.guild.memberCount >= 1000) {
      const logChannelIds = logTypes.map((type) =>
        member.guild.settings.get<string>(`log.${type}`)
      );
      logTypes.forEach(async (type, index) => {
        const id = logChannelIds[index];
        if (!id) return;
        const isMulti = logChannelIds.filter((lid) => lid == id).length > 1;
        if (isMulti) {
          const message = member.guild.language.get(
            `LOGGING_${type.toUpperCase()}_DISABLED_MEMBERCOUNT` as LanguageKeys
          ) as string;
          if (type == "moderation")
            member.guild.modLog(message, ModLogTypes.SYSTEM).catch(() => {});
          else if (type == "action")
            member.guild
              .actionLog(message, ActionLogTypes.SYSTEM)
              .catch(() => {});
          else if (type == "members")
            member.guild
              .memberLog(message, MemberLogTypes.SYSTEM)
              .catch(() => {});
          await member.guild.settings.delete(`log.${type}`, this.client.user);
        }
      });
    }

    const language = member.guild.language;

    if (!member.user.bot) {
      let joinMessage = member.guild.settings.get<string>("greet.joinmsg");
      const channel = member.guild.channels.cache.get(
        member.guild.settings.get<Snowflake>("greet.joinchannel")
      );
      if (joinMessage && channel instanceof FireTextChannel) {
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
          joinMessage = joinMessage.replace(
            regex as RegExp,
            replacement as string
          );
        await channel.send({ content: joinMessage }).catch(() => {});
      }
    }

    if (member.guild.settings.has("log.members")) {
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(member.joinedAt)
        .setAuthor({
          name: language.get("MEMBERJOIN_LOG_AUTHOR", {
            member: member.toString(),
          }),
          iconURL: member.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          url: "https://i.giphy.com/media/Nx0rz3jtxtEre/giphy.gif",
        })
        .addFields({
          name: language.get("ACCOUNT_CREATED"),
          value: Formatters.time(member.user.createdAt, "R"),
        })
        .setFooter({ text: member.id });
      const randInt = this.client.util.randInt(0, 100);
      if (!member.guild.premium && randInt == 69)
        embed.addFields({
          name: language.get("MEMBERJOIN_LOG_PREMIUM_UPSELL_TITLE"),
          value: language.get("MEMBERJOIN_LOG_PREMIUM_UPSELL_VALUE"),
        });
      if (
        member.user.bot &&
        member.guild.members.me.permissions.has(
          PermissionFlagsBits.ViewAuditLog
        )
      ) {
        // this is (or at least should be) infrequent enough
        // to make moving it to guildAuditLogEntryCreate not completely necessary
        // however, it might be worth doing so to add extra details and/or have it in mod logs
        // especially since this is the last audit fetch remaining
        const auditLogActions = await member.guild
          .fetchAuditLogs({ limit: 2, type: "BOT_ADD" })
          .catch(() => {});
        if (auditLogActions) {
          const action = auditLogActions.entries.find(
            (entry) =>
              // @ts-ignore
              entry.target && entry.target?.id == member.id
          );
          if (action)
            embed.addFields({
              name: language.get("INVITED_BY"),
              value: `${action.executor} (${action.executor.id})`,
            });
        }
      }
      if (usedInvite)
        embed.addFields({
          name: language.get("INVITE_USED"),
          value: usedInvite,
        });
      const roles = member.roles.cache
        .filter((role) => role.id != member.guild.roles.everyone.id)
        .map((role) => role.toString())
        .join(", ");
      if (roles && roles.length <= 1024)
        embed.addFields({ name: language.get("ROLES"), value: roles });
      if (member.guild.mutes.has(member.id))
        embed.addFields({
          name: member.guild.language.get("MUTE_WILL_BE_UNMUTED"),
          value: Formatters.time(
            new Date(member.guild.mutes.get(member.id)),
            "R"
          ),
        });
      await member.guild.memberLog(embed, MemberLogTypes.JOIN);
    }
  }
}
