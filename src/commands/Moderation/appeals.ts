import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import { constants } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import * as centra from "centra";
import { Snowflake } from "discord-api-types/globals";
import {
  APICheckboxGroupOption,
  APIRadioGroupOption,
  APISelectMenuOption,
  PermissionFlagsBits,
} from "discord-api-types/v9";
import {
  ChannelSelectMenu,
  CheckboxComponent,
  CheckboxGroupComponent,
  ContainerComponent,
  FileComponent,
  FileUploadComponent,
  GuildPreview,
  LabelComponent,
  MediaGalleryComponent,
  MediaGalleryItem,
  MessageActionRow,
  MessageAttachment,
  MessageButton,
  MessageSelectMenu,
  Modal,
  RadioGroupComponent,
  SectionComponent,
  SeparatorComponent,
  StringSelectMenu,
  TextDisplayComponent,
  TextInputComponent,
  ThumbnailComponent,
} from "discord.js";
import {
  ChannelTypes,
  MessageButtonStyles,
  MessageComponentTypes,
  SeparatorComponentSpacing,
  TextInputStyles,
} from "discord.js/typings/enums";
import { TOptions } from "i18next";

export type AppealStatus =
  | "not_appealed"
  | "appealed"
  | "accepted"
  | "rejected";

export type AppealsConfig = {
  channel: Snowflake;
  notBefore: number;
  notAfter: number;
  items: AppealFormItem[];
  language: string;
};

export type AppealFormItem =
  | AppealFormDropdownItem
  | AppealFormTextInputItem
  | AppealFormFileUploadItem
  | AppealFormCheckboxItem
  | AppealFormCheckboxGroupItem
  | AppealFormRadioGroupItem;

export type AppealFormDropdownItem = {
  type: MessageComponentTypes.STRING_SELECT;
  label: string;
  description: string;
  placeholder: string;
  options: APISelectMenuOption[];
  required: boolean;
};

export type AppealFormTextInputItem = {
  type: MessageComponentTypes.TEXT_INPUT;
  label: string;
  description: string;
  placeholder: string;
  style: TextInputStyles;
  required: boolean;
};

export type AppealFormFileUploadItem = {
  type: MessageComponentTypes.FILE_UPLOAD;
  label: string;
  description: string;
  minFiles: number;
  maxFiles: number;
  required: boolean;
};

export type AppealFormCheckboxItem = {
  type: MessageComponentTypes.CHECKBOX;
  label: string;
  description: string;
  default: boolean;
};

export type AppealFormCheckboxGroupItem = {
  type: MessageComponentTypes.CHECKBOX_GROUP;
  label: string;
  description: string;
  options: APICheckboxGroupOption[];
  minValues: number;
  maxValues: number;
  required: boolean;
};

export type AppealFormRadioGroupItem = {
  type: MessageComponentTypes.RADIO_GROUP;
  label: string;
  description: string;
  options: APIRadioGroupOption[];
  required: boolean;
};

type AppealFileObject = {
  url?: string;
  fileId: string;
  originalName: string;
  contentType: string;
};

export type AppealContainerData = {
  user: FireUser;
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
    created: Date;
    reason: string;
    moderator: FireUser;
  };
};

