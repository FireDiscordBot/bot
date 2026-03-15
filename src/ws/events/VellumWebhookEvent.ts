import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { WebhookPayload } from "@vellum-flags/sdk-node";

type VellumProject = "bot" | "commands" | "user" | "guild" | "quotes";

export default class VellumWebhook extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.VELLUM_WEBHOOK);
  }

  async run(data: WebhookPayload & { scope?: VellumProject }) {
    this.console.log("Received request from Vellum to update data...");
    this.manager.client.vellum.getProject(data.scope).handleWebhook(data);
  }
}
