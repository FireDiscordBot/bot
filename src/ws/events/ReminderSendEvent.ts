import { Manager } from "@fire/lib/Manager";
import { FireUser } from "@fire/lib/extensions/user";
import { Reminder } from "@fire/lib/interfaces/reminders";
import { constants } from "@fire/lib/util/constants";
import { Message } from "@fire/lib/ws/Message";
import { Event } from "@fire/lib/ws/event/Event";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import { Snowflake } from "discord-api-types/globals";
import {
  DeconstructedSnowflake,
  DiscordAPIError,
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  SnowflakeUtil,
} from "discord.js";

const { regexes } = constants;
const PLACEHOLDER_ID = "0".repeat(15);

enum REMINDER_FAILURE_CAUSES {
  UNKNOWN,
  DISCORD_API_ERROR_UNKNOWN,
  DMS_CLOSED,
}

// Aether keeps track of the amount of times it tried to send a reminder
// and whether or not it is currently trying to send it
// so we create a new type specifically for use in this event
type SendingReminder = Reminder & {
  sending: true; // always true when we receive it
  sendAttempts: number;
};

// This will always get sent to shard 0 so we can handle
// interactions here too
export default class ReminderSendEvent extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.REMINDER_SEND);
  }

  async run(data: SendingReminder, nonce: string) {
    const user = (await this.manager.client.users
      .fetch(data.user, { cache: false })
      .catch(() => {})) as FireUser;
    this.manager.client.console.log(
      `[Aether] Got request to ${
        data.sendAttempts == 0 ? "send" : "retry"
      } reminder to ${user} (${data.user})${
        data.sendAttempts > 0 ? ` (attempt ${data.sendAttempts + 1})` : ""
      }`
    );
    if (!user) return; // how?

    // We can use the link to get the time of when the reminder was created
    // since the message id will be the time of when the command was run
    const snowflake = regexes.discord.message.exec(data.link)?.groups
      ?.message_id as Snowflake;
    let deconstructed: DeconstructedSnowflake;
    if (snowflake) deconstructed = SnowflakeUtil.deconstruct(snowflake);

    // This placeholder is used for reminders set via the website
    // which can't link to a message, so we delete it after we got the time
    if (data.link?.includes(PLACEHOLDER_ID)) delete data.link;

    const components = [
      new MessageActionRow().addComponents(
        [
          new MessageButton()
            .setCustomId("!complete_reminder")
            .setStyle("SUCCESS")
            .setLabel(user.language.get("REMINDER_COMPLETE_BUTTON")),
          new MessageButton()
            .setCustomId(`!snooze:${user.id}:${data.timestamp}`)
            .setStyle("SECONDARY")
            .setLabel(user.language.get("REMINDER_SNOOZE_BUTTON")),
          data.link
            ? new MessageButton()
                .setStyle("LINK")
                .setURL(data.link)
                .setLabel(user.language.get("REMINDER_LINK_BUTTON"))
            : undefined,
        ].filter((component) => !!component)
      ),
    ];

    const emptyReminderContent = user.language.get(
      deconstructed && deconstructed.timestamp != 0
        ? "REMINDER_MESSAGE_BODY_WITH_TIME_NO_TEXT"
        : "REMINDER_MESSAGE_BODY_NO_TIME_OR_TEXT",
      {
        time: deconstructed
          ? Formatters.time(deconstructed.date, "R")
          : undefined,
      }
    );
    const requiresEmbed =
      // - 2 is for the double newline when text is present
      data.text.length >= 2000 - emptyReminderContent.length - 2;

    const reminderContent = user.language.get(
      deconstructed && deconstructed.timestamp != 0
        ? requiresEmbed
          ? "REMINDER_MESSAGE_BODY_WITH_TIME_NO_TEXT"
          : "REMINDER_MESSAGE_BODY_WITH_TIME_AND_TEXT"
        : requiresEmbed
        ? "REMINDER_MESSAGE_BODY_NO_TIME_OR_TEXT"
        : "REMINDER_MESSAGE_BODY_NO_TIME_WITH_TEXT",
      {
        time: deconstructed
          ? Formatters.time(deconstructed.date, "R")
          : undefined,
        text: data.text,
      }
    );

    const message = await user
      .send(
        requiresEmbed
          ? {
              content: emptyReminderContent,
              embeds: [
                new MessageEmbed()
                  .setDescription(data.text)
                  .setColor("#2ECC71"),
              ],
              components,
            }
          : {
              content: reminderContent,
              components,
            }
      )
      .catch((e: Error) => {
        this.manager.client.console.error(
          `[Aether] Failed to send reminder to ${user} (${data.user}) due to "${e.message}"`
        );
        let cause: REMINDER_FAILURE_CAUSES = REMINDER_FAILURE_CAUSES.UNKNOWN,
          opcode: number = e instanceof DiscordAPIError ? e.code : 0;
        if (e instanceof DiscordAPIError && e.code == 50007)
          cause = REMINDER_FAILURE_CAUSES.DMS_CLOSED;
        else if (e instanceof DiscordAPIError)
          cause = REMINDER_FAILURE_CAUSES.DISCORD_API_ERROR_UNKNOWN;

        this.manager?.ws.send(
          MessageUtil.encode(
            new Message(
              EventType.REMINDER_SEND,
              {
                success: false,
                data,
                error: {
                  cause,
                  opcode,
                  message: e.message,
                },
              },
              nonce
            )
          )
        );
      });
    if (message)
      // we return success to aether
      this.manager?.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.REMINDER_SEND,
            {
              success: true,
              data,
            },
            nonce
          )
        )
      );
  }
}
