import { FireGuild } from "@fire/lib/extensions/guild";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ActionLogTypes } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import { Formatters, MessageEmbed, ThreadChannel } from "discord.js";

// Totally not copied from channelCreate lol
export default class ThreadCreate extends Listener {
  constructor() {
    super("threadCreate", {
      emitter: "client",
      event: "threadCreate",
    });
  }

  async exec(channel: ThreadChannel) {
    const guild = channel.guild as FireGuild,
      language = guild.language;

    if (!channel.parent) return; // something probably broke, details in FIRE-7BX

    const parent = channel.parent;

    if (
      parent.type == "GUILD_TEXT" &&
      guild.settings.get("slowmode.sync", false) &&
      (parent as FireTextChannel).rateLimitPerUser > 0
    )
      await channel
        .setRateLimitPerUser(
          parent.rateLimitPerUser,
          language.get("SLOWMODE_SYNC_REASON")
        )
        .catch(() => {});

    if (guild.settings.has("log.action")) {
      const owner = await guild.members.fetch(channel.ownerId).catch(() => {});
      const autoArchiveDuration =
        typeof channel.autoArchiveDuration == "string"
          ? 10080
          : channel.autoArchiveDuration;
      const autoArchiveAt = new Date(+new Date() + autoArchiveDuration * 60000);
      const embed = new MessageEmbed()
        .setColor("#2ECC71")
        .setTimestamp(channel.createdAt)
        .setAuthor({
          name: language.get("THREADCREATELOG_AUTHOR", { guild: guild.name }),
          iconURL: guild.iconURL({ size: 2048, format: "png", dynamic: true }),
        })
        .addField(language.get("NAME"), channel.name)
        .addField(language.get("CHANNEL"), parent.toString())
        .addField(language.get("ARCHIVE"), Formatters.time(autoArchiveAt, "R"))
        .addField(
          language.get("CREATED_BY"),
          owner ? `${owner} (${owner.id})` : channel.ownerId
        )
        .setFooter(channel.id);
      if (parent.messages.cache.has(channel.id))
        embed.addField(
          language.get("THREAD_MESSAGE"),
          `[${language.get("CLICK_TO_VIEW")}](${
            parent.messages.cache.get(channel.id).url
          })`
        );
      await guild
        .actionLog(embed, ActionLogTypes.CHANNEL_CREATE)
        .catch(() => {});
    }
  }
}
