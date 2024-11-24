import { Manager } from "@fire/lib/Manager";
import {
  GuildOrUserConfig,
  SettingsValueTypes,
} from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class UpdateUserConfigEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_USER_CONFIG);
  }

  async run(
    data:
      | { id: Snowflake; config: GuildOrUserConfig }
      | { id: Snowflake; key: string; value?: SettingsValueTypes }
  ) {
    this.manager.client.console.log(
      `[Aether] Received user config update event for user ${
        this.manager.client.users.cache.has(data.id)
          ? `${this.manager.client.users.cache.get(data.id)} (${data.id})`
          : data.id
      }${"key" in data ? ` with key "${data.key}"` : ""}.`
    );
    if ("config" in data) this.manager.state.userConfigs[data.id] = data.config;
    else if ("key" in data && data.id in this.manager.state.userConfigs)
      if ("value" in data)
        this.manager.state.userConfigs[data.id][data.key] = data.value;
      else delete this.manager.state.userConfigs[data.id][data.key];
    else if ("key" in data && !(data.id in this.manager.state.userConfigs))
      if ("value" in data)
        this.manager.state.userConfigs[data.id] = { [data.key]: data.value };
  }
}
