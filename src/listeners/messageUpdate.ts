import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { PrefixSupplier } from "discord-akairo";
import Filters from "../modules/filters";
import Sk1er from "../modules/sk1er";
import Message from "./message";

export default class MessageUpdate extends Listener {
  constructor() {
    super("messageUpdate", {
      emitter: "client",
      event: "messageUpdate",
    });
  }

  // A few things are commented out since the normal bot will handle them for now
  // Once deployed, they will be uncommented
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

    if (
      after.member &&
      (after.content.includes("@everyone") ||
        after.content.includes("@here")) &&
      after.guild.settings.get("mod.antieveryone", false) &&
      !after.member.hasPermission("MENTION_EVERYONE")
    )
      await after.delete().catch(() => {});

    const messageListener = this.client.getListener("message") as Message;

    // let toSearch =
    //   after.content +
    //   after.embeds.map((embed) => JSON.stringify(embed)).join(" ");
    // if (messageListener.tokenRegex.test(toSearch) && process.env.GITHUB_TOKENS_TOKEN)
    //   await messageListener.tokenGist(after, toSearch);

    if (!after.member || after.author.bot) return;

    const autoroleId = after.guild.settings.get("mod.autorole", null);
    const delay = after.guild.settings.get("mod.autorole.waitformsg", false);
    if (autoroleId && delay) {
      const role = after.guild.roles.cache.get(autoroleId);
      if (role && !after.member.roles.cache.has(role.id))
        await after.member.roles.add(role).catch(() => {});
    }

    // TODO add --remind when remind command added

    const filters = this.client.getModule("filters") as Filters;
    await filters?.runAll(after, messageListener.cleanContent(after));

    if (
      after.content.replace(/!/gim, "").trim() ==
      (after.guild.me as FireMember).toMention().replace(/!/gim, "").trim()
    )
      await after.send(
        "HELLO_PREFIX",
        (this.client.commandHandler.prefix as PrefixSupplier)(after)
      );
  }
}
