import { ManagerState } from "@fire/lib/interfaces/aether";
import { getAllCommands, getCommands } from "@fire/lib/util/commandutil";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { getCommitHash } from "@fire/lib/util/gitUtils";
import { EventType } from "@fire/lib/ws/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import GuildCheckEvent from "./GuildCheckEvent";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";

export default class RestartEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.RESTART_CLIENT);
  }

  async run(data: { reason?: string }) {
    this.manager.client.console.log(
      data.reason
        ? `[Aether] Received kill event with reason "${data.reason}", shutting down...`
        : "[Aether] Received kill event, shutting down..."
    );
    this.manager.kill(data.reason ?? "forced_shutdown");
  }
}
