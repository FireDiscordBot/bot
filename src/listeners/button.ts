import {
  MessageSelectOptionData,
  MessageActionRow,
  MessageButton,
  SnowflakeUtil,
  MessageEmbed,
  Permissions,
  Snowflake,
  MessageSelectMenu,
} from "discord.js";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import ReminderSendEvent from "../ws/events/ReminderSendEvent";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { codeblockTypeCaster } from "../arguments/codeblock";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { LanguageKeys } from "@fire/lib/util/language";
import { constants } from "@fire/lib/util/constants";
import { getBranch } from "@fire/lib/util/gitUtils";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import Rank from "../commands/Premium/rank";
import Sk1er from "../modules/sk1er";
import * as centra from "centra";

const { url, emojis } = constants;

const reminderSnoozeTimes = {
  REMINDER_SNOOZE_FIVEMIN: "300000",
  REMINDER_SNOOZE_HALFHOUR: "1800000",
  REMINDER_SNOOZE_HOUR: "3600000",
  REMINDER_SNOOZE_SIXHOURS: "21600000",
  REMINDER_SNOOZE_HALFDAY: "43200000",
  REMINDER_SNOOZE_DAY: "86400000",
  REMINDER_SNOOZE_WEEK: "604800000",
};
const validPaginatorIds = ["close", "start", "back", "forward", "end"];
const validSk1erTypes = ["general", "purchase", "bug"];
const sk1erTypeToEmoji = {
  general: "🖥️",
  purchase: "💸",
  bug: "🐛",
};

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
      return await button.delete(button.interaction.message.id).catch(() => {});

    let message: FireMessage;
    if (!button.ephemeralSource) message = button.message as FireMessage;

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

    if (
      url.supportedHaste.some((url) => button.customId.startsWith(`h:${url}:`))
    ) {
      button.flags = 64;
      const [, uploader, key] = button.customId.split(":");
      const hasteReq = await centra(`https://${uploader}/raw/${key}`)
        .header(
          "User-Agent",
          `Fire Discord Bot/${button.client.manager.version} (+https://fire.gaminggeek.dev/)`
        )
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
          let sentContent = false;
          for (const embed of embeds) {
            const instance = new MessageEmbed(embed);
            if (this.isEmbedEmpty(instance)) continue;
            content && !sentContent
              ? await button.channel.send({ content, embeds: [instance] })
              : await button.channel.send({ embeds: [instance] });
            if (!sentContent) sentContent = true;
          }
          return await message.success();
        } else if (typeof embeds == "object") {
          const instance = new MessageEmbed(embeds);
          if (this.isEmbedEmpty(instance))
            return await message.error("EMBED_OBJECT_INVALID");
          return content
            ? await button.channel.send({ content, embeds: [instance] })
            : await button.channel.send({ embeds: [instance] });
        } else return await message.error("EMBED_OBJECT_INVALID");
      }
    }

    // handle ticket close buttons
    if (button.customId.startsWith("ticket_close")) {
      const { guild } = button;
      if (!guild) return;
      const channelId = button.customId.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(
        channelId
      ) as FireTextChannel;
      if (!channel || !channel.guild || channel.type != "GUILD_TEXT") return;
      if (guild.tickets.find((ticket) => ticket.id == channelId)) {
        const closure = await guild
          .closeTicket(
            channel,
            button.member,
            guild.language.get("TICKET_CLOSE_BUTTON")
          )
          .catch(() => {});
        if (closure == "forbidden")
          return await button.error("TICKET_CLOSE_FORBIDDEN");
        else if (closure == "nonticket")
          return await button.error("TICKET_NON_TICKET");
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

      const components = Rank.getRankButtons(button.guild, button.member);
      const embed = new MessageEmbed()
        .setColor(button.member?.displayColor ?? "#FFFFFF")
        .setTimestamp()
        .setAuthor(
          button.language.get("RANKS_AUTHOR", {
            guild: button.guild.toString(),
          }),
          button.guild.icon
            ? (button.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      await button.channel.update({
        embeds: [embed],
        components,
      });
    } else if (button.customId.startsWith(`rank:`)) {
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

    if (button.customId.startsWith("tag_edit:") && button.guild) {
      if (!button.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        return await button
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              "MANAGE_MESSAGES",
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

      let cancelled = false;
      const cancelSnowflake = SnowflakeUtil.generate();
      this.client.buttonHandlersOnce.set(cancelSnowflake, () => {
        if (button.ephemeralSource) return;
        cancelled = true;
        const cancelledEmbed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayColor ?? "#FFFFFF")
          .setDescription(button.language.get("TAG_EDIT_BUTTON_CANCEL_EMBED"))
          .setTimestamp();
        return (button.message as FireMessage).edit({
          embeds: [cancelledEmbed],
          components: [],
        });
      });
      const editEmbed = new MessageEmbed()
        .setAuthor(
          button.guild.name,
          button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setColor(button.member?.displayColor ?? "#FFFFFF")
        .setDescription(button.language.get("TAG_EDIT_BUTTON_EMBED"))
        .setTimestamp();
      await button.channel.update({
        embeds: [editEmbed],
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setLabel(button.language.get("TAG_EDIT_CANCEL_BUTTON"))
              .setStyle("DANGER")
              .setCustomId(cancelSnowflake)
          ),
        ],
      });

      const newContent = await button.channel
        .awaitMessages({
          max: 1,
          time: 150000,
          errors: ["time"],
          filter: (m: FireMessage) =>
            m.author.id == button.author.id &&
            m.channel.id == button.interaction.channelId,
        })
        .catch(() => {});
      if (cancelled || !newContent || !newContent.first()?.content) return;
      this.client.buttonHandlersOnce.delete(cancelSnowflake);

      if (newContent.first()?.content.length > 2000)
        return await button.error("TAGS_CREATE_CONTENT_TOO_LONG");

      if (!button.ephemeralSource && !cancelled) {
        const editingEmbed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayColor ?? "#FFFFFF")
          .setDescription(button.language.get("TAG_EDIT_BUTTON_EDITING_EMBED"))
          .setTimestamp();
        await (button.message as FireMessage).edit({
          embeds: [editingEmbed],
          components: [],
        });
      }

      button.flags = 0;
      await newContent
        .first()
        ?.delete()
        .catch(() => {});

      const edited = await button.guild.tags
        .editTag(tag.name, newContent.first()?.content)
        .catch(() => {});
      if (!button.ephemeralSource && !cancelled) {
        const editingEmbed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayColor ?? "#FFFFFF")
          .setDescription(
            !edited
              ? button.language.getError("TAG_EDIT_FAILED")
              : button.language.getSuccess("TAG_EDIT_SUCCESS")
          )
          .setTimestamp();
        return await (button.message as FireMessage).edit({
          embeds: [editingEmbed],
          components: [],
        });
      } else {
        if (!edited) return await button.error("TAG_EDIT_FAILED");
        else return await button.success("TAG_EDIT_SUCCESS");
      }
    }

    if (button.customId.startsWith(`tag_view:`) && button.guild) {
      const name = button.customId.slice(9);
      if (!button.guild.tags) {
        button.guild.tags = new GuildTagManager(this.client, button.guild);
        await button.guild.tags.init();
      }
      const tag = await button.guild.tags.getTag(name, false);
      if (!tag) return;
      else
        return await button.channel
          .send({ content: tag.content }, 64)
          .catch(() => {});
    }

    if (button.customId.startsWith("tag_delete:") && button.guild) {
      if (!button.guild.tags) {
        button.guild.tags = new GuildTagManager(this.client, button.guild);
        await button.guild.tags.init();
      }
      if (!button.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        return await button
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              "MANAGE_MESSAGES",
              button.language
            ),
            command: "tag delete",
          })
          .catch(() => {});

      const name = button.customId.slice(11);
      const tag = await button.guild.tags.getTag(name, false, true);
      if (!tag) return;

      if (typeof tag.createdBy != "string") tag.createdBy = tag.createdBy.id;
      delete tag.uses;

      const data = await this.client.util
        .haste(JSON.stringify(tag, null, 4), false, "json")
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
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayColor ?? "#FFFFFF")
          .setDescription(
            button.language.get("TAG_DELETE_SUCCESS", { haste: data })
          )
          .setTimestamp();
        return await button.channel.update({ embeds: [embed], components: [] });
      }
    }

    if (button.customId.startsWith("sk1er_support_")) {
      const type = button.customId.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (!message) return "no message";
      const component = message.components
        ?.map((component) =>
          component.type == "ACTION_ROW" || component.type == 1
            ? component?.components ?? component
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
        button
          .edit({
            content: button.language.get("INTERACTION_CANCELLED"),
            components: [],
          })
          .catch(() => {});
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
      if (!(ticket instanceof FireTextChannel)) {
        if (ticket instanceof Error)
          this.client.sentry.captureException(ticket, {
            user: {
              username: button.author.toString(),
              id: button.author.id,
            },
            extra: {
              "message.id": button.id,
              "guild.id": button.guild?.id,
              "guild.name": button.guild?.name,
              "guild.shard": button.guild?.shardId || 0,
              "button.customid": button.customId,
              env: process.env.NODE_ENV,
            },
          });
        return await button.error("SK1ER_SUPPORT_FAIL", {
          reason: ticket.toString(),
        });
      } else
        await button
          .edit({
            content: `${emojis.success} ${button.language.get(
              "NEW_TICKET_CREATED",
              {
                channel: ticket.toString(),
              }
            )}`,
            components: [],
          })
          .catch(() => {});
    }

    if (button.customId.startsWith("snooze:")) {
      const event = this.client.manager.eventHandler?.store?.get(
        EventType.REMINDER_SEND
      ) as ReminderSendEvent;
      if (!event) return await button.error("REMINDER_SNOOZE_ERROR");
      else if (
        !event.sent.find((r) =>
          button.customId.endsWith(r.timestamp.toString())
        )
      )
        return await button.error("REMINDER_SNOOZE_UNKNOWN");
      const dropdown = new MessageSelectMenu()
        .setPlaceholder(
          button.author.language.get("REMINDER_SNOOZE_PLACEHOLDER")
        )
        .setCustomId(`!snooze:${button.customId.slice(7)}`)
        .setMaxValues(1)
        .setMinValues(1)
        .addOptions(
          Object.entries(reminderSnoozeTimes).map(([key, time]) => {
            return {
              label: button.author.language.get(key as LanguageKeys),
              value: time,
            };
          })
        );
      return await button.channel.update({
        content: "\u200b",
        components: [new MessageActionRow().addComponents(dropdown)],
      });
    }

    if (button.customId.startsWith("deploy:") && button.author.isSuperuser()) {
      await button.channel
        .update({
          embeds: (button.message as FireMessage).embeds,
          components: [],
        })
        .catch(() => {});
      const commit = button.customId.slice(7);
      // i should probably make this less jank
      const commitMessage =
        codeblockTypeCaster(
          null,
          (button.message as FireMessage).embeds[0].fields[0].value
        )?.content.trim() ?? "Commit Message Unknown";
      const branch = getBranch();
      return this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.DEPLOY, {
            commit,
            branch,
            message: commitMessage,
          })
        )
      );
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
      !(button.channel.messages.cache.get(button.message?.id) as FireMessage)
        ?.paginator &&
      button.customId == "close"
    )
      await message?.delete().catch(() => {});
  }

  private isEmbedEmpty(embed: MessageEmbed) {
    return (
      !embed.title &&
      !embed.description &&
      !embed.url &&
      !embed.timestamp &&
      !embed.footer?.text &&
      !embed.footer?.iconURL &&
      !embed.image?.url &&
      !embed.thumbnail?.url &&
      !embed.author?.name &&
      !embed.author?.url &&
      !embed.fields?.length
    );
  }
}
