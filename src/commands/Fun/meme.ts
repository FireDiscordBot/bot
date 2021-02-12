import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { MessageEmbed, TextChannel } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { RedditImage } from "@aero/ksoft";

const { imageExts } = constants;

export default class Meme extends Command {
  constructor() {
    super("meme", {
      description: (language: Language) =>
        language.get("MEME_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      restrictTo: "all",
      args: [
        {
          id: "subreddit",
          type: "string",
          default: null,
          required: false,
        },
        {
          id: "span",
          type: ["hour", "day", "week", "month", "year", "all"],
          slashCommandType: "span",
          flag: "--span",
          match: "option",
          default: "month",
        },
      ],
      enableSlashCommand: true,
    });
  }

  async exec(
    message: FireMessage,
    args: {
      subreddit?: string;
      span: "hour" | "day" | "week" | "month" | "year" | "all";
    }
  ) {
    if (!this.client.ksoft) return await message.error("ERROR_NO_KSOFT");
    let meme: RedditImage;
    try {
      if (args.subreddit)
        meme = await this.client.ksoft.images.reddit(
          args.subreddit.replace("r/", ""),
          {
            removeNSFW: !(message.channel as TextChannel).nsfw,
            span: args.span,
          }
        );
      else meme = await this.client.ksoft.images.meme();
    } catch (e) {
      return await message.error("MEME_NOT_FOUND", e);
    }
    if (!meme.url || !meme.post) return await message.error("MEME_NOT_FOUND");
    if (meme.tag.nsfw && !(message.channel as TextChannel).nsfw)
      return await message.error("MEME_NSFW_FORBIDDEN");
    const language = message.language;
    const embed = new MessageEmbed()
      .setTitle(language.get("MEME_EMBED_TITLE"))
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setURL(meme.post.link)
      .setTimestamp()
      .setAuthor(
        language.get("MEME_EMBED_AUTHOR", message.author.toString()),
        message.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        })
      )
      .setFooter(
        language.get("POWERED_BY_KSOFT"),
        "https://cdn.ksoft.si/images/Logo1024.png"
      )
      .addField(language.get("TITLE"), meme.post.title)
      .addField(
        language.get("MEME_SUBREDDIT"),
        `[${meme.post.subreddit}](https://reddit.com/${meme.post.subreddit})`
      )
      .addField(
        message.language.get("STATS"),
        `<:upvote:646857470345478184> ${meme.post.upvotes.toLocaleString(
          language.id
        )} | <:downvote:646857487353380867> ${meme.post.downvotes.toLocaleString(
          language.id
        )}`
      );
    if (meme.url && imageExts.filter((ext) => meme.url.endsWith(ext)).length)
      embed.setImage(meme.url);
    else
      embed.addField(language.get("ATTACHMENT"), `[Click Here](${meme.url})`);
    return await message.channel.send(embed);
  }
}
