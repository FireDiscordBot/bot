import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, Permissions } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Track } from "@aero/ksoft";

export default class Lyrics extends Command {
  constructor() {
    super("lyrics", {
      description: (language: Language) =>
        language.get("LYRICS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      restrictTo: "all",
      args: [
        {
          id: "song",
          // type: Argument.union("memberSilent", "string"),
          // readableType: "member|string",
          // slashCommandType: "query",
          type: "string",
          match: "rest",
          default: null,
          required: false,
        },
      ],
      enableSlashCommand: true,
    });
  }

  async getSpotify(member: FireMember) {
    if (
      member.presence?.clientStatus == null &&
      member.presence?.status == "offline"
    )
      member = (await member.guild.members
        .fetch({
          user: member,
          withPresences: true,
        })
        .catch(() => {})) as FireMember;
    if (!member) return null;
    if (
      member.presence?.activities &&
      member.presence.activities.filter(
        (activity) =>
          activity.name == "Spotify" &&
          !activity.applicationID &&
          activity.type == "LISTENING"
      ).length
    ) {
      const activity = member.presence.activities.find(
        (activity) => activity.name == "Spotify"
      );
      return `${activity.state.replace(/;/gim, ",")} ${activity.details}`;
    } else return null;
  }

  async exec(message: FireMessage, args: { song: FireMember | string }) {
    // async exec(message: FireMessage, args: { song: string }) {
    if (!args.song && message.member) {
      args.song = await this.getSpotify(message.member);
    } else if (args.song instanceof FireMember)
      args.song = await this.getSpotify(args.song);
    else if (!args.song) return await message.error("LYRICS_NO_QUERY");
    if (!args.song) return await message.error("LYRICS_NO_QUERY");
    // const song = args.song;
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
      .setColor(message.member?.displayHexColor || "#ffffff")
      .setTitle(
        message.language.get("LYRICS_TITLE", lyrics.name, lyrics.artist.name)
      );
    const footer = {
      text: message.language.get("POWERED_BY_KSOFT"),
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
