import { ThreadMember, MessageEmbed, Collection, Snowflake } from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";

export default class ThreadMembersUpdate extends Listener {
  constructor() {
    super("threadMembersUpdate", {
      emitter: "client",
      event: "threadMembersUpdate",
    });
  }

  async exec(
    before: Collection<Snowflake, ThreadMember>,
    after: Collection<Snowflake, ThreadMember>
  ) {
    const thread = after.first()?.thread;
    const guild = thread?.guild as FireGuild;
    if (!thread || !guild) return;

    const added = after.filter((member) => !before.has(member.id));
    const removed = before.filter((member) => !after.has(member.id));
    if (!added.size && !removed.size) return;

    if (guild.settings.has("log.action")) {
      const language = guild.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor(
          language.get("THREADMEMBERUPDATELOG_AUTHOR", { thread: thread.name }),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setFooter(thread.id);
      if (added.size) {
        const ids = added.map((member) => member.id);
        const members = await guild.members
          .fetch({ user: ids })
          .catch(() => {});
        if (members)
          embed.addField(
            language.get("NEW_MEMBERS"),
            members.map((member: FireMember) => member.toMention()).join(" - ")
          );
      }
      if (removed.size) {
        const ids = removed.map((member) => member.id);
        const members = await guild.members
          .fetch({ user: ids })
          .catch(() => {});
        if (members)
          embed.addField(
            language.get("OLD_MEMBERS"),
            members.map((member: FireMember) => member.toMention()).join(" - ")
          );
      }

      if (embed.fields.length)
        await guild.actionLog(embed, "channel_update").catch(() => {});
    }
  }
}
