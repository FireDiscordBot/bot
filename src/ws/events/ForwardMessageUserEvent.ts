import { FireUser } from "@fire/lib/extensions/user";
import { Manager } from "@fire/lib/Manager";
import { LanguageKeys } from "@fire/lib/util/language";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import {
  BaseMessageComponentOptions,
  MessageActionRowOptions,
  Snowflake,
} from "discord.js";
import { StringMap, TOptions } from "i18next";

export default class ForwardMessageUserEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE_USER);
  }

  async run(data: {
    user: Snowflake;
    message: LanguageKeys | string;
    args: TOptions<StringMap>;
    buttons?: (Required<BaseMessageComponentOptions> &
      MessageActionRowOptions)[];
  }) {
    const user = (await this.manager.client.users
      .fetch(data.user)
      .catch(() => {})) as FireUser;
    if (!user) return;

    const language = user.language;
    const defaultLang = this.manager.client.getLanguage("en-US");
    if (language.has(data.message) || defaultLang.has(data.message)) {
      const message = language.get(data.message as LanguageKeys, data.args);
      if (typeof message == "string")
        return await user
          .send({ content: message, components: data.buttons })
          .catch(() => {});
    } else
      return await user
        .send({ content: data.message, components: data.buttons })
        .catch(() => {});
  }
}
