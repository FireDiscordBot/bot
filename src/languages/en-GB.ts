import { Language } from "@fire/lib/util/language";

// Language#get falls back to en-US if the selected language
// does not have a certain string, so only strings that are different
// need to be added here (mostly small things like "color" vs "colour")

export default class enGB extends Language {
  constructor() {
    super("en-GB", {
      language: {},
      enabled: true,
    });
    this.language = {
      LANGUAGE_COMMAND_HELLO: (type: "guild" | "user") =>
        type == "user"
          ? "Hello! You have successfully set Fire's language to English (GB) :D"
          : "Hello! You have successfully set Fire's language in this guild to English (GB). Want to set it just for you? Run the command in DMs",
      COLOR_COMMAND_DESCRIPTION: "Get information about a colour",
      COLOR_ARGUMENT_INVALID: (random: string) =>
        `That does not seem to be a valid colour, maybe try ${random}`,
      COLOR_HEADING: (color: string) =>
        `Information about the colour **${color}**`,
    };
  }
}
