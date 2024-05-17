import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed, NewsChannel } from "discord.js";

export default class Embed extends Command {
  constructor() {
    super("embed", {
      description: (language: Language) =>
        language.get("EMBED_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.EmbedLinks],
      userPermissions: [PermissionFlagsBits.EmbedLinks],
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
      !message.member
        ?.permissionsIn(args.channel)
        .has(PermissionFlagsBits.ManageMessages)
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
      const instances = embeds
        .map((e) => new MessageEmbed(e))
        .filter((e) => !this.client.util.isEmbedEmpty(e))
        .slice(0, 10);
      return await args.channel.send({ content, embeds: instances });
    } else if (typeof embeds == "object") {
      const instance = new MessageEmbed(embeds);
      if (this.client.util.isEmbedEmpty(instance))
        return await message.error("EMBED_OBJECT_INVALID");
      return content
        ? await args.channel.send({ content, embeds: [instance] })
        : await args.channel.send({ embeds: [instance] });
    } else return await message.error("EMBED_OBJECT_INVALID");
  }
}
