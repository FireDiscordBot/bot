import { FireGuild } from "@fire/lib/extensions/guild";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ActionLogTypes, titleCase } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DMChannel,
  GuildBasedChannel,
  GuildChannel,
  MessageEmbed,
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
      !guild.me.permissionsIn(channel).missing(muteCommand.clientPermissions)
        .length
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

    if (!guild.permRoles) await guild.loadPermRoles();
    if (guild.permRoles.size) {
      for (const [role, perms] of guild.permRoles) {
        if (
          !channel
            .permissionsFor(guild.me)
            .has(PermissionFlagsBits.ManageRoles) ||
          !(channel instanceof GuildChannel)
        )
          continue;
        await channel.permissionOverwrites
          .set(
            [
              ...channel.permissionOverwrites.cache
                .filter(
                  // ensure the overwrites below are used instead
                  (overwrite) => overwrite.id != role
                )
                .toJSON(),
              {
                allow: perms.allow,
                deny: perms.deny,
                id: role,
                type: "role",
              },
            ],
            guild.language.get("PERMROLES_REASON")
          )
          .catch(() => {});
      }
    }
  }
}
