import { Manager } from "@fire/lib/Manager";
import {
  GuildOrUserConfig,
  SettingsValueTypes,
} from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class UpdateUserConfig extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_USER_CONFIG);
  }

  async run(
    data:
      | { id: Snowflake; config: GuildOrUserConfig }
      | { id: Snowflake; key: string; value?: SettingsValueTypes }
  ) {
    if ("config" in data) {
      this.console.log(
        "Refreshing config",
        this.manager.client.users.cache.has(data.id)
          ? `for ${this.manager.client.users.cache.get(data.id)} (${data.id})`
          : `for ${data.id}`
      );
      this.manager.state.userConfigs[data.id] = data.config;
    } else if ("key" in data && data.id in this.manager.state.userConfigs) {
      const current = this.manager.state.userConfigs[data.id];
      if ("value" in data && current[data.key] !== data.value) {
        this.console.log(
          "Updating config",
          this.manager.client.users.cache.has(data.id)
            ? `for ${this.manager.client.users.cache.get(data.id)} (${data.id})`
            : `for ${data.id}`,
          `with key "${data.key}".`
        );
        current[data.key] = data.value;
      } else if (
        data.key in this.manager.state.userConfigs[data.id] &&
        !("value" in data)
      ) {
        this.console.log(
          `Removing key "${data.key}" from config`,
          this.manager.client.users.cache.has(data.id)
            ? `for ${this.manager.client.users.cache.get(data.id)} (${data.id})`
            : `for ${data.id}`
        );
        delete this.manager.state.userConfigs[data.id][data.key];
      }
    } else if ("key" in data && !(data.id in this.manager.state.userConfigs))
      if ("value" in data) {
        this.console.log(
          "Adding new config",
          this.manager.client.users.cache.has(data.id)
            ? `for ${this.manager.client.users.cache.get(data.id)} (${data.id})`
            : `for ${data.id}`,
          `with key "${data.key}".`
        );
        this.manager.state.userConfigs[data.id] = { [data.key]: data.value };
      }
  }
}
