import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireGuild } from "@fire/lib/extensions/guild";
import { MessageEmbed, TextChannel } from "discord.js";
import { titleCase } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";

export default class GuildUpdate extends Listener {
  theFunny: boolean;

  constructor() {
    super("guildUpdate", {
      emitter: "client",
      event: "guildUpdate",
    });
    this.theFunny = false;
  }

  async exec(before: FireGuild, after: FireGuild) {
    if (
      before.id == "411619823445999637" &&
      !after.features.includes("PARTNERED")
    ) {
      await (after.channels.cache.get("411620457754787841") as TextChannel)
        .send("rip partner")
        .then(() => (this.theFunny = true))
        .catch(() => {});
    }

    const discoveryChanges =
      before.name != after.name ||
      before.icon != after.icon ||
      before.splash != after.splash ||
      before.discoverySplash != after.discoverySplash;

    if (discoveryChanges && after.isPublic())
      // send discovery update
      this.client.manager.ws?.send(
        MessageUtil.encode(
          new Message(
            EventType.DISCOVERY_UPDATE,
            this.client.util.getDiscoverableGuilds()
          )
        )
      );

    const notableChanges =
      before.name != after.name ||
      before.ownerID != after.ownerID ||
      before.systemChannelID != after.systemChannelID ||
      before.icon != after.icon ||
      before.splash != after.splash ||
      before.banner != after.banner ||
      before.description != after.description ||
      before.verificationLevel != after.verificationLevel ||
      before.explicitContentFilter != after.explicitContentFilter ||
      before.features.length != after.features.length;

    let beforeOwner: FireMember, afterOwner: FireMember;

    if (before.ownerID != after.ownerID) {
      beforeOwner = (await after.members
        .fetch(before.ownerID)
        .catch(() => {})) as FireMember;
      afterOwner = (await after.members
        .fetch(after.ownerID)
        .catch(() => {})) as FireMember;
    }

    if (after.settings.has("log.action") && notableChanges) {
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
      if (before.systemChannelID != after.systemChannelID)
        embed.addField(
          language.get("SYSTEM_CHANNEL"),
          `${before.systemChannel?.name || "???"} ➜ ${
            after.systemChannel?.name || "???"
          }`
        );
      if (before.ownerID != after.ownerID)
        embed.addField(
          language.get("OWNER"),
          `${beforeOwner || before.ownerID} ➜ ${afterOwner || after.ownerID}`
        );
      if (before.icon != after.icon)
        embed.addField(
          language.get("GUILDUPDATELOG_ICON_CHANGED"),
          `${
            before.iconURL({
              size: 128,
              format: "png",
              dynamic: true,
            }) || "???"
          } ➜ ${
            after.iconURL({ size: 128, format: "png", dynamic: true }) || "???"
          }`
        );
      if (before.splash != after.splash)
        embed.addField(
          language.get("GUILDUPDATELOG_SPLASH_CHANGED"),
          `${
            before.splashURL({
              size: 2048,
              format: "png",
            }) || "???"
          } ➜ ${after.splashURL({ size: 2048, format: "png" }) || "???"}`
        );
      if (before.banner != after.banner)
        embed.addField(
          language.get("GUILDUPDATELOG_BANNER_CHANGED"),
          `${
            before.bannerURL({
              size: 2048,
              format: "png",
            }) || "???"
          } ➜ ${after.bannerURL({ size: 2048, format: "png" }) || "???"}`
        );
      if (
        before.description != after.description &&
        after.id != "411619823445999637" &&
        after.id != "564052798044504084"
      )
        embed.addField(
          language.get("DESCRIPTION"),
          `${before.description} ➜ ${after.description}`
        );
      if (before.verificationLevel != after.verificationLevel)
        embed.addField(
          language.get("VERIFICATION_LEVEL"),
          `${language.get(
            "GUILD_VERIF_" + before.verificationLevel.toString()
          )} ➜ ${language.get(
            "GUILD_VERIF_" + after.verificationLevel.toString()
          )}`.replace(/\*/gim, "")
        );
      if (before.explicitContentFilter != after.explicitContentFilter)
        embed.addField(
          language.get("EXPLICIT_CONTENT_FILTER"),
          `${language.get(
            "EXPLICIT_CONTENT_FILTER_" + before.explicitContentFilter.toString()
          )} ➜ ${language.get(
            "EXPLICIT_CONTENT_FILTER_" + after.explicitContentFilter.toString()
          )}`
        );
      if (before.features.length != after.features.length) {
        const added = after.features.filter(
          (feature) => !before.features.includes(feature)
        );
        const removed = before.features.filter(
          (feature) => !after.features.includes(feature)
        );
        if (added.length)
          embed.addField(
            language.get("ADDED_FEATURES"),
            added
              .map((feature) => titleCase(feature.split("_").join(" ")))
              .join("\n")
          );
        if (removed.length)
          embed.addField(
            language.get("REMOVED_FEATURES"),
            removed
              .map((feature) => titleCase(feature.split("_").join(" ")))
              .join(", ")
          );
      }
      if (embed.fields.length)
        await after.actionLog(embed, "guild_update").catch(() => {});
    }
  }
}
