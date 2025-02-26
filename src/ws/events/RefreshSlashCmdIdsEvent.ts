import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";

export default class RefreshSlashCmdIds extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REFRESH_SLASH_COMMAND_IDS);
  }

  async run(data: {
    commands: {
      id: string;
      slashId: Snowflake;
      slashIds: Record<Snowflake, Snowflake>;
    }[];
  }) {
    for (const cmd of data.commands) {
      const command = this.manager.client.getCommand(cmd.id);
      if (command) {
        command.slashId = cmd.slashId;
        command.slashIds = cmd.slashIds;
      }
    }
    this.manager
      .getLogger("Commands")
      .log(`Refreshed slash command IDs for ${data.commands.length} commands`);
  }
}
