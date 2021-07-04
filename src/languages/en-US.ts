import { Language } from "@fire/lib/util/language";
import * as language from "@fire/i18n/en-US.json";

export default class enUS extends Language {
  constructor() {
    super("en-US", {
      enabled: true,
      language,
    });
  }
}
