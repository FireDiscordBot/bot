import { FireMessage } from "@fire/lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { Command } from "@fire/lib/util/command";

export const commandTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Command | null =>
  typeof phrase == "string" && phrase
    ? message.client.getCommand(phrase)
    : undefined;
