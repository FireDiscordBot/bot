import InteractionCreate from "@fire/src/listeners/INTERACTION_CREATE";
import { SlashCommand } from "@fire/lib/interfaces/slashCommands";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Manager } from "@fire/lib/Manager";

export default class SlashCommandEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SLASH_COMMAND);
  }

  async run(data: SlashCommand) {
    const INTERACTION_CREATE = this.manager.client.getListener(
      "INTERACTION_CREATE"
    ) as InteractionCreate;

    return await INTERACTION_CREATE.exec(data);
  }
}
