import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";

export default class RequestCommandsEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REQUEST_COMMANDS);
  }

  async run() {
    this.manager.client.console.log(
      `[Event] Received request to sync commands.`
    );
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(EventType.REQUEST_COMMANDS, {
          id: this.manager.id,
          commands: getCommands(this.manager.client),
          allCommands: getAllCommands(this.manager.client),
        })
      )
    );
  }
}
