import { ArgumentTypeCaster, Command } from "discord-akairo";
import { FireMessage } from "../../lib/extensions/message";

export const commandTypeCaster: ArgumentTypeCaster = (
  message: FireMessage,
  phrase
): Command | null => message.client.getCommand(phrase);
