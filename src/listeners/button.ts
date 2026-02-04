import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import { constants, titleCase } from "@fire/lib/util/constants";
import { getBranch } from "@fire/lib/util/gitUtils";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { EventType } from "@fire/lib/ws/util/constants";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  CategoryChannel,
  CheckboxGroupComponent,
  ContainerComponent,
  EmbedFieldData,
  FileComponent,
  Formatters,
  LabelComponent,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  MessageSelectOptionData,
  Modal,
  ModalActionRowComponent,
  NewsChannel,
  SnowflakeUtil,
  TextDisplayComponent,
  TextInputComponent,
  ThreadChannel,
} from "discord.js";
import {
  MessageButtonStyles,
  MessageComponentTypes,
  TextInputStyles,
} from "discord.js/typings/enums";
import { codeblockTypeCaster } from "../arguments/codeblock";
import Anti from "../commands/Configuration/anti";
import Google from "../commands/Fun/google";
import Appeals, {
  AppealFormDropdownItem,
  AppealStatus,
} from "../commands/Moderation/appeals";
import Rank from "../commands/Premium/rank";
import Embed from "../commands/Utilities/embed";
import LogScan from "../commands/Utilities/minecraft-log-scan";
import RemindersDelete from "../commands/Utilities/reminders-delete";
import RemindersList from "../commands/Utilities/reminders-list";
import Essential from "../modules/essential";
import Sk1er from "../modules/sk1er";
import SparkUniverse from "../modules/sparkuniverse";

const { url } = constants;

const reminderSnoozeTimes = {
  REMINDER_SNOOZE_FIVEMIN: 300000,
  REMINDER_SNOOZE_HALFHOUR: 1800000,
  REMINDER_SNOOZE_HOUR: 3600000,
  REMINDER_SNOOZE_SIXHOURS: 21600000,
  REMINDER_SNOOZE_HALFDAY: 43200000,
  REMINDER_SNOOZE_DAY: 86400000,
  REMINDER_SNOOZE_THREEDAYS: 259200000,
  REMINDER_SNOOZE_WEEK: 604800000,
  REMINDER_SNOOZE_FORTNIGHT: 1209600000,
  REMINDER_SNOOZE_MONTH: 2628060000,
  REMINDER_SNOOZE_OTHER: "other",
};
const validPaginatorIds = ["close", "start", "back", "forward", "end"];
const validSk1erTypes = ["general", "purchase", "bug"];
const sk1erTypeToEmoji = {
  general: "🖥️",
  purchase: "💸",
  bug: "🐛",
};

const validEssentialTypes = [
  "crash",
  "bug",
  "enquiry",
  "ice",
  "general",
  "testers",
  "cape",
  "network",
];

const validSparkTypes = [
  "marketplace_bug",
  "marketplace_bug_",
  "marketplace_feedback",
  "marketplace_general",
  "java_bug",
  "java_bug_",
  "java_crash",
  "java_crash_",
  "java_feedback",
  "java_general",
];

const validGFuelTypes = {
  support: "1063167726497038357",
  feedback: "1063203686328840383",
  twitch: "1065365444971741294",
  verification: "1070028032397561986",
};

type GFuelType = keyof typeof validGFuelTypes;

const defaultGFuelModalComponents = [
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("email")
      .setRequired(true)
      .setLabel("Email")
      .setStyle(TextInputStyles.SHORT)
      .setMaxLength(125)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("code")
      .setRequired(true)
      .setLabel("Ambassador Code")
      .setStyle(TextInputStyles.SHORT)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("subject")
      .setRequired(true)
      .setLabel("Ticket Subject")
      .setPlaceholder("Enter a subject for your ticket here")
      .setStyle(TextInputStyles.PARAGRAPH)
      .setMaxLength(500)
  ),
];

const twitchGFuelModalComponents = [
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("code")
      .setRequired(true)
      .setLabel("Ambassador Code")
      .setStyle(TextInputStyles.SHORT)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("username")
      .setRequired(true)
      .setLabel("Twitch username")
      .setStyle(TextInputStyles.SHORT)
      .setMinLength(3)
      .setMaxLength(50)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("subject")
      .setRequired(true)
      .setLabel("Ticket Subject")
      .setPlaceholder("Enter a subject for your ticket here")
      .setStyle(TextInputStyles.PARAGRAPH)
      .setMaxLength(500)
  ),
];

const verifGFuelModalComponents = [
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("email")
      .setRequired(true)
      .setLabel("Email")
      .setStyle(TextInputStyles.SHORT)
      .setMaxLength(125)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("code")
      .setRequired(true)
      .setLabel("Ambassador Code")
      .setStyle(TextInputStyles.SHORT)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("fullname")
      .setRequired(true)
      .setLabel("Full Name")
      .setStyle(TextInputStyles.SHORT)
  ),
  new MessageActionRow<ModalActionRowComponent>().addComponents(
    new TextInputComponent()
      .setCustomId("alias")
      .setRequired(true)
      .setLabel("Alias")
      .setStyle(TextInputStyles.SHORT)
  ),
];

const validAppealFormTypes = ["STRING_SELECT", "TEXT_INPUT", "FILE_UPLOAD"];

export default class Button extends Listener {
  constructor() {
    super("button", {
      emitter: "client",
      event: "button",
    });
  }

