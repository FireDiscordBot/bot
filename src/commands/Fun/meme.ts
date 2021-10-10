import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { MessageEmbed, Permissions } from "discord.js";
import { constants } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { RedditImage } from "@aero/ksoft";

const { imageExts } = constants;

export default class Meme extends Command {
  constructor() {
    super("meme", {
      description: (language: Language) =>
        language.get("MEME_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
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
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      subreddit?: string;
      span: "hour" | "day" | "week" | "month" | "year" | "all";
    }
  ) {
    if (!this.client.ksoft) return await command.error("ERROR_NO_KSOFT");
    let meme: RedditImage;
    try {
      if (args.subreddit)
        meme = await this.client.ksoft.images.reddit(
          args.subreddit.replace("r/", ""),
          {
            removeNSFW: !command.channel.nsfw,
            span: args.span,
          }
        );
      else meme = await this.client.ksoft.images.meme();
    } catch (e) {
      return await command.error("MEME_NOT_FOUND");
    }
    if (!meme.url || !meme.post) return await command.error("MEME_NOT_FOUND");
    if (meme.tag.nsfw && !command.channel.nsfw)
      return await command.error("MEME_NSFW_FORBIDDEN");
    const language = command.language;
    const embed = new MessageEmbed()
      .setTitle(language.get("MEME_EMBED_TITLE"))
      .setColor(command.member?.displayColor ?? "#FFFFFF")
      .setURL(meme.post.link)
      .setTimestamp()
      .setAuthor(
        language.get("MEME_EMBED_AUTHOR", { user: command.author.toString() }),
        command.author.displayAvatarURL({
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
        command.language.get("STATS"),
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
    return await command.channel.send({ embeds: [embed] });
  }
}
