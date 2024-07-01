import { FireGuild } from "@fire/lib/extensions/guild";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DMChannel,
  GuildBasedChannel,
  GuildChannel,
  OverwriteType,
} from "discord.js";

export default class ChannelCreate extends Listener {
  constructor() {
    super("channelCreate", {
      emitter: "client",
      event: "channelCreate",
    });
  }

  async exec(channel: GuildBasedChannel | DMChannel) {
    if (channel instanceof DMChannel) return;
    const guild = channel.guild as FireGuild;
    const muteRole = guild.muteRole;
    const muteCommand = this.client.getCommand("mute");
    if (
      channel instanceof GuildChannel &&
      muteRole &&
      !guild.members.me
        .permissionsIn(channel)
        .missing(muteCommand.clientPermissions).length
    )
      await channel.permissionOverwrites
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
      !(channel instanceof GuildChannel) ||
      !channel.permissionsFor(guild.me).has(PermissionFlagsBits.ManageRoles)
    )
      return;

    if (!guild.permRoles) await guild.loadPermRoles();
    if (guild.permRoles.size)
      await channel.permissionOverwrites
        .set(
          [
            ...channel.permissionOverwrites.cache
              .filter(
                // ensure the overwrites below are used instead
                (overwrite) => !guild.permRoles.has(overwrite.id)
              )
              .toJSON(),
            ...guild.permRoles.map((data, role) => ({
              allow: data.allow,
              deny: data.deny,
              id: role,
              type: "role" as OverwriteType, // idk why this is necessary but whatever
            })),
          ],
          guild.language.get("PERMROLES_REASON")
        )
        .catch(() => {});
  }
}
