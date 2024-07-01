import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DMChannel,
  GuildBasedChannel,
  GuildChannel,
  OverwriteType,
} from "discord.js";

export default class ChannelUpdate extends Listener {
  constructor() {
    super("channelUpdate", {
      emitter: "client",
      event: "channelUpdate",
    });
  }

  async exec(
    _: GuildBasedChannel | DMChannel,
    after: GuildBasedChannel | DMChannel
  ) {
    if (after instanceof DMChannel) return;

    const guild = after.guild as FireGuild;
    const muteRole = guild.muteRole;
    const muteCommand = this.client.getCommand("mute");
    if (
      after instanceof GuildChannel &&
      muteRole &&
      !guild.members.me
        .permissionsIn(after)
        .missing(muteCommand.clientPermissions).length &&
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

    if (
      !(after instanceof GuildChannel) ||
      !after
        .permissionsFor(guild.members.me)
        .has(PermissionFlagsBits.ManageRoles)
    )
      return;

    if (!guild.permRoles) await guild.loadPermRoles();
    if (
      guild.permRoles.size &&
      guild.permRoles.some(
        (_, role) => !after.permissionOverwrites.cache.has(role)
      )
    )
      await after.permissionOverwrites
        .set(
          [
            ...guild.permRoles
              // Remove roles that already have overwrites on the channel
              // We don't want to touch those as they should already be correct
              // and if not, they might be from someone about to change the permissions for the permrole
              .filter((_, role) => !after.permissionOverwrites.cache.has(role))
              .map((data, role) => ({
                allow: data.allow,
                deny: data.deny,
                id: role,
                type: "role" as OverwriteType, // idk why this is necessary but whatever
              })),
            ...after.permissionOverwrites.cache.toJSON(),
          ],
          guild.language.get("PERMROLES_REASON")
        )
        .catch(() => {});
  }
}
