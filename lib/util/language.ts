import { AkairoHandler, AkairoModule } from "discord-akairo";
import { Fire } from "../Fire";

export class Language extends AkairoModule {
  language: any;
  enabled: boolean;
  client: Fire;
  constructor(
    id: string,
    options = {
      language: {},
      enabled: true,
    }
  ) {
    super(id, {});

    const { language, enabled } = options;
    this.language = language;
    this.enabled = enabled;
  }

  has(key: string) {
    return this.language.hasOwnProperty(key);
  }

  get(key: string, ...args: any[]): string | object {
    const defaultLang =
      this.id == "en-US"
        ? this
        : (this.client.languages.modules.get("en-US") as Language);
    const message = this.has(key)
      ? this.language[key]
      : defaultLang.has(key)
      ? defaultLang.get(key, args)
      : defaultLang.get("DEFAULT", key);
    if (typeof message === "function") {
      return message(...args);
    } else return message;
  }
}

export class LanguageHandler extends AkairoHandler {
  constructor(
    client: Fire,
    {
      directory = "./src/languages",
      classToHandle = Language,
      extensions = [".js", ".ts"],
      automateCategories = false,
      loadFilter = () => true,
    }
  ) {
    super(client, {
      directory,
      classToHandle,
      extensions,
      automateCategories,
      loadFilter,
    });
  }
}
