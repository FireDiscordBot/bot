import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "../../../lib/util/paginators";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed } from "discord.js";
import { Track } from "@aero/ksoft";

export default class Lyrics extends Command {
  constructor() {
    super("lyrics", {
      description: (language: Language) =>
        language.get("LYRICS_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "ADD_REACTIONS"],
      restrictTo: "all",
      args: [
        {
          id: "song",
          type: "string",
          match: "rest",
          default: null,
          required: true,
        },
      ],
    });
  }

  async exec(message: FireMessage, args: { song: string }) {
    if (!args.song) {
      if (
        message.member?.presence?.activities &&
        message.member.presence.activities.filter(
          (activity) =>
            activity.name == "Spotify" &&
            !activity.applicationID &&
            activity.type == "LISTENING"
        )
      ) {
        const activity = message.member.presence.activities.find(
          (activity) => activity.name == "Spotify"
        );
        args.song = `${activity.state} ${activity.details}`;
      } else return await message.error("LYRICS_NO_QUERY");
    }
    let lyrics: Track;
    try {
      lyrics = await this.client.ksoft.lyrics.get(args.song, {
        textOnly: false,
      });
    } catch (e) {
      return await message.error("LYRICS_NOT_FOUND", e);
    }
    if (!lyrics.id || !lyrics.lyrics)
      return await message.error("LYRICS_NOT_FOUND");
    const paginator = new WrappedPaginator("", "", 1000);
    lyrics.lyrics.split("\n").forEach((line) => paginator.addLine(line));
    const embed = new MessageEmbed()
      .setColor(message?.member.displayColor || "#ffffff")
      .setTitle(
        message.language.get("LYRICS_TITLE", lyrics.name, lyrics.artist.name)
      );
    const footer = {
      text: message.language.get("POWERED_BY_KSOFT") as string,
      iconURL: "https://cdn.ksoft.si/images/Logo1024.png",
    };
    const paginatorInterface = new PaginatorEmbedInterface(
      message.client,
      paginator,
      { owner: message.author, embed, footer }
    );
    return await paginatorInterface.send(message.channel);
  }
}
