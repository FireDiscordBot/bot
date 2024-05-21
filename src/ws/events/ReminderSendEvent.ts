import { Manager } from "@fire/lib/Manager";
import { FireUser } from "@fire/lib/extensions/user";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { constants } from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import {
  DeconstructedSnowflake,
  Formatters,
  MessageActionRow,
  MessageButton,
  Snowflake,
  SnowflakeUtil,
} from "discord.js";

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
      new MessageActionRow().addComponents([
        new MessageButton()
          .setCustomId("!complete_reminder")
          .setStyle("SUCCESS")
          .setLabel(user.language.get("REMINDER_COMPLETE_BUTTON")),
        new MessageButton()
          .setCustomId(`!snooze:${user.id}:${data.timestamp}`)
          .setStyle("SECONDARY")
          .setLabel(user.language.get("REMINDER_SNOOZE_BUTTON")),
      ]),
    ];

    const textLengthType =
      data.text?.includes("\n") || data.text?.length >= 100
        ? "_LONG"
        : "_SHORT";

    const message = await user
      .send({
        content: user.language.get(
          data.link
            ? (`REMINDER_MESSAGE_LINKED${textLengthType}` as LanguageKeys)
            : (`REMINDER_MESSAGE_UNKNOWN${textLengthType}` as LanguageKeys),
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
      .catch((e: Error) => {
        this.manager.client.console.error(
          `[Aether] Failed to send reminder to ${user} (${data.user}) due to ${e.message}`
        );
      });
    if (message) {
      // ensure reminder is deleted
      this.manager?.ws.send(
        MessageUtil.encode(new Message(EventType.REMINDER_DELETE, data))
      );
      this.sent.push(data);
    }
  }
}
