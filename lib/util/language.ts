import * as enUS from "@fire/i18n/en-US.json";
import { Fire } from "@fire/lib/Fire";
import { AkairoHandler, AkairoModule } from "discord-akairo";
import { StringMap, TOptions } from "i18next";

type LanguageOptions = Partial<typeof enUS>;
export type LanguageKeys = keyof typeof enUS;

export class Language extends AkairoModule {
  private language: LanguageOptions;
  declare client: Fire;
  enabled: boolean;

  constructor(
    id: string,
    options: {
      enabled: boolean;
      language?: LanguageOptions;
    } = {
      enabled: true,
    }
  ) {
    super(id, {});

    const { enabled, language } = options;
    this.language = language;
    this.enabled = enabled;
  }

  init() {
    this.client.i18n.addResourceBundle(
      this.id,
      "fire",
      this.language,
      true,
      true
    );
  }

  has(key: string) {
    if (!this.enabled) return this.client.i18n.t(key, { lng: "en-US" }) != key;
    return this.client.i18n.t(key, { lng: this.id }) != key;
  }

  get(key: LanguageKeys, args?: TOptions<StringMap>) {
    if (args && !("interpolation" in args))
      args.interpolation = { escapeValue: false };
    if (!this.enabled) return this.client.i18n.t(key, { ...args });
    else if (!this.has(key))
      return `"${key} has not been localized for any languages yet."`;
    return this.client.i18n.t(key, { ...args, lng: this.id });
  }

  getSuccess(key: LanguageKeys, args?: TOptions<StringMap>) {
    return `${this.client.util.useEmoji("success")} ${this.get(key, args)}`;
  }

  getWarning(key: LanguageKeys, args?: TOptions<StringMap>) {
    return `${this.client.util.useEmoji("warning")} ${this.get(key, args)}`;
  }

  getError(key: LanguageKeys, args?: TOptions<StringMap>) {
    return `${this.client.util.useEmoji("error")} ${this.get(key, args)}`;
  }

  getSlashError(key: LanguageKeys, args?: TOptions<StringMap>) {
    return `${this.client.util.useEmoji("interactionerror")} ${this.get(
      key,
      args
    )}`;
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
