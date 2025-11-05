import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { Manager } from "@fire/lib/Manager";
import { Event } from "@fire/lib/ws/event/Event";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import Appeals, { AppealsConfig } from "@fire/src/commands/Moderation/appeals";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v10";
import { ContainerComponent, MessageAttachment } from "discord.js";

type AppealFileObject = {
  fileId: string;
  originalName: string;
  contentType: string;
};

type AppealSubmitData = {
  userId: Snowflake;
  guildId: Snowflake;
  appealId: string;
  config: AppealsConfig;
  form: {
    fields: {
      values: string[];
    }[];
    attachments: AppealFileObject[];
  };
  entry: {
    caseId: string;
    created: number;
    reason: string;
    moderatorId: Snowflake;
  };
};

export default class SubmitAppeal extends Event {
  constructor(manager: Manager) {
    super(manager, EventType.SUBMIT_APPEAL);
  }

  async run(data: AppealSubmitData, nonce: string) {
    const appeals = this.manager.client.getCommand("appeals") as Appeals;
    if (!appeals) return this.sendError("Appeals Unavailable", 503, nonce);

    const guild = this.manager.client.guilds.cache.get(
      data.guildId
    ) as FireGuild;
    if (!guild) return this.sendError("Failed to retrieve guild", 500, nonce);
    const me = guild.members.me;

    const user = (await this.manager.client.users
      .fetch(data.userId)
      .catch(() => {})) as FireUser;
    if (!user) return this.sendError("Failed to retrieve user", 500, nonce);

    const language = user.language;

    const channel = guild.channels.cache.get(data.config.channel);
    if (!channel || !channel.isText())
      return this.sendError(
        language.get("APPEAL_SUBMIT_FAILED_UNKNOWN_CHANNEL"),
        404,
        nonce
      );
    else if (
      !me
        .permissionsIn(channel)
        .has(PermissionFlagsBits.ViewChannel | PermissionFlagsBits.SendMessages)
    )
      return this.sendError(
        language.get("APPEAL_SUBMIT_FAILED_NO_PERMISSIONS"),
        403,
        nonce
      );

    const moderator = (await this.manager.client.users
      .fetch(data.entry.moderatorId)
      .catch(() => {})) as FireUser;
    if (!moderator)
      return this.sendError(
        language.get("APPEAL_SUBMIT_FAILED_FETCH_MODERATOR"),
        500,
        nonce
      );

    const { container, attachments } = await appeals
      .getAppealSubmitContainer({
        user,
        guildId: data.guildId,
        appealId: data.appealId,
        config: data.config,
        form: data.form,
        entry: {
          caseId: data.entry.caseId,
          created: new Date(data.entry.created),
          reason: data.entry.reason,
          moderator,
        },
      })
      .catch((e) => {
        this.manager.sentry.captureException(e);
        return { container: undefined, attachments: [] } as {
          container: ContainerComponent;
          attachments: MessageAttachment[];
        };
      });
    if (!container)
      return this.sendError(
        language.get("APPEAL_SUBMIT_FAILED_TO_GET_CONTAINER"),
        500,
        nonce
      );

    const message = await channel
      .send({ components: [container], files: attachments })
      .catch((e) => {
        this.manager.console.debug(e);
      });
    if (!message)
      return this.sendError(
        language.get("APPEAL_SUBMIT_FAILED_TO_SEND_MESSAGE"),
        500,
        nonce
      );
    else {
      await this.manager.client.db
        .query(
          "UPDATE modlogs SET appealstatus='appealed' WHERE caseid=$1 AND appealid=$2;",
          [data.entry.caseId, data.appealId]
        )
        .catch(() => {});

      return this.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.SUBMIT_APPEAL, { success: true }, nonce)
        )
      );
    }
  }

  sendError(error: string, code: number, nonce: string) {
    this.manager.ws.send(
      MessageUtil.encode(
        new Message(
          EventType.SUBMIT_APPEAL,
          { success: false, error, code },
          nonce
        )
      )
    );
  }
}
