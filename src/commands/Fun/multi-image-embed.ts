import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { GuildTextChannel } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  HexColorString,
  MessageAttachment,
  MessageEmbed,
  Permissions,
  ThreadChannel,
  Webhook,
  WebhookClient,
} from "discord.js";
import * as tinycolor from "tinycolor2";

const firstEmbedArguments = [
  "image-one",
  "image-two",
  "image-three",
  "image-four",
];
const secondEmbedArguments = [
  "image-five",
  "image-six",
  "image-seven",
  "image-eight",
];

const maybeColor = (phrase: string) =>
  phrase
    ? typeof tinycolor(phrase)?.isValid == "function" &&
      tinycolor(phrase).isValid()
      ? tinycolor(phrase)
      : undefined
    : tinycolor.random();

export default class MultiImageEmbed extends Command {
  constructor() {
    super("multi-image-embed", {
      description: (language: Language) =>
        language.get("MULTIIMGEMBED_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_WEBHOOKS],
      userPermissions: [Permissions.FLAGS.ATTACH_FILES],
      args: [
        {
          id: "image-one",
          slashCommandType: "image-one",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGEONE_DESCRIPTION"),
          default: null,
          required: true,
        },
        {
          id: "image-two",
          slashCommandType: "image-two",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGETWO_DESCRIPTION"),
          default: null,
          required: true,
        },
        {
          id: "image-three",
          slashCommandType: "image-three",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGETHREE_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "image-four",
          slashCommandType: "image-four",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGEFOUR_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "image-five",
          slashCommandType: "image-five",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGEFIVE_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "image-six",
          slashCommandType: "image-six",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGESIX_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "image-seven",
          slashCommandType: "image-seven",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGESEVEN_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "image-eight",
          slashCommandType: "image-eight",
          type: "image",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_IMAGEEIGHT_DESCRIPTION"),
          default: null,
          required: false,
        },
        {
          id: "color",
          type: "string",
          description: (language: Language) =>
            language.get("MULTIIMGEMBED_ARGUMENTS_COLOR_DESCRIPTION"),
        },
      ],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: {
      "image-one": MessageAttachment;
      "image-two": MessageAttachment;
      "image-three": MessageAttachment;
      "image-four": MessageAttachment;
      "image-five": MessageAttachment;
      "image-six": MessageAttachment;
      "image-seven": MessageAttachment;
      "image-eight": MessageAttachment;
      color: string;
    }
  ) {
    let color: string | tinycolor.Instance =
      command.member?.displayHexColor ?? tinycolor.random();
    if (args.color) color = maybeColor(args.color);
    if (typeof color != "string") color = color.toHexString();

    const makeEmbed = (attch: MessageAttachment, first: boolean) =>
      new MessageEmbed()
        .setColor(color as HexColorString)
        .setURL(
          first
            ? command.url
            : command.url + "?randomquerystring=toseparatetheembeds"
        )
        .setImage(attch.url);

    const channel =
      command.channel.real instanceof ThreadChannel
        ? command.channel.real.parent
        : (command.channel.real as GuildTextChannel);

    const embeds: MessageEmbed[] = [];
    for (const arg of firstEmbedArguments)
      if (args[arg]) embeds.push(makeEmbed(args[arg], true));
    for (const arg of secondEmbedArguments)
      if (args[arg]) embeds.push(makeEmbed(args[arg], false));

    let webhook: Webhook | WebhookClient;
    if (command.guild?.quoteHooks?.has(channel.id))
      webhook = command.guild.quoteHooks.get(channel.id);
    else {
      const hooks =
        typeof channel.fetchWebhooks == "function"
          ? await channel.fetchWebhooks().catch(() => {})
          : null;
      if (hooks && !webhook)
        webhook = hooks
          ?.filter((hook) => !!hook.token && hook.channelId == channel.id)
          ?.first();
      if (!webhook && typeof channel.createWebhook == "function") {
        webhook = await channel
          .createWebhook(
            `Fire Quotes #${channel.name ? channel.name : channel.id}`,
            {
              avatar: this.client.user.displayAvatarURL({
                size: 2048,
                format: "png",
              }),
              reason: command.guild.language.get(
                "QUOTE_WEBHOOK_CREATE_REASON"
              ) as string,
            }
          )
          .catch(() => null);
      }
    }
    if (!webhook) return await command.error("MULTIIMGEMBED_WEBHOOK_FAILED");

    return await webhook
      .send({
        embeds,
        username:
          command.member && command.member.nickname
            ? `${command.member.nickname} (${command.author
                .toString()
                .replace(/#0000/gim, "")})`
            : command.author.toString().replace(/#0000/gim, ""),
        avatarURL: (command.member ?? command.author).displayAvatarURL({
          size: 2048,
          format: "png",
        }),
      })
      .then(() => command.success("MULTIIMGEMBED_SENT_SUCCESSFULLY"))
      .catch(() => command.error("MULTIIMGEMBED_SEND_ERROR"));
  }
}
