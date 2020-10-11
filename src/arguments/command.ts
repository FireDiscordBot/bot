import { FireMessage } from "../../lib/extensions/message";
import { ArgumentTypeCaster } from "discord-akairo";
import { Command } from "../../lib/util/command";

export const commandTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Command | null => message.client.getCommand(phrase);
