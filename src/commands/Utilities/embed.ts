import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { parseTime } from "@fire/src/arguments/time";
import { Snowflake } from "discord-api-types/v9";
import {
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  Modal,
  ModalActionRowComponent,
  TextInputComponent,
} from "discord.js";
import * as tinycolor from "tinycolor2";
import { Value } from "ts-postgres";

interface EmbedData {
  id: string;
  createdBy: Snowflake;
  embed: MessageEmbed;
}

type EmbedBuilderButtonActionFull =
  | "embed-builder"
  | "embed-builder-add-field"
  | "embed-builder-edit-field"
  | "embed-builder-edit-field-content"
  | "embed-builder-edit-field-inline"
  | "embed-builder-remove-field";

type EmbedBuilderButtonAction =
  | "add-field"
  | "edit-field"
  | "edit-field-content"
  | "edit-field-inline"
  | "remove-field";

type EmbedBuilderDropdownAction =
  | "embed-builder"
  | "embed-builder-edit-field"
  | "embed-builder-remove-field";

type EmbedBuilderModalAction =
  | "embed-builder"
  | "embed-builder-add-field"
  | "embed-builder-edit-field";

type EmbedBuilderModalPart =
  | "title"
  | "desc"
  | "url"
  | "time"
  | "color"
  | "footer"
  | "image"
  | "thumbnail"
  | "author"
  | "add-field"
  | "edit-field"
  | `${number}`;

type EmbedBuilderDropdownValue =
  | "title"
  | "description"
  | "url"
  | "timestamp"
  | "color"
  | "footer"
  | "image"
  | "thumbnail"
  | "author";

const maybeColor = (phrase: string) =>
  phrase
    ? typeof tinycolor(phrase)?.isValid == "function" &&
      tinycolor(phrase).isValid()
      ? tinycolor(phrase)
      : undefined
    : undefined;

export default class Embed extends Command {
  constructor() {
    super("embed", {
      description: (language: Language) =>
        language.get("EMBED_COMMAND_DESCRIPTION"),
      args: [],
      enableSlashCommand: true,
      restrictTo: "all",
      slashOnly: true,
      group: true,
    });
  }

  async exec() {
    return; // base command isn't usable
  }

  async getEmbed(id: string) {
    const data = await this.client.db
      .query("SELECT uid, embed FROM embeds WHERE id=$1;", [id])
      .first()
      .catch(() => {});
    if (!data) return null;
    // @ts-ignore idk why this complains when APIEmbed from /v9 is *in* the type
    const embed = new MessageEmbed(data.get("embed") as APIEmbed);
    return {
      id,
      createdBy: data.get("uid") as Snowflake,
      embed,
    } as EmbedData;
  }

  async getEmbeds(ids: string[]) {
    const data = await this.client.db
      .query("SELECT id, uid, embed FROM embeds WHERE id=ANY($1);", [ids])
      .catch(() => {});
    if (!data) return null;
    const embeds: EmbedData[] = [];
    for await (const row of data) {
      // @ts-ignore idk why this complains when APIEmbed from /v9 is *in* the type
      const embed = new MessageEmbed(row.get("embed") as APIEmbed);
      embeds.push({
        id: row.get("id") as string,
        createdBy: row.get("uid") as Snowflake,
        embed,
      });
    }
    return embeds.sort((a, b) => ids.indexOf(a.id) - ids.indexOf(b.id));
  }

