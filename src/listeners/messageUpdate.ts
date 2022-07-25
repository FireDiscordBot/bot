import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Snowflake } from "discord.js";
import { Listener } from "@fire/lib/util/listener";
import Filters from "@fire/src/modules/filters";
import Message from "./message";
import { ActionLogTypes } from "@fire/lib/util/constants";

export default class MessageUpdate extends Listener {
  constructor() {
    super("messageUpdate", {
      emitter: "client",
      event: "messageUpdate",
    });
  }

  async exec(before: FireMessage, after: FireMessage) {
    if (this.client.manager.id != 0 && !after.guild) return;
    const guild = after.guild;

    // Ensures people get dehoisted/decancered even if
    // Fire missed them joining/changing name
    if (after.member)
      // This will check permissions & whether
      // dehoist/decancer is enabled so no need for checks here
      after.member.dehoistAndDecancer();

    await after.runAntiFilters().catch(() => {});
    await after.runPhishFilters().catch(() => {});

    const messageListener = this.client.getListener("message") as Message;

    let toSearch =
      after.content +
      after.embeds.map((embed) => JSON.stringify(embed)).join(" ");
    if (
      messageListener.tokenRegex.test(toSearch) &&
      process.env.GITHUB_TOKENS_TOKEN
    )
      await messageListener.tokenReset(after, toSearch);

    if (!guild) return;

    if (guild.starboardMessages?.has(after.id) && guild.starboard) {
      const currentStarboardMsg = await guild.starboard.messages
        .fetch(after.id)
        .catch(() => {});
      if (currentStarboardMsg) {
        const [updatedContent, updatedEmbed] = after.getStarboardMessage(
          guild.settings.get("starboard.emoji", "⭐").trim(),
          guild.starboardReactions.get(after.id) ||
            guild.settings.get("starboard.minimum", 5)
        );
        if (
          currentStarboardMsg.content != updatedContent ||
          !currentStarboardMsg.embeds[0]?.equals(updatedEmbed)
        )
          await currentStarboardMsg
            .edit({
              content: updatedContent,
              embeds: [updatedEmbed],
            })
            .catch(() => {});
      }
    }

    if (!after.member || after.author.bot) return;

    const autoroleId = guild.settings.get<Snowflake>("mod.autorole", null);
    const delay = guild.settings.get<boolean>("mod.autorole.waitformsg", false);
    if (autoroleId && delay && after.type == "DEFAULT") {
      const role = guild.roles.cache.get(autoroleId);
      if (role && !after.member.roles.cache.has(role.id))
        await after.member.roles
          .add(role, after.member.guild.language.get("AUTOROLE_REASON"))
          .catch(() => {});
    }

    const filters = this.client.getModule("filters") as Filters;
    await filters?.runAll(after, messageListener.cleanContent(after));

    if (before.content.trim() == after.content.trim()) return;

    if (
      guild?.settings.has("log.action") &&
      !before.partial &&
      before.content &&
      after.content &&
      // if it's too long to show any changes
      // (since it is sliced to prevent huge embeds),
      // don't bother logging the edit
      before.content.slice(0, 1001) + "..." !=
        after.content.slice(0, 1001) + "..." &&
      !guild.logIgnored.includes(after.channel.id)
    ) {
      const embed = new MessageEmbed()
        .setColor(after.member.displayColor ?? "#FFFFFF")
        .setTimestamp(after.editedAt)
        .setAuthor({
          name: after.author.toString(),
          iconURL: after.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          url: after.url,
        })
        .setDescription(
          guild.language.get("MSGEDITLOG_DESCRIPTION", {
            author: after.author.toMention(),
            channel: after.channel.toString(),
          })
        )
        .addField(
          guild.language.get("BEFORE"),
          before.content.length <= 1000
            ? before.content
            : before.content.slice(0, 1001) + "..."
        )
        .addField(
          guild.language.get("AFTER"),
          after.content.length <= 1000
            ? after.content
            : after.content.slice(0, 1001) + "..."
        )
        .setFooter(`${after.author.id} | ${after.id} | ${after.channel.id}`);
      await guild.actionLog(embed, ActionLogTypes.MESSAGE_EDIT);
    }
  }
}
