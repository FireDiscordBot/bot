import { FireUser } from "@fire/lib/extensions/user";
import { Manager } from "@fire/lib/Manager";
import { LanguageKeys } from "@fire/lib/util/language";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";
import {
  BaseMessageComponentOptions,
  MessageActionRowOptions,
} from "discord.js";
import { TOptions } from "i18next";

export default class ForwardMessageUser extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.FORWARD_MESSAGE_USER);
  }

  async run(data: {
    user: Snowflake;
    message: LanguageKeys | string;
    args?: TOptions;
    components?: (Required<BaseMessageComponentOptions> &
      MessageActionRowOptions)[];
  }) {
    const user = (await this.manager.client.users
      .fetch(data.user)
      .catch(() => {})) as FireUser;
    if (!user) return;

    const components = data.components;

    const language = user.language;
    const defaultLang = this.manager.client.getLanguage("en-US");
    for (const row of components)
      for (const component of row.components)
        if (
          "label" in component &&
          (language.has(component.label) || defaultLang.has(component.label))
        )
          component.label = language.get(
            component.label as LanguageKeys,
            data.args
          ) as string;
    if (language.has(data.message) || defaultLang.has(data.message)) {
      const message = language.get(data.message as LanguageKeys, data.args);
      if (typeof message == "string")
        return await user
          .send({ content: message, components })
          .catch(() => {});
      else
        return await user
          .send({ content: data.message, components })
          .catch(() => {});
    } else
      return await user
        .send({ content: data.message, components })
        .catch(() => {});
  }
}
