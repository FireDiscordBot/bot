import {
  DeconstructedSnowflake,
  MessageActionRow,
  SnowflakeUtil,
  MessageButton,
  Formatters,
  Snowflake,
} from "discord.js";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { EventType } from "@fire/lib/ws/util/constants";
import { FireUser } from "@fire/lib/extensions/user";
import { constants } from "@fire/lib/util/constants";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { Manager } from "@fire/lib/Manager";

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
    ) {
      this.manager.client.console.log(
        `[Aether] Got duplicated reminder request for ${data.user}, sending delete...`
      );
      return this.manager?.ws.send(
        MessageUtil.encode(new Message(EventType.REMINDER_DELETE, data))
      );
    }
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

    if (data.link?.includes("000000000000000000")) delete data.link;

    const components = [
      new MessageActionRow().addComponents(
        new MessageButton()
          .setCustomId(`!snooze:${user.id}:${data.timestamp}`)
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
              deconstructed && deconstructed.timestamp != 0
                ? Formatters.time(deconstructed.date, "R")
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
