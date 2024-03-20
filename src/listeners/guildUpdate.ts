import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { DiscoveryUpdateOp } from "@fire/lib/interfaces/stats";
import { ActionLogTypes, constants } from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
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
        .setFooter(after.id);
      if (before.name != after.name)
        embed.addField(language.get("NAME"), `${before.name} ➜ ${after.name}`);
      if (before.systemChannelId != after.systemChannelId)
        embed.addField(
          language.get("SYSTEM_CHANNEL"),
          `${before.systemChannel?.name || constants.escapedShruggie} ➜ ${
            after.systemChannel?.name || constants.escapedShruggie
          }`
        );
      if (before.ownerId != after.ownerId)
        embed.addField(
          language.get("OWNER"),
          `${beforeOwner || before.ownerId} ➜ ${afterOwner || after.ownerId}`
        );
      if (before.icon != after.icon)
        embed.addField(
          language.get("GUILDUPDATELOG_ICON_CHANGED"),
          `${
            before.iconURL({
              size: 128,
              format: "png",
              dynamic: true,
            }) || constants.escapedShruggie
          } ➜ ${
            after.iconURL({ size: 128, format: "png", dynamic: true }) ||
            constants.escapedShruggie
          }`
        );
      if (before.splash != after.splash)
        embed.addField(
          language.get("GUILDUPDATELOG_SPLASH_CHANGED"),
          `${
            before.splashURL({
              size: 2048,
              format: "png",
            }) || constants.escapedShruggie
          } ➜ ${
            after.splashURL({ size: 2048, format: "png" }) ||
            constants.escapedShruggie
          }`
        );
      if (before.banner != after.banner)
        embed.addField(
          language.get("GUILDUPDATELOG_BANNER_CHANGED"),
          `${
            before.bannerURL({
              size: 2048,
              format: "png",
            }) || constants.escapedShruggie
          } ➜ ${
            after.bannerURL({ size: 2048, format: "png" }) ||
            constants.escapedShruggie
          }`
        );
      if (before.verificationLevel != after.verificationLevel)
        embed.addField(
          language.get("VERIFICATION_LEVEL"),
          `${language.get(
            ("GUILD_VERIF_" +
              before.verificationLevel.toString()) as LanguageKeys
          )} ➜ ${language.get(
            ("GUILD_VERIF_" +
              after.verificationLevel.toString()) as LanguageKeys
          )}`.replace(/\*/gim, "")
        );
      if (before.explicitContentFilter != after.explicitContentFilter)
        embed.addField(
          language.get("EXPLICIT_CONTENT_FILTER"),
          `${language.get(
            ("EXPLICIT_CONTENT_FILTER_" +
              before.explicitContentFilter.toString()) as LanguageKeys
          )} ➜ ${language.get(
            ("EXPLICIT_CONTENT_FILTER_" +
              after.explicitContentFilter.toString()) as LanguageKeys
          )}`
        );
      if (before.features.length != after.features.length) {
        const added = after.features.filter(
          (feature) => !before.features.includes(feature)
        );
        const removed = before.features.filter(
          (feature) => !after.features.includes(feature)
        );
        if (after.id == "411619823445999637" && added.length)
          await this.client.req
            .channels("624304772333436928")
            .messages.post({
              data: {
                content: `<@287698408855044097> new feature(s) in sk1er discord, ${added.join(
                  ", "
                )}`,
                allowed_mentions: {
                  users: ["287698408855044097"],
                },
              },
            })
            .catch(() => {});
        if (added.length)
          embed.addField(
            language.get("ADDED_FEATURES"),
            added
              .map((feature) =>
                this.client.util.cleanFeatureName(feature, after.language)
              )
              .join("\n")
          );
        if (removed.length)
          embed.addField(
            language.get("REMOVED_FEATURES"),
            removed
              .map((feature) =>
                this.client.util.cleanFeatureName(feature, after.language)
              )
              .join("\n")
          );
      }
      if (
        before.description != after.description ||
        (before.description != after.description && embed.fields.length != 0)
      )
        embed.addField(
          language.get("DESCRIPTION"),
          `${before.description} ➜ ${after.description}`
        );
      if (embed.fields.length)
        await after
          .actionLog(embed, ActionLogTypes.GUILD_UPDATE)
          .catch(() => {});
    }
  }
}
