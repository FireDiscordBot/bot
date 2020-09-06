import { AkairoHandler, AkairoModule } from "discord-akairo";
import { type } from "os";
import { Fire } from "../Fire";

export class Language extends AkairoModule {
  language: any;
  enabled: boolean;
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

  get(key: string, ...args: any[]): string {
    const message = this.language.hasOwnProperty(key)
      ? this.language[key]
      : this.language?.DEFAULT(key);
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
