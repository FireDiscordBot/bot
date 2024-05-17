import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord.js";

type Primitive = string | boolean | number | null;

export default class SettingsSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SETTINGS_SYNC);
  }

  async run(data: {
    user: Snowflake;
    setting: string;
    value: Primitive | Primitive[];
  }) {
    if (data.value != "deleteSetting")
      this.manager.client.userSettings.set(data.user, data.setting, data.value);
    else this.manager.client.userSettings.delete(data.user, data.setting);
  }
}
