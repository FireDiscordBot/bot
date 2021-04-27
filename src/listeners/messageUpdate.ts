import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import Filters from "@fire/src/modules/filters";
import Sk1er from "@fire/src/modules/sk1er";
import { MessageEmbed } from "discord.js";
import Message from "./message";

export default class MessageUpdate extends Listener {
  constructor() {
    super("messageUpdate", {
      emitter: "client",
      event: "messageUpdate",
    });
  }

  async exec(before: FireMessage, after: FireMessage) {
    if (this.client.manager.id != 0 && !after.guild) return;
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    await sk1erModule?.checkBotStatus(after).catch(() => {});

    // Ensures people get dehoisted/decancered even if
    // Fire missed them joining/changing name
    if (after.member) {
      // This will check permissions & whether
      // dehoist/decancer is enabled so no need for checks here
      after.member.dehoistAndDecancer();
    }

    await after.runFilters().catch(() => {});

    const messageListener = this.client.getListener("message") as Message;

    let toSearch =
      after.content +
      after.embeds.map((embed) => JSON.stringify(embed)).join(" ");
    if (
      messageListener.tokenRegex.test(toSearch) &&
      process.env.GITHUB_TOKENS_TOKEN
    )
      await messageListener.tokenGist(after, toSearch);

    if (!after.member || after.author.bot) return;

    const autoroleId = after.guild.settings.get("mod.autorole", null);
    const delay = after.guild.settings.get("mod.autorole.waitformsg", false);
    if (autoroleId && delay && after.type == "DEFAULT") {
      const role = after.guild.roles.cache.get(autoroleId);
      if (role && !after.member.roles.cache.has(role.id))
        await after.member.roles
          .add(
            role,
            after.member.guild.language.get("AUTOROLE_REASON") as string
          )
          .catch(() => {});
    }

    const filters = this.client.getModule("filters") as Filters;
    await filters?.runAll(after, messageListener.cleanContent(after));

    if (before.content.trim() == after.content.trim()) return;

    if (
      after.guild?.settings.has("log.action") &&
      !before.partial &&
      before.content &&
      after.content &&
      // if it's too long to show any changes
      // (since it is sliced to prevent huge embeds),
      // don't bother logging the edit
      before.content.slice(0, 501) + "..." !=
        after.content.slice(0, 501) + "..." &&
      !after.guild.logIgnored.includes(after.channel.id)
    ) {
      const embed = new MessageEmbed()
        .setColor(after.member.displayHexColor || "#ffffff")
        .setTimestamp(after.editedAt)
        .setAuthor(
          after.author.toString(),
          after.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
          after.url
        )
        .setDescription(
          after.guild.language.get(
            "MSGEDITLOG_DESCRIPTION",
            after.author.toMention(),
            after.channel.toString()
          )
        )
        .addField(
          after.guild.language.get("BEFORE"),
          before.content.length <= 500
            ? before.content
            : before.content.slice(0, 501) + "..."
        )
        .addField(
          after.guild.language.get("AFTER"),
          after.content.length <= 500
            ? after.content
            : after.content.slice(0, 501) + "..."
        )
        .setFooter(`${after.author.id} | ${after.id} | ${after.channel.id}`);
      await after.guild.actionLog(embed, "message_edit");
    }
  }
}