  getEmbedBuilderComponents(
    command: ApplicationCommandMessage | ComponentMessage | ModalMessage,
    id: string,
    hasFields = false
  ) {
    const singleItemsDropdown = new MessageSelectMenu()
      .setCustomId(`!embed-builder:${id}:${command.author.id}`)
      .setPlaceholder(
        command.language.get("EMBED_BUILDER_SINGLE_ITEMS_PLACEHOLDER")
      )
      .addOptions([
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_TITLE"),
          value: "title",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_TITLE_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_DESCRIPTION"),
          value: "description",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_DESCRIPTION_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_URL"),
          value: "url",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_URL_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_TIMESTAMP"),
          value: "timestamp",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_TIMESTAMP_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("COLOR"),
          value: "color",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_COLOR_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_FOOTER"),
          value: "footer",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_FOOTER_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_IMAGE"),
          value: "image",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_IMAGE_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_THUMBNAIL"),
          value: "thumbnail",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_THUMBNAIL_DESCRIPTION"
          ),
        },
        {
          label: command.language.get("EMBED_BUILDER_SINGLE_ITEMS_AUTHOR"),
          value: "author",
          description: command.language.get(
            "EMBED_BUILDER_SINGLE_ITEMS_AUTHOR_DESCRIPTION"
          ),
        },
      ])
      .setMaxValues(1)
      .setMinValues(1);
    const singleItemsRow = new MessageActionRow().addComponents(
      singleItemsDropdown
    );

    // TODO: maybe add some emojis?
    const addFieldButton = new MessageButton()
        .setStyle("SUCCESS")
        .setCustomId(`!embed-builder-add-field:${id}:${command.author.id}`)
        .setLabel(command.language.get("EMBED_BUILDER_ADD_FIELD_BUTTON")),
      editFieldButton = new MessageButton()
        .setStyle("SECONDARY")
        .setCustomId(`embed-builder-edit-field:${id}:${command.author.id}`)
        .setLabel(command.language.get("EMBED_BUILDER_EDIT_FIELD_BUTTON"))
        .setDisabled(!hasFields),
      removeFieldButton = new MessageButton()
        .setStyle("DANGER")
        .setCustomId(`embed-builder-remove-field:${id}:${command.author.id}`)
        .setLabel(command.language.get("EMBED_BUILDER_REMOVE_FIELD_BUTTON"))
        .setDisabled(!hasFields);
    const buttonsRow = new MessageActionRow().addComponents([
      addFieldButton,
      editFieldButton,
      removeFieldButton,
    ]);

    return [singleItemsRow, buttonsRow];
  }

  async handleButton(button: ComponentMessage) {
    const [actionFull, id, uid, index] = button.customId.split(":") as [
      EmbedBuilderButtonActionFull,
      string,
      Snowflake,
      `${number}`
    ];
    if (!actionFull.startsWith("embed-builder") || button.author.id != uid)
      return;

    const action =
      actionFull == "embed-builder"
        ? actionFull
        : (actionFull.slice(14) as EmbedBuilderButtonAction);
    switch (action) {
      case "embed-builder": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await button.error("EMBED_BUILDER_ID_NOT_FOUND", { id });

        return await button.edit({
          content: button.language.get("EMBED_BUILDER", {
            sendcmd: this.client
              .getCommand("embed")
              .getSlashCommandMention(
                button.guild,
                this.client.getCommand("embed-send")
              ),
            id,
          }),
          embeds: [embed.embed],
          components: this.getEmbedBuilderComponents(
            button,
            id,
            !!embed.embed.fields.length
          ),
        });
      }
      case "add-field": {
        return await button.component.showModal(
          new Modal()
            .setCustomId(`embed-builder:add-field:${id}:${button.author.id}`)
            .setTitle(
              button.language.get("EMBED_BUILDER_ADD_FIELD_MODAL_TITLE")
            )
            .addComponents(
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("field-name")
                  .setLabel(
                    button.language.get("EMBED_BUILDER_ADD_FIELD_NAME_LABEL")
                  )
                  .setPlaceholder(
                    button.language.get(
                      "EMBED_BUILDER_ADD_FIELD_NAME_PLACEHOLDER"
                    )
                  )
                  .setRequired(true)
                  .setStyle("SHORT")
                  // technically max should be 256
                  // but that'll break adding an asterisk
                  // to identify the field being edited
                  // so we just bring it down by 1
                  .setMaxLength(255)
              ),
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("field-value")
                  .setLabel(
                    button.language.get("EMBED_BUILDER_ADD_FIELD_VALUE_LABEL")
                  )
                  .setPlaceholder(
                    button.language.get(
                      "EMBED_BUILDER_ADD_FIELD_VALUE_PLACEHOLDER"
                    )
                  )
                  .setRequired(true)
                  .setStyle("PARAGRAPH")
                  .setMaxLength(1024)
              )
            )
        );
      }
      case "edit-field": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await button.error("EMBED_BUILDER_ID_NOT_FOUND", { id });
        else if (!embed.embed.fields.length)
          return await button.error("EMBED_BUILDER_NO_FIELDS_TO_EDIT");

        const dropdown = new MessageSelectMenu()
          .setCustomId(button.customId)
          .setPlaceholder(
            button.language.get("EMBED_BUILDER_EDIT_FIELD_PLACEHOLDER")
          )
          .addOptions(
            embed.embed.fields.map((field, i) => ({
              label: this.client.util.shortenText(field.name, 100),
              value: `field-${i}`,
              description: this.client.util.shortenText(field.value, 50),
            }))
          )
          .setMaxValues(1)
          .setMinValues(1);
        const row = new MessageActionRow().addComponents(dropdown);
        return await button.edit({
          content: null,
          embeds: [],
          components: [row],
        });
      }
      case "edit-field-content": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await button.error("EMBED_BUILDER_ID_NOT_FOUND", { id });

        const fieldIndex = parseInt(index);
        const field = embed.embed.fields[fieldIndex];
        if (!field) return await button.error("EMBED_BUILDER_FIELD_NOT_FOUND");

        return await button.component.showModal(
          new Modal()
            .setCustomId(
              `embed-builder-edit-field:${fieldIndex}:${id}:${button.author.id}`
            )
            .setTitle(
              button.language.get(
                "EMBED_BUILDER_EDIT_FIELD_CONTENT_MODAL_TITLE"
              )
            )
            .addComponents(
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("field-name")
                  .setLabel(
                    button.language.get("EMBED_BUILDER_ADD_FIELD_NAME_LABEL")
                  )
                  .setPlaceholder(
                    button.language.get(
                      "EMBED_BUILDER_ADD_FIELD_NAME_PLACEHOLDER"
                    )
                  )
                  .setRequired(true)
                  .setValue(field.name)
                  .setStyle("SHORT")
                  .setMaxLength(255)
              ),
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("field-value")
                  .setLabel(
                    button.language.get("EMBED_BUILDER_ADD_FIELD_VALUE_LABEL")
                  )
                  .setPlaceholder(
                    button.language.get(
                      "EMBED_BUILDER_ADD_FIELD_VALUE_PLACEHOLDER"
                    )
                  )
                  .setRequired(true)
                  .setValue(field.value)
                  .setStyle("PARAGRAPH")
                  .setMaxLength(1024)
              )
            )
        );
      }
      case "edit-field-inline": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await button.error("EMBED_BUILDER_ID_NOT_FOUND", { id });

        const fieldIndex = parseInt(index);
        const field = embed.embed.fields[fieldIndex];
        if (!field) return await button.error("EMBED_BUILDER_FIELD_NOT_FOUND");

        field.inline = !field.inline;

        const updated = await this.client.db
          .query("UPDATE embeds SET embed=$1 WHERE id=$2 AND uid=$3;", [
            embed.embed.toJSON() as Value,
            id,
            button.author.id,
          ])
          .catch(() => {});
        if (!updated || !updated.status.startsWith("UPDATE"))
          return await button.error("EMBED_BUILDER_FAILED_TO_UPDATE");
        return await button.edit({
          embeds: [
            new MessageEmbed(embed.embed).setFields(
              embed.embed.fields.map((f, i) =>
                i == fieldIndex
                  ? {
                      name: `${f.name}*`,
                      value: f.value,
                      inline: f.inline,
                    }
                  : f
              )
            ),
          ],
          components: button.message.components.map((row: MessageActionRow) => {
            row.components = row.components.map((component) => {
              if (component.customId == button.customId)
                (component as MessageButton).setStyle(
                  field.inline ? "SUCCESS" : "DANGER"
                );
              return component;
            });
            return row;
          }),
        });
      }
      case "remove-field": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await button.error("EMBED_BUILDER_ID_NOT_FOUND", { id });
        else if (!embed.embed.fields.length)
          return await button.error("EMBED_BUILDER_NO_FIELDS_TO_REMOVE");

        const dropdown = new MessageSelectMenu()
          .setCustomId(button.customId)
          .setPlaceholder(
            button.language.get("EMBED_BUILDER_REMOVE_FIELD_PLACEHOLDER")
          )
          .addOptions(
            embed.embed.fields.map((field, i) => ({
              label: this.client.util.shortenText(field.name, 100),
              value: `field-${i}`,
              description: this.client.util.shortenText(field.value, 50),
            }))
          )
          .setMaxValues(1)
          .setMinValues(1);
        const row = new MessageActionRow().addComponents(dropdown);
        return await button.edit({
          content: null,
          embeds: [],
          components: [row],
        });
      }
    }
  }

  async handleDropdown(dropdown: ComponentMessage) {
    const [action, id, uid] = dropdown.customId.split(":") as [
      EmbedBuilderDropdownAction,
      string,
      Snowflake
    ];
    if (!action.startsWith("embed-builder") || dropdown.author.id != uid)
      return;

    switch (action) {
      case "embed-builder": {
        const value = dropdown.values[0] as EmbedBuilderDropdownValue;
        switch (value) {
          case "title": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:title:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_TITLE_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("title")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_TITLE"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get("EMBED_BUILDER_TITLE_PLACEHOLDER")
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].title ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(256)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(
                  dropdown.message
                    .components[1] as MessageActionRow as MessageActionRow
                ).components[1].disabled
              ),
            });
          }
          case "description": {
            const isBaseDescription =
              dropdown.message.embeds[0].description ==
              dropdown.language.get("EMBED_CREATE_BASE_DESCRIPTION");

            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:desc:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_DESCRIPTION_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("description")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_DESCRIPTION"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_DESCRIPTION_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(
                        !isBaseDescription
                          ? dropdown.message.embeds[0].description ?? ""
                          : ""
                      )
                      .setStyle("PARAGRAPH")
                      .setMaxLength(4000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(
                  dropdown.message
                    .components[1] as MessageActionRow as MessageActionRow
                ).components[1].disabled
              ),
            });
          }
          case "url": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:url:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_URL_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("url")
                      .setLabel(
                        dropdown.language.get("EMBED_BUILDER_SINGLE_ITEMS_URL")
                      )
                      .setPlaceholder(
                        dropdown.language.get("EMBED_BUILDER_URL_PLACEHOLDER")
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].url ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(
                  dropdown.message
                    .components[1] as MessageActionRow as MessageActionRow
                ).components[1].disabled
              ),
            });
          }
          case "timestamp": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:time:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_TIMESTAMP_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("timestamp")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_TIMESTAMP"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_TIMESTAMP_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(
                        dropdown.message.embeds[0].timestamp
                          ? this.client.util.getTimestamp(
                              dropdown.message.embeds[0].timestamp,
                              dropdown.language,
                              dropdown.author.timezone,
                              "f"
                            ) ?? ""
                          : ""
                      )
                      .setStyle("SHORT")
                      .setMaxLength(256)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(
                  dropdown.message
                    .components[1] as MessageActionRow as MessageActionRow
                ).components[1].disabled
              ),
            });
          }
          case "color": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:color:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_COLOR_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("color")
                      .setLabel(dropdown.language.get("COLOR"))
                      .setPlaceholder(
                        dropdown.language.get("EMBED_BUILDER_COLOR_PLACEHOLDER")
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].hexColor ?? "")
                      .setStyle("SHORT")
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(
                  dropdown.message
                    .components[1] as MessageActionRow as MessageActionRow
                ).components[1].disabled
              ),
            });
          }
          case "footer": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:footer:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_FOOTER_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("footer")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_FOOTER"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_FOOTER_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].footer?.text ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(2048)
                  ),
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("footer-icon")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_FOOTER_ICON_URL_LABEL"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_FOOTER_ICON_URL_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(
                        dropdown.message.embeds[0].footer?.iconURL ?? ""
                      )
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(dropdown.message.components[1] as MessageActionRow)
                  .components[1].disabled
              ),
            });
          }
          case "image": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:image:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_IMAGE_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("image")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_IMAGE"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get("EMBED_BUILDER_IMAGE_PLACEHOLDER")
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].image?.url ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(dropdown.message.components[1] as MessageActionRow)
                  .components[1].disabled
              ),
            });
          }
          case "thumbnail": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(
                  `embed-builder:thumbnail:${id}:${dropdown.author.id}`
                )
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_THUMBNAIL_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("thumbnail")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_THUMBNAIL"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_THUMBNAIL_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].thumbnail?.url ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(dropdown.message.components[1] as MessageActionRow)
                  .components[1].disabled
              ),
            });
          }
          case "author": {
            await dropdown.component.showModal(
              new Modal()
                .setCustomId(`embed-builder:author:${id}:${dropdown.author.id}`)
                .setTitle(
                  dropdown.language.get("EMBED_BUILDER_AUTHOR_MODAL_TITLE")
                )
                .addComponents(
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("author")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_SINGLE_ITEMS_AUTHOR"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_AUTHOR_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].author?.name ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(256)
                  ),
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("author-url")
                      .setLabel(
                        dropdown.language.get("EMBED_BUILDER_SINGLE_ITEMS_URL")
                      )
                      .setPlaceholder(
                        dropdown.language.get("EMBED_BUILDER_URL_PLACEHOLDER")
                      )
                      .setRequired(false)
                      .setValue(dropdown.message.embeds[0].author?.url ?? "")
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  ),
                  new MessageActionRow<ModalActionRowComponent>().addComponents(
                    new TextInputComponent()
                      .setCustomId("author-icon")
                      .setLabel(
                        dropdown.language.get(
                          "EMBED_BUILDER_AUTHOR_ICON_URL_LABEL"
                        )
                      )
                      .setPlaceholder(
                        dropdown.language.get(
                          "EMBED_BUILDER_AUTHOR_ICON_URL_PLACEHOLDER"
                        )
                      )
                      .setRequired(false)
                      .setValue(
                        dropdown.message.embeds[0].author?.iconURL ?? ""
                      )
                      .setStyle("SHORT")
                      .setMaxLength(2000)
                  )
                )
            );
            return await dropdown.edit({
              components: this.getEmbedBuilderComponents(
                dropdown,
                id,
                !(dropdown.message.components[1] as MessageActionRow)
                  .components[1].disabled
              ),
            });
          }
        }
      }
      case "embed-builder-edit-field": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await dropdown.error("EMBED_BUILDER_ID_NOT_FOUND", { id });

        const fieldIndex = parseInt(dropdown.values[0].split("-")[1]);
        const field = embed.embed.fields[fieldIndex];
        if (!field)
          return await dropdown.error("EMBED_BUILDER_FIELD_NOT_FOUND");

        const editContentButton = new MessageButton()
            .setStyle("PRIMARY")
            .setCustomId(
              `!embed-builder-edit-field-content:${id}:${dropdown.author.id}:${fieldIndex}`
            )
            .setLabel(
              dropdown.language.get("EMBED_BUILDER_EDIT_FIELD_CONTENT_BUTTON")
            ),
          setInlineButton = new MessageButton()
            .setStyle(field.inline ? "SUCCESS" : "DANGER")
            .setCustomId(
              `embed-builder-edit-field-inline:${id}:${dropdown.author.id}:${fieldIndex}`
            )
            .setLabel(
              dropdown.language.get("EMBED_BUILDER_EDIT_FIELD_INLINE_BUTTON")
            ),
          backButton = new MessageButton()
            .setStyle("SECONDARY")
            .setCustomId(`embed-builder:${id}:${dropdown.author.id}`)
            .setLabel(dropdown.language.get("EMBED_BUILDER_BACK_BUTTON_LABEL"));
        const buttonRow = new MessageActionRow().addComponents([
          editContentButton,
          setInlineButton,
          backButton,
        ]);

        const fieldsRow = dropdown.message.components.find(
          // only the dropdown row will have a single component
          (row: MessageActionRow) => row.components.length == 1
        ) as MessageActionRow;
        const fieldsDropdown = fieldsRow.components[0] as MessageSelectMenu;
        fieldsDropdown.options = fieldsDropdown.options.map((option) => {
          if (option.value == dropdown.values[0]) option.default = true;
          else option.default = false;
          return option;
        });

        return await dropdown.edit({
          content: dropdown.language.get("EMBED_BUILDER_EDITING_FIELD", {
            name: field.name,
          }),
          embeds: [
            new MessageEmbed(embed.embed).setFields(
              embed.embed.fields.map((f, i) =>
                i == fieldIndex
                  ? {
                      name: `${f.name}*`,
                      value: f.value,
                      inline: f.inline,
                    }
                  : f
              )
            ),
          ],
          components: [buttonRow, fieldsRow],
        });
      }
      case "embed-builder-remove-field": {
        const embed = await this.getEmbed(id);
        if (!embed)
          return await dropdown.error("EMBED_BUILDER_ID_NOT_FOUND", { id });
        else if (!embed.embed.fields.length)
          return await dropdown.error("EMBED_BUILDER_NO_FIELDS_TO_REMOVE");

        const fieldIndex = parseInt(dropdown.values[0].split("-")[1]);
        const field = embed.embed.fields[fieldIndex];
        if (!field)
          return await dropdown.error("EMBED_BUILDER_FIELD_NOT_FOUND");

        embed.embed.fields.splice(fieldIndex);

        const updated = await this.client.db
          .query("UPDATE embeds SET embed=$1 WHERE id=$2 AND uid=$3;", [
            embed.embed.toJSON() as Value,
            id,
            dropdown.author.id,
          ])
          .catch(() => {});
        if (!updated || !updated.status.startsWith("UPDATE"))
          return await dropdown.error("EMBED_BUILDER_FAILED_TO_UPDATE");
        return await dropdown.edit({
          content: dropdown.language.get("EMBED_BUILDER", {
            sendcmd: this.client
              .getCommand("embed")
              .getSlashCommandMention(
                dropdown.guild,
                this.client.getCommand("embed-send")
              ),
            id,
          }),
          embeds: [embed.embed],
          components: this.getEmbedBuilderComponents(
            dropdown,
            id,
            !!embed.embed.fields.length
          ),
        });
      }
    }
  }

  async handleModal(modal: ModalMessage) {
    let [action, part, id, uid] = modal.customId.split(":") as [
      EmbedBuilderModalAction,
      EmbedBuilderModalPart,
      string,
      Snowflake
    ];
    if (!action.startsWith("embed-builder") || modal.author.id != uid) return;

    const embedData = await this.getEmbed(id);
    if (!embedData)
      return await modal.error("EMBED_BUILDER_ID_NOT_FOUND", { id });

    let index: number;
    if (action == "embed-builder-edit-field")
      (index = parseInt(part)), (part = "edit-field");

    switch (part) {
      case "title":
      case "desc":
      case "url":
      case "time":
      case "color":
      case "footer":
      case "image":
      case "thumbnail":
      case "author": {
        const embed = embedData.embed;
        if (
          embed.description ==
          modal.language.get("EMBED_CREATE_BASE_DESCRIPTION")
        )
          embed.setDescription("");

        const title = modal.getTextInputValue("title");
        if (title) embed.setTitle(title);
        else if (part == "title") embed.setTitle("");

        const description = modal.getTextInputValue("description");
        if (description) embed.setDescription(description);
        else if (part == "desc") embed.setDescription("");

        const url = modal.getTextInputValue("url");
        if (url && !embed.title)
          return await modal.error("EMBED_BUILDER_URL_NO_TITLE");
        else if (url) {
          try {
            new URL(url);
            embed.setURL(url);
          } catch {
            return await modal.error("EMBED_BUILDER_INVALID_URL");
          }
        } else if (part == "url") embed.setURL("");

        const timestamp = modal.getTextInputValue("timestamp");
        if (timestamp) {
          const parsed = parseTime(
            timestamp,
            modal.createdAt,
            modal.author.timezone,
            modal
          );
          if (!parsed || !parsed.date)
            return await modal.error("EMBED_BUILDER_INVALID_TIMESTAMP");
          embed.setTimestamp(parsed.date);
        } else if (part == "time") embed.setTimestamp(null);

        const color = modal.getTextInputValue("color");
        if (color) {
          const colour = maybeColor(color);
          if (!colour) return await modal.error("EMBED_BUILDER_INVALID_COLOR");
          else embed.setColor(colour.toHexString() as `#${string}`);
        } else if (part == "color") embed.setColor(null);

        const footerText = modal.getTextInputValue("footer");
        let footerIconURL = modal.getTextInputValue("footer-icon"),
          footerIconURLInvalid = false;
        if (footerText) {
          if (footerIconURL) {
            try {
              new URL(footerIconURL);
            } catch {
              (footerIconURL = undefined), (footerIconURLInvalid = true);
            }
          }
          embed.setFooter({
            text: footerText,
            iconURL: footerIconURL,
          });
        } else if (part == "footer") embed.setFooter(null);

        const image = modal.getTextInputValue("image");
        if (image) {
          try {
            new URL(image);
            embed.setImage(image);
          } catch {
            return await modal.error("EMBED_BUILDER_INVALID_URL");
          }
        } else if (part == "image") embed.setImage(null);

        const thumbnail = modal.getTextInputValue("thumbnail");
        if (thumbnail) {
          try {
            new URL(thumbnail);
            embed.setThumbnail(thumbnail);
          } catch {
            return await modal.error("EMBED_BUILDER_INVALID_URL");
          }
        } else if (part == "thumbnail") embed.setThumbnail(null);

        const author = modal.getTextInputValue("author");
        let authorURL = modal.getTextInputValue("author-url"),
          authorIconURL = modal.getTextInputValue("author-icon"),
          authorURLInvalid = false;
        if (author) {
          if (authorIconURL) {
            try {
              new URL(authorIconURL);
            } catch {
              (authorIconURL = undefined), (authorURLInvalid = true);
            }
          }
          if (authorURL) {
            try {
              new URL(authorURL);
            } catch {
              (authorURL = undefined), (authorURLInvalid = true);
            }
          }
          embed.setAuthor({
            name: author,
            url: authorURL,
            iconURL: authorIconURL,
          });
        } else if (part == "author") embed.setAuthor(null);

        if (this.client.util.isEmbedEmpty(embed))
          return await modal.error("EMBED_BUILDER_EMPTY_EMBED");

        const updated = await this.client.db
          .query("UPDATE embeds SET embed=$1 WHERE id=$2 AND uid=$3;", [
            embed.toJSON() as Value,
            id,
            modal.author.id,
          ])
          .catch(() => {});
        if (!updated || !updated.status.startsWith("UPDATE"))
          return await modal.error("EMBED_BUILDER_FAILED_TO_UPDATE");
        await modal.channel.update({
          embeds: [embed],
          components: this.getEmbedBuilderComponents(
            modal,
            id,
            !!embed.fields.length
          ),
        });

        // non-fatal errors
        if (footerIconURLInvalid)
          return await modal.error("EMBED_BUILDER_INVALID_FOOTER_ICON");
        else if (authorURLInvalid)
          return await modal.error("EMBED_BUILDER_INVALID_AUTHOR_URL");
        else return;
      }
      case "add-field": {
        const embed = embedData.embed;

        if (embed.fields.length >= 25)
          return await modal.error("EMBED_BUILDER_MAXIMUM_FIELDS_REACHED");

        const name = modal.getTextInputValue("field-name"),
          value = modal.getTextInputValue("field-value");
        embed.addFields({
          name,
          value,
          inline: false,
        });

        if (
          embed.description ==
          modal.language.get("EMBED_CREATE_BASE_DESCRIPTION")
        )
          embed.setDescription("");

        const updated = await this.client.db
          .query("UPDATE embeds SET embed=$1 WHERE id=$2 AND uid=$3;", [
            embed.toJSON() as Value,
            id,
            modal.author.id,
          ])
          .catch(() => {});
        if (!updated || !updated.status.startsWith("UPDATE"))
          return await modal.error("EMBED_BUILDER_FAILED_TO_UPDATE");
        return await modal.channel.update({
          embeds: [embed],
          components: this.getEmbedBuilderComponents(modal, id, true),
        });
      }
      case "edit-field": {
        const embed = embedData.embed;
        if (!embed.fields.length)
          return await modal.error("EMBED_BUILDER_NO_FIELDS_TO_EDIT");

        const field = embed.fields[index];
        if (!field) return await modal.error("EMBED_BUILDER_FIELD_NOT_FOUND");

        const name = modal.getTextInputValue("field-name"),
          value = modal.getTextInputValue("field-value");

        embed.fields[index] = {
          name,
          value,
          inline: field.inline,
        };

        const updated = await this.client.db
          .query("UPDATE embeds SET embed=$1 WHERE id=$2 AND uid=$3;", [
            embed.toJSON() as Value,
            id,
            modal.author.id,
          ])
          .catch(() => {});
        if (!updated || !updated.status.startsWith("UPDATE"))
          return await modal.error("EMBED_BUILDER_FAILED_TO_UPDATE");
        return await modal.channel.update({
          embeds: [embed],
          components: this.getEmbedBuilderComponents(modal, id, true),
        });
      }
    }
  }
}
