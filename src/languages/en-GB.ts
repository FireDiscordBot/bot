import { Language } from "../../lib/util/language";

// This is a special language.
// It copies en-US (except for a select few strings) but
// will modify dates when using Date#toLocaleString
export default class enGB extends Language {
  constructor() {
    super("en-GB", {
      language: {},
      enabled: true,
    });
    setTimeout(() => {
      this.language = { ...this.client.getLanguage("en-US").language };
      this.language.LANGUAGE_COMMAND_HELLO = (type: "guild" | "user") =>
        type == "user"
          ? "Hello! You have successfully set Fire's language to English (GB) :D"
          : "Hello! You have successfully set Fire's language in this guild to English (GB). Want to set it just for you? Run the command in DMs";
      this.language.COLOR_COMMAND_DESCRIPTION =
        "Get information about a colour";
      this.language.COLOR_ARGUMENT_INVALID = (random: string) =>
        `That does not seem to be a valid colour, maybe try ${random}`;
      this.language.COLOR_HEADING = (color: string) =>
        `Information about the colour **${color}**`;
    }, 500);
  }
}
