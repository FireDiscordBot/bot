import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { ArgumentTypeCaster } from "discord-akairo";

export const commandTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Command | null =>
  typeof phrase == "string" && phrase
    ? message.client.getCommand(phrase)
    : undefined;
