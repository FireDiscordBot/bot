import { EventType } from "../../../lib/ws/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";

export default class SettingsSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SETTINGS_SYNC);
  }

  run(data: { user: string; setting: string; value: any }) {
    this.manager.client.console.log(
      `[Event] Received settings sync request for ${
        this.manager.client.users.cache.get(data.user) || data.user
      }.`
    );
    if (data.value != "deleteSetting")
      this.manager.client.userSettings.set(data.user, data.setting, data.value);
    else this.manager.client.userSettings.delete(data.user, data.setting);
  }
}
