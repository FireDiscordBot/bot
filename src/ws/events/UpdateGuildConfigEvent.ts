import { Manager } from "@fire/lib/Manager";
import {
  GuildOrUserConfig,
  SettingsValueTypes,
} from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class UpdateGuildConfig extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.UPDATE_GUILD_CONFIG);
  }

  async run(
    data:
      | { id: Snowflake; config: GuildOrUserConfig }
      | { id: Snowflake; key: string; value?: SettingsValueTypes }
  ) {
    if ("config" in data) {
      this.console.log(
        `Refreshing config for ${
          this.manager.client.guilds.cache.get(data.id)?.name ?? "Unknown"
        } (${data.id})`
      );
      this.manager.state.guildConfigs[data.id] = data.config;
    } else if ("key" in data && data.id in this.manager.state.guildConfigs) {
      const current = this.manager.state.guildConfigs[data.id];
      if ("value" in data && current[data.key] !== data.value) {
        this.console.log(
          `Updating config for ${
            this.manager.client.guilds.cache.get(data.id)?.name ?? "Unknown"
          } (${data.id}) with key "${data.key}".`
        );
        current[data.key] = data.value;
      } else if (
        data.key in this.manager.state.guildConfigs[data.id] &&
        !("value" in data)
      ) {
        this.console.log(
          `Removing key "${data.key}" from config for ${
            this.manager.client.guilds.cache.get(data.id)?.name ?? "Unknown"
          } (${data.id}).`
        );
        delete this.manager.state.guildConfigs[data.id][data.key];
      }
    } else if ("key" in data && !(data.id in this.manager.state.guildConfigs))
      if ("value" in data) {
        this.console.log(
          `Adding new config for ${
            this.manager.client.guilds.cache.get(data.id)?.name ?? "Unknown"
          } (${data.id}) with key "${data.key}".`
        );
        this.manager.state.guildConfigs[data.id] = { [data.key]: data.value };
      }
  }
}
