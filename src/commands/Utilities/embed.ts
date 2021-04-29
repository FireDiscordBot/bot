import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { MessageEmbed, NewsChannel } from "discord.js";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Embed extends Command {
  constructor() {
    super("embed", {
      description: (language: Language) =>
        language.get("EMBED_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS"],
      userPermissions: ["EMBED_LINKS"],
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
          type: "textChannelSilent",
          default: undefined,
          required: false,
        },
      ],
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: { haste?: string; channel?: FireTextChannel | NewsChannel }
  ) {
    if (!args.haste) return;
    if (
      args.channel &&
      !message.member?.permissionsIn(args.channel).has("MANAGE_MESSAGES")
    )
      return await message.error("EMBED_MISSING_PERMISSIONS");
    if (typeof args.channel == "undefined")
      args.channel = message.channel as FireTextChannel;
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
      return content
        ? await args.channel.send(content, instance)
        : await args.channel.send(instance);
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
