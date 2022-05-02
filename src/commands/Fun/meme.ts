import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { MessageEmbed } from "discord.js";
import { RedditPost } from "@fire/lib/interfaces/reddit";
import { getRandomPost, getRandomPostLanguage } from "@fire/lib/util/reddit";

export default class Meme extends Command {
  constructor() {
    super("meme", {
      description: (language: Language) =>
        language.get("MEME_COMMAND_DESCRIPTION"),
      restrictTo: "all",
      args: [
        {
          id: "subreddit",
          type: "string",
          default: null,
          required: false,
        },
        {
          id: "language",
          type: "string",
          default: "en",
          required: false,
        },
      ],
      enableSlashCommand: true,
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      subreddit?: string;
      language?: "en" | "es" | "de" | "fr" | "it" | "ru" | "tr" | "br" | "it";
    }
  ) {
    let meme: RedditPost;
    try {
      if (args.language) {
        meme = await getRandomPostLanguage(args.language);
      } else if (args.subreddit) {
        meme = await getRandomPost(args.subreddit);
      } else {
        meme = await getRandomPost();
      }
    } catch (e) {
      return await command.error("MEME_NOT_FOUND");
    }
    if (meme.nsfw && !command.channel.nsfw)
      return await command.error("MEME_NSFW_FORBIDDEN");
    const language = command.language;
    const embed = new MessageEmbed()
      .setTitle(language.get("MEME_EMBED_TITLE"))
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setURL(meme.url)
      .setTimestamp()
      .setAuthor({
        name: language.get("MEME_EMBED_AUTHOR", {
          user: command.author.toString(),
        }),
        iconURL: command.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setFooter(
        "Made with ❤️ by open source contributors. Powered by Reddit API."
      )
      .addField(language.get("TITLE"), meme.title)
      .addField(
        language.get("MEME_SUBREDDIT"),
        `[${meme.subreddit}](https://reddit.com/r/${meme.subreddit})`
      )
      .addField(
        command.language.get("STATS"),
        `<:upvote:646857470345478184> ${meme.ups.toLocaleString(
          language.id
        )} | <:downvote:646857487353380867> ${meme.downs.toLocaleString(
          language.id
        )}`
      );
    if (meme.image) embed.setImage(meme.image);
    else
      embed.addField(language.get("ATTACHMENT"), `[Click Here](${meme.url})`);
    return await command.channel.send({ embeds: [embed] });
  }
}