export default class Appeals extends Command {
  constructor() {
    super("appeals", {
      description: (language: Language) =>
        language.get("APPEALS_COMMAND_DESCRIPTION"),
      clientPermissions: [PermissionFlagsBits.BanMembers],
      userPermissions: [PermissionFlagsBits.BanMembers],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async run(command: ApplicationCommandMessage) {
    const config = await this.getAppealsConfig(command.guild);
    const container = this.getAppealsContainer(command, config);
    return await command.channel.send({ components: [container] });
  }

  getAppealsContainer(
    command: ApplicationCommandMessage | ComponentMessage | ModalMessage,
    config: AppealsConfig
  ) {
    const get = (key: LanguageKeys, opt: TOptions = {}) =>
      command.guild.language.get(key, opt);

    const container = new ContainerComponent().setColor(
      command.member.displayColor || "#FFFFFF"
    );
    let header: SectionComponent | TextDisplayComponent;
    if (command.guild.icon)
      header = new SectionComponent()
        .setAccessory(
          new ThumbnailComponent().setMedia(
            command.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
        )
        .addComponents([
          new TextDisplayComponent({
            content: get("APPEALS_CONTAINER_HEADER", {
              guild: command.guild.toString(),
            }),
          }),
        ]);
    else
      header = new TextDisplayComponent({
        content: get("APPEALS_CONTAINER_HEADER", {
          guild: command.guild.toString(),
        }),
      });
    container.addComponents(
      header,
      new SeparatorComponent()
        .displayDivider(true)
        .setSpacing(SeparatorComponentSpacing.SMALL)
    );

    const channelDropdown = new ChannelSelectMenu()
      .setPlaceholder(
        command.language.get("APPEALS_CHANNEL_SELECT_PLACEHOLDER")
      )
      .setChannelTypes(ChannelTypes.GUILD_TEXT)
      .setCustomId("appeals:channel")
      .setMinValues(0)
      .setMaxValues(1);
    if (config.channel && command.guild.channels.cache.has(config.channel))
      channelDropdown.setDefaultValues({ id: config.channel, type: "channel" });

    const notBeforeAndNotAfterDisplay = new TextDisplayComponent({
      content: get("APPEALS_NOT_BEFORE_AND_NOT_AFTER_DISPLAY", {
        notBefore: config.notBefore
          ? get("APPEALS_NOT_BEFORE_SET", {
              time: this.client.util.getRelativeTimeString(
                +new Date() + config.notBefore,
                command.guild.language
              ),
            })
          : get("APPEALS_NOT_BEFORE_UNSET"),
        notAfter: config.notAfter
          ? get("APPEALS_NOT_AFTER_SET", {
              time: this.client.util.getRelativeTimeString(
                +new Date() + config.notBefore + config.notAfter,
                command.guild.language
              ),
            })
          : get("APPEALS_NOT_AFTER_UNSET"),
      }),
    });

    const addFormItemButton = new MessageButton()
        .setCustomId("!appeals:addFormItem")
        .setStyle(MessageButtonStyles.PRIMARY)
        .setLabel(command.language.get("APPEALS_ADD_FORM_ITEM_BUTTON"))
        .setDisabled(!config.channel),
      editFormItemButton = new MessageButton()
        .setCustomId("!appeals:editFormItem")
        .setStyle(MessageButtonStyles.SECONDARY)
        .setLabel(command.language.get("APPEALS_EDIT_FORM_ITEM_BUTTON"))
        .setDisabled(!config.channel),
      removeFormItemButton = new MessageButton()
        .setCustomId("!appeals:removeFormItem")
        .setStyle(MessageButtonStyles.DANGER)
        .setLabel(command.language.get("APPEALS_REMOVE_FORM_ITEM_BUTTON"))
        .setDisabled(!config.channel);
    const setNotBeforeButton = new MessageButton()
        .setCustomId("!appeals:setNotBefore")
        .setStyle(MessageButtonStyles.PRIMARY)
        .setLabel(command.language.get("APPEALS_SET_NOT_BEFORE_BUTTON"))
        .setDisabled(!config.channel),
      setNotAfterButton = new MessageButton()
        .setCustomId("!appeals:setNotAfter")
        .setStyle(MessageButtonStyles.DANGER)
        .setLabel(command.language.get("APPEALS_SET_NOT_AFTER_BUTTON"))
        .setDisabled(!config.channel);

    const previewAppealFormButton = new MessageButton()
        .setURL(`${constants.url.website}/appeals/preview/${command.guildId}`)
        .setStyle(MessageButtonStyles.LINK)
        .setLabel(command.language.get("APPEALS_PREVIEW_FORM_BUTTON"))
        .setDisabled(!config.channel),
      previewInAppFormButton = new MessageButton()
        .setCustomId("!appeals:preview")
        .setStyle(MessageButtonStyles.SECONDARY)
        .setLabel(command.language.get("APPEALS_PREVIEW_APP_FORM_BUTTON"))
        .setDisabled(!config.channel);

    container.addComponents(
      new MessageActionRow().addComponents(channelDropdown),
      new MessageActionRow().addComponents(
        addFormItemButton,
        editFormItemButton,
        removeFormItemButton
      ),
      new SeparatorComponent()
        .displayDivider(true)
        .setSpacing(SeparatorComponentSpacing.SMALL),
      notBeforeAndNotAfterDisplay,
      new MessageActionRow().addComponents(
        setNotBeforeButton,
        setNotAfterButton
      ),
      new SeparatorComponent()
        .displayDivider(true)
        .setSpacing(SeparatorComponentSpacing.SMALL),
      new MessageActionRow().addComponents(
        previewAppealFormButton,
        previewInAppFormButton
      )
    );

    return container;
  }

  async getAppealsConfig(guild: FireGuild) {
    let dbResult = await this.client.db
      .query<{
        notbefore: bigint;
        notafter: bigint;
        items: AppealFormItem[];
      }>("SELECT notbefore, notafter, items FROM appeals WHERE gid=$1;", [
        typeof guild == "string" ? guild : guild.id,
      ])
      .first()
      .catch((e: Error) => e);
    if (dbResult instanceof Error) return null;
    else if (!dbResult)
      dbResult = await this.client.db
        .query<{
          notbefore: bigint;
          notafter: bigint;
          items: AppealFormItem[];
        }>(
          "INSERT INTO appeals (gid) VALUES ($1) RETURNING notbefore, notafter, items;",
          [typeof guild == "string" ? guild : guild.id]
        )
        .first();
    return {
      channel: guild.settings.get<Snowflake>("appeals.channel"),
      notBefore: Number(dbResult.notbefore),
      notAfter: Number(dbResult.notafter),
      items: dbResult.items,
    } as AppealsConfig;
  }

  async getAppealSubmitContainer(data: AppealContainerData) {
    const guild = this.client.guilds.cache.get(data.guildId) as FireGuild,
      language = guild.language,
      user = data.user,
      entry = data.entry,
      moderator = entry.moderator;

    const container = new ContainerComponent().setColor("#E74C3C");

    const header = new SectionComponent()
      .setAccessory(
        new ThumbnailComponent().setMedia(
          user.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
      )
      .addComponents([
        new TextDisplayComponent({
          content: language.get(
            !user.displayName || user.displayName == user.username
              ? "APPEAL_SUBMIT_HEADER"
              : "APPEAL_SUBMIT_HEADER_DISPLAY",
            {
              displayName: user.displayName,
              username: user.username,
            }
          ),
        }),
        new TextDisplayComponent({
          content:
            language.get("APPEAL_SUBMIT_BANNED_BY", {
              username: moderator.username,
              id: moderator.id,
            }) +
            "\n" +
            language.get("APPEAL_SUBMIT_REASON", { reason: entry.reason }) +
            "\n" +
            language.get("APPEAL_SUBMIT_CASE_ID", { caseID: entry.caseId }),
        }),
      ]);
    container.addComponents(
      header,
      new SeparatorComponent()
        .displayDivider(true)
        .setSpacing(SeparatorComponentSpacing.SMALL)
    );

    const formResponseComponents: (
      | [TextDisplayComponent, MessageActionRow]
      | TextDisplayComponent
      | [TextDisplayComponent, MediaGalleryComponent | FileComponent[]]
    )[] = [];
    const attachments: MessageAttachment[] = [];
    for (const [index, field] of data.form.fields.entries()) {
      const item = data.config.items[index];
      switch (item.type) {
        case MessageComponentTypes.STRING_SELECT: {
          formResponseComponents.push([
            new TextDisplayComponent({ content: `## ${item.label}` }),
            new MessageActionRow().addComponents(
              new MessageSelectMenu()
                .setCustomId(`IGNORE_ME${index}`)
                .setDisabled(true)
                .setPlaceholder(item.placeholder ?? "")
                .setMinValues(0)
                .setMaxValues(item.options.length)
                .addOptions(
                  item.options.map((option) => ({
                    label: option.label,
                    value: option.value,
                    description: option.description,
                    default: field.values.includes(option.value),
                    emoji: option.emoji.name,
                  }))
                )
            ),
          ]);
          break;
        }
        case MessageComponentTypes.TEXT_INPUT: {
          formResponseComponents.push(
            new TextDisplayComponent({
              content: `## ${item.label}` + "\n" + field.values[0],
            })
          );
          break;
        }
        case MessageComponentTypes.FILE_UPLOAD: {
          let files = data.form.attachments.filter((attach) =>
            field.values.includes(attach.fileId)
          );
          for (const file of files) {
            const req = await centra(
              "url" in file
                ? file.url
                : `${this.client.manager.REST_HOST}/v2/appeals/${data.appealId}/files/${file.fileId}`
            )
              .header("User-Agent", this.client.manager.ua)
              .header(
                "Authorization",
                "url" in file ? undefined : process.env.WS_AUTH
              )
              .timeout(10000)
              .send()
              .catch(() => {});
            if (req && req.statusCode >= 200 && req.statusCode <= 299)
              attachments.push(
                new MessageAttachment(req.body, file.originalName)
              );
            else files = files.filter((attach) => attach.fileId != file.fileId);
          }
          const allMedia =
            files.length &&
            files.every(
              (file) =>
                (file.contentType?.startsWith("image/") ||
                  file.contentType?.startsWith("video/")) &&
                attachments.find((attach) => attach.name == file.originalName)
            );
          if (allMedia) {
            formResponseComponents.push([
              new TextDisplayComponent({
                content: `## ${item.label}`,
              }),
              new MediaGalleryComponent().addItems(
                files.map((file) =>
                  new MediaGalleryItem().setMedia(
                    `attachment://${file.originalName}`
                  )
                )
              ),
            ]);
            break;
          } else {
            const validFiles = files.filter((file) =>
              attachments.find((attach) => attach.name == file.originalName)
            );
            if (validFiles.length)
              formResponseComponents.push([
                new TextDisplayComponent({
                  content: `## ${item.label}`,
                }),
                validFiles.map((file) =>
                  new FileComponent().setFile(encodeURI(file.originalName))
                ),
              ]);
            break;
          }
        }
        case MessageComponentTypes.CHECKBOX: {
          formResponseComponents.push(
            new TextDisplayComponent({
              content: `${this.client.util.useEmoji(field.values.includes("true") ? "success" : "error")} ${item.label}`,
            })
          );
          break;
        }
        case MessageComponentTypes.CHECKBOX_GROUP: {
          formResponseComponents.push([
            new TextDisplayComponent({ content: `## ${item.label}` }),
            new MessageActionRow().addComponents(
              new MessageSelectMenu()
                .setCustomId(`IGNORE_ME${index}`)
                .setDisabled(true)
                .setMinValues(1)
                .setMaxValues(item.options.length)
                .addOptions(
                  item.options.map((option) => ({
                    label: option.label,
                    value: option.value,
                    description: option.description,
                    default: field.values.includes(option.value),
                  }))
                )
            ),
          ]);
          break;
        }
        case MessageComponentTypes.RADIO_GROUP: {
          formResponseComponents.push([
            new TextDisplayComponent({ content: `## ${item.label}` }),
            new MessageActionRow().addComponents(
              new MessageSelectMenu()
                .setCustomId(`IGNORE_ME${index}`)
                .setDisabled(true)
                .setMinValues(1)
                .setMaxValues(item.options.length)
                .addOptions(
                  item.options.map((option) => ({
                    label: option.label,
                    value: option.value,
                    description: option.description,
                    default: field.values.includes(option.value),
                  }))
                )
            ),
          ]);
          break;
        }
      }
    }

    for (const response of formResponseComponents) {
      if (Array.isArray(response))
        for (const component of response)
          container.addComponents(
            Array.isArray(component) ? component : [component]
          );
      else container.addComponents(response);
      if (
        (Array.isArray(response) && response.length) ||
        !Array.isArray(response)
      )
        container.addComponents(new SeparatorComponent().displayDivider(true));
    }

    const acceptAppealButton = new MessageButton()
        .setCustomId(`appeal:accept:${entry.caseId}`)
        .setStyle(MessageButtonStyles.SUCCESS)
        .setLabel(language.get("APPEAL_SUBMIT_ACCEPT_BUTTON")),
      rejectAppealButton = new MessageButton()
        .setCustomId(`appeal:reject:${entry.caseId}`)
        .setStyle(MessageButtonStyles.DANGER)
        .setLabel(language.get("APPEAL_SUBMIT_REJECT_BUTTON")),
      userIdDisplay = new TextDisplayComponent({
        content: language.get("APPEAL_SUBMIT_FOOTER", { id: user.id }),
      });
    container.addComponents(
      new MessageActionRow().addComponents(
        acceptAppealButton,
        rejectAppealButton
      ),
      userIdDisplay
    );

    return { container, attachments };
  }

  getAppealSubmitModal(
    context: ApplicationCommandMessage | ComponentMessage,
    config: AppealsConfig,
    guild: FireGuild | GuildPreview,
    appealId: string,
    preview: boolean = false
  ) {
    const modal = new Modal()
      .setCustomId(`appeal:${preview ? "preview" : "submit"}:${appealId}`)
      .setTitle(
        context.language.get(
          preview
            ? "APPEALS_MODAL_PREVIEW_TITLE"
            : "APPEALS_MODAL_SUBMIT_TITLE",
          { server: guild?.name ?? "Unknown" }
        )
      );

    for (const [index, item] of config.items.entries()) {
      switch (item.type) {
        case MessageComponentTypes.SELECT_MENU: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new StringSelectMenu()
                  .setCustomId(index.toString())
                  .setPlaceholder(item.placeholder ?? "")
                  .setRequired(item.required)
                  .setMinValues(item.required ? 1 : 0)
                  .setMaxValues(1)
                  .setOptions(
                    item.options.map((option) => ({
                      label: option.label,
                      value: option.value,
                      description: option.description,
                      default: option.default,
                      emoji: option.emoji?.id ?? option.emoji?.name,
                    }))
                  )
              )
          );
          break;
        }
        case MessageComponentTypes.TEXT_INPUT: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new TextInputComponent()
                  .setCustomId(index.toString())
                  .setPlaceholder(item.placeholder ?? "")
                  .setStyle(item.style)
                  .setRequired(item.required)
              )
          );
          break;
        }
        case MessageComponentTypes.FILE_UPLOAD: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new FileUploadComponent()
                  .setCustomId(index.toString())
                  .setMinValues(item.minFiles)
                  .setMaxValues(item.maxFiles)
                  .setRequired(item.required)
              )
          );
          break;
        }
        case MessageComponentTypes.CHECKBOX: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new CheckboxComponent()
                  .setCustomId(index.toString())
                  .setDefault(item.default)
              )
          );
          break;
        }
        case MessageComponentTypes.CHECKBOX_GROUP: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new CheckboxGroupComponent()
                  .setCustomId(index.toString())
                  .setRequired(item.required)
                  .setMinValues(
                    item.minValues > item.options.length
                      ? item.options.length
                      : item.minValues
                  )
                  .setMaxValues(
                    item.maxValues > item.options.length
                      ? item.options.length
                      : item.maxValues
                  )
                  .setOptions(
                    item.options.map((option) => ({
                      label: option.label,
                      value: option.value,
                      description: option.description,
                      default: option.default,
                    }))
                  )
              )
          );
          break;
        }
        case MessageComponentTypes.RADIO_GROUP: {
          modal.addComponents(
            new LabelComponent()
              .setLabel(item.label)
              .setDescription(item.description)
              .setComponent(
                new RadioGroupComponent()
                  .setCustomId(index.toString())
                  .setRequired(item.required)
                  .setOptions(
                    item.options.map((option) => ({
                      label: option.label,
                      value: option.value,
                      description: option.description,
                      default: option.default,
                    }))
                  )
              )
          );
          break;
        }
      }
    }

    return modal;
  }

  // KEEPING LONG REUSABLE COMPONENTS HERE

  stringSelectCreationComponents(
    language: Language,
    existing?: AppealFormDropdownItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_STRING_SELECT_LABEL_DESCRIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_STRING_SELECT_DESCRIPTION_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(language.get("PLACEHOLDER"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_STRING_SELECT_PLACEHOLDER_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("placeholder")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.placeholder : undefined)
        ),
      new LabelComponent()
        .setId(4)
        .setLabel(language.get("REQUIRED"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_STRING_SELECT_REQUIRED_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("required")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.required : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.required : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }

  textInputCreationComponents(
    language: Language,
    existing?: AppealFormTextInputItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT_LABEL_DESCRTIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_TEXT_INPUT_DESCRIPTION_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(language.get("PLACEHOLDER"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_TEXT_INPUT_PLACEHOLDER_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("placeholder")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.placeholder : undefined)
        ),
      new LabelComponent()
        .setId(4)
        .setLabel(language.get("STYLE"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT_STYLE_DESCRIPTION")
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("style")
            .addOptions([
              {
                label: language.get(
                  "APPEALS_CONFIG_UPDATE_TEXT_INPUT_STYLE_SHORT"
                ),
                value: "SHORT",
                default: existing
                  ? existing.style == TextInputStyles.SHORT
                  : false,
              },
              {
                label: language.get(
                  "APPEALS_CONFIG_UPDATE_TEXT_INPUT_STYLE_PARAGRAPH"
                ),
                value: "PARAGRAPH",
                default: existing
                  ? existing.style == TextInputStyles.PARAGRAPH
                  : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
      new LabelComponent()
        .setId(5)
        .setLabel(language.get("REQUIRED"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_TEXT_INPUT_REQUIRED_DESCRIPTION")
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("required")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.required : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.required : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }

  fileUploadCreationComponents(
    language: Language,
    existing?: AppealFormFileUploadItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_FILE_UPLOAD_LABEL_DESCRTIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_FILE_UPLOAD_DESCRIPTION_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(
          language.get("APPEALS_CONFIG_UPDATE_FILE_UPLOAD_MIN_FILES_LABEL")
        )
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_FILE_UPLOAD_MIN_FILES_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("min")
            .addOptions(
              Array.from({ length: 10 }).map((_, i) => ({
                label: `${i + 1}`,
                value: `${i + 1}`,
                default: existing ? existing.minFiles == i + 1 : false,
              }))
            )
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(1)
        ),
      new LabelComponent()
        .setId(4)
        .setLabel(
          language.get("APPEALS_CONFIG_UPDATE_FILE_UPLOAD_MAX_FILES_LABEL")
        )
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_FILE_UPLOAD_MAX_FILES_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("max")
            .addOptions(
              Array.from({ length: 10 }).map((_, i) => ({
                label: `${i + 1}`,
                value: `${i + 1}`,
                default: existing ? existing.maxFiles == i + 1 : false,
              }))
            )
            .setRequired(false)
            .setMinValues(0)
            .setMaxValues(1)
        ),
      new LabelComponent()
        .setId(5)
        .setLabel(language.get("REQUIRED"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_FILE_UPLOAD_REQUIRED_DESCRIPTION")
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("required")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.required : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.required : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }

  checkboxCreationComponents(
    language: Language,
    existing?: AppealFormCheckboxItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_LABEL_DESCRIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_DESCRIPTION_DESCRIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(language.get("DEFAULT"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_DEFAULT_DESCRIPTION")
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("default")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.default : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.default : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }

  checkboxGroupCreationComponents(
    language: Language,
    existing?: AppealFormCheckboxGroupItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_LABEL_DESCRIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_DESCRIPTION_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_MIN_VALUES_LABEL")
        )
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_MIN_VALUES_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("min")
            .addOptions(
              Array.from({ length: 11 }).map((_, i) => ({
                label: `${i}`,
                value: `${i}`,
                default: existing ? existing.minValues == i : false,
              }))
            )
            .setRequired(false)
            .setMinValues(1)
            .setMaxValues(1)
        ),
      new LabelComponent()
        .setId(4)
        .setLabel(
          language.get("APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_MAX_VALUES_LABEL")
        )
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_MAX_VALUES_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("max")
            .addOptions(
              Array.from({ length: 10 }).map((_, i) => ({
                label: `${i + 1}`,
                value: `${i + 1}`,
                default: existing ? existing.maxValues == i + 1 : false,
              }))
            )
            .setRequired(false)
            .setMinValues(1)
            .setMaxValues(1)
        ),
      new LabelComponent()
        .setId(5)
        .setLabel(language.get("REQUIRED"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_CHECKBOX_GROUP_REQUIRED_DESCRIPTION"
          )
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("required")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.required : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.required : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }

  radioGroupCreationComponents(
    language: Language,
    existing?: AppealFormRadioGroupItem
  ) {
    return [
      new LabelComponent()
        .setId(1)
        .setLabel(language.get("LABEL"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_RADIO_GROUP_LABEL_DESCRIPTION")
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("label")
            .setRequired(true)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(100)
            .setValue(existing ? existing.label : undefined)
        ),
      new LabelComponent()
        .setId(2)
        .setLabel(language.get("DESCRIPTION"))
        .setDescription(
          language.get(
            "APPEALS_CONFIG_UPDATE_RADIO_GROUP_DESCRIPTION_DESCRIPTION"
          )
        )
        .setComponent(
          new TextInputComponent()
            .setCustomId("description")
            .setRequired(false)
            .setStyle(TextInputStyles.SHORT)
            .setMaxLength(250)
            .setValue(existing ? existing.description : undefined)
        ),
      new LabelComponent()
        .setId(3)
        .setLabel(language.get("REQUIRED"))
        .setDescription(
          language.get("APPEALS_CONFIG_UPDATE_RADIO_GROUP_REQUIRED_DESCRIPTION")
        )
        .setComponent(
          new MessageSelectMenu()
            .setCustomId("required")
            .addOptions([
              {
                label: language.get("YES"),
                value: "true",
                default: existing ? existing.required : false,
              },
              {
                label: language.get("NO"),
                value: "false",
                default: existing ? !existing.required : false,
              },
            ])
            .setMinValues(1)
            .setMaxValues(1)
        ),
    ];
  }
}
