import { ButtonMessage } from "@fire/lib/extensions/buttonMessage";
import {
  MessageActionRow,
  MessageButton,
  SnowflakeUtil,
  MessageEmbed,
  Permissions,
  Snowflake,
} from "discord.js";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { constants } from "@fire/lib/util/constants";
import { Listener } from "@fire/lib/util/listener";
import Rank from "../commands/Premium/rank";
import Sk1er from "../modules/sk1er";
import * as centra from "centra";

const { url, emojis } = constants;

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
  async exec(button: ButtonMessage) {
    // check for deletion button
    if (button.customID == "delete_me")
      return await button.delete(button.interaction.message.id).catch(() => {});

    let message: FireMessage;
    if (!button.ephemeral) message = button.message as FireMessage;

    // Run handlers
    try {
      if (this.client.buttonHandlers.has(button.customID))
        this.client.buttonHandlers.get(button.customID)(button);
    } catch {}
    try {
      if (this.client.buttonHandlersOnce.has(button.customID)) {
        const handler = this.client.buttonHandlersOnce.get(button.customID);
        this.client.buttonHandlersOnce.delete(button.customID);
        handler(button);
      }
    } catch {}

    if (
      url.supportedHaste.some((url) => button.customID.startsWith(`h:${url}:`))
    ) {
      button.flags = 64;
      const [, uploader, key] = button.customID.split(":");
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
              ? await button.channel.send(content, instance)
              : await button.channel.send(instance);
            if (!sentContent) sentContent = true;
          }
          return await message.success();
        } else if (typeof embeds == "object") {
          const instance = new MessageEmbed(embeds);
          if (this.isEmbedEmpty(instance))
            return await message.error("EMBED_OBJECT_INVALID");
          return content
            ? await button.channel.send(content, instance)
            : await button.channel.send(instance);
        } else return await message.error("EMBED_OBJECT_INVALID");
      }
    }

    // handle ticket close buttons
    if (button.customID.startsWith("ticket_close")) {
      const { guild } = button;
      if (!guild) return;
      const channelId = button.customID.slice(13) as Snowflake;
      const channel = this.client.channels.cache.get(
        channelId
      ) as FireTextChannel;
      if (!channel || !channel.guild || channel.type != "text") return;
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

    if (button.customID.startsWith(`rank:${button.member?.id}:`)) {
      const roleId = button.customID.slice(
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
        .setColor(button.member?.displayHexColor || "#ffffff")
        .setTimestamp()
        .setAuthor(
          button.language.get("RANKS_AUTHOR", button.guild.toString()),
          button.guild.icon
            ? (button.guild.iconURL({
                size: 2048,
                format: "png",
                dynamic: true,
              }) as string)
            : undefined
        );
      await button.channel.update(null, {
        embeds: [embed],
        components,
      });
    }

    if (button.customID.startsWith("tag_edit:") && button.guild) {
      if (!button.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        return await button
          .error(
            "MISSING_PERMISSIONS_USER",
            [
              this.client.util.cleanPermissionName(
                "MANAGE_MESSAGES",
                button.language
              ),
            ],
            "tag edit"
          )
          .catch(() => {});

      const name = button.customID.slice(9);
      const tag = await button.guild.tags.getTag(name, false);

      let cancelled = false;
      const cancelSnowflake = SnowflakeUtil.generate();
      this.client.buttonHandlersOnce.set(cancelSnowflake, () => {
        if (button.ephemeral) return;
        cancelled = true;
        const cancelledEmbed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayHexColor || "#ffffff")
          .setDescription(button.language.get("TAG_EDIT_BUTTON_CANCEL_EMBED"))
          .setTimestamp();
        return (button.message as FireMessage).edit(null, {
          embed: cancelledEmbed,
          components: [],
        });
      });
      const editEmbed = new MessageEmbed()
        .setAuthor(
          button.guild.name,
          button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
        )
        .setColor(button.member?.displayHexColor || "#ffffff")
        .setDescription(button.language.get("TAG_EDIT_BUTTON_EMBED"))
        .setTimestamp();
      await button.channel.update(editEmbed, {
        components: [
          new MessageActionRow().addComponents(
            new MessageButton()
              .setLabel(button.language.get("TAG_EDIT_CANCEL_BUTTON"))
              .setStyle("DANGER")
              .setCustomID(cancelSnowflake)
          ),
        ],
      });

      const newContent = await button.channel
        .awaitMessages(
          (m: FireMessage) =>
            m.author.id == button.author.id &&
            m.channel.id == button.interaction.channelID,
          { max: 1, time: 150000, errors: ["time"] }
        )
        .catch(() => {});
      if (cancelled || !newContent || !newContent.first()?.content) return;
      this.client.buttonHandlersOnce.delete(cancelSnowflake);

      if (!button.ephemeral && !cancelled) {
        const editingEmbed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayHexColor || "#ffffff")
          .setDescription(button.language.get("TAG_EDIT_BUTTON_EDITING_EMBED"))
          .setTimestamp();
        await (button.message as FireMessage).edit(null, {
          embed: editingEmbed,
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
      if (!edited) return await button.error("TAG_EDIT_FAILED");
      else return await button.success("TAG_EDIT_SUCCESS");
    }

    if (button.customID.startsWith(`tag_view:`) && button.guild) {
      const name = button.customID.slice(9);
      const tag = await button.guild.tags.getTag(name, false);
      if (!tag) return;
      else
        return await button.channel.send(tag.content, {}, 64).catch(() => {});
    }

    if (button.customID.startsWith("tag_delete:") && button.guild) {
      if (!button.member?.permissions.has(Permissions.FLAGS.MANAGE_MESSAGES))
        return await button
          .error(
            "MISSING_PERMISSIONS_USER",
            [
              this.client.util.cleanPermissionName(
                "MANAGE_MESSAGES",
                button.language
              ),
            ],
            "tag delete"
          )
          .catch(() => {});

      const name = button.customID.slice(11);
      const tag = await button.guild.tags.getTag(name, false);
      if (!tag) return;

      if (typeof tag.createdBy != "string") tag.createdBy = tag.createdBy.id;
      delete tag.uses;

      const data = await this.client.util
        .haste(JSON.stringify(tag, null, 4), false, "json")
        .catch(() => {});
      if (!data) return;

      const deleted = await button.guild.tags.deleteTag(name);
      if (!deleted)
        return await button.channel.update(
          button.language.get("TAG_DELETE_FAILED", data),
          { embeds: [], components: [] }
        );
      else {
        const embed = new MessageEmbed()
          .setAuthor(
            button.guild.name,
            button.guild.iconURL({ size: 2048, format: "png", dynamic: true })
          )
          .setColor(button.member?.displayHexColor || "#ffffff")
          .setDescription(button.language.get("TAG_DELETE_SUCCESS", data))
          .setTimestamp();
        return await button.channel.update(embed, { components: [] });
      }
    }

    if (button.customID.startsWith("sk1er_support_")) {
      const type = button.customID.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (!message) return "no message";
      const component = message.components
        ?.map((component) =>
          component.type == "ACTION_ROW"
            ? component?.components ?? component
            : component
        )
        .flat()
        .find(
          (component) =>
            component.type == "BUTTON" &&
            component.style != "LINK" &&
            (component.customID == button.customID ||
              component.customID.slice(1) == button.customID)
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
        .setCustomID(`sk1er_confirm_${type}`)
        .setStyle("SUCCESS")
        .setEmoji(emoji)
        .setDisabled(true);
      const deleteSnowflake = SnowflakeUtil.generate();
      const deleteButton = new MessageButton()
        .setEmoji("534174796938870792")
        .setStyle("DANGER")
        .setCustomID(deleteSnowflake);
      this.client.buttonHandlersOnce.set(deleteSnowflake, () => {
        button
          .edit(button.language.get("SK1ER_SUPPORT_CANCELLED"), {
            components: [],
          })
          .catch(() => {});
      });
      await button.channel.send(
        button.language.get("SK1ER_SUPPORT_CONFIRM"),
        {
          components: [
            new MessageActionRow().addComponents([confirmButton, deleteButton]),
          ],
        },
        64
      );

      await this.client.util.sleep(5000);
      confirmButton.setDisabled(false);
      // user has not clicked delete button
      if (this.client.buttonHandlersOnce.has(deleteSnowflake))
        await button.edit(button.language.get("SK1ER_SUPPORT_CONFIRM_EDIT"), {
          components: [
            new MessageActionRow().addComponents([confirmButton, deleteButton]),
          ],
        });
    } else if (button.customID.startsWith("sk1er_confirm_")) {
      const type = button.customID.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      // since this is an ephemeral message, it does not give us the components
      // so we need to fake them
      (button.message as FireMessage).components = [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setCustomID(`sk1er_confirm_${type}`)
            .setEmoji(sk1erTypeToEmoji[type])
        ),
      ];

      const ticket = await sk1erModule
        .handleSupport(button, button.author)
        .catch((e: Error) => e);
      if (!(ticket instanceof FireTextChannel))
        return await button.error("SK1ER_SUPPORT_FAIL", ticket.toString());
      else
        await button
          .edit(
            `${emojis.success} ${button.language.get(
              "NEW_TICKET_CREATED",
              ticket.toString()
            )}`,
            { components: [] }
          )
          .catch(() => {});
    }

    if (
      message &&
      validPaginatorIds.includes(button.customID) &&
      message?.paginator &&
      message.paginator.ready &&
      message.paginator.owner?.id == button.author.id
    )
      await message?.paginator.buttonHandler(button).catch(() => {});
    else if (
      !button.channel.messages.cache.has(button.message?.id) &&
      button.customID == "close"
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
