import { DeconstructedSnowflake, SnowflakeUtil } from "discord.js";
import { constants, humanize } from "../../../lib/util/constants";
import { Reminder } from "../../../lib/interfaces/reminders";
import { EventType } from "../../../lib/ws/util/constants";
import { FireUser } from "../../../lib/extensions/user";
import { Event } from "../../../lib/ws/event/Event";
import { Manager } from "../../../lib/Manager";
import * as moment from "moment";

const { regexes } = constants;

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
    const snowflake = regexes.discord.message.exec(data.link)?.groups
      ?.message_id;
    let deconstructed: DeconstructedSnowflake;
    if (snowflake) deconstructed = SnowflakeUtil.deconstruct(snowflake);

    // should prevent it from displaying the accurate number of seconds since
    // due to reminders being checked every 5 seconds
    deconstructed?.date?.setSeconds(0);

    const now = moment();
    const duration = moment(deconstructed?.date || now).diff(now);

    const message = await user
      .send(
        data.link
          ? user.language.get(
              "REMINDER_MESSAGE",
              data.text,
              duration != 0
                ? humanize(duration, user.language.id.split("-")[0])
                : user.language.get("REMINDER_TIME_UNKNOWN"),
              data.link
            )
          : user.language.get(
              "REMINDER_MESSAGE",
              data.text,
              duration != 0
                ? humanize(duration, user.language.id.split("-")[0])
                : user.language.get("REMINDER_TIME_UNKNOWN")
            )
      )
      .catch(() => {});
    if (message) this.sent.push(`${data.user}-${data.timestamp}`);
  }
}
