import { MessageEmbed, GuildChannel, DMChannel } from "discord.js";
import { FireGuild } from "../../lib/extensions/guild";
import { Listener } from "../../lib/util/listener";

export default class ChannelUpdate extends Listener {
  constructor() {
    super("channelUpdate", {
      emitter: "client",
      event: "channelUpdate",
    });
  }

  async exec(
    before: GuildChannel | DMChannel,
    after: GuildChannel | DMChannel
  ) {
    if (after instanceof DMChannel) return;

    before = before as GuildChannel;
    after = after as GuildChannel;

    const guild = after.guild as FireGuild;
    const muteRole = guild.muteRole;
    if (
      muteRole &&
      (after.permissionsFor(muteRole).has("SEND_MESSAGES") ||
        after.permissionsFor(muteRole).has("ADD_REACTIONS"))
    )
      await after
        .updateOverwrite(
          muteRole,
          {
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
          },
          guild.language.get("MUTE_ROLE_CREATE_REASON") as string
        )
        .catch(() => {});

    let beforeOverwrites: string[] = [],
      afterOverwrites: string[] = [];

    if (
      before.permissionOverwrites.keyArray().sort((a, b) => (a > b ? 1 : -1)) !=
      after.permissionOverwrites.keyArray().sort((a, b) => (a > b ? 1 : -1))
    ) {
      if (before.permissionOverwrites.size > 1) {
        const roleOverwrites = before.permissionOverwrites
          .map((overwrite) => overwrite.id)
          .map((id) => guild.roles.cache.get(id))
          .filter((role) => !!role);
        const memberIds = before.permissionOverwrites
          .map((overwrite) => overwrite.id)
          .filter((id) => !guild.roles.cache.has(id));
        const members: string[] = memberIds.length
          ? await guild.members
              .fetch({ user: memberIds })
              .then((found) => found.map((member) => member.toString()))
              .catch(() => [])
          : [];
        beforeOverwrites = [
          ...roleOverwrites.map((role) => role.toString()),
          ...members,
        ];
      }
      if (after.permissionOverwrites.size > 1) {
        const roleOverwrites = after.permissionOverwrites
          .map((overwrite) => overwrite.id)
          .map((id) => guild.roles.cache.get(id))
          .filter((role) => !!role);
        const memberIds = after.permissionOverwrites
          .map((overwrite) => overwrite.id)
          .filter((id) => !guild.roles.cache.has(id));
        const members: string[] = memberIds.length
          ? await guild.members
              .fetch({ user: memberIds })
              .then((found) => found.map((member) => member.toString()))
              .catch(() => [])
          : [];
        afterOverwrites = [
          ...roleOverwrites.map((role) => role.toString()),
          ...members,
        ];
      }
    }

    const newOverwrites = afterOverwrites.filter(
      (viewer) => !beforeOverwrites.includes(viewer)
    );
    const removedOverwrites = beforeOverwrites.filter(
      (viewer) => !afterOverwrites.includes(viewer)
    );

    const notableChanges =
      before.name != after.name ||
      before.parentID != after.parentID ||
      newOverwrites.length ||
      removedOverwrites.length ||
      // @ts-ignore
      before.topic != after.topic;

    if (guild.settings.has("log.action") && notableChanges) {
      const language = guild.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor(
          language.get("CHANNELUPDATELOG_AUTHOR", after.type, after.name),
          guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setFooter(after.id);
      if (before.name != after.name)
        embed.addField(language.get("NAME"), `${before.name} ➜ ${after.name}`);
      if (before.parentID != after.parentID)
        embed.addField(
          language.get("CATEGORY"),
          `${before.parent.name} ➜ ${after.parent.name}`
        );
      // @ts-ignore
      if (before.topic != after.topic)
        embed.addField(
          language.get("TOPIC"),
          // @ts-ignore
          `${before.topic || language.get("NO_TOPIC")} ➜ ${
            // @ts-ignore
            after.topic || language.get("NO_TOPIC")
          }`
        );
      if (newOverwrites.length)
        embed.addField(
          language.get("ADDED_OVERWRITES"),
          newOverwrites.join(" - ")
        );
      if (removedOverwrites.length)
        embed.addField(
          language.get("REMOVED_OVERWRITES"),
          removedOverwrites.join(" - ")
        );
      if (embed.fields.length)
        await guild.actionLog(embed, "channel_update").catch(() => {});
    }
  }
}
