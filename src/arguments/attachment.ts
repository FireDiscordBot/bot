import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { CommandInteraction } from "@fire/lib/extensions/commandinteraction";
import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { MessageAttachment } from "discord.js";

const imageConverter = (
  message: FireMessage | ApplicationCommandMessage,
  phrase: string
) => {
  if (message instanceof ApplicationCommandMessage) {
    const predicate = (_: unknown, key: string) => key == phrase;
    const resolved = (message.slashCommand as CommandInteraction).options
      .resolved;
    return resolved.attachments.find(predicate);
  } else return message.attachments.first();
};

export const attachmentTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): MessageAttachment | undefined => imageConverter(message, phrase);
