import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";
import { MessageEmbed } from "discord.js";
import { FireMember } from "../../lib/extensions/guildmember";

export default class GuildUpdate extends Listener {
  constructor() {
    super("guildUpdate", {
      emitter: "client",
      event: "guildUpdate",
    });
  }

  async exec(before: FireGuild, after: FireGuild) {
    const notableChanges =
      before.name != after.name ||
      before.ownerID != after.ownerID ||
      before.icon != after.icon ||
      before.description != after.description ||
      before.region != after.region;

    let beforeOwner: FireMember, afterOwner: FireMember;

    if (before.ownerID != after.ownerID) {
      beforeOwner = (await after.members
        .fetch(before.ownerID)
        .catch(() => {})) as FireMember;
      afterOwner = (await after.members
        .fetch(after.ownerID)
        .catch(() => {})) as FireMember;
    }

    if (after.settings.has("temp.log.action") && notableChanges) {
      const language = after.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor(
          language.get("GUILDUPDATELOG_AUTHOR", after.name),
          after.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setFooter(after.id);
      if (before.name != after.name)
        embed.addField(language.get("NAME"), `${before.name} ➜ ${after.name}`);
      if (before.ownerID != after.ownerID)
        embed.addField(
          language.get("OWNER"),
          `${beforeOwner || before.ownerID} ➜ ${afterOwner || after.ownerID}`
        );
      if (before.icon != after.icon)
        embed.addField(
          language.get("GUILDUPDATELOG_ICON_CHANGED"),
          `${before.iconURL({
            size: 128,
            format: "png",
            dynamic: true,
          })} ➜ ${after.iconURL({ size: 128, format: "png", dynamic: true })}`
        );
      if (before.region != after.region) {
        const unknown = language.get("REGION_DEPRECATED");
        embed.addField(
          language.get("REGION"),
          `${language.get("REGIONS")[before.region] || unknown} ➜ ${
            language.get("REGIONS")[after.region] || unknown
          }`
        );
      }
      if (
        before.description != after.description &&
        after.id != "411619823445999637"
      )
        embed.addField(
          language.get("DESCRIPTION"),
          `${before.description} ➜ ${after.description}`
        );
      if (embed.fields.length)
        await after.actionLog(embed, "guild_update").catch(() => {});
    }
  }
}
