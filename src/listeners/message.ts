import { FireMember } from "../../lib/extensions/guildmember";
import { FireMessage } from "../../lib/extensions/message";
import { Listener } from "../../lib/util/listener";
import { PrefixSupplier } from "discord-akairo";
import Filters from "../modules/filters";
import Sk1er from "../modules/sk1er";
import * as centra from "centra";

export default class Message extends Listener {
  tokenRegex: RegExp;

  constructor() {
    super("message", {
      emitter: "client",
      event: "message",
    });
    this.tokenRegex = /[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}/im;
  }

  async tokenGist(message: FireMessage, foundIn: string) {
    const tokens = this.tokenRegex.exec(foundIn);
    let files: { [key: string]: { content: string } } = {};
    for (const token in tokens)
      files[`token_leak_${Date.now()}`] = {
        // the account the gists get uploaded to is hidden from the public so the content doesn't matter, it just needs the token
        content: `some fuckin loser leaked their token LUL anyways here it is ${token}`,
      };
    const body = {
      description: `Tokens found in ${message.guild} sent by ${message.author}`,
      public: true, // not really since account hidden but sure
      files,
    };
    try {
      const gist = await (
        await centra("https://api.github.com/gists", "POST")
          .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
          .body(body, "json")
          .send()
      ).json();
      await this.client.util.sleep(30000);
      await centra(`https://api.github.com/gists/${gist.id}`, "DELETE")
        .header("Authorization", `token ${process.env.GITHUB_TOKEN}`)
        .send();
    } catch (e) {
      this.client.console.error(
        `[Listener] Failed to create tokens gist\n${e.stack}`
      );
    }
  }

  // A few things are commented out since the normal bot will handle them for now
  // Once deployed, they will be uncommented
  async exec(message: FireMessage) {
    if (this.client.manager.id != 0 && !message.guild) return;
    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    // These won't run if the module isn't loaded
    await sk1erModule?.checkLogs(message).catch(() => {});
    await sk1erModule?.checkBotStatus(message).catch(() => {});

    if (
      message.member &&
      (message.content.includes("@everyone") ||
        message.content.includes("@here")) &&
      message.guild.settings.get("mod.antieveryone", false) &&
      !message.member.hasPermission("MENTION_EVERYONE")
    )
      await message.delete().catch(() => {});

    // let toSearch =
    //   message.content +
    //   message.embeds.map((embed) => JSON.stringify(embed)).join(" ");
    // if (this.tokenRegex.test(toSearch) && process.env.GITHUB_TOKEN)
    //   await this.tokenGist(message, toSearch);

    if (!message.guild) return;

    if (
      message.channel.id == "600070909365059584" &&
      message.embeds[0]?.title.includes("new commit") &&
      !message.flags.has("CROSSPOSTED")
    ) {
      try {
        await message.crosspost();
      } catch {}
    }

    if (!message.member || message.author.bot) return;

    // TODO add --remind when remind command added

    // const excluded: string[] = message.guild.settings.get(
    //   "excluded.filter",
    //   []
    // );
    // const roleIds = message.member.roles.cache.map((role) => role.id);
    // if (
    //   !excluded.includes(message.author.id) &&
    //   !excluded.filter((id) => roleIds.includes(id)).length &&
    //   !excluded.includes(message.channel.id)
    // ) {
    //   const filters = this.client.getModule("filters") as Filters;
    //   await filters?.runAll(message, this.cleanContent(message));
    // }

    if (
      message.content.replace("!", "").trim() ==
      (message.guild.me as FireMember).toMention().replace("!", "").trim()
    )
      await message.send(
        "HELLO_PREFIX",
        (this.client.commandHandler.prefix as PrefixSupplier)(message)
      );
  }

  cleanContent(message: FireMessage) {
    return message.content
      .replace("\u200b", "")
      .replace(" ", "")
      .replace("(.)", ".")
      .replace("dot", ".");
  }
}
