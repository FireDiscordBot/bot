import { Language } from "@fire/lib/util/language";
import * as language from "@fire/i18n/en-GB.json";

// Language#get falls back to en-US if the selected language
// does not have a certain string, so only strings that are different
// need to be added here (mostly small things like "color" vs "colour")

export default class enGB extends Language {
  constructor() {
    super("en-GB", {
      language: language,
      enabled: true,
    });
  }
}
