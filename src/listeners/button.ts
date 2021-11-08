import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { constants, titleCase } from "@fire/lib/util/constants";
import { getBranch } from "@fire/lib/util/gitUtils";
import { GuildTagManager } from "@fire/lib/util/guildtagmanager";
import { LanguageKeys } from "@fire/lib/util/language";
import { Listener } from "@fire/lib/util/listener";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import * as centra from "centra";
import {
  Collection,
  MessageActionRow,
  MessageButton,
  MessageEmbed,
  MessageSelectMenu,
  NewsChannel,
  Permissions,
  Snowflake,
  SnowflakeUtil,
  ThreadChannel,
} from "discord.js";
import { codeblockTypeCaster } from "../arguments/codeblock";
import Rank from "../commands/Premium/rank";
import Essential from "../modules/essential";
import Sk1er from "../modules/sk1er";
import ReminderSendEvent from "../ws/events/ReminderSendEvent";

const { url, emojis } = constants;

const reminderSnoozeTimes = {
  REMINDER_SNOOZE_FIVEMIN: "300000",
  REMINDER_SNOOZE_HALFHOUR: "1800000",
  REMINDER_SNOOZE_HOUR: "3600000",
  REMINDER_SNOOZE_SIXHOURS: "21600000",
  REMINDER_SNOOZE_HALFDAY: "43200000",
  REMINDER_SNOOZE_DAY: "86400000",
  REMINDER_SNOOZE_THREEDAYS: "259200000",
  REMINDER_SNOOZE_WEEK: "604800000",
  REMINDER_SNOOZE_FORTNIGHT: "1209600000",
  REMINDER_SNOOZE_MONTH: "2628060000",
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
];

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
    else if (button.customId == "cancel_me")
      return await button
        .edit({
          content: button.language.get("INTERACTION_CANCELLED"),
          components: [],
        })
        .catch(() => {});

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
        // edit with disabled button
        await button
          .edit({
            components:
              button.message instanceof FireMessage
                ? button.message.components.map((row) => {
                    row.components = row.components.map((component) => {
                      component.setDisabled(true);
                      return component;
                    });
                    return row;
                  })
                : [],
          })
          .catch(() => {});
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
              ? button.language.getSlashError("TAG_EDIT_FAILED")
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
        else if (ticket instanceof Error)
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

      const choices = [
        new MessageButton()
          .setCustomId("essentialsupport:crash")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_CRASH"))
          .setStyle("DANGER"),
        // .setEmoji("895747752443666442"),
        new MessageButton()
          .setCustomId("essentialsupport:bug")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_BUG"))
          .setStyle("DANGER"),
        // .setEmoji("🐛"),
        new MessageButton()
          .setCustomId("essentialsupport:enquiry")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_ENQUIRY"))
          .setStyle("PRIMARY"),
        // .setEmoji("❓"),
        new MessageButton()
          .setCustomId("essentialsupport:ice")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_ICE"))
          .setStyle("PRIMARY"),
        new MessageButton()
          .setCustomId("essentialsupport:other")
          .setLabel(button.language.get("ESSENTIAL_SUPPORT_BUTTON_OTHER"))
          .setStyle("PRIMARY"),
        // .setEmoji("785860532041285673"),
      ];
      button.flags += 64;
      return await button.edit({
        content: button.language.get("ESSENTIAL_SUPPORT_CHOOSE_ISSUE"),
        components: [new MessageActionRow().addComponents(choices)],
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
        else if (ticket instanceof Error)
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
        return await button.error("BUTTON_SUPPORT_FAIL", {
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
    } else if (button.customId.startsWith("essentialsupport:")) {
      const choice = button.customId.slice(17);
      const essentialModule = this.client.getModule("essential") as Essential;
      if (!essentialModule) return;

      const handler: Function =
        essentialModule[`supportHandle${titleCase(choice)}`];
      if (!handler || typeof handler != "function")
        return await button.error("ESSENTIAL_SUPPORT_CHOICE_INVALID");
      else return await handler(button);
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
              m.embeds.length &&
              m.embeds[0].title.startsWith(`[bot:${branch}]`) &&
              m.embeds[0].description.includes(commit)
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
