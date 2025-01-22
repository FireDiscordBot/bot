import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { MinecraftLogInfo } from "@fire/lib/interfaces/mclogs";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Channel,
  Formatters,
  MessageEmbed,
  MessageSelectMenu,
  ThreadChannel,
} from "discord.js";
import { parseWithUserTimezone } from "../arguments/time";

export default class Modal extends Listener {
  constructor() {
    super("modal", {
      emitter: "client",
      event: "modal",
    });
  }

  // used to handle generic modals like the ticket close reason modal
  async exec(modal: ModalMessage) {
    const guild = modal.guild;

    // Run handlers
    try {
      if (this.client.modalHandlers.has(modal.customId))
        this.client.modalHandlers.get(modal.customId)(modal);
    } catch {}
    try {
      if (this.client.modalHandlersOnce.has(modal.customId)) {
        const handler = this.client.modalHandlersOnce.get(modal.customId);
        this.client.modalHandlersOnce.delete(modal.customId);
        handler(modal);
      }
    } catch {}

    if (modal.customId.startsWith("ticket_close")) {
      modal.channel.ack();
      const channelId = modal.customId.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(channelId) as
        | FireTextChannel
        | ThreadChannel;
      if (
        !channel ||
        !channel.guild ||
        (channel.type != "GUILD_TEXT" && channel.type != "GUILD_PRIVATE_THREAD")
      )
        return;
      const canClose = await modal.guild.canCloseTicket(channel, modal.member);
      if (canClose == "forbidden")
        return await modal.error("TICKET_CLOSE_FORBIDDEN");
      else if (canClose == "nonticket")
        return await modal.error("TICKET_NON_TICKET");
      const reason = modal.interaction.fields.getTextInputValue("close_reason");
      if (!reason)
        return await modal.error("COMMAND_ERROR_GENERIC", { id: "close" });
      const closed = await guild
        .closeTicket(channel, modal.member, reason)
        .catch((e: Error) => e);
      if (!(closed instanceof Channel))
        return await modal.error("COMMAND_ERROR_500_CTX", {
          ctx: typeof closed == "string" ? closed : "close",
        });
    }

    if (modal.customId.startsWith("tag_edit:") && modal.guild) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      if (!modal.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return await modal
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageMessages,
              modal.language
            ),
            command: "tag edit",
          })
          .catch(() => {});

      const name = modal.customId.slice(9);
      if (!modal.guild.tags) {
        // this should never be true since we init the tag manager on button click
        modal.guild.tags = new GuildTagManager(this.client, modal.guild);
        await modal.guild.tags.init();
      }
      const tag = await modal.guild.tags.getTag(name, false);
      if (!tag) return await modal.error("TAG_INVALID_TAG", { tag: name });

      const newName = modal.interaction.fields.getTextInputValue("tag_name");
      if (newName.length && newName != name) {
        const renamed = await modal.guild.tags.renameTag(name, newName);
        if (!renamed) return await modal.error("TAG_EDIT_NAME_FAILED");
      }

      const newContent =
        modal.interaction.fields.getTextInputValue("tag_content");
      if (newContent.length) {
        const edited = await modal.guild.tags.editTag(
          newName || name,
          newContent
        );
        if (!edited) return await modal.error("TAG_EDIT_CONTENT_FAILED");
      }

      return await modal.success("TAG_EDIT_SUCCESS");
    }

    if (modal.customId.startsWith("reminders-edit:")) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral

      const [, userId, timestamp] = modal.customId.split(":") as [
        string,
        Snowflake,
        `${number}`
      ];
      if (userId != modal.author.id) return;

      const date = new Date(+timestamp);
      if (date <= new Date())
        return await modal.error("REMINDERS_EDIT_PAST_DATE");

      const reminderResult = await this.client.db
        .query("SELECT * FROM remind WHERE uid=$1 AND forwhen=$2", [
          userId,
          date,
        ])
        .first();
      if (!reminderResult)
        return await modal.error("REMINDERS_EDIT_INVALID_SELECTION");

      const reminder = {
        text: reminderResult.get("reminder") as string,
        link: reminderResult.get("link") as string,
        date,
      };
      const modalValues = {
        text:
          modal.interaction.fields.getTextInputValue("reminder") ||
          reminder.text,
        time: modal.interaction.fields.getTextInputValue("time")
          ? parseWithUserTimezone(
              modal.interaction.fields.getTextInputValue("time"),
              modal.createdAt,
              modal.author.settings.get<string>(
                "reminders.timezone.iana",
                "Etc/UTC"
              )
            ).parsed[0]?.start.date() ?? reminder.date
          : reminder.date,
      };

      const isContentChanged = modalValues.text.trim() != reminder.text.trim();
      const isTimeChanged = modalValues.time != reminder.date;

      if (!isContentChanged && !isTimeChanged)
        return await modal.channel.send(
          modal.language.get("REMINDERS_EDIT_NO_CHANGES")
        );

      let query: string,
        values:
          | [string, Date, Snowflake, Date]
          | [string, Snowflake, Date]
          | [Date, Snowflake, Date];
      if (isContentChanged && isTimeChanged)
        (query =
          "UPDATE remind SET reminder=$1, forwhen=$2 WHERE uid=$3 AND forwhen=$4"),
          (values = [modalValues.text, modalValues.time, userId, date]);
      else if (isContentChanged)
        (query = "UPDATE remind SET reminder=$1 WHERE uid=$2 AND forwhen=$3"),
          (values = [modalValues.text, userId, date]);
      else if (isTimeChanged)
        (query = "UPDATE remind SET forwhen=$1 WHERE uid=$2 AND forwhen=$3"),
          (values = [modalValues.time, userId, date]);

      const updated = await this.client.db.query(query, values).catch(() => {});
      if (!updated) return await modal.error("REMINDERS_EDIT_FAILED");
      else if (updated.status.startsWith("UPDATE ")) {
        // we need to update the components in the og message
        // so they can be reused, rather than needing to run list again
        const dropdown = modal.message.components[0]
          .components[0] as MessageSelectMenu;
        const buttonRow = modal.message.components[1];
        for (const button of buttonRow.components) {
          if (!button.customId) continue;
          button.setCustomId(
            button.customId.replaceAll(
              timestamp,
              (+modalValues.time).toString()
            )
          );
        }
        dropdown.options.forEach((option) => {
          if (option.value == timestamp) {
            if (isContentChanged)
              option.label = this.client.util.shortenText(
                modalValues.text,
                100
              );
            if (isTimeChanged) option.value = (+modalValues.time).toString();
          }
        });

        // and we may as well update the embed too
        const embed = modal.message.embeds[0];
        if (isContentChanged) embed.setDescription(modalValues.text);
        if (isTimeChanged) {
          embed.fields[0].value = Formatters.time(modalValues.time, "R");
          embed.setTimestamp(modalValues.time);
        }
        await modal.edit({
          embeds: [embed],
          components: modal.message.components,
        });

        // We first send a delete with the original timestamp (or same if unchanged)
        this.client.manager?.ws.send(
          MessageUtil.encode(
            new Message(EventType.REMINDER_DELETE, {
              user: userId,
              timestamp: +timestamp,
            })
          )
        );

        // and then we send a create with the new data
        this.client.manager?.ws.send(
          MessageUtil.encode(
            new Message(EventType.REMINDER_CREATE, {
              user: userId,
              text: modalValues.text,
              link: reminder.link,
              timestamp: +modalValues.time,
            })
          )
        );

        return await modal.success("REMINDERS_EDIT_SUCCESS", {
          time: Formatters.time(modalValues.time, "R"),
          // 1850 chars should be enough to not clash with the rest of the content
          // while remaining under the 2000 char limit
          text: this.client.util.shortenText(modalValues.text, 1850),
        });
      }
    }

    if (modal.customId.startsWith("mclogscan:solution:")) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      const enUS = this.client.getLanguage("en-US");
      const url = "https://" + modal.customId.slice(19);

      if (!this.client.manager.REST_HOST)
        return await modal.error("ERROR_CONTACT_SUPPORT");

      const logInfoReq = await centra(
        `${this.client.manager.REST_HOST}/${this.client.manager.CURRENT_REST_VERSION}/minecraft/logs`,
        "POST"
      )
        .header("User-Agent", this.client.manager.ua)
        .header("Authorization", process.env.WS_AUTH)
        .body({ url }, "json")
        .send();
      if (logInfoReq.statusCode != 200)
        return await modal.error("MINECRAFT_LOGSCAN_SOLUTION_MODAL_NO_INFO");
      const logInfo = (await logInfoReq.json()) as MinecraftLogInfo;

      const infoEmbed = new MessageEmbed()
        .setTitle(enUS.get("MINECRAFT_LOGSCAN_SOLUTION_EMBED_TITLE"))
        .setAuthor({
          name: `${modal.author.globalName} (${modal.author.id})`,
          iconURL: modal.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setURL(url)
        .setDescription(
          enUS.get(
            logInfo.loader && logInfo.mcVersion
              ? "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_FULL"
              : logInfo.mcVersion
              ? "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_NO_LOADER"
              : "MINECRAFT_LOGSCAN_SOLUTION_LOG_INFO_BASIC",
            {
              user: logInfo.user,
              loader: logInfo.loader,
              version: logInfo.loaderVersion,
              minecraft: logInfo.mcVersion,
            }
          )
        )
        .addFields(
          [
            logInfo.solutions.length
              ? {
                  name: enUS.get("MC_LOG_POSSIBLE_SOLUTIONS"),
                  value: logInfo.solutions.join("\n"),
                }
              : undefined,
            logInfo.recommendations.length
              ? {
                  name: enUS.get("MC_LOG_RECOMMENDATIONS"),
                  value: logInfo.recommendations.join("\n"),
                }
              : undefined,
            {
              name: enUS.get("GUILD"),
              value: logInfo.guild,
            },
            {
              name: enUS.get("MODS"),
              value: logInfo.mods.length.toLocaleString(enUS.id),
            },
            {
              name: enUS.get("PROFILE"),
              value: logInfo.profile.ign
                ? `${logInfo.profile.ign} (${logInfo.profile.uuid})`
                : "N/A",
            },
          ].filter((f) => !!f)
        )
        .setFooter({
          text: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_EMBED_FOOTER"),
        })
        .setTimestamp(new Date(logInfo.scannedAt));
      const solutionEmbed = new MessageEmbed().addFields([
        {
          name: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_DESC_LABEL"),
          value: modal.interaction.fields.getTextInputValue("description"),
        },
        {
          name: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_SOLUTION_LABEL"),
          value: modal.interaction.fields.getTextInputValue("solution"),
        },
      ]);

      const messageReq = await this.client.req
        .channels("1148234164315893792")
        .messages.post({
          data: {
            embeds: [infoEmbed.toJSON(), solutionEmbed.toJSON()],
          },
        })
        .catch(() => {});
      if (!messageReq) return await modal.error("ERROR_CONTACT_SUPPORT");
      else return await modal.success("MINECRAFT_LOGSCAN_SOLUTION_SUBMITTED");
    }
  }
}
