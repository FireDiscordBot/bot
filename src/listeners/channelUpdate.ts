import { FireGuild } from "@fire/lib/extensions/guild";
import { ActionLogTypes, constants, titleCase } from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DMChannel,
  GuildBasedChannel,
  GuildChannel,
  MessageEmbed,
  StageChannel,
  VoiceChannel,
} from "discord.js";

export default class ChannelUpdate extends Listener {
  constructor() {
    super("channelUpdate", {
      emitter: "client",
      event: "channelUpdate",
    });
  }

  async exec(
    before: GuildBasedChannel | DMChannel,
    after: GuildBasedChannel | DMChannel
  ) {
    if (after instanceof DMChannel) return;

    before = before as GuildBasedChannel;
    after = after as GuildBasedChannel;

    const guild = after.guild as FireGuild;
    const muteRole = guild.muteRole;
    const muteCommand = this.client.getCommand("mute");
    if (
      after instanceof GuildChannel &&
      muteRole &&
      !guild.me.permissionsIn(after).missing(muteCommand.clientPermissions)
        .length &&
      !after.permissionOverwrites.cache
        .get(muteRole.id)
        ?.deny.has(
          PermissionFlagsBits.CreatePrivateThreads |
            PermissionFlagsBits.CreatePublicThreads |
            PermissionFlagsBits.SendMessagesInThreads |
            PermissionFlagsBits.RequestToSpeak |
            PermissionFlagsBits.SendMessages |
            PermissionFlagsBits.AddReactions |
            PermissionFlagsBits.Speak
        )
    )
      await after.permissionOverwrites
        .edit(
          muteRole,
          {
            SEND_MESSAGES_IN_THREADS: false,
            CREATE_PRIVATE_THREADS: false,
            CREATE_PUBLIC_THREADS: false,
            REQUEST_TO_SPEAK: false,
            SEND_MESSAGES: false,
            ADD_REACTIONS: false,
            SPEAK: false,
          },
          {
            reason: guild.language.get("MUTE_ROLE_CREATE_REASON"),
            type: 0,
          }
        )
        .catch(() => {});

    let beforeOverwrites: string[] = [],
      afterOverwrites: string[] = [];

    if (
      before instanceof GuildChannel &&
      after instanceof GuildChannel &&
      before.permissionOverwrites.cache.size !=
        after.permissionOverwrites.cache.size
    ) {
      const beforeRoleOverwrites = before.permissionOverwrites.cache
        .map((overwrite) => overwrite.id)
        .map((id) => guild.roles.cache.get(id))
        .filter((role) => !!role);
      beforeOverwrites = beforeRoleOverwrites.map((role) => role.toString());
      const afterRoleOverwrites = after.permissionOverwrites.cache
        .map((overwrite) => overwrite.id)
        .map((id) => guild.roles.cache.get(id))
        .filter((role) => !!role);
      afterOverwrites = afterRoleOverwrites.map((role) => role.toString());
    }

    const newOverwrites = afterOverwrites.filter(
      (viewer) => !beforeOverwrites.includes(viewer)
    );
    const removedOverwrites = beforeOverwrites.filter(
      (viewer) => !afterOverwrites.includes(viewer)
    );

    const notableChanges =
      before.name != after.name ||
      before.parentId != after.parentId ||
      newOverwrites.length ||
      removedOverwrites.length ||
      // @ts-ignore (cba to do instance checks everywhere, ignoring is easier)
      before.topic != after.topic ||
      // @ts-ignore
      before.region != after.region;

    if (guild.settings.has("log.action") && notableChanges) {
      const language = guild.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor({
          name: language.get("CHANNELUPDATELOG_AUTHOR", {
            type: titleCase(after.type.replace(/_/g, " ")),
            channel: after.name,
          }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .setFooter(after.id);
      if (before.name != after.name)
        embed.addField(language.get("NAME"), `${before.name} ➜ ${after.name}`);
      if (before.parentId != after.parentId)
        embed.addField(
          language.get("CATEGORY"),
          `${before.parent?.name || constants.escapedShruggie} ➜ ${
            after.parent?.name || constants.escapedShruggie
          }`
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
      if (
        (before instanceof VoiceChannel || before instanceof StageChannel) &&
        (after instanceof VoiceChannel || after instanceof StageChannel)
      )
        if (before.rtcRegion != after.rtcRegion) {
          embed.addField(
            language.get("REGION"),
            `${
              language.get(
                `REGIONS.${before.rtcRegion}` as unknown as LanguageKeys
              ) || constants.escapedShruggie
            } ➜ ${
              language.get(
                `REGIONS.${after.rtcRegion}` as unknown as LanguageKeys
              ) || constants.escapedShruggie
            }`
          );
        }
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
        await guild
          .actionLog(embed, ActionLogTypes.CHANNEL_UPDATE)
          .catch(() => {});
    }
  }
}
