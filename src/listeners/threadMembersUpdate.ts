import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { ActionLogTypes } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Collection, MessageEmbed, Snowflake, ThreadMember } from "discord.js";

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
    if (added.size <= 1 && removed.size <= 1) return;

    if (guild.settings.has("log.action")) {
      const language = guild.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor({
          name: language.get("THREADMEMBERUPDATELOG_AUTHOR", {
            thread: thread.name,
          }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .setFooter({ text: thread.id });
      if (added.size) {
        const ids = added.map((member) => member.id);
        const members = await guild.members
          .fetch({ user: ids })
          .catch(() => {});
        if (members && members.size)
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
        if (members && members.size)
          embed.addField(
            language.get("OLD_MEMBERS"),
            members.map((member: FireMember) => member.toMention()).join(" - ")
          );
      }

      if (embed.fields.length)
        await guild
          .actionLog(embed, ActionLogTypes.CHANNEL_UPDATE)
          .catch(() => {});
    }
  }
}
