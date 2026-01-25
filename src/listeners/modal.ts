import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { MinecraftLogInfo } from "@fire/lib/interfaces/mclogs";
import { constants } from "@fire/lib/util/constants";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import * as centra from "centra";
import { casual } from "chrono-node";
import { Snowflake } from "discord-api-types/globals";
import { APISelectMenuOption, PermissionFlagsBits } from "discord-api-types/v9";
import {
  Channel,
  Formatters,
  MessageActionRow,
  MessageEmbed,
  MessageSelectMenu,
  ThreadChannel,
} from "discord.js";
import {
  MessageComponentTypes,
  TextInputStyles,
} from "discord.js/typings/enums";
import { Value } from "ts-postgres";
import { parseWithUserTimezone } from "../arguments/time";
import Appeals, {
  AppealFormDropdownItem,
  AppealFormFileUploadItem,
  AppealFormTextInputItem,
} from "../commands/Moderation/appeals";
import Embed from "../commands/Utilities/embed";
import LogScan from "../commands/Utilities/minecraft-log-scan";

const { regexes } = constants;

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

    // Embed Builder
    if (modal.customId.startsWith("embed-builder")) {
      const embed = this.client.getCommand("embed") as Embed;
      return await embed.handleModal(modal);
    }

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
      const reason = modal.getTextInputValue("close_reason");
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

      const newName = modal.getTextInputValue("tag_name");
      if (newName.length && newName != name) {
        const renamed = await modal.guild.tags.renameTag(name, newName);
        if (!renamed) return await modal.error("TAG_EDIT_NAME_FAILED");
      }

      const newContent = modal.getTextInputValue("tag_content");
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
        `${number}`,
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
        text: modal.getTextInputValue("reminder") || reminder.text,
        time: modal.getTextInputValue("time")
          ? (parseWithUserTimezone(
              modal.getTextInputValue("time"),
              modal.createdAt,
              modal.author.timezone
            ).parsed[0]?.start.date() ?? reminder.date)
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
        ((query =
          "UPDATE remind SET reminder=$1, forwhen=$2 WHERE uid=$3 AND forwhen=$4"),
          (values = [modalValues.text, modalValues.time, userId, date]));
      else if (isContentChanged)
        ((query = "UPDATE remind SET reminder=$1 WHERE uid=$2 AND forwhen=$3"),
          (values = [modalValues.text, userId, date]));
      else if (isTimeChanged)
        ((query = "UPDATE remind SET forwhen=$1 WHERE uid=$2 AND forwhen=$3"),
          (values = [modalValues.time, userId, date]));

      const updated = await this.client.db.query(query, values).catch(() => {});
      if (!updated) return await modal.error("REMINDERS_EDIT_FAILED");
      else if (updated.status.startsWith("UPDATE ")) {
        // we need to update the components in the og message
        // so they can be reused, rather than needing to run list again
        const dropdown = (modal.message.components[0] as MessageActionRow)
          .components[0] as MessageSelectMenu;
        const buttonRow = modal.message.components[1] as MessageActionRow;
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

    if (modal.customId == "mclogscan:toggle") {
      const logScan = this.client.getCommand("minecraft-log-scan") as LogScan;
      modal.flags = 64;
      if (modal.channel.type == "DM")
        return await modal.error("MINECRAFT_LOGSCAN_MANAGE_DMS");
      else if (!modal.member?.isAdmin(modal.channel))
        return await modal
          .error("MINECRAFT_LOGSCAN_MANAGE_ADMIN_ONLY")
          .catch(() => {});

      await modal.guild.settings.set("minecraft.logscan", true, modal.author);
      if (modal.guild.settings.get<boolean>("minecraft.logscan", false) == true)
        return await modal.success("MINECRAFT_LOGSCAN_TOGGLE_FAIL");
      const components = logScan.getMenuComponents(modal);
      await modal.channel.update({ components });
      return await modal.success("MINECRAFT_LOGSCAN_ENABLED");
    }

    if (modal.customId.startsWith("mclogscan:solution:")) {
      await modal.channel.ack();
      modal.flags = 64; // make messages ephemeral
      const enUS = this.client.getLanguage("en-US");
      const url = "https://" + modal.customId.slice(19);

      if (!this.client.manager.REST_HOST)
        return await modal.error("ERROR_CONTACT_SUPPORT");

      const logInfoReq = await centra(
        `${this.client.manager.REST_HOST}/v2/minecraft/logs`,
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
          value: modal.getTextInputValue("description"),
        },
        {
          name: enUS.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_SOLUTION_LABEL"),
          value: modal.getTextInputValue("solution"),
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

    if (modal.customId == "appeals:setNotBefore") {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const input = modal.getTextInputValue("not-before");
      if (!input)
        return await modal.error("APPEALS_CONFIG_UPDATE_NOT_BEFORE_INVALID");

      const parsed = casual.parseDate(input, modal.createdAt, {
        forwardDate: true,
      });
      if (!parsed)
        return await modal.error("APPEALS_CONFIG_UPDATE_NOT_BEFORE_INVALID");

      const diff = +parsed - +modal.createdAt;
      if (diff < 0)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_NOT_BEFORE_DIFF_FAILED"
        );

      config.notBefore = diff;

      const updated = await this.client.db
        .query("UPDATE appeals SET notbefore=$1 WHERE gid=$2", [
          config.notBefore,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else {
        await modal.channel
          .update({
            components: [appeals.getAppealsContainer(modal, config)],
          })
          .catch(() => {});
        if (config.notBefore)
          return await modal.success(
            "APPEALS_CONFIG_UPDATE_SET_NOT_BEFORE_SUCCESS",
            {
              server: modal.guild.name,
              time: Formatters.time(
                Math.floor((+modal.createdAt + config.notBefore) / 1000),
                "F"
              ),
            }
          );
        else
          return await modal.success(
            "APPEALS_CONFIG_UPDATE_RESET_NOT_BEFORE_SUCCESS",
            { server: modal.guild.name }
          );
      }
    } else if (modal.customId == "appeals:setNotAfter") {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const input = modal.getTextInputValue("not-after");
      if (!input)
        return await modal.error("APPEALS_CONFIG_UPDATE_NOT_AFTER_INVALID");

      const parsed = casual.parseDate(input, modal.createdAt, {
        forwardDate: true,
      });
      if (!parsed)
        return await modal.error("APPEALS_CONFIG_UPDATE_NOT_AFTER_INVALID");

      const diff = +parsed - +modal.createdAt;
      if (diff < 0)
        return await modal.error("APPEALS_CONFIG_UPDATE_NOT_AFTER_DIFF_FAILED");

      config.notAfter = diff;

      const updated = await this.client.db
        .query("UPDATE appeals SET notafter=$1 WHERE gid=$2", [
          config.notAfter,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else {
        await modal.channel
          .update({
            components: [appeals.getAppealsContainer(modal, config)],
          })
          .catch(() => {});
        if (config.notAfter)
          return await modal.success(
            "APPEALS_CONFIG_UPDATE_SET_NOT_AFTER_SUCCESS",
            {
              server: modal.guild.name,
              time: Formatters.time(
                Math.floor(
                  (+modal.createdAt + config.notBefore + config.notAfter) / 1000
                ),
                "F"
              ),
            }
          );
        else
          return await modal.success(
            "APPEALS_CONFIG_UPDATE_RESET_NOT_AFTER_SUCCESS",
            { server: modal.guild.name }
          );
      }
    }

    if (modal.customId == "appeals:addFormItem:STRING_SELECT") {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (config.items.length >= 5)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_ADD_FORM_ITEM_MAX_ITEMS"
        );

      const stringSelectItem: AppealFormDropdownItem = {
        type: MessageComponentTypes.STRING_SELECT,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        placeholder: modal.getTextInputValue("placeholder"),
        options: [
          {
            label: modal.language.get(
              "APPEALS_CONFIG_UPDATE_STRING_SELECT_OPTION_PLACEHOLDER_LABEL"
            ),
            description: modal.language.get(
              "APPEALS_CONFIG_UPDATE_STRING_SELECT_OPTION_PLACEHOLDER_DESCRIPTION"
            ),
            value: "PLACEHOLDER_VALUE",
          },
        ],
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      config.items.push(stringSelectItem);

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_ADD_STRING_SELECT_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    } else if (modal.customId == "appeals:addFormItem:TEXT_INPUT") {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (config.items.length >= 5)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_ADD_FORM_ITEM_MAX_ITEMS"
        );

      const textInputItem: AppealFormTextInputItem = {
        type: MessageComponentTypes.TEXT_INPUT,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        placeholder: modal.getTextInputValue("placeholder"),
        style: modal
          .getStringSelectValues("style")
          .every((value) => value == "SHORT")
          ? TextInputStyles.SHORT
          : TextInputStyles.PARAGRAPH,
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      config.items.push(textInputItem);

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_ADD_TEXT_INPUT_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    } else if (modal.customId == "appeals:addFormItem:FILE_UPLOAD") {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (config.items.length >= 5)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_ADD_FORM_ITEM_MAX_ITEMS"
        );

      const fileUploadItem: AppealFormFileUploadItem = {
        type: MessageComponentTypes.FILE_UPLOAD,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        minFiles: +modal.getStringSelectValues("min")[0] || 0,
        maxFiles: +modal.getStringSelectValues("max")[0] || 1,
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      config.items.push(fileUploadItem);

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_ADD_FILE_UPLOAD_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    }

    if (modal.customId.startsWith("appeals:editFormItem:STRING_SELECT")) {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +modal.customId.split(":").at(3);
      const item = config.items[index];
      if (!item)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      const stringSelectItem: AppealFormDropdownItem = {
        type: MessageComponentTypes.STRING_SELECT,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        placeholder: modal.getTextInputValue("placeholder"),
        options: [
          {
            label: modal.language.get(
              "APPEALS_CONFIG_UPDATE_STRING_SELECT_OPTION_PLACEHOLDER_LABEL"
            ),
            description: modal.language.get(
              "APPEALS_CONFIG_UPDATE_STRING_SELECT_OPTION_PLACEHOLDER_DESCRIPTION"
            ),
            value: "PLACEHOLDER_VALUE",
          },
        ],
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      config.items[index] = stringSelectItem;

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_EDIT_STRING_SELECT_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    } else if (modal.customId.startsWith("appeals:editFormItem:TEXT_INPUT")) {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +modal.customId.split(":").at(3);
      const item = config.items[index];
      if (!item)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      const textInputItem: AppealFormTextInputItem = {
        type: MessageComponentTypes.TEXT_INPUT,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        placeholder: modal.getTextInputValue("placeholder"),
        style: modal
          .getStringSelectValues("style")
          .every((value) => value == "SHORT")
          ? TextInputStyles.SHORT
          : TextInputStyles.PARAGRAPH,
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      config.items[index] = textInputItem;

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_EDIT_TEXT_INPUT_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    } else if (modal.customId.startsWith("appeals:editFormItem:FILE_UPLOAD")) {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +modal.customId.split(":").at(3);
      const item = config.items[index];
      if (!item)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      const fileUploadItem: AppealFormFileUploadItem = {
        type: MessageComponentTypes.FILE_UPLOAD,
        label: modal.getTextInputValue("label"),
        description: modal.getTextInputValue("description"),
        minFiles: +modal.getStringSelectValues("min")[0] || 0,
        maxFiles: +modal.getStringSelectValues("max")[0] || 1,
        required: modal
          .getStringSelectValues("required")
          .every((value) => value == "true"),
      };
      // FIRE-D63
      if (fileUploadItem.required && fileUploadItem.minFiles < 1)
        fileUploadItem.minFiles = 1;
      config.items[index] = fileUploadItem;

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.channel.update({
          content: modal.language.getSuccess(
            "APPEALS_CONFIG_UPDATE_EDIT_FILE_UPLOAD_SUCCESS",
            { server: modal.guild.name }
          ),
          components: [],
        });
    }

    if (modal.customId.startsWith("appeals:editFormItem:addOption:")) {
      if (!modal.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await modal.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            modal.language
          ),
          command: "appeals",
        });

      modal.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(modal.guild);
      if (!config.channel || !modal.guild.channels.cache.has(config.channel))
        return await modal.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +modal.customId.split(":").at(3);
      const item = config.items[index];
      if (!item || item.type != MessageComponentTypes.STRING_SELECT)
        return await modal.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      if (
        item.options.length == 1 &&
        item.options.at(0).value == "PLACEHOLDER_VALUE"
      )
        item.options.pop();

      const option: APISelectMenuOption = {
        label: modal.getTextInputValue("label"),
        value: `STRING_SELECT_OPTION_${item.options.length}`,
        description: modal.getTextInputValue("description") || undefined,
        default: modal
          .getStringSelectValues("default")
          .every((value) => value == "true"),
      };

      const emojiInput = modal.getTextInputValue("emoji");
      if (emojiInput) {
        const isUnicode = regexes.unicodeEmoji.test(emojiInput);
        regexes.unicodeEmoji.lastIndex = 0;
        if (isUnicode) option.emoji = { name: emojiInput };
      }

      item.options.push(option);

      const updated = await this.client.db
        .query("UPDATE appeals SET items=$1 WHERE gid=$2", [
          config.items as Value,
          modal.guild.id,
        ])
        .catch((e: Error) => e);
      if (updated instanceof Error || !updated.status.startsWith("UPDATE "))
        return await modal.error("ERROR_CONTACT_SUPPORT");
      else
        return await modal.success(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_ADD_OPTION_SUCCESS"
        );
    }
  }
}
