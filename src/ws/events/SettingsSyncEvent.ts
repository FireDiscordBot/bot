import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class SettingsSyncEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SETTINGS_SYNC);
  }

  run(data: { user: string; setting: string; value: any }) {
    if (data.value != "deleteSetting")
      this.manager.client.userSettings.set(data.user, data.setting, data.value);
    else this.manager.client.userSettings.delete(data.user, data.setting);
  }
}
