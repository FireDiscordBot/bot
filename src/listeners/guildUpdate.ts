import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { ActionLogTypes, constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { MessageEmbed } from "discord.js";

export default class GuildUpdate extends Listener {
  constructor() {
    super("guildUpdate", {
      emitter: "client",
      event: "guildUpdate",
    });
  }

  async exec(before: FireGuild, after: FireGuild) {
    if (after.deleted) return;

    const discoveryChanges =
      before.name != after.name ||
      before.icon != after.icon ||
      before.splash != after.splash ||
      before.discoverySplash != after.discoverySplash ||
      before.features.length != after.features.length;

    if (discoveryChanges && after.isPublic() && this.client.manager.ws?.open)
      // send discovery update
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.ADD_OR_SYNC,
            guilds: [after.getDiscoverableData()],
          })
        )
      );
    // below can check for changes like disabling invites (which adds the INVITES_DISABLED feature)
    else if (
      discoveryChanges &&
      !after.isPublic() &&
      this.client.manager.ws?.open
    )
      // send discovery delete
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.DISCOVERY_UPDATE, {
            op: DiscoveryUpdateOp.REMOVE,
            guilds: [{ id: after.id }],
          })
        )
      );

    const basicInfoChanges =
      before.name != after.name ||
      before.icon != after.icon ||
      before.banner != after.banner ||
      before.ownerId != after.ownerId ||
      before.features.length != after.features.length ||
      before.vanityURLCode != after.vanityURLCode;
    if (basicInfoChanges)
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(EventType.GUILD_BASIC_INFO_UPDATE, {
            id: after.id,
            name: after.name,
            icon: after.icon,
            banner: after.banner,
            ownerId: after.ownerId,
            features: after.features,
            vanity: after.vanityURLCode,
          })
        )
      );

    const notableChanges =
      before.name != after.name ||
      before.ownerId != after.ownerId ||
      before.systemChannelId != after.systemChannelId ||
      before.icon != after.icon ||
      before.splash != after.splash ||
      before.banner != after.banner ||
      before.description != after.description ||
      before.verificationLevel != after.verificationLevel ||
      before.explicitContentFilter != after.explicitContentFilter ||
      before.features.length != after.features.length;

    let beforeOwner: FireMember, afterOwner: FireMember;

    if (before.ownerId != after.ownerId) {
      beforeOwner = (await after.members
        .fetch(before.ownerId)
        .catch(() => {})) as FireMember;
      afterOwner = (await after.members
        .fetch(after.ownerId)
        .catch(() => {})) as FireMember;
    }

    if (after.settings.has("log.action") && notableChanges) {
      const language = after.language;
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp()
        .setAuthor({
          name: language.get("GUILDUPDATELOG_AUTHOR", { name: after.name }),
          iconURL: after.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .addFields(
          [
            before.name != after.name
              ? {
                  name: language.get("NAME"),
                  value: `${before.name} ➜ ${after.name}`,
                }
              : null,
            before.systemChannelId != after.systemChannelId
              ? {
                  name: language.get("SYSTEM_CHANNEL"),
                  value: `${
                    before.systemChannel?.name || constants.escapedShruggie
                  } ➜ ${
                    after.systemChannel?.name || constants.escapedShruggie
                  }`,
                }
              : null,
            before.ownerId != after.ownerId
              ? {
                  name: language.get("OWNER"),
                  value: `${beforeOwner || before.ownerId} ➜ ${
                    afterOwner || after.ownerId
                  }`,
                }
              : null,
            before.icon != after.icon
              ? {
                  name: language.get("ICON"),
                  value: `${
                    before.iconURL({
                      size: 128,
                      format: "png",
                      dynamic: true,
                    }) || constants.escapedShruggie
                  } ➜ ${
                    after.iconURL({
                      size: 128,
                      format: "png",
                      dynamic: true,
                    }) || constants.escapedShruggie
                  }`,
                }
              : null,
            before.splash != after.splash
              ? {
                  name: language.get("GUILDUPDATELOG_SPLASH_CHANGED"),
                  value: `${
                    before.splashURL({
                      size: 2048,
                      format: "png",
                    }) || constants.escapedShruggie
                  } ➜ ${
                    after.splashURL({ size: 2048, format: "png" }) ||
                    constants.escapedShruggie
                  }`,
                }
              : null,
            before.banner != after.banner
              ? {
                  name: language.get("GUILDUPDATELOG_BANNER_CHANGED"),
                  value: `${
                    before.bannerURL({
                      size: 2048,
                      format: "png",
                    }) || constants.escapedShruggie
                  } ➜ ${
                    after.bannerURL({ size: 2048, format: "png" }) ||
                    constants.escapedShruggie
                  }`,
                }
              : null,
            before.verificationLevel != after.verificationLevel
              ? {
                  name: language.get("VERIFICATION_LEVEL"),
                  value: `${language.get(
                    `GUILD_VERIF_${before.verificationLevel}`
                  )} ➜ ${language.get(
                    `GUILD_VERIF_${after.verificationLevel}`
                  )}`.replace(/\*/gim, ""),
                }
              : null,
            before.explicitContentFilter != after.explicitContentFilter
              ? {
                  name: language.get("EXPLICIT_CONTENT_FILTER"),
                  value: `${language.get(
                    `EXPLICIT_CONTENT_FILTER_${before.explicitContentFilter}`
                  )} ➜ ${language.get(
                    `EXPLICIT_CONTENT_FILTER_${after.explicitContentFilter}`
                  )}`,
                }
              : null,
            before.description != after.description
              ? {
                  name: language.get("DESCRIPTION"),
                  value: `${before.description} ➜ ${after.description}`,
                }
              : null,
          ].filter((field) => !!field)
        )
        .setFooter({ text: after.id });
      if (before.features.length != after.features.length) {
        const added = after.features.filter(
          (feature) => !before.features.includes(feature)
        );
        const removed = before.features.filter(
          (feature) => !after.features.includes(feature)
        );
        embed.addFields(
          [
            added.length
              ? {
                  name: language.get("ADDED_FEATURES"),
                  value: added
                    .map((feature) =>
                      this.client.util.cleanFeatureName(feature, after.language)
                    )
                    .join("\n"),
                }
              : null,
            removed.length
              ? {
                  name: language.get("REMOVED_FEATURES"),
                  value: removed
                    .map((feature) =>
                      this.client.util.cleanFeatureName(feature, after.language)
                    )
                    .join("\n"),
                }
              : null,
          ].filter((field) => !!field)
        );
      }
      if (embed.fields.length)
        await after
          .actionLog(embed, ActionLogTypes.GUILD_UPDATE)
          .catch(() => {});
    }
  }
}
