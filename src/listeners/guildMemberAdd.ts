import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { MessageEmbed, Permissions, Snowflake } from "discord.js";
import { constants, humanize } from "@fire/lib/util/constants";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { Listener } from "@fire/lib/util/listener";
import * as moment from "moment";

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
    // auto ban dumbass blatant bots in select servers
    if (
      member.user.username.includes("twitter.com/h0nde") &&
      member.guild.hasExperiment(1187986866, 1)
    ) {
      return await member.bean("Bot.", member.guild.me, 0, 0);
    }

    // This will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    member.dehoistAndDecancer();

    let usedInvite: string;
    if (
      member.guild.premium &&
      !member.user.bot &&
      member.guild.me.permissions.has(Permissions.FLAGS.MANAGE_GUILD) &&
      member.guild.invites
    ) {
      const before = member.guild.invites.clone();
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
          const roleId = member.guild.inviteRoles.get(usedInvite);
          if (roleId) {
            const role = member.guild.roles.cache.get(roleId);
            await member.roles.add(
              role,
              member.guild.language.get(
                "INVITE_ROLE_REASON",
                usedInvite
              ) as string
            );
          }
        } else if (member.guild.features.includes("DISCOVERABLE"))
          usedInvite = member.guild.language.get(
            "JOINED_WITHOUT_INVITE"
          ) as string;
      }
    } else if (
      member.guild.premium &&
      member.guild.me.permissions.has(Permissions.FLAGS.MANAGE_GUILD) &&
      !member.guild.invites
    )
      await member.guild.loadInvites();

    if (member.guild.mutes.has(member.id)) {
      await member.roles.add(member.guild.muteRole).catch(() => {});
    }

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

    const hasScreening =
      member.guild.features.includes("PREVIEW_ENABLED") &&
      member.guild.features.includes("MEMBER_VERIFICATION_GATE_ENABLED");

    if (member.user.bot) {
      const role = member.guild.roles.cache.get(
        member.guild.settings.get<Snowflake>("mod.autobotrole", null)
      );
      if (
        role &&
        member.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)
      )
        await member.roles
          .add(role, member.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    } else if (!hasScreening) {
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
        !member.pending
      ) {
        const role = member.guild.roles.cache.get(autoroleId);
        if (
          role &&
          member.guild.me.permissions.has(Permissions.FLAGS.MANAGE_ROLES)
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
      logTypes.forEach((type, index) => {
        const id = logChannelIds[index];
        if (!id) return;
        const isMulti = logChannelIds.filter((lid) => lid == id).length > 1;
        if (isMulti) {
          const message = member.guild.language.get(
            `LOGGING_${type.toUpperCase()}_DISABLED_MEMBERCOUNT`
          ) as string;
          if (type == "moderation")
            member.guild.modLog(message, "system").catch(() => {});
          else if (type == "action")
            member.guild.actionLog(message, "system").catch(() => {});
          else if (type == "members")
            member.guild.memberLog(message, "system").catch(() => {});
          member.guild.settings.delete(`log.${type}`);
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
          [joinleavemsgs.discrim, member.user.discriminator],
          [joinleavemsgs.guild, member.guild.name],
          [
            joinleavemsgs.count,
            member.guild.memberCount.toLocaleString(member.guild.language.id),
          ],
        ];
        for (const [regex, replacement] of regexes)
          joinMessage = joinMessage.replace(
            regex as RegExp,
            replacement as string
          );
        await channel.send(joinMessage).catch(() => {});
      }
    }

    if (member.guild.settings.has("log.members")) {
      const createdDelta =
        humanize(
          moment(member.user.createdAt).diff(moment()),
          language.id.split("-")[0]
        ) + language.get("AGO");
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor(
          language.get("MEMBERJOIN_LOG_AUTHOR", member.toString()),
          member.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          "https://i.giphy.com/media/Nx0rz3jtxtEre/giphy.gif"
        )
        .addField(language.get("ACCOUNT_CREATED"), createdDelta)
        .setFooter(member.id);
      const randInt = this.client.util.randInt(0, 100);
      if (!member.guild.premium && randInt == 69)
        embed.addField(
          language.get("MEMBERJOIN_LOG_PREMIUM_UPSELL_TITLE"),
          language.get("MEMBERJOIN_LOG_PREMIUM_UPSELL_VALUE")
        );
      if (member.user.bot) {
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
            embed.addField(
              language.get("INVITED_BY"),
              `${action.executor} (${action.executor.id})`
            );
        }
      }
      if (usedInvite) embed.addField(language.get("INVITE_USED"), usedInvite);
      await member.guild.memberLog(embed, "join");
    }
  }
}
