import { EventType } from "../../../lib/ws/util/constants";
import { Reminder } from "../../../lib/interfaces/reminders";
import { FireUser } from "../../../lib/extensions/user";
import { humanize } from "../../../lib/util/constants";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";
import * as moment from "moment";

export default class ReminderSendEvent extends Event {
  sent: string[];

  constructor(manager: Manager) {
    super(manager, EventType.REMINDER_SEND);
    this.sent = [];
  }

  async run(data: Reminder) {
    if (this.sent.includes(`${data.user}-${data.timestamp}`)) return;
    const user = (await this.manager.client.users
      .fetch(data.user, false)
      .catch(() => {})) as FireUser;
    this.manager.client.console.log(
      `[Aether] Got request to send reminder to ${user} (${data.user})`
    );
    if (!user) return; // how?
    const date = new Date(data.legacy ? data.timestamp * 1000 : data.timestamp);

    const now = moment();
    const duration = moment(date).diff(now);

    const message = await user
      .send(
        data.link
          ? user.language.get(
              "REMINDER_MESSAGE",
              data.text,
              humanize(duration, user.language.id.split("-")[0]),
              data.link
            )
          : user.language.get(
              "REMINDER_MESSAGE",
              data.text,
              humanize(duration, user.language.id.split("-")[0])
            )
      )
      .catch(() => {});
    if (message) this.sent.push(`${data.user}-${data.timestamp}`);
  }
}
