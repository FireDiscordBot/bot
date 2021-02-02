import { MessageEmbed, TextChannel, NewsChannel } from "discord.js";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

export default class Embed extends Command {
  constructor() {
    super("embed", {
      description: (language: Language) =>
        language.get("EMBED_COMMAND_DESCRIPTION"),
      enableSlashCommand: true,
      args: [
        {
          id: "haste",
          type: "haste",
          required: true,
          default: null,
        },
        {
          id: "channel",
          type: "textChannel",
          default: undefined,
          required: false,
        },
      ],
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: { haste?: string; channel?: TextChannel | NewsChannel }
  ) {
    if (!args.haste) return;
    if (typeof args.channel == "undefined")
      args.channel = message.channel as TextChannel;
    else if (!args.channel) return;

    let embeds: object | object[], content: string;
    try {
      const data: {
        content?: string;
        embed?: object;
        embeds?: object[];
      } = JSON.parse(args.haste);
      if (data?.embed) embeds = data.embed;
      else if (data?.embeds) embeds = data.embeds;
      if (data?.content) content = data.content;
    } catch {
      return await message.error("EMBED_OBJECT_INVALID");
    }

    if (!embeds && !content) return await message.error("EMBED_OBJECT_INVALID");

    if (embeds instanceof Array) {
      let sentContent = false;
      for (const embed of embeds) {
        const instance = new MessageEmbed(embed);
        if (this.isEmpty(instance)) continue;
        content && !sentContent
          ? await args.channel.send(content, instance)
          : await args.channel.send(instance);
        if (!sentContent) sentContent = true;
      }
      return await message.success();
    } else if (typeof embeds == "object") {
      const instance = new MessageEmbed(embeds);
      if (this.isEmpty(instance))
        return await message.error("EMBED_OBJECT_INVALID");
      content
        ? await args.channel.send(content, instance)
        : await args.channel.send(instance);
      return await message.success();
    } else return await message.error("EMBED_OBJECT_INVALID");
  }

  private isEmpty(embed: MessageEmbed) {
    return (
      !embed.title &&
      !embed.description &&
      !embed.url &&
      !embed.timestamp &&
      !embed.footer?.text &&
      !embed.footer?.iconURL &&
      !embed.image?.url &&
      !embed.thumbnail?.url &&
      !embed.author?.name &&
      !embed.author?.url &&
      !embed.fields?.length
    );
  }
}
