import {
  createAudioResource,
  getVoiceConnection,
  joinVoiceChannel,
} from "@discordjs/voice";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import {
  ActionLogTypes,
  constants,
  MemberLogTypes,
  ModLogTypes,
  titleCase,
} from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Snowflake } from "discord-api-types/globals";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  DeconstructedSnowflake,
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  Modal,
  ModalActionRowComponent,
  SnowflakeUtil,
  TextInputComponent,
} from "discord.js";
import { TextInputStyles } from "discord.js/typings/enums";
import { Readable } from "stream";
import { parseWithUserTimezone } from "../arguments/time";
import LinkfilterToggle from "../commands/Configuration/linkfilter-toggle";
import LoggingConfig from "../commands/Configuration/logging-configure";
import Google from "../commands/Fun/google";
import LogScan from "../commands/Utilities/minecraft-log-scan";
import RemindersCreate from "../commands/Utilities/reminders-create";

const { regexes } = constants;
const SET_AT_QUERY = "?setAt=";

export default class Select extends Listener {
  constructor() {
    super("select", {
      emitter: "client",
      event: "select",
    });
  }

  // used to handle generic dropdowns like the rank selector
  async exec(select: ComponentMessage) {
    if (select.type != "SELECT_MENU") return;

    if (select.customId == "quote_copy") {
      select.flags = 64;
      return await select.error("QUOTE_COPIED_SELECT");
    }

    let message = select.message as FireMessage;

    const guild = select.guild;

    // Run handlers
    try {
      if (this.client.dropdownHandlers.has(select.customId))
        this.client.dropdownHandlers.get(select.customId)(select);
    } catch {}
    try {
      if (this.client.dropdownHandlersOnce.has(select.customId)) {
        const handler = this.client.dropdownHandlersOnce.get(select.customId);
        this.client.dropdownHandlersOnce.delete(select.customId);
        handler(select);
      }
    } catch {}

    if (
      guild &&
      select.customId == `rank:${guild?.id}` &&
      select.member instanceof FireMember
    ) {
      const ranks = guild.settings
        .get<Snowflake[]>("utils.ranks", [])
        .map((id) => guild.roles.cache.get(id))
        .filter((role) => !!role);

      const roleIds = select.values.filter(
        (id) =>
          guild.roles.cache.has(id as Snowflake) &&
          ranks.find((role) => role.id == id)
      ) as Snowflake[];
      const join = roleIds.filter(
        (id: Snowflake) => !select.member.roles.cache.has(id)
      );
      const leave = roleIds.filter((id: Snowflake) =>
        select.member.roles.cache.has(id)
      );

      if (!join.length && !leave.length)
        return await select.error("RANKS_SELECT_NONE");

      const newRoles = select.member.roles.cache
        .map((role) => role.id)
        .filter((id) => !leave.includes(id));
      newRoles.push(...join);

      const set = await select.member.roles.set(newRoles).catch(() => {});
      if (!set) return;

      const mapRoles = (roles: Snowflake[]) =>
        roles
          .map((id) => guild.roles.cache.get(id)?.name)
          .filter((name) => !!name)
          .map((name) => `**${name}**`)
          .join(", ");

      select.flags = 64;
      if (leave.length && !join.length)
        return leave.length == 1
          ? await select.success("RANKS_SELECT_LEAVE_SINGLE", {
              role: guild.roles.cache.get(leave[0])?.name,
            })
          : await select.success("RANKS_SELECT_LEAVE_MULTI", {
              roles: mapRoles(leave),
            });
      else if (join.length && !leave.length)
        return join.length == 1
          ? await select.success("RANKS_SELECT_JOIN_SINGLE", {
              role: guild.roles.cache.get(join[0])?.name,
            })
          : await select.success("RANKS_SELECT_JOIN_MULTI", {
              roles: mapRoles(join),
            });
      else if (join.length == 1 && leave.length == 1)
        return await select.success("RANKS_SELECT_JOIN_LEAVE_SINGLE", {
          join: guild.roles.cache.get(join[0])?.name,
          leave: guild.roles.cache.get(leave[0])?.name,
        });
      else if (join.length == 1)
        return await select.success("RANKS_SELECT_JOIN_SINGLE_LEAVE_MULTI", {
          join: guild.roles.cache.get(join[0])?.name,
          left: mapRoles(leave),
        });
      else
        return await select.success("RANKS_SELECT_JOIN_LEAVE_MULTI", {
          joined: mapRoles(join),
          left: mapRoles(leave),
        });
    }

    if (select.customId == `google:${select.author.id}`) {
      await select.channel.update({
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setStyle("SECONDARY")
              .setLabel(select.language.get("GOOGLE_LOADING"))
              .setCustomId("google_loading")
              .setEmoji("769207087674032129")
              .setDisabled(true)
          ),
        ],
      });
      const query = select.values[0];
      const google = this.client.getCommand("google") as Google;
      const assist = await google.sendAssistantQuery(select, query);
      if (!assist) {
        return await select.edit({
          content: select.language.get("GOOGLE_ERROR_UNKNOWN"),
          components: [],
          attachments: [],
        });
      } else if (assist.success == false) {
        if (select.language.has(`GOOGLE_ERROR_${assist.error}`))
          return await select.edit({
            content: select.language.get(
              `GOOGLE_ERROR_${assist.error}` as LanguageKeys
            ),
            components: [],
            attachments: [],
          });
        else
          return await select.edit({
            content: select.language.get("GOOGLE_ERROR_UNKNOWN"),
            components: [],
            attachments: [],
          });
      }
      let components = [],
        files = [];
      if (assist.response.suggestions?.length)
        components.push(
          new MessageActionRow().addComponents(
            new MessageSelectMenu()
              .setCustomId(`!google:${select.author.id}`)
              .setPlaceholder(select.language.get("GOOGLE_SUGGESTIONS"))
              .setOptions(
                assist.response.suggestions.map((suggestion) => ({
                  label: suggestion,
                  value: suggestion,
                }))
              )
              .setMinValues(1)
              .setMaxValues(1)
          )
        );
      if (assist.response.screenshot?.success == true) {
        const screenshot = Buffer.from(assist.response.screenshot.image.data);
        files.push({ attachment: screenshot, name: "google.png" });
      }
      const canPlayAudio =
        assist.response.audio &&
        (select.member ?? select.author).voice?.channelId;
      if (canPlayAudio) {
        const state = (select.member ?? select.author).voice;
        const audio = Buffer.from(assist.response.audio.data);
        const connection =
          getVoiceConnection(state.guild.id) ??
          joinVoiceChannel({
            channelId: state.channelId,
            guildId: state.guild.id,
            // @ts-ignore
            adapterCreator: state.guild.voiceAdapterCreator,
          });
        const player = this.client.util.createAssistantAudioPlayer(
          state.member as FireMember,
          connection
        );
        connection.subscribe(player);
        player.play(createAudioResource(Readable.from(audio)));
      }
      return await select.edit({
        content: !files.length
          ? assist.response.text ?? canPlayAudio
            ? select.language.get("GOOGLE_RESPONSE_AUDIO_ONLY")
            : select.language.get("GOOGLE_NO_RESPONSE")
          : undefined,
        files,
        components,
      });
    }

    if (select.customId.startsWith(`snooze:${select.author.id}:`)) {
      const isContext = select.customId.endsWith(":context");
      const createRemind = this.client.getCommand(
        "reminders-create"
      ) as RemindersCreate;

      let originalMessage: FireMessage;
      const referencedId = select.message.reference?.messageId;
      if (createRemind.recentlyClicked.has(referencedId)) {
        originalMessage =
          createRemind.recentlyClicked.get(referencedId).message;
        createRemind.recentlyClicked.delete(referencedId);
      } else
        originalMessage = (await select.message
          .fetchReference()
          .catch(() => {})) as FireMessage;

      if (
        // these conditions should all be true for the reminder message
        // so if any aren't, it's not usable
        !originalMessage ||
        !originalMessage.content ||
        (isContext
          ? false
          : !originalMessage.components.length ||
            originalMessage.author?.id != this.client.user.id)
      )
        return await select.error("REMINDER_SNOOZE_UNKNOWN");

      let contextText: string;
      if (isContext) {
        // currently we only have a single case for useEmbedDescription
        // in createremind.ts so we can just use that condition as the value
        const useEmbedDescription =
          originalMessage.embeds.length &&
          originalMessage.content
            .replaceAll("x.com", "twitter.com")
            .includes(originalMessage.embeds[0].url) &&
          originalMessage.embeds[0].description;

        const hasYouTubeLink = regexes.youtube.video.exec(
          originalMessage.content
        );
        const hasYouTubeEmbed = originalMessage.embeds.find((e) =>
          e.url.includes(`/watch?v=${hasYouTubeLink?.groups?.video}`)
        );
        regexes.youtube.video.lastIndex = 0;

        contextText =
          hasYouTubeLink && hasYouTubeEmbed
            ? `[${hasYouTubeEmbed.title}](${hasYouTubeEmbed.url})`
            : useEmbedDescription
            ? originalMessage.embeds[0].description
            : originalMessage.content;
      }

      const currentRemind = {
        text: isContext
          ? contextText
          : originalMessage.embeds.length
          ? originalMessage.embeds[0].description
          : originalMessage.content.split("\n\n").at(1) ?? undefined,
        link: originalMessage.components.length
          ? (originalMessage.components[0].components as MessageButton[]).find(
              (button) => button.style == "LINK"
            )?.url ?? originalMessage.url + `?setAt=${+new Date()}`
          : originalMessage.url + `?setAt=${+new Date()}`,
      };
      // if we don't have the text, we can't snooze it so we return an error
      if (!currentRemind.text)
        return await select.error("REMINDER_SNOOZE_UNKNOWN");
      else if (currentRemind.text.length > 4000)
        return await select.error("REMINDER_CONTENT_TOO_LONG");

      const hasSelectedOther = select.values.find((v) => v == "other");
      let specifyTimeModal: ModalMessage;
      if (hasSelectedOther) {
        const modalPromise = new Promise((resolve) =>
          this.client.modalHandlersOnce.set(select.customId, resolve)
        ) as Promise<ModalMessage>;
        await select.component.showModal(
          new Modal()
            .setTitle(select.language.get("REMINDER_SNOOZE_OTHER_TITLE"))
            .setCustomId(select.customId)
            .addComponents(
              new MessageActionRow<ModalActionRowComponent>().addComponents(
                new TextInputComponent()
                  .setCustomId("time")
                  .setRequired(true)
                  .setLabel(
                    select.language.get("REMINDER_SNOOZE_OTHER_FIELD_NAME")
                  )
                  .setPlaceholder(
                    select.language.get(
                      "REMINDER_SNOOZE_OTHER_FIELD_PLACEHOLDER"
                    )
                  )
                  .setStyle(TextInputStyles.SHORT)
              )
            )
        );
        specifyTimeModal = await modalPromise;
        // await specifyTimeModal.channel.ack();

        const input =
          specifyTimeModal.interaction.fields.getTextInputValue("time");
        if (!input)
          return await specifyTimeModal.error("REMINDER_SNOOZE_TIME_INVALID");
        const { parsed } = parseWithUserTimezone(
          input,
          specifyTimeModal.createdAt,
          select.author.settings.get<string>(
            "reminders.timezone.iana",
            "Etc/UTC"
          )
        );
        const timestamp = +parsed[0]?.start.date();
        if (!parsed || isNaN(timestamp))
          return await specifyTimeModal.error("REMINDER_SNOOZE_TIME_INVALID");
        select.values = [timestamp.toString()];
      }
      let created: { [duration: string]: boolean } = {};
      for (const value of select.values) {
        const timestamp = +value;
        if (isNaN(timestamp)) {
          select.values = select.values.filter((v) => v != value);
          continue;
        }
        const date = new Date(timestamp);
        const remind = await select.author.createReminder(
          date,
          select.createdTimestamp,
          currentRemind.text,
          currentRemind.link
        );
        created[Formatters.time(date, "R")] = remind;
      }
      const success = Object.entries(created)
        .filter(([, success]) => success)
        .map(([duration]) => duration);
      const failed = Object.entries(created)
        .filter(([, success]) => !success)
        .map(([duration]) => duration);
      if (failed.length != select.values.length) {
        await originalMessage
          .edit({
            content: select.author.language.getSuccess(
              "REMINDER_SNOOZE_SNOOZED",
              { time: success[0] }
            ),
            components: originalMessage.components
              .filter((c) => c instanceof MessageActionRow)
              .map((row) => {
                row.components = row.components.map((component) =>
                  component.setDisabled(
                    component.type == "BUTTON"
                      ? component.style != "LINK"
                      : true
                  )
                );
                return row;
              }),
          })
          .catch(() => {});
        await (specifyTimeModal
          ? specifyTimeModal.channel.update.bind(specifyTimeModal.channel)
          : select.channel.update.bind(select.channel))({
          components: [],
          content: select.author.language.getSuccess(
            success.length == 1
              ? "REMINDER_CREATED_SINGLE"
              : "REMINDER_CREATED_MULTI",
            {
              time: success[0],
              times: success.map((s) => "- " + s).join("\n"),
              includeSlashUpsell: true,
            }
          ),
        });
      } else
        return await (specifyTimeModal ?? select).error(
          "ERROR_CONTACT_SUPPORT"
        );
    }

    if (select.customId == "help_category") {
      const categoryName = select.values[0];
      const category = this.client.commandHandler
        .getCategories()
        .get(categoryName);
      // the following length checks should always be truthy but you never know what could happen
      if (!category) {
        if (message.embeds.length)
          message.embeds[0].description = select.author.language.get(
            "HELP_CATEGORY_INVALID",
            {
              names: this.client.commandHandler
                .getCategories()
                .map((c) => c.id)
                .join(", "),
            }
          );
        if (message.components.length)
          message.components = message.components.filter(
            (r) =>
              r instanceof MessageActionRow &&
              !r.components.find((c) => c.type == "SELECT_MENU")
          );
        return await select.edit({
          embeds: message.embeds,
          components: message.components,
        });
      } else {
        const shouldUpsell = select.hasExperiment(3144709624, 1);
        if (message.embeds.length) {
          delete message.embeds[0].description;
          message.embeds[0].fields = [
            {
              name: categoryName,
              value: category
                .map((command) =>
                  command.parent
                    ? command.slashOnly && !message.interaction && shouldUpsell
                      ? Formatters.strikethrough(
                          `\`${command.id.replace("-", " ")}\``
                        )
                      : `\`${command.id.replace("-", " ")}\``
                    : command.slashOnly && !message.interaction && shouldUpsell
                    ? Formatters.strikethrough(`\`${command.id}\``)
                    : `\`${command.id}\``
                )
                .join(", "),
              inline: false,
            },
          ];
          if (
            !message.interaction &&
            category.find((c) => c.slashOnly) &&
            shouldUpsell
          )
            message.embeds[0].fields.push({
              name: message.language.get("NOTE"),
              value: message.language.get("HELP_COMMANDS_UNAVAILABLE"),
              inline: false,
            });
        }
        return await select.edit({
          embeds: message.embeds,
        });
      }
    }

    if (select.customId == "linkfilters" && select.guild) {
      select.flags = 64;
      if (!select.member?.permissions.has(PermissionFlagsBits.ManageGuild))
        return await select
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageGuild,
              select.language
            ),
            command: "linkfilter",
          })
          .catch(() => {});

      const linkfilter = this.client.getCommand(
        "linkfilter-toggle"
      ) as LinkfilterToggle;

      // handle disable first
      if (select.values.includes("disable")) {
        await select.guild.settings.delete("mod.linkfilter", select.author);
        await select.channel.update({
          content: select.language.get("LINKFILTER_TOGGLE_FILTER_LIST"),
          components: linkfilter.getMenuComponents(select),
        });
        if (!select.guild.settings.has("mod.linkfilter"))
          return await select.success("LINKFILTER_RESET");
        else
          return await select.error("COMMAND_ERROR_GENERIC", {
            id: "linkfilter",
          });
      }

      const values = select.values.filter((f) =>
        linkfilter.valid.names.includes(f)
      );
      await select.guild.settings.set("mod.linkfilter", values, select.author);
      await select.channel.update({
        content: select.language.get("LINKFILTER_TOGGLE_FILTER_LIST"),
        components: linkfilter.getMenuComponents(select),
      });
      if (
        select.guild.settings
          .get("mod.linkfilter", [])
          .every((f) => values.includes(f))
      )
        return await select.success("LINKFILTER_SET", {
          enabled: values.join(", "),
        });
      else
        return await select.error("COMMAND_ERROR_GENERIC", {
          id: "linkfilter",
        });
    }

    if (select.customId == "mclogscan:configure" && select.guild) {
      select.flags = 64;
      if (select.channel.type == "DM")
        return await select.error("MINECRAFT_LOGSCAN_MANAGE_DMS");
      else if (!select.member?.isAdmin(select.channel))
        return await select
          .error("MINECRAFT_LOGSCAN_MANAGE_ADMIN_ONLY")
          .catch(() => {});

      const logScan = this.client.getCommand("minecraft-log-scan") as LogScan;
      const options = logScan.valid.names;
      for (const option of options)
        await select.guild.settings.set(
          `minecraft.logscan.${option}`,
          select.values.includes(option),
          select.author
        );
      await select.channel.update({
        components: logScan.getMenuComponents(select),
      });
      return await select.success("MINECRAFT_LOGSCAN_CONFIGURED", {
        options: select.values
          .map((v) =>
            select.language.get(
              `MINECRAFT_LOGSCAN_OPTION_${v.toUpperCase()}` as LanguageKeys
            )
          )
          .join(", "),
      });
    }

    if (select.customId.startsWith("logging-configure:") && select.guild) {
      const guild = select.guild;
      select.flags = 64;
      if (!select.member?.permissions.has(PermissionFlagsBits.ManageGuild))
        return await select
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              PermissionFlagsBits.ManageGuild,
              select.language
            ),
            command: "logging configure",
          })
          .catch(() => {});

      const type = select.customId.split(":")[1];
      const loggingConfigure = this.client.getCommand(
        "logging-configure"
      ) as LoggingConfig;
      let flags = 0;
      let typeEnum:
        | typeof ModLogTypes
        | typeof ActionLogTypes
        | typeof MemberLogTypes;
      switch (type) {
        case "moderation":
          typeEnum = ModLogTypes;
          break;
        case "action":
          typeEnum = ActionLogTypes;
          break;
        case "members":
          typeEnum = MemberLogTypes;
          break;
      }
      for (const action of select.values) flags |= typeEnum[action];
      await guild.settings.set(`logging.${type}.flags`, flags, select.author);
      const components = [
        loggingConfigure.getModLogsSelect(select),
        loggingConfigure.getActionLogsSelect(select),
        loggingConfigure.getMemberLogsSelect(select),
      ] as MessageActionRow[];
      await select.channel.update({
        components,
      });
      await select.success("LOGGING_CONFIG_SUCCESS", {
        type: type,
        logs: select.values
          .map((v) => titleCase(v, v.includes("_") ? "_" : " "))
          .join(", "),
      });
    }

    if (select.customId.startsWith("reminders-list:")) {
      const [, userId] = select.customId.split(":");
      if (select.author.id != userId) return;

      const timestamp = +select.values[0];
      if (isNaN(timestamp))
        return await select.error("REMINDERS_LIST_SELECTED_INVALID");
      const date = new Date(timestamp);

      const reminderResult = await this.client.db
        .query("SELECT * FROM remind WHERE uid=$1 AND forwhen=$2", [
          userId,
          date,
        ])
        .first()
        .catch(() => {});
      if (!reminderResult)
        return await select.error("REMINDERS_LIST_SELECTED_UNKNOWN");

      const reminder = {
        text: reminderResult.get("reminder") as string,
        link: reminderResult.get("link") as string,
        date,
      };

      const snowflake = regexes.discord.message.exec(reminder.link)?.groups
        ?.message_id as Snowflake;
      let deconstructed: DeconstructedSnowflake;
      if (snowflake) deconstructed = SnowflakeUtil.deconstruct(snowflake);

      let reminderSetAt: Date;
      if (reminder.link.includes(SET_AT_QUERY)) {
        const [link, setAt] = reminder.link.split(SET_AT_QUERY);
        reminderSetAt = new Date(parseInt(setAt));
        reminder.link = link;
      } else if (deconstructed) reminderSetAt = deconstructed.date;

      const embed = new MessageEmbed()
        .setColor(select.member?.displayColor || "#FFFFFF")
        .setAuthor({
          name: select.language.get("REMINDERS_LIST_SELECTED_AUTHOR_NAME", {
            author: select.author.toString(),
          }),
          iconURL: select.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          }),
        })
        .setDescription(reminder.text)
        .setTimestamp(date)
        .addFields([
          {
            name: select.language.get(
              "REMINDERS_LIST_SELECTED_RELATIVE_TIME_FIELD_NAME"
            ),
            value: Formatters.time(date, "R"),
          },
          {
            name: select.language.get(
              "REMINDERS_LIST_SELECTED_CREATED_AT_FIELD_NAME"
            ),
            value: Formatters.time(reminderSetAt, "F"),
          },
        ]);

      (
        select.message.components[0].components[0] as MessageSelectMenu
      ).options.forEach(
        (option) => (option.default = option.value == timestamp.toString())
      );

      const editButton = new MessageButton()
          .setCustomId(`!reminders-edit:${select.author.id}:${timestamp}`)
          .setLabel(
            select.language.get("REMINDERS_LIST_SELECTED_EDIT_BUTTON_LABEL")
          )
          .setStyle("PRIMARY"),
        deleteButton = new MessageButton()
          .setCustomId(`reminders-delete:${select.author.id}:${timestamp}`)
          .setLabel(
            select.language.get("REMINDERS_LIST_SELECTED_DELETE_BUTTON_LABEL")
          )
          .setStyle("DANGER"),
        linkButton = reminder.link
          ? new MessageButton()
              .setStyle("LINK")
              .setURL(reminder.link)
              .setLabel(select.language.get("REMINDER_LINK_BUTTON"))
          : undefined;

      return await select.edit({
        embeds: [embed],
        components: [
          select.message.components[0],
          new MessageActionRow().addComponents(
            editButton,
            deleteButton,
            linkButton
          ),
        ],
      });
    }
  }
}