  // used to handle generic buttons, like ticket close or reaction roles
  async exec(button: ComponentMessage) {
    // check for deletion button
    if (button.customId == "delete_me")
      return await button.delete(button.component.message.id).catch(() => {});
    else if (button.customId == "cancel_me") return await button.delete();
    else if (button.customId.startsWith("quote_copy")) {
      button.flags = 64;
      return await button.error("QUOTE_COPIED_BUTTON");
    } else if (button.customId == "reminders_delete_cancel")
      return await button.channel.update({
        content: button.language.get("REMINDERS_DELETE_NO"),
        components: [],
      });
    else if (button.customId == "reminders_context_cancel")
      return await button.channel.update({
        content: button.language.get("REMINDER_CONTEXT_CANCELLED"),
        components: [],
      });

    const message = button.message as FireMessage;

    // Run handlers
    try {
      if (this.client.buttonHandlers.has(button.customId))
        this.client.buttonHandlers.get(button.customId)(button);
    } catch {}
    try {
      if (this.client.buttonHandlersOnce.has(button.customId)) {
        const handler = this.client.buttonHandlersOnce.get(button.customId);
        this.client.buttonHandlersOnce.delete(button.customId);
        handler(button);
      }
    } catch {}

    // Embed Builder
    if (button.customId.startsWith("embed-builder")) {
      const embed = this.client.getCommand("embed") as Embed;
      return await embed.handleButton(button);
    } else if (button.customId.startsWith("embed-delete-confirm")) {
      const id = button.customId.slice(21);
      const deleted = await this.client.db
        .query("DELETE FROM embeds WHERE id=$1 AND uid=$2", [
          id,
          button.author.id,
        ])
        .catch(() => {});
      if (!deleted || !deleted.status.startsWith("DELETE"))
        return await button.error("EMBED_DELETE_FAILED");
      else
        return await button.channel.update({
          content: button.language.getSuccess("EMBED_DELETE_SUCCESS", { id }),
          embeds: [],
          components: [],
        });
    }

    if (
      url.supportedHaste.some((url) => button.customId.startsWith(`h:${url}:`))
    ) {
      button.flags = 64;
      const [, uploader, key] = button.customId.split(":");
      const hasteReq = await centra(`https://${uploader}/raw/${key}`)
        .header("User-Agent", button.client.manager.ua)
        .send()
        .catch(() => {});
      if (!hasteReq || hasteReq.statusCode != 200) {
        return await button.error("HASTE_FETCH_FAILED");
      } else {
        const hasteBody = hasteReq.body?.toString();
        if (!hasteBody) return await button.error("HASTE_FETCH_FAILED");
        let embeds: object | object[], content: string;
        try {
          const data: {
            content?: string;
            embed?: object;
            embeds?: object[];
          } = JSON.parse(hasteBody);
          if (data?.embed) embeds = data.embed;
          else if (data?.embeds) embeds = data.embeds;
          if (data?.content) content = data.content;
        } catch {
          return await button.error("EMBED_OBJECT_INVALID");
        }

        if (!embeds && !content)
          return await button.error("EMBED_OBJECT_INVALID");

        if (embeds instanceof Array) {
          const instances = embeds
            .map((e) => new MessageEmbed(e))
            .filter((e) => !this.client.util.isEmbedEmpty(e))
            .slice(0, 10);
          return await button.channel.send({ content, embeds: instances });
        } else if (typeof embeds == "object") {
          const instance = new MessageEmbed(embeds);
          if (this.client.util.isEmbedEmpty(instance))
            return await button.error("EMBED_OBJECT_INVALID");
          return content
            ? await button.channel.send({ content, embeds: [instance] })
            : await button.channel.send({ embeds: [instance] });
        } else return await button.error("EMBED_OBJECT_INVALID");
      }
    }

    if (button.customId == "appeals:setNotBefore") {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const modal = new Modal()
        .setTitle(button.language.get("APPEALS_CONFIG_NOT_BEFORE_MODAL_TITLE"))
        .setCustomId("appeals:setNotBefore")
        .addComponents(
          new LabelComponent()
            .setId(1)
            .setLabel(
              button.language.get("APPEALS_CONFIG_NOT_BEFORE_MODAL_LABEL")
            )
            .setDescription(
              button.language.get("APPEALS_CONFIG_NOT_BEFORE_MODAL_DESCRIPTION")
            )
            .setComponent(
              new TextInputComponent()
                .setCustomId("not-before")
                .setRequired(true)
                .setPlaceholder(
                  button.language.get(
                    "APPEALS_CONFIG_TIMELINE_MODAL_PLACEHOLDER"
                  )
                )
                .setStyle(TextInputStyles.SHORT)
            )
        );
      return await button.component.showModal(modal);
    } else if (button.customId == "appeals:setNotAfter") {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const modal = new Modal()
        .setTitle(button.language.get("APPEALS_CONFIG_NOT_AFTER_MODAL_TITLE"))
        .setCustomId("appeals:setNotAfter")
        .addComponents(
          new LabelComponent()
            .setId(1)
            .setLabel(
              button.language.get("APPEALS_CONFIG_NOT_AFTER_MODAL_LABEL")
            )
            .setDescription(
              button.language.get("APPEALS_CONFIG_NOT_AFTER_MODAL_DESCRIPTION")
            )
            .setComponent(
              new TextInputComponent()
                .setCustomId("not-after")
                .setRequired(true)
                .setPlaceholder(
                  button.language.get(
                    "APPEALS_CONFIG_TIMELINE_MODAL_PLACEHOLDER"
                  )
                )
                .setStyle(TextInputStyles.SHORT)
            )
        );
      return await button.component.showModal(modal);
    } else if (button.customId == "appeals:addFormItem") {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;
      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (config.items.length >= 5)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_ADD_FORM_ITEM_MAX_ITEMS"
        );

      const dropdownButton = new MessageButton()
          .setCustomId("!appeals:addFormItem:STRING_SELECT")
          .setStyle(MessageButtonStyles.PRIMARY)
          .setLabel(button.language.get("APPEALS_CONFIG_UPDATE_STRING_SELECT")),
        textInputButton = new MessageButton()
          .setCustomId("!appeals:addFormItem:TEXT_INPUT")
          .setStyle(MessageButtonStyles.PRIMARY)
          .setLabel(button.language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT")),
        fileUploadButton = new MessageButton()
          .setCustomId("!appeals:addFormItem:FILE_UPLOAD")
          .setStyle(MessageButtonStyles.PRIMARY)
          .setLabel(button.language.get("APPEALS_CONFIG_UPDATE_FILE_UPLOAD"));

      const row = new MessageActionRow().addComponents(
        dropdownButton,
        textInputButton,
        fileUploadButton
      );
      return await button.channel.send({
        content: button.language.get(
          "APPEALS_CONFIG_UPDATE_ADD_FORM_ITEM_STARTER"
        ),
        components: [row],
      });
    } else if (button.customId == "appeals:removeFormItem") {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;
      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (!config.items.length)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_REMOVE_FORM_ITEM_NOTHING_TO_REMOVE"
        );

      const options: MessageSelectOptionData[] = [];
      for (const item of config.items) {
        switch (item.type) {
          case MessageComponentTypes.STRING_SELECT: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get(
                  "APPEALS_CONFIG_UPDATE_STRING_SELECT"
                )} - ${item.label}`,
                60
              ),
              value: `appeals:removeFormItem:${
                item.type
              }:${config.items.indexOf(item)}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
          case MessageComponentTypes.TEXT_INPUT: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT")} - ${
                  item.label
                }`,
                60
              ),
              value: `appeals:removeFormItem:${
                item.type
              }:${config.items.indexOf(item)}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
          case MessageComponentTypes.FILE_UPLOAD: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get(
                  "APPEALS_CONFIG_UPDATE_FILE_UPLOAD"
                )} - ${item.label}`,
                60
              ),
              value: `appeals:removeFormItem:${
                item.type
              }:${config.items.indexOf(item)}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
        }
      }

      const dropdown = new MessageSelectMenu()
        .setCustomId("appeals:removeFormItem")
        .addOptions(options)
        .setMinValues(1)
        .setMaxValues(1);
      const row = new MessageActionRow().addComponents(dropdown);
      return await button.channel.send({
        content: button.language.get(
          "APPEALS_CONFIG_UPDATE_REMOVE_FORM_ITEM_STARTER"
        ),
        components: [row],
      });
    } else if (button.customId == "appeals:editFormItem") {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;
      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      if (!config.items.length)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_NOTHING_TO_EDIT"
        );

      const options: MessageSelectOptionData[] = [];
      for (const item of config.items) {
        switch (item.type) {
          case MessageComponentTypes.STRING_SELECT: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get(
                  "APPEALS_CONFIG_UPDATE_STRING_SELECT"
                )} - ${item.label}`,
                60
              ),
              value: `appeals:editFormItem:${item.type}:${config.items.indexOf(
                item
              )}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
          case MessageComponentTypes.TEXT_INPUT: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT")} - ${
                  item.label
                }`,
                60
              ),
              value: `appeals:editFormItem:${item.type}:${config.items.indexOf(
                item
              )}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
          case MessageComponentTypes.FILE_UPLOAD: {
            options.push({
              label: this.client.util.shortenText(
                `${button.language.get(
                  "APPEALS_CONFIG_UPDATE_FILE_UPLOAD"
                )} - ${item.label}`,
                60
              ),
              value: `appeals:editFormItem:${item.type}:${config.items.indexOf(
                item
              )}`,
              description: item.description
                ? this.client.util.shortenText(item.description, 100)
                : undefined,
            });
            break;
          }
        }
      }

      const dropdown = new MessageSelectMenu()
        .setCustomId("!appeals:editFormItem")
        .addOptions(options)
        .setMinValues(1)
        .setMaxValues(1);
      const row = new MessageActionRow().addComponents(dropdown);
      return await button.channel.send({
        content: button.language.get(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_STARTER"
        ),
        components: [row],
      });
    }

    if (button.customId.startsWith("appeals:addFormItem:")) {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;

      const itemType = button.customId.slice(20) as
        | "STRING_SELECT"
        | "TEXT_INPUT"
        | "FILE_UPLOAD";
      if (!validAppealFormTypes.includes(itemType))
        return await button.error(
          "APPEALS_CONFIG_UPDATE_INVALID_FORM_ITEM_TYPE"
        );

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      let title: string,
        modalComponents: LabelComponent[] = [];
      switch (itemType) {
        case "STRING_SELECT": {
          title = button.language.get(
            "APPEALS_CONFIG_UPDATE_STRING_SELECT_MODAL_TITLE"
          );
          modalComponents = appeals.stringSelectCreationComponents(
            button.language
          );
          break;
        }
        case "TEXT_INPUT": {
          title = button.language.get(
            "APPEALS_CONFIG_UPDATE_TEXT_INPUT_MODAL_TITLE"
          );
          modalComponents = appeals.textInputCreationComponents(
            button.language
          );
          break;
        }
        case "FILE_UPLOAD": {
          title = button.language.get(
            "APPEALS_CONFIG_UPDATE_FILE_UPLOAD_MODAL_TITLE"
          );
          modalComponents = appeals.fileUploadCreationComponents(
            button.language
          );
          break;
        }
      }

      const modal = new Modal()
        .setTitle(title)
        .setCustomId(button.customId)
        .addComponents(...modalComponents);
      return await button.component.showModal(modal);
    }

    if (button.customId.startsWith("appeals:editFormItem:addOption:")) {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +button.customId.split(":").at(3);
      const item = config.items[index] as AppealFormDropdownItem;
      if (!item || item.type != MessageComponentTypes.STRING_SELECT)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      const modal = new Modal()
        .setCustomId(button.customId)
        .setTitle(
          button.language.get(
            "APPEALS_CONFIG_UPDATE_STRING_SELECT_ADD_OPTION_MODAL_TITLE"
          )
        )
        .addComponents(
          new LabelComponent()
            .setId(1)
            .setLabel(button.language.get("LABEL"))
            .setDescription(
              button.language.get(
                "APPEALS_CONFIG_UPDATE_STRING_SELECT_ADD_OPTION_MODAL_LABEL_DESCRIPTION"
              )
            )
            .setComponent(
              new TextInputComponent()
                .setCustomId("label")
                .setStyle(TextInputStyles.SHORT)
                .setRequired(true)
                .setMaxLength(100)
            ),
          new LabelComponent()
            .setId(2)
            .setLabel(button.language.get("DESCRIPTION"))
            .setDescription(
              button.language.get(
                "APPEALS_CONFIG_UPDATE_STRING_SELECT_ADD_OPTION_MODAL_DESCRIPTION_DESCRIPTION"
              )
            )
            .setComponent(
              new TextInputComponent()
                .setCustomId("description")
                .setStyle(TextInputStyles.SHORT)
                .setRequired(false)
                .setMaxLength(100)
            ),
          new LabelComponent()
            .setId(3)
            .setLabel(button.language.get("EMOJI"))
            .setDescription(
              button.language.get(
                "APPEALS_CONFIG_UPDATE_STRING_SELECT_ADD_OPTION_MODAL_EMOJI_DESCRIPTION"
              )
            )
            .setComponent(
              new TextInputComponent()
                .setCustomId("emoji")
                .setStyle(TextInputStyles.SHORT)
                .setRequired(false)
                .setMaxLength(32)
            ),
          new LabelComponent()
            .setId(4)
            .setLabel(button.language.get("DEFAULT"))
            .setDescription(
              button.language.get(
                "APPEALS_CONFIG_UPDATE_STRING_SELECT_ADD_OPTION_MODAL_DEFAULT_DESCRIPTION"
              )
            )
            .setComponent(
              new MessageSelectMenu()
                .setCustomId("default")
                .addOptions([
                  {
                    label: button.language.get("YES"),
                    value: "true",
                    default: false,
                  },
                  {
                    label: button.language.get("NO"),
                    value: "false",
                    default: false,
                  },
                ])
                .setMinValues(1)
                .setMaxValues(1)
            )
        );

      return await button.component.showModal(modal);
    } else if (
      button.customId.startsWith("appeals:editFormItem:removeOption:")
    ) {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +button.customId.split(":").at(3);
      const item = config.items[index] as AppealFormDropdownItem;
      if (!item || item.type != MessageComponentTypes.STRING_SELECT)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      if (
        item.options.length == 1 &&
        item.options.at(0).value == "PLACEHOLDER_VALUE"
      )
        return await button.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_REMOVE_OPTION_PLACEHOLDER_ONLY"
        );

      const optionSelectDropdown = new MessageSelectMenu()
        .setCustomId(`appeals:editFormItem:removeOption:${index}`)
        .setMinValues(1)
        .setMaxValues(item.options.length)
        .addOptions(
          item.options.map((opt) => ({
            label: opt.label,
            value: opt.value,
            description: opt.description,
            emoji: opt.emoji
              ? "id" in opt.emoji
                ? opt.emoji.id
                : opt.emoji.name
              : undefined,
          }))
        );
      return await button.channel.send({
        content: button.language.get(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_REMOVE_OPTION_STARTER"
        ),
        components: [
          new MessageActionRow().addComponents(optionSelectDropdown),
        ],
      });
    } else if (button.customId.startsWith("appeals:editFormItem:")) {
      if (!button.member?.permissions.has(PermissionFlagsBits.BanMembers))
        return await button.error("MISSING_PERMISSIONS_USER", {
          permissions: this.client.util.cleanPermissionName(
            PermissionFlagsBits.BanMembers,
            button.language
          ),
          command: "appeals",
        });

      button.flags = 64;

      const appeals = this.client.getCommand("appeals") as Appeals;
      const config = await appeals.getAppealsConfig(button.guild);
      if (!config.channel || !button.guild.channels.cache.has(config.channel))
        return await button.error("APPEALS_CONFIG_UPDATE_CHANNEL_REQUIRED");

      const index = +button.customId.split(":").at(2);
      const item = config.items[index] as AppealFormDropdownItem;
      if (!item || item.type != MessageComponentTypes.STRING_SELECT)
        return await button.error(
          "APPEALS_CONFIG_UPDATE_EDIT_FORM_ITEM_UNKNOWN"
        );

      const modal = new Modal()
        .setTitle(
          button.language.get("APPEALS_CONFIG_UPDATE_STRING_SELECT_MODAL_TITLE")
        )
        .setCustomId(`appeals:editFormItem:STRING_SELECT:${index}`)
        .addComponents(
          ...appeals.stringSelectCreationComponents(button.language, item)
        );
      return await button.component.showModal(modal);
    }

    if (button.customId.startsWith("appeal:accept:")) {
      button.flags = 64;
      if (!button.member?.isModerator())
        return await button.error("COMMAND_MODERATOR_ONLY");

      const caseId = button.customId.split(":").at(2);
      const entry = await this.client.db
        .query<{
          caseid: string;
          appealstatus: AppealStatus;
          uid: Snowflake;
        }>(
          "SELECT caseid, appealstatus, uid FROM modlogs WHERE caseid=$1 AND gid=$2;",
          [caseId, button.guildId]
        )
        .first()
        .catch(() => {});
      if (!entry || entry.caseid != caseId)
        return await button.error("APPEAL_ACCEPT_FAILED_TO_FIND_ENTRY");
      const appealStatus = entry.appealstatus;
      if (appealStatus != "appealed")
        return await button.error("APPEAL_ACTION_DECIDED_ALREADY");

      const userId = entry.uid;
      const user = (await this.client.users
        .fetch(userId)
        .catch(() => {})) as FireUser;
      if (!user)
        return await button.error("APPEAL_ACCEPT_FAILED_TO_FETCH_USER");

      const updateModLogs = await this.client.db
        .query(
          "UPDATE modlogs SET appealstatus='accepted' WHERE caseid=$1 AND gid=$2;",
          [caseId, button.guildId]
        )
        .catch(() => {});
      if (!updateModLogs || !updateModLogs.status.startsWith("UPDATE "))
        return await button.error("APPEAL_ACTION_STATUS_UPDATE_FAILED");

      const unban = await button.guild.unban(
        user,
        button.guild.language.get("APPEAL_ACCEPT_REASON"),
        button.member,
        button.channel
      );
      if (unban == "FORBIDDEN") return await button.error("COMMAND_ERROR_500");
      if (typeof unban == "string")
        return await button.error(`UNBAN_FAILED_${unban}`);

      const container = button.message.components[0] as ContainerComponent;
      const buttonsRow = container.components.find(
        (comp) =>
          comp instanceof MessageActionRow &&
          comp.components.find((onent) =>
            onent.customId.startsWith("appeal:accept")
          )
      ) as MessageActionRow;
      // user id is always the last component
      // and we want to keep it that way
      const userIdTextDisplay = container.components.at(
        -1
      ) as TextDisplayComponent;
      if (buttonsRow && buttonsRow.components.length) {
        // First we remove it from the components as we wish to add text before it
        const buttonsRowIndex = container.components.indexOf(buttonsRow);
        container.components.splice(buttonsRowIndex, 1);
        // and remove the user id too since it should always be at the bottom
        const userIdTextIndex = container.components.indexOf(userIdTextDisplay);
        container.components.splice(userIdTextIndex, 1);

        // then we disable the buttons
        for (const component of buttonsRow.components)
          component.setDisabled(true);

        // and create the text display component
        const acceptedTextDisplay = new TextDisplayComponent({
          content: button.guild.language.get("APPEAL_ACCEPTED_NOTE", {
            user: button.member.toString(),
            time: Formatters.time(button.createdAt, "F"),
          }),
        });

        // before finally pushing them all
        // note then buttons then user id
        container.addComponents(
          acceptedTextDisplay,
          buttonsRow,
          userIdTextDisplay
        );

        // we can't edit with URLs in file components
        // so we need to reset them to attachment:// format
        const fileComponents = container.components.filter(
          (component) => component instanceof FileComponent
        );
        for (const file of fileComponents) file.setFile(file.name);

        await button.message.edit({ components: [container] }).catch(() => {});
      }

      await user
        .send(
          user.language.getSuccess("APPEAL_ACCEPT_MESSAGE", {
            guild: button.guild.name,
          })
        )
        .catch(() => {});
    } else if (button.customId.startsWith("appeal:reject:")) {
      button.flags = 64;
      if (!button.member?.isModerator())
        return await button.error("COMMAND_MODERATOR_ONLY");

      const caseId = button.customId.split(":").at(2);
      const entry = await this.client.db
        .query<{
          caseid: string;
          appealstatus: AppealStatus;
          uid: Snowflake;
        }>(
          "SELECT caseid, appealstatus, uid FROM modlogs WHERE caseid=$1 AND gid=$2;",
          [caseId, button.guildId]
        )
        .first()
        .catch(() => {});
      if (!entry || entry.caseid != caseId)
        return await button.error("APPEAL_REJECT_FAILED_TO_FIND_ENTRY");
      const appealStatus = entry.appealstatus;
      if (appealStatus != "appealed")
        return await button.error("APPEAL_ACTION_DECIDED_ALREADY");

      const updateModLogs = await this.client.db
        .query(
          "UPDATE modlogs SET appealstatus='rejected' WHERE caseid=$1 AND gid=$2;",
          [caseId, button.guildId]
        )
        .catch(() => {});
      if (!updateModLogs || !updateModLogs.status.startsWith("UPDATE "))
        return await button.error("APPEAL_ACTION_STATUS_UPDATE_FAILED");

      const container = button.message.components[0] as ContainerComponent;
      const buttonsRow = container.components.find(
        (comp) =>
          comp instanceof MessageActionRow &&
          comp.components.find((onent) =>
            onent.customId.startsWith("appeal:reject")
          )
      ) as MessageActionRow;
      // user id is always the last component
      const userIdTextDisplay = container.components.at(
        -1
      ) as TextDisplayComponent;
      if (buttonsRow && buttonsRow.components.length) {
        // First we remove it from the components as we wish to add text before it
        const buttonsRowIndex = container.components.indexOf(buttonsRow);
        container.components.splice(buttonsRowIndex, 1);
        const userIdTextIndex = container.components.indexOf(userIdTextDisplay);
        container.components.splice(userIdTextIndex, 1);

        // then we disable the buttons
        for (const component of buttonsRow.components)
          component.setDisabled(true);

        // and create the text display component
        const rejectedTextDisplay = new TextDisplayComponent({
          content: button.guild.language.get("APPEAL_REJECTED_NOTE", {
            user: button.member.toString(),
            time: Formatters.time(button.createdAt, "F"),
          }),
        });

        // before finally pushing them both, text then buttons
        container.addComponents(
          rejectedTextDisplay,
          buttonsRow,
          userIdTextDisplay
        );

        // we can't edit with URLs in file components
        // so we need to reset them to attachment:// format
        const fileComponents = container.components.filter(
          (component) => component instanceof FileComponent
        );
        for (const file of fileComponents) file.setFile(file.name);

        await button.message.edit({ components: [container] }).catch(() => {});
      }

      await button.success("APPEAL_REJECT_RESPONSE");

      const userId = entry.uid;
      const user = (await this.client.users
        .fetch(userId)
        .catch(() => {})) as FireUser;
      if (user)
        await user
          .send(
            user.language.getError("APPEAL_REJECT_MESSAGE", {
              guild: button.guild.name,
            })
          )
          .catch(() => {});
    }

    // handle ticket close buttons
    if (button.customId.startsWith("ticket_close")) {
      const { guild } = button;
      if (!guild) return;
      const channelId = button.customId.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(channelId) as
        | FireTextChannel
        | ThreadChannel;
      if (
        !channel ||
        !channel.guild ||
        (channel.type != "GUILD_TEXT" && channel.type != "GUILD_PRIVATE_THREAD")
      )
        return;
      if (guild.tickets.find((ticket) => ticket.id == channelId)) {
        const canClose = await button.guild.canCloseTicket(
          channel,
          button.member
        );
        if (canClose == "forbidden")
          return await button.error("TICKET_CLOSE_FORBIDDEN");
        else if (canClose == "nonticket")
          return await button.error("TICKET_NON_TICKET");
        try {
          return await button.component.showModal(
            new Modal()
              .setTitle(
                button.language.get("TICKET_CLOSE_MODAL_TITLE", {
                  name: button.channel.name ?? "Unknown",
                })
              )
              .setCustomId(button.customId)
              .addComponents(
                new MessageActionRow<ModalActionRowComponent>().addComponents(
                  new TextInputComponent()
                    .setCustomId("close_reason")
                    .setRequired(true)
                    .setLabel(button.language.get("TICKET_CLOSE_REASON"))
                    .setStyle(TextInputStyles.SHORT)
                    .setMaxLength(60)
                )
              )
          );
        } catch (e) {
          return this.client.commandHandler.emit(
            "commandError",
            button,
            this.client.getCommand("close"),
            {},
            e
          );
        }
      } else return;
    }

    if (button.customId.startsWith(`rank:${button.member?.id}:`)) {
      const roleId = button.customId.slice(
        `rank:${button.member?.id}:`.length
      ) as Snowflake;
      const role = button.guild?.roles.cache.get(roleId);
      if (!role || !button.guild || !button.member) return;
      const ranks = button.guild.settings
        .get<Snowflake[]>("utils.ranks", [])
        .filter((id) => button.guild.roles.cache.has(id));
      if (!ranks.includes(roleId))
        return await button.error("RANKS_MENU_INVALID_ROLE");
      const shouldRemove = button.member.roles.cache.has(roleId);
      if (shouldRemove)
        button.member = (await button.member.roles
          .remove(role, button.guild.language.get("RANKS_LEAVE_REASON"))
          .catch(() => button.member)) as FireMember;
      else
        button.member = (await button.member.roles
          .add(role, button.guild.language.get("RANKS_JOIN_REASON"))
          .catch(() => button.member)) as FireMember;

      const components = await Rank.getRankButtons(button.guild, button.member);
      const embed = new MessageEmbed()
        .setColor(button.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setAuthor({
          name: button.language.get("RANKS_AUTHOR", {
            guild: button.guild.toString(),
          }),
          iconURL: button.guild.icon
            ? (button.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined,
        });
      await button.channel.update({
        embeds: [embed],
        components,
      });
    } else if (button.customId.startsWith(`rank:`)) {
      button.flags = 64;
      const roleId = button.customId.slice(5) as Snowflake;
      const role = button.guild?.roles.cache.get(roleId);
      if (!role || !button.guild || !button.member) return;
      const ranks = button.guild.settings
        .get<Snowflake[]>("utils.ranks", [])
        .filter((id) => button.guild.roles.cache.has(id));
      if (!ranks.includes(roleId))
        return await button.error("RANKS_MENU_INVALID_ROLE");
      const shouldRemove = button.member.roles.cache.has(roleId);
      if (shouldRemove) {
        const removed = (await button.member.roles
          .remove(role, button.guild.language.get("RANKS_LEAVE_REASON"))
          .catch(() => button.member)) as FireMember;
        if (!removed)
          return await button.error("COMMAND_ERROR_GENERIC", { id: "rank" });
        else
          return await button.success("RANKS_LEFT_RANK", { role: role.name });
      } else {
        const added = (await button.member.roles
          .add(role, button.guild.language.get("RANKS_JOIN_REASON"))
          .catch(() => button.member)) as FireMember;
        if (!added)
          return await button.error("COMMAND_ERROR_GENERIC", { id: "rank" });
        else
          return await button.success("RANKS_JOIN_RANK", { role: role.name });
      }
    }

    if (button.customId.startsWith("anti:") && button.guild) {
      button.flags = 64;
      if (!button.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return await button
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageMessages,
              button.language
            ),
            command: "anti",
          })
          .catch(() => {});

      const anti = this.client.getCommand("anti") as Anti;

      const update = async () =>
        button.channel.update({
          content: button.language.get("ANTI_CURRENT_OPTIONS"),
          components: anti.getMenuComponents(button),
        });

      const type = button.customId.slice(5);
      switch (type) {
        case "everyone": {
          const current = button.guild.settings.get<boolean>(
            "mod.antieveryone",
            false
          );
          await button.guild.settings.set<boolean>(
            "mod.antieveryone",
            !current,
            button.author
          );
          await update();
          return current
            ? await button.success("ANTI_EVERYONE_DISABLED")
            : await button.success("ANTI_EVERYONE_ENABLED");
        }
        case "zws": {
          const current = button.guild.settings.get<boolean>(
            "mod.antizws",
            false
          );
          await button.guild.settings.set<boolean>(
            "mod.antizws",
            !current,
            button.author
          );
          await update();
          return current
            ? await button.success("ANTI_ZWS_DISABLED")
            : await button.success("ANTI_ZWS_ENABLED");
        }
        case "spoiler": {
          const current = button.guild.settings.get<boolean>(
            "mod.antispoilers",
            false
          );
          await button.guild.settings.set<boolean>(
            "mod.antispoilers",
            !current,
            button.author
          );
          await update();
          return current
            ? await button.success("ANTI_SPOILER_DISABLED")
            : await button.success("ANTI_SPOILER_ENABLED");
        }
        default: {
          return await button.error("ANTI_UNKNOWN", {
            valid: anti.valid.join(", "),
          });
        }
      }
    }

    if (button.customId.startsWith("tag_edit:") && button.guild) {
      if (!button.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return await button
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageMessages,
              button.language
            ),
            command: "tag edit",
          })
          .catch(() => {});

      const name = button.customId.slice(9);
      if (!button.guild.tags) {
        button.guild.tags = new GuildTagManager(this.client, button.guild);
        await button.guild.tags.init();
      }
      const tag = await button.guild.tags.getTag(name, false);
      if (!tag) return await button.error("TAG_INVALID_TAG", { tag: name });

      return await button.component.showModal(
        new Modal()
          .setTitle(button.language.get("TAG_EDIT_MODAL_TITLE"))
          .setCustomId(button.customId)
          .addComponents(
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("tag_name")
                .setRequired(false)
                .setLabel(button.language.get("TAG_EDIT_MODAL_NAME_FIELD"))
                .setValue(tag.name)
                .setStyle(TextInputStyles.SHORT)
                .setMaxLength(25)
            ),
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("tag_content")
                .setRequired(true)
                .setLabel(button.language.get("TAG_EDIT_MODAL_CONTENT_FIELD"))
                .setValue(tag.content)
                .setStyle(TextInputStyles.PARAGRAPH)
                .setMaxLength(2000)
            )
          )
      );
    }

    if (button.customId.startsWith(`tag_view:`) && button.guild) {
      const name = button.customId.slice(9);
      if (!button.guild.tags) {
        button.guild.tags = new GuildTagManager(this.client, button.guild);
        await button.guild.tags.init();
      }
      const tag = await button.guild.tags.getTag(name, false);
      if (!tag) return;
      else {
        await button.guild.tags.useTag(tag.name);

        const embeds = await button.guild.tags.embedCommand.getEmbeds(
          tag.embedIds
        );

        return await button.channel
          .send(
            {
              content: tag.content,
              embeds: embeds.map((embed) => embed.embed),
            },
            64
          )
          .catch(() => {});
      }
    }

    if (button.customId.startsWith("tag_delete:") && button.guild) {
      if (!button.guild.tags) {
        button.guild.tags = new GuildTagManager(this.client, button.guild);
        await button.guild.tags.init();
      }
      if (!button.member?.permissions.has(PermissionFlagsBits.ManageMessages))
        return await button
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageMessages,
              button.language
            ),
            command: "tag delete",
          })
          .catch(() => {});

      const name = button.customId.slice(11);
      const tag = await button.guild.tags.getTag(name, false, true);
      if (!tag) return;

      if (tag.createdBy && typeof tag.createdBy != "string")
        tag.createdBy = tag.createdBy.id;
      delete tag.uses;

      const data = await this.client.util
        .haste(
          tag.content,
          `${tag.name}.md`,
          {
            createdBy:
              typeof tag.createdBy == "string"
                ? tag.createdBy
                : tag.createdBy.id,
            embedIds: tag.embedIds,
            aliases: tag.aliases,
            uses: tag.uses,
          },
          true,
          false
        )
        .catch(() => {});
      if (!data) return;

      const deleted = await button.guild.tags.deleteTag(name);
      if (!deleted)
        return await button.channel.update({
          content: button.language.get("TAG_DELETE_FAILED", { haste: data }),
          embeds: [],
          components: [],
        });
      else {
        const embed = new MessageEmbed()
          .setAuthor({
            name: button.guild.name,
            iconURL: button.guild.iconURL({
              size: 2048,
              format: "png",
              dynamic: true,
            }),
          })
          .setColor(button.member?.displayColor || "#FFFFFF")
          .setDescription(
            button.language.get("TAG_DELETE_SUCCESS", { haste: data })
          )
          .setTimestamp();
        return await button.channel.update({ embeds: [embed], components: [] });
      }
    }

    if (button.customId.startsWith("sk1er_support_")) {
      // handle limit first so we can give a better msg and give it right away
      if (
        button.guild?.getTickets(button.author.id).length >=
        button.guild?.settings.get<number>("tickets.limit", 1)
      )
        return await button.edit(
          button.language.getSlashError("NEW_TICKET_LIMIT")
        );

      const type = button.customId.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (!message) return "no message";
      const component = message.components
        ?.map((component) =>
          component.type == "ACTION_ROW"
            ? (component?.components ?? component)
            : component
        )
        .flat()
        .find(
          (component) =>
            component.type == "BUTTON" &&
            component.style != "LINK" &&
            (component.customId == button.customId ||
              component.customId.slice(1) == button.customId)
        );
      if (component?.type != "BUTTON" || component?.style == "LINK")
        return "non button";
      if (!component.emoji) return "unknown emoji";
      const emoji =
        typeof component.emoji == "string"
          ? component.emoji
          : component.emoji.name;

      button.flags += 64; // set ephemeral
      const confirmButton = new MessageButton()
        .setCustomId(`sk1er_confirm_${type}`)
        .setStyle("SUCCESS")
        .setEmoji(emoji)
        .setDisabled(true);
      const deleteSnowflake = SnowflakeUtil.generate();
      const deleteButton = new MessageButton()
        .setEmoji("534174796938870792")
        .setStyle("DANGER")
        .setCustomId(deleteSnowflake);
      this.client.buttonHandlersOnce.set(deleteSnowflake, () => {
        button.delete();
      });
      await button.edit({
        content: button.language.get("SK1ER_SUPPORT_CONFIRM"),
        components: [
          new MessageActionRow().addComponents([confirmButton, deleteButton]),
        ],
      });

      await this.client.util.sleep(5000);
      confirmButton.setDisabled(false);
      // user has not clicked delete button
      if (this.client.buttonHandlersOnce.has(deleteSnowflake))
        await button.edit({
          content: button.language.get("SK1ER_SUPPORT_CONFIRM_EDIT"),
          components: [
            new MessageActionRow().addComponents([confirmButton, deleteButton]),
          ],
        });
    } else if (button.customId.startsWith("sk1er_confirm_")) {
      const type = button.customId.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      // since this is an ephemeral message, it does not give us the components
      // so we need to fake them
      (button.message as FireMessage).components = [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomId(`sk1er_confirm_${type}`)
            .setEmoji(sk1erTypeToEmoji[type])
        ),
      ];

      const ticket = await sk1erModule
        .handleSupport(button, button.author)
        .catch((e: Error) => e);
      if (
        !(ticket instanceof FireTextChannel) &&
        !(ticket instanceof ThreadChannel)
      ) {
        // how?
        if (ticket == "author" || ticket == "blacklisted") return;
        else if (ticket == "disabled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_DISABLED")
          );
        else if (ticket == "limit")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LIMIT")
          );
        else if (ticket == "lock")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LOCK", {
              limit: button.guild.settings.get<number>("tickets.limit", 1),
            })
          );
        else if (ticket == "toggled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_TOGGLED", {
              message: button.guild.settings.get<string>("tickets.togglemsg"),
            })
          );
        else if (ticket instanceof Error)
          this.client.sentry?.captureException(ticket, {
            user: {
              username: button.author.toString(),
              id: button.author.id,
            },
            extra: {
              "message.id": button.id,
              "guild.id": button.guild?.id,
              "guild.name": button.guild?.name,
              "guild.shard": button.shard,
              "button.customid": button.customId,
              env: process.env.NODE_ENV,
            },
          });
        return await button.error("BUTTON_SUPPORT_FAIL", {
          reason: ticket.toString(),
        });
      } else
        await button
          .edit({
            content: button.language.getSuccess("NEW_TICKET_CREATED", {
              channel: ticket.toString(),
            }),
            components: [],
          })
          .catch(() => {});
    }

    // below is a ton of duplicated code since it needs to be kept separate to allow for easy changes
    if (button.customId.startsWith("essential_support_")) {
      // handle limit first so we can give a better msg and give it right away
      if (
        button.guild?.getTickets(button.author.id).length >=
        button.guild?.settings.get<number>("tickets.limit", 1)
      )
        return await button.edit(
          button.language.getSlashError("NEW_TICKET_LIMIT")
        );

      const type = button.customId.slice(18);
      if (!type || !validEssentialTypes.includes(type)) return;
      const essentialModule = this.client.getModule("essential") as Essential;
      if (!essentialModule) return;

      if (!message) return "no message";

      const choicesRowOne = [
        new MessageButton()
          .setCustomId("essentialsupport:crash")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_CRASH"))
          .setStyle("DANGER"),
        new MessageButton()
          .setCustomId("essentialsupport:bug")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_BUG"))
          .setStyle("DANGER"),
        new MessageButton()
          .setCustomId("essentialsupport:enquiry")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_ENQUIRY"))
          .setStyle("PRIMARY"),
        new MessageButton()
          .setCustomId("essentialsupport:ice")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_ICE"))
          .setStyle("PRIMARY"),
      ];
      const choicesRowTwo = [
        new MessageButton()
          .setCustomId("essentialsupport:network")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_NETWORK"))
          .setStyle("DANGER"),
        new MessageButton()
          .setCustomId("essentialsupport:other")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_OTHER"))
          .setStyle("PRIMARY"),
      ];
      if (!(button.flags & 64)) button.flags += 64;
      return await button.edit({
        content: button.language.get("ESSENTIAL_SUPPORT_CHOOSE_ISSUE"),
        components: [
          // make the cape button super fucking obvious
          new MessageActionRow().addComponents([
            new MessageButton()
              .setCustomId("essentialsupport:cape")
              .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_CAPE"))
              .setStyle("PRIMARY"),
          ]),
          new MessageActionRow().addComponents(choicesRowOne),
          new MessageActionRow().addComponents(choicesRowTwo),
        ],
      });
    } else if (button.customId.startsWith("essential_confirm_")) {
      const type = button.customId.slice(18);
      if (!type || !validEssentialTypes.includes(type)) return;
      const essentialModule = this.client.getModule("essential") as Essential;
      if (!essentialModule) return;

      const ticket = await essentialModule
        .handleTicket(button, type)
        .catch((e: Error) => e);
      if (
        !(ticket instanceof FireTextChannel) &&
        !(ticket instanceof ThreadChannel)
      ) {
        // how?
        if (ticket == "blacklisted") return;
        else if (
          typeof ticket == "string" &&
          (ticket == "author" || ticket.startsWith("no "))
        )
          return await button.edit(
            button.language.getSlashError("COMMAND_ERROR_500", {
              status: constants.url.fireStatus,
            })
          );
        else if (ticket == "disabled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_DISABLED")
          );
        else if (ticket == "limit")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LIMIT")
          );
        else if (ticket == "lock")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LOCK", {
              limit: button.guild.settings.get<number>("tickets.limit", 1),
            })
          );
        else if (ticket == "toggled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_TOGGLED", {
              message: button.guild.settings.get<string>("tickets.togglemsg"),
            })
          );
        else if (ticket instanceof Error)
          this.client.sentry?.captureException(ticket, {
            user: {
              username: button.author.toString(),
              id: button.author.id,
            },
            extra: {
              "message.id": button.id,
              "guild.id": button.guild?.id,
              "guild.name": button.guild?.name,
              "guild.shard": button.shard,
              "button.customid": button.customId,
              env: process.env.NODE_ENV,
            },
          });
        return await button.error("BUTTON_SUPPORT_FAIL", {
          reason: ticket ? ticket.toString() : "unknown",
        });
      } else
        await button
          .edit({
            content: `${this.client.util.useEmoji(
              "success"
            )} ${button.language.get("NEW_TICKET_CREATED", {
              channel: ticket.toString(),
            })}`,
            components: [],
          })
          .catch(() => {});
    } else if (button.customId.startsWith("essentialsupport:")) {
      const choice = button.customId.slice(17);
      const essentialModule = this.client.getModule("essential") as Essential;
      if (!essentialModule) return;

      const handler: Function =
        essentialModule[`supportHandle${titleCase(choice, "_", false)}`];
      if (!handler || typeof handler != "function")
        return await button.error("BUTTON_SUPPORT_CHOICE_INVALID");
      else return await handler.bind(essentialModule)(button);
    }

    // below is a ton of duplicated code since it needs to be kept separate to allow for easy changes
    if (button.customId.startsWith("spark_support_")) {
      // handle limit first so we can give a better msg and give it right away
      if (
        button.guild?.getTickets(button.author.id).length >=
        button.guild?.settings.get<number>("tickets.limit", 1)
      )
        return await button.edit(
          button.language.getSlashError("NEW_TICKET_LIMIT")
        );

      const sparkModule = this.client.getModule(
        "sparkuniverse"
      ) as SparkUniverse;
      if (!sparkModule) return;

      if (!message) return "no message";

      let choices: MessageButton[];
      if (button.channelId == "722502261107851285")
        choices = [
          new MessageButton()
            .setCustomId("sparksupport:marketplace_bug")
            .setLabel("Bug Report")
            .setStyle("DANGER"),
          new MessageButton()
            .setCustomId("spark_confirm_marketplace_feedback")
            .setLabel("Feedback")
            .setStyle("PRIMARY"),
          new MessageButton()
            .setCustomId("spark_confirm_marketplace_general")
            .setLabel("General Questions")
            .setStyle("PRIMARY"),
        ];
      else if (button.channelId == "937795539850903622")
        choices = [
          new MessageButton()
            // .setCustomId("sparksupport:java_bug")
            .setCustomId("spark_confirm_java_bug")
            .setLabel("Bug Report")
            .setStyle("DANGER"),
          new MessageButton()
            // .setCustomId("sparksupport:java_crash")
            .setCustomId("spark_confirm_java_crash")
            .setLabel("The game is crashing")
            .setStyle("DANGER"),
          new MessageButton()
            .setCustomId("spark_confirm_java_feedback")
            .setLabel("Feedback")
            .setStyle("PRIMARY"),
          new MessageButton()
            .setCustomId("spark_confirm_java_general")
            .setLabel("General Questions")
            .setStyle("PRIMARY"),
        ];

      if (!(button.flags & 64)) button.flags += 64;
      return await button.edit({
        content: `Hey, welcome to <:SparkStar:815934576056205352> Spark Universe support 👋

To provide you with the best support possible, I will walk you through getting the information you need ready. To start, please use the buttons below to indicate what type of issue you are having.

Please choose accurately as it will allow us to help you as quick as possible! ⚡`,
        components: [new MessageActionRow().addComponents(choices)],
      });
    } else if (button.customId.startsWith("spark_confirm_")) {
      const type = button.customId.slice(14);
      if (
        !type ||
        !validSparkTypes.find((t) =>
          t.endsWith("_") ? type.startsWith(t) : type == t
        )
      )
        return;
      const sparkModule = this.client.getModule(
        "sparkuniverse"
      ) as SparkUniverse;
      if (!sparkModule) return;

      const ticket = await sparkModule
        .handleTicket(button, type)
        .catch((e: Error) => e);
      if (
        !(ticket instanceof FireTextChannel) &&
        !(ticket instanceof ThreadChannel)
      ) {
        // how?
        if (ticket == "blacklisted") return;
        else if (
          typeof ticket == "string" &&
          (ticket == "author" || ticket.startsWith("no "))
        )
          return await button.edit(
            button.language.getSlashError("COMMAND_ERROR_500", {
              status: constants.url.fireStatus,
            })
          );
        else if (ticket == "disabled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_DISABLED")
          );
        else if (ticket == "limit")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LIMIT")
          );
        else if (ticket == "lock")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_LOCK", {
              limit: button.guild.settings.get<number>("tickets.limit", 1),
            })
          );
        else if (ticket == "toggled")
          return await button.edit(
            button.language.getSlashError("NEW_TICKET_TOGGLED", {
              message: button.guild.settings.get<string>("tickets.togglemsg"),
            })
          );
        else if (ticket instanceof Error)
          this.client.sentry?.captureException(ticket, {
            user: {
              username: button.author.toString(),
              id: button.author.id,
            },
            extra: {
              "message.id": button.id,
              "guild.id": button.guild?.id,
              "guild.name": button.guild?.name,
              "guild.shard": button.shard,
              "button.customid": button.customId,
              env: process.env.NODE_ENV,
            },
          });
        return await button.error("BUTTON_SUPPORT_FAIL", {
          reason: ticket.toString(),
        });
      } else
        await button
          .edit({
            content: `${this.client.util.useEmoji(
              "success"
            )} ${button.language.get("NEW_TICKET_CREATED", {
              channel: ticket.toString(),
            })}`,
            components: [],
          })
          .catch(() => {});
    } else if (button.customId.startsWith("sparksupport:")) {
      const choice = button.customId.slice(13);
      const sparkModule = this.client.getModule(
        "sparkuniverse"
      ) as SparkUniverse;
      if (!sparkModule) return;

      const handler: Function =
        sparkModule[`supportHandle${titleCase(choice, "_", false)}`];
      if (!handler || typeof handler != "function")
        return await button.error("BUTTON_SUPPORT_CHOICE_INVALID");
      else return await handler.bind(sparkModule)(button);
    }

    if (button.customId.startsWith("gfuelambassador_")) {
      const type = button.customId.slice(16) as GFuelType;
      if (!type || !validGFuelTypes[type]) return;
      const categoryId = validGFuelTypes[type];
      if (!categoryId) return;

      const gfuelGuild = this.client.guilds.cache.get(
        "1063167289475747860"
      ) as FireGuild;
      const category = gfuelGuild.channels.cache.get(
        categoryId
      ) as CategoryChannel;

      const modalPromise = new Promise((resolve) => {
        this.client.modalHandlersOnce.set(
          `gfuel_confirm_${button.author.id}`,
          resolve
        );
      }) as Promise<ModalMessage>;
      const modalObj = new Modal()
        .setTitle("G Fuel Ambassador Tickets")
        .setCustomId(`gfuel_confirm_${button.author.id}`);
      if (type == "twitch")
        modalObj.addComponents(...twitchGFuelModalComponents);
      else if (type == "verification")
        modalObj.addComponents(...verifGFuelModalComponents);
      else modalObj.addComponents(...defaultGFuelModalComponents);
      await button.component.showModal(modalObj);

      const modal = await modalPromise;
      await modal.channel.ack();
      modal.flags = 64;

      let additionalFields: EmbedFieldData[], subject: string;
      if (type == "verification") {
        subject = "Verification";
        const email = modal.getTextInputValue("email"),
          code = modal.getTextInputValue("code"),
          fullName = modal.getTextInputValue("fullname"),
          alias = modal.getTextInputValue("alias");
        additionalFields = [
          {
            name: "Email",
            value: email,
          },
          {
            name: "Ambassador Code",
            value: code,
          },
          {
            name: "Full Name",
            value: fullName,
          },
          {
            name: "Alias",
            value: alias,
          },
        ];
      } else if (type == "twitch") {
        subject = modal.getTextInputValue("subject");
        const username = modal.getTextInputValue("username"),
          code = modal.getTextInputValue("code");
        additionalFields = [
          {
            name: "Twitch Username",
            value: username,
          },
          {
            name: "Ambassador Code",
            value: code,
          },
        ];
      } else {
        subject = modal.getTextInputValue("subject");
        const email = modal.getTextInputValue("email"),
          code = modal.getTextInputValue("code");
        additionalFields = [
          {
            name: "Email",
            value: email,
          },
          {
            name: "Ambassador Code",
            value: code,
          },
        ];
      }

      const ticket = await gfuelGuild.createTicket(
        button.member,
        subject,
        undefined,
        category,
        undefined,
        additionalFields
      );
      if (!(ticket instanceof FireTextChannel)) {
        // how?
        if (ticket == "blacklisted") return;
        else if (typeof ticket == "string" && ticket == "author")
          return await modal.error("COMMAND_ERROR_500_CTX", {
            status: constants.url.fireStatus,
            ctx: "GUILD_ID_MISMATCH",
          });
        else if (ticket == "disabled")
          return await modal.error("NEW_TICKET_DISABLED");
        else if (ticket == "limit")
          return await modal.error("NEW_TICKET_LIMIT");
        else if (ticket == "lock")
          return await modal.error("NEW_TICKET_LOCK", {
            limit: button.guild.settings.get<number>("tickets.limit", 1),
          });
        else if (ticket == "toggled")
          return await modal.error("NEW_TICKET_TOGGLED", {
            message: button.guild.settings.get<string>("tickets.togglemsg"),
          });
        else
          return await modal.error("COMMAND_ERROR_500_CTX", {
            status: constants.url.fireStatus,
            ctx: `UNEXPECTED_RETURN_VALUE: ${ticket}`,
          });
      } else
        await modal
          .success("NEW_TICKET_CREATED", {
            channel: ticket.toString(),
          })
          .catch(() => {});
    }

    if (button.customId.startsWith("mclogscan:")) {
      const logScan = this.client.getCommand("minecraft-log-scan") as LogScan;
      button.flags = 64;
      if (button.channel.type == "DM")
        return await button.error("MINECRAFT_LOGSCAN_MANAGE_DMS");
      else if (!button.member?.isAdmin(button.channel))
        return await button
          .error("MINECRAFT_LOGSCAN_MANAGE_ADMIN_ONLY")
          .catch(() => {});

      const action = button.customId.slice(10);
      if (action == "toggle") {
        const current = button.guild.settings.get<boolean>(
          "minecraft.logscan",
          false
        );

        if (!current && button.author.hasExperiment(3324162204, 1))
          return await button.component.showModal(
            new Modal()
              .setTitle(button.language.get("MINECRAFT_LOGSCAN_MODAL_TITLE"))
              .setCustomId("mclogscan:toggle")
              .addComponents(
                new TextDisplayComponent({
                  content: button.language.get("MINECRAFT_LOGSCAN_MODAL_DESC"),
                }).setId(1),
                new LabelComponent()
                  .setId(2)
                  .setLabel(
                    button.language.get("MINECRAFT_LOGSCAN_MODAL_LABEL")
                  )
                  .setDescription(
                    button.language.get("MINECRAFT_LOGSCAN_MODAL_LABEL_DESC")
                  )
                  .setComponent(
                    new CheckboxGroupComponent()
                      .setCustomId("agreement")
                      .addOptions([
                        {
                          label: button.language.get(
                            "MINECRAFT_LOGSCAN_MODAL_AGREEMENT"
                          ),
                          value: "true",
                        },
                      ])
                      .setRequired(true)
                  )
              )
          );

        await button.guild.settings.set(
          "minecraft.logscan",
          !current,
          button.author
        );
        if (button.guild.settings.get("minecraft.logscan", current) == current)
          return await button.success("MINECRAFT_LOGSCAN_TOGGLE_FAIL");
        const components = logScan.getMenuComponents(button);
        await button.channel.update({ components });
        return await button.success(
          !current ? "MINECRAFT_LOGSCAN_ENABLED" : "MINECRAFT_LOGSCAN_DISABLED"
        );
      } else if (action == "solution") {
        const solutionsPrevented =
          button.message.content.includes(
            button.guild.language.get("MC_LOG_CRACKED")
          ) ||
          button.message.content.includes(
            button.guild.language.get("MC_LOG_CHEATS_FOUND")
          ) ||
          button.message.content.includes(
            button.guild.language.get("MC_LOG_MOBILE_UNSUPPORTED")
          );
        if (solutionsPrevented)
          return await button.error("MINECRAFT_LOGSCAN_SOLUTION_UNSUPPORTED");
        const logURL = (
          (button.message?.components[0] as MessageActionRow)
            ?.components[0] as MessageButton
        )?.url;
        if (!logURL)
          return await button.error("MINECRAFT_LOGSCAN_SOLUTION_MISSING_LOG");
        const mentions = button.message?.mentions.users;
        if (!button.member?.isModerator() && (!mentions || !mentions.size))
          return await button.error("MINECRAFT_LOGSCAN_SOLUTION_MISSING_USER");
        else if (
          !mentions.has(button.author.id) &&
          !button.member?.isModerator()
        )
          return await button.error("MINECRAFT_LOGSCAN_SOLUTION_INVALID_USER");
        return await button.component.showModal(
          new Modal()
            .setTitle(
              button.language.get("MINECRAFT_LOGSCAN_SOLUTION_MODAL_TITLE")
            )
            .setCustomId(`mclogscan:solution:${logURL.split("://")[1]}`)
            .addComponents(
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("description")
                  .setRequired(true)
                  .setLabel(
                    button.language.get(
                      "MINECRAFT_LOGSCAN_SOLUTION_MODAL_DESC_LABEL"
                    )
                  )
                  .setPlaceholder(
                    button.language.get(
                      "MINECRAFT_LOGSCAN_SOLUTION_MODAL_DESC_PLACEHOLDER"
                    )
                  )
                  .setStyle(TextInputStyles.PARAGRAPH)
                  .setMinLength(64)
                  .setMaxLength(4000)
              ),
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("solution")
                  .setRequired(true)
                  .setLabel(
                    button.language.get(
                      "MINECRAFT_LOGSCAN_SOLUTION_MODAL_SOLUTION_LABEL"
                    )
                  )
                  .setPlaceholder(
                    button.language.get(
                      "MINECRAFT_LOGSCAN_SOLUTION_MODAL_SOLUTION_PLACEHOLDER"
                    )
                  )
                  .setStyle(TextInputStyles.PARAGRAPH)
                  .setMinLength(30)
                  .setMaxLength(2000)
              )
            )
        );
      }
    }

    if (button.customId.startsWith("snooze:")) {
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          button.author.language.get("REMINDER_SNOOZE_PLACEHOLDER")
        )
        .setCustomId(`!${button.customId}`)
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(
          Object.entries(reminderSnoozeTimes).map(([key, time]) => {
            return {
              label: button.author.language.get(
                key as keyof typeof reminderSnoozeTimes
              ),
              value:
                typeof time == "number"
                  ? (button.createdTimestamp + time).toString()
                  : time,
            };
          })
        );
      return await button.channel.send({
        components: [new MessageActionRow().addComponents(dropdown)],
      });
    } else if (button.customId == "complete_reminder") {
      const hasReminderContentEmbed =
        button.message.embeds.length &&
        // this specific color is used for the embed with the reminder content
        // whenever the content is too long for the main message content
        button.message.embeds[0].color == 3066993;

      const originalContent = hasReminderContentEmbed
        ? button.message.embeds[0].description
        : button.message.content;
      let content = originalContent.split("\n");

      // FIRE-D6S
      // With longer content, the addition of formatting can push it beyond
      // the 4096 character limit for embed descriptions, however,
      // since we're marking a reminder as complete, the entire content
      // is likely no longer needed so cutting it short should be fine
      if (originalContent.length >= 3950)
        content = this.client.util
          .shortenText(originalContent, 3950)
          .split("\n");

      content = content.map((line) => {
        if (line.length)
          return Formatters.strikethrough(this.client.util.supressLinks(line));
      });
      return await button.channel.update(
        hasReminderContentEmbed
          ? {
              content: Formatters.strikethrough(button.message.content),
              embeds: [
                button.message.embeds[0].setDescription(content.join("\n")),
              ],
              components: button.message.components
                .filter((c) => c instanceof MessageActionRow)
                .map((row) => {
                  row.components = row.components.map((component) =>
                    component.setDisabled(true)
                  );
                  return row;
                }),
            }
          : {
              content: content.join("\n"),
              components: button.message.components
                .filter((c) => c instanceof MessageActionRow)
                .map((row) => {
                  row.components = row.components.map((component) => {
                    component.setDisabled(
                      component.type == "BUTTON"
                        ? component.style != "LINK"
                        : true
                    );
                    if (component.customId == "!complete_reminder")
                      (component as MessageButton).setLabel(
                        button.language.get(
                          "REMINDER_COMPLETE_BUTTON_COMPLETED",
                          {
                            time: this.client.util.getTimestamp(
                              button.createdAt,
                              button.language,
                              button.author.timezone
                            ),
                          }
                        )
                      );
                    return component;
                  });
                  return row;
                }),
            }
      );
    }

    if (
      button.customId == "googleauth" &&
      button.author.hasExperiment(2100999090, 1)
    ) {
      button.flags = 64;
      await button.channel.ack();
      const google = this.client.getCommand("google") as Google;
      const auth = await google.getAssistantAuthUrl(button);
      if (!auth) return await button.error("GOOGLE_AUTH_ERROR");
      else if (auth.success == false)
        return await button.error(`GOOGLE_AUTH_ERROR_${auth.error}`);
      else
        return await button.send("GOOGLE_AUTH_LEARN_AND_LINK", {
          components: [
            new MessageActionRow().addComponents(
              new MessageButton()
                .setStyle("LINK")
                .setLabel(button.language.get("GOOGLE_AUTH_BUTTON_LABEL"))
                .setURL(auth.url)
                .setEmoji("769207087674032129")
            ),
          ],
        });
    } else if (button.customId == "googleauthn't") {
      button.flags = 64;
      await button.channel.ack();
      const authnot = await button.author.settings.set(
        "assistant.noauthprompt",
        false
      );
      if (authnot) await button.success("GOOGLE_AUTHNOT");
      else
        return await button.error("COMMAND_ERROR_500", {
          status: constants.url.fireStatus,
        });
    }

    if (button.customId.startsWith("deploy:") && button.author.isSuperuser()) {
      await button.channel.ack();
      await button.delete("@original");
      const commit = button.customId.slice(7);
      // i should probably make this less jank
      const commitMessage =
        codeblockTypeCaster(
          null,
          (button.message as FireMessage).embeds[0].fields[0].value
        )?.content.trim() ?? "Commit Message Unknown";
      const branch = getBranch();
      const githubChannel = this.client.channels.cache.get(
        this.client.config.githubChannelId
      ) as NewsChannel;
      let threadId: Snowflake;
      if (githubChannel) {
        const messages = await githubChannel.messages
          .fetch({ limit: 10 })
          .catch(() => {});
        if (messages) {
          const commitMsg = messages.find(
            (m) =>
              m.embeds.length && m.embeds[0].title.startsWith(`[bot:${branch}]`)
          );
          if (commitMsg)
            if (commitMsg.hasThread) threadId = commitMsg.id;
            else {
              const thread = await commitMsg
                .startThread({
                  name: "Deploy Log",
                  autoArchiveDuration: 1440,
                })
                .catch(() => {});
              if (thread) threadId = thread?.id;
            }
        }
      }
      return this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.DEPLOY, {
            commit,
            branch,
            threadId,
            message: commitMessage,
          })
        )
      );
    }

    if (button.customId.startsWith("reminders-list-page:")) {
      const [, userId, page] = button.customId.split(":") as [
        string,
        Snowflake,
        `${number}`,
      ];
      if (button.author.id != userId) return;

      const remindersList = this.client.getCommand(
        "reminders-list"
      ) as RemindersList;
      const components = await remindersList.getReminderListComponents(
        button,
        +page
      );
      if (!components || !("dropdown" in components)) return;

      const { dropdown, previousPageButton, nextPageButton } = components;
      return await button.edit({
        components: [
          new MessageActionRow().addComponents([dropdown]),
          previousPageButton && nextPageButton
            ? new MessageActionRow().addComponents([
                previousPageButton,
                nextPageButton,
              ])
            : undefined,
        ].filter((c) => !!c),
      });
    }

    if (button.customId.startsWith("reminders-edit:")) {
      const [, userId, timestamp] = button.customId.split(":") as [
        string,
        Snowflake,
        `${number}`,
      ];
      if (button.author.id != userId) return;

      const date = new Date(+timestamp);
      if (date <= new Date()) {
        const dropdown = (button.message.components[0] as MessageActionRow)
          .components[0] as MessageSelectMenu;
        dropdown.options = dropdown.options.filter(
          (option) => +option.value > +new Date()
        );
        dropdown.options.forEach((option) => (option.default = false));
        await button.message
          .edit({
            components: button.message.components,
          })
          .catch(() => {});
        return await button.error("REMINDERS_EDIT_PAST_DATE");
      }

      const reminder = await this.client.db
        .query<{
          reminder: string;
        }>("SELECT reminder FROM remind WHERE uid=$1 AND forwhen=$2", [
          userId,
          date,
        ])
        .first();
      if (!reminder)
        return await button.error("REMINDERS_EDIT_INVALID_SELECTION");

      const text = reminder.reminder;
      return await button.component.showModal(
        new Modal()
          .setCustomId(button.customId)
          .setTitle(button.language.get("REMINDERS_EDIT_TITLE"))
          .addComponents(
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("reminder")
                .setLabel(button.language.get("REMINDERS_EDIT_CONTENT_LABEL"))
                .setValue(text)
                .setMinLength(1)
                .setStyle(TextInputStyles.PARAGRAPH)
            ),
            new MessageActionRow<ModalActionRowComponent>().addComponents(
              new TextInputComponent()
                .setCustomId("time")
                .setLabel(button.language.get("REMINDERS_EDIT_TIME_LABEL"))
                .setPlaceholder(
                  button.language.get("REMINDERS_EDIT_TIME_PLACEHOLDER")
                )
                .setStyle(TextInputStyles.SHORT)
            )
          )
      );
    }

    if (button.customId.startsWith("reminders-delete:")) {
      const [, userId, timestamp] = button.customId.split(":") as [
        string,
        Snowflake,
        `${number}`,
      ];
      if (button.author.id != userId) return;

      // all reminder related responses are ephemeral
      // sp we update the flags here so the responses
      // from RemindersDelete#actuallyRun are also ephemeral
      button.flags = 64;

      const remindersDelete = this.client.getCommand(
        "reminders-delete"
      ) as RemindersDelete;
      // we unfortunately don't have the ability to update the components
      // to remove the deleted reminder when we do it this way
      // but that'd also require updating the embed if it was selected
      // which I cba to do anyways so this is good enough
      return await remindersDelete.actuallyRun(button, { reminder: timestamp });
    }

    if (
      button.customId.startsWith(`avatar:`) &&
      (button.customId.includes(":guild:") ||
        button.customId.includes(":global:"))
    ) {
      const [, userId, type, authorId] = button.customId.split(":") as [
        string,
        Snowflake,
        "guild" | "global",
        Snowflake,
      ];
      if (type == "guild" && !button.guild)
        return await button.error("AVATAR_BUTTON_NO_GUILD");
      const user = (await (
        type == "global" ? this.client.users : button.guild.members
      )
        .fetch(userId)
        .catch(() => {})) as FireMember | FireUser;
      if (!user || typeof user.displayAvatarURL != "function")
        return await button.error(
          type == "global"
            ? "USER_NOT_FOUND_COMPONENT"
            : "MEMBER_NOT_FOUND_COMPONENT"
        );
      if (user instanceof FireMember && !user.avatar)
        return await button.error("AVATAR_NO_GUILD_AVATAR");
      const embed = new MessageEmbed()
        .setColor(button.member?.displayColor || "#FFFFFF")
        .setTimestamp()
        .setTitle(
          button.language.get("AVATAR_TITLE", { user: user.toString() })
        )
        .setImage(
          user.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        );

      const actionRow = new MessageActionRow().addComponents(
        new MessageButton()
          .setLabel(
            button.language.get(
              type == "global"
                ? "AVATAR_SWITCH_TO_GUILD"
                : "AVATAR_SWITCH_TO_GLOBAL"
            )
          )
          .setStyle("PRIMARY")
          .setCustomId(
            `avatar:${userId}:${type == "global" ? "guild" : "global"}:${
              button.author.id
            }`
          )
      );

      if (authorId == button.author.id)
        return await button.edit({
          embeds: [embed],
          components: [actionRow],
        });
      else {
        button.flags = 64;
        return await (message.flags.has("EPHEMERAL")
          ? button.channel.update({
              embeds: [embed],
              components: [actionRow],
            })
          : button.channel.send({
              embeds: [embed],
              components: [actionRow],
            }));
      }
    }

    if (
      message &&
      validPaginatorIds.includes(button.customId) &&
      message?.paginator &&
      message.paginator.ready &&
      message.paginator.owner?.id == button.author.id
    )
      await message?.paginator.buttonHandler(button).catch(() => {});
    else if (
      button.customId == "close" &&
      !(button.channel?.messages?.cache?.get(button.message?.id) as FireMessage)
        ?.paginator
    )
      await message?.delete().catch(() => {});
  }
}
