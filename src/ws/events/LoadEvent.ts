import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";

export default class Load extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.LOAD_MODULE);
  }

  async run(data: {
    name: string;
    type: "Command" | "Language" | "Listener" | "Module";
    action: "reload" | "unload";
  }) {
    this.console.log(
      `Received request to ${data.action} the ${data.type.toLowerCase()}, ${
        data.name
      }`
    );
    switch (data.type) {
      case "Command": {
        data.action == "reload"
          ? this.manager.client.commandHandler.reload(data.name)
          : this.manager.client.commandHandler.remove(data.name);
        break;
      }
      case "Language": {
        data.action == "reload"
          ? this.manager.client.languages.reload(data.name)
          : this.manager.client.languages.remove(data.name);
        break;
      }
      case "Listener": {
        data.action == "reload"
          ? this.manager.client.listenerHandler.reload(data.name)
          : this.manager.client.listenerHandler.remove(data.name);
        break;
      }
      case "Module": {
        data.action == "reload"
          ? this.manager.client.modules.reload(data.name)
          : this.manager.client.modules.remove(data.name);
        break;
      }
    }
  }
}
