import {
  DeconstructedSnowflake,
  MessageActionRow,
  SnowflakeUtil,
  MessageButton,
  Snowflake,
} from "discord.js";
import { constants, humanize } from "@fire/lib/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireUser } from "@fire/lib/extensions/user";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";
import * as moment from "moment";

const { regexes } = constants;

// This will always get sent to shard 0 so we can handle
// interactions here too
export default class ReminderSendEvent extends Event {
  sent: Reminder[];

  constructor(manager: Manager) {
    super(manager, EventType.REMINDER_SEND);
    this.sent = [];
  }

  async run(data: Reminder) {
    if (
      this.sent.find(
        (r) => r.user == data.user && r.timestamp == data.timestamp
      )
    )
      return this.manager?.ws.send(
        MessageUtil.encode(new Message(EventType.REMINDER_DELETE, data))
      );
    const user = (await this.manager.client.users
      .fetch(data.user, { cache: false })
      .catch(() => {})) as FireUser;
    this.manager.client.console.log(
      `[Aether] Got request to send reminder to ${user} (${data.user})`
    );
    if (!user) return; // how?
    const snowflake = regexes.discord.message.exec(data.link)?.groups
      ?.message_id as Snowflake;
    let deconstructed: DeconstructedSnowflake;
    if (snowflake) deconstructed = SnowflakeUtil.deconstruct(snowflake);

    const now = moment();
    const duration = moment(deconstructed?.date || now).diff(now);

    if (data.link?.includes("000000000000000000")) delete data.link;

    const components = [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`!snooze:${data.timestamp}`)
          .setStyle("PRIMARY")
          .setLabel(user.language.get("REMINDER_SNOOZE_BUTTON"))
      ),
    ];

    const message = await user
      .send({
        content: user.language.get(
          data.link ? "REMINDER_MESSAGE_LINKED" : "REMINDER_MESSAGE_UNKNOWN",
          {
            time:
              duration != 0
                ? humanize(duration, user.language.id.split("-")[0])
                : user.language.get("REMINDER_TIME_UNKNOWN"),
            text: data.text,
            link: data.link,
          }
        ),
        components,
      })
      .catch(() => {});
    if (message) {
      // ensure reminder is deleted
      this.manager?.ws.send(
        MessageUtil.encode(new Message(EventType.REMINDER_DELETE, data))
      );
      this.sent.push(data);
    }
  }
}
