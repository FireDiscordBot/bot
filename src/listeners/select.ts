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
  MemberLogTypes,
  ModLogTypes,
  titleCase,
} from "@fire/lib/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { EventType } from "@fire/lib/ws/util/constants";
import { PermissionFlagsBits } from "discord-api-types/v9";
import {
  Formatters,
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  Modal,
  ModalActionRowComponent,
  Snowflake,
  TextInputComponent,
} from "discord.js";
import { TextInputStyles } from "discord.js/typings/enums";
import { Readable } from "stream";
import { parseWithUserTimezone } from "../arguments/time";
import LinkfilterToggle from "../commands/Configuration/linkfilter-toggle";
import LoggingConfig from "../commands/Configuration/logging-configure";
import Google from "../commands/Fun/google";
import LogScan from "../commands/Utilities/log-scan";
import ReminderSendEvent from "../ws/events/ReminderSendEvent";

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
      const event = this.client.manager.eventHandler?.store?.get(
        EventType.REMINDER_SEND
      ) as ReminderSendEvent;
      if (!event) return await select.error("REMINDER_SNOOZE_ERROR");
      const currentRemind = event.sent.find((r) =>
        select.customId.endsWith(`${r.user}:${r.timestamp}`)
      );
      if (!currentRemind || !currentRemind.link)
        return await select.error("REMINDER_SNOOZE_UNKNOWN");
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
          select.createdAt,
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
      return failed.length != select.values.length
        ? await (specifyTimeModal
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
          })
        : await (specifyTimeModal ?? select).error("ERROR_CONTACT_SUPPORT");
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
                      ? `~~\`${command.id.replace("-", " ")}\`~~`
                      : `\`${command.id.replace("-", " ")}\``
                    : command.slashOnly && !message.interaction && shouldUpsell
                    ? `~~\`${command.id}\`~~`
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
        select.guild.settings.delete("mod.linkfilter");
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
      select.guild.settings.set("mod.linkfilter", values);
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
      for (const option of options) {
        if (select.values.includes(option))
          await select.guild.settings.set(`minecraft.logscan.${option}`, true);
        else
          await select.guild.settings.set(`minecraft.logscan.${option}`, false);
      }
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
      guild.settings.set(`logging.${type}.flags`, flags);
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
  }
}
