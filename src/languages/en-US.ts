import * as language from "@fire/i18n/en-US.json";
import { Language } from "@fire/lib/util/language";

export default class enUS extends Language {
  readonly name = "English (US)";

  constructor() {
    super("en-US", {
      enabled: true,
      language,
    });
  }
}
