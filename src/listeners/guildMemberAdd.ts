import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";
import { MessageEmbed } from "discord.js";
import * as moment from "moment";
import { humanize } from "../../lib/util/constants";

export default class GuildMemberAdd extends Listener {
  constructor() {
    super("guildMemberAdd", {
      emitter: "client",
      event: "guildMemberAdd",
    });
  }

  async exec(member: FireMember) {
    // This will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    member.dehoistAndDecancer();

    if (
      // @ts-ignore
      !member.guild.features.includes("PREVIEW_ENABLED")
    ) {
      let autoroleId: string;
      const delay = member.guild.settings.get("mod.autorole.waitformsg", false);
      if (member.user.bot)
        autoroleId = member.guild.settings.get("mod.autobotrole", null);
      else autoroleId = member.guild.settings.get("mod.autorole", null);

      if (
        autoroleId &&
        (member.user.bot || !delay) &&
        !member.roles.cache.has(autoroleId)
      ) {
        const role = member.guild.roles.cache.get(autoroleId);
        if (role && member.guild.me.hasPermission("MANAGE_ROLES"))
          await member.roles.add(role).catch(() => {});
      }
    }

    const language = member.guild.language;

    if (member.guild.settings.has("temp.log.members")) {
      const createdDelta =
        humanize(
          moment(member.user.createdAt).diff(moment()),
          language.id.split("-")[0]
        ) + language.get("AGO");
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(new Date())
        .setAuthor(
          language.get("MEMBERJOIN_LOG_AUTHOR", member.toString()),
          member.user.displayAvatarURL({
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
      await member.guild.memberLog(embed, "join");
    }
  }
}
