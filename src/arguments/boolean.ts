import { ArgumentTypeCaster } from "discord-akairo";

export const booleanTypeCaster: ArgumentTypeCaster = (message, phrase) => {
  const content = phrase.toLowerCase().trim();
  if (["yes", "y", "true", "t", "1", "enable", "on"].includes(content)) {
    return true;
  } else if (
    ["no", "n", "false", "f", "0", "disable", "off"].includes(content)
  ) {
    return false;
  } else {
    return null;
  }
};
