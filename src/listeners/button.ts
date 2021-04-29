import {
  ButtonMessage,
  EphemeralMessage,
} from "@fire/lib/extensions/buttonMessage";
import {
  APIComponent,
  ButtonStyle,
  ButtonType,
} from "@fire/lib/interfaces/interactions";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import Rank from "../commands/Premium/rank";
import { SnowflakeUtil } from "discord.js";
import Sk1er from "../modules/sk1er";

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
    if (button.custom_id == "delete_me")
      return await button.delete(button.button.message.id).catch(() => {});

    let message: FireMessage;
    if (!button.ephemeral) message = button.message as FireMessage;

    // Run handlers
    try {
      if (this.client.buttonHandlers.has(button.custom_id))
        this.client.buttonHandlers.get(button.custom_id)(button);
    } catch {}
    try {
      if (this.client.buttonHandlersOnce.has(button.custom_id)) {
        const handler = this.client.buttonHandlersOnce.get(button.custom_id);
        this.client.buttonHandlersOnce.delete(button.custom_id);
        handler(button);
      }
    } catch {}

    // handle ticket close buttons
    if (button.custom_id.startsWith("ticket_close")) {
      const { guild } = button;
      if (!guild) return;
      const channelId = button.custom_id.slice(13);
      const channel = this.client.channels.cache.get(
        channelId
      ) as FireTextChannel;
      if (!channel || !channel.guild || channel.type != "text") return;
      if (guild.tickets.find((ticket) => ticket.id == channelId)) {
        const closure = await guild
          .closeTicket(
            channel,
            button.member,
            guild.language.get("TICKET_CLOSE_BUTTON") as string
          )
          .catch(() => {});
        if (closure == "forbidden")
          return await button.error("TICKET_CLOSE_FORBIDDEN");
        else if (closure == "nonticket")
          return await button.error("TICKET_NON_TICKET");
      } else return;
    }

    if (button.custom_id.startsWith(`rank:${button.member?.id}:`)) {
      const roleId = button.custom_id.slice(
        `rank:${button.member?.id}:`.length
      );
      const role = button.guild?.roles.cache.get(roleId);
      if (!role || !button.guild || !button.member) return;
      const ranks = (button.guild.settings.get(
        "utils.ranks",
        []
      ) as string[]).filter((id) => button.guild.roles.cache.has(id));
      if (!ranks.includes(roleId))
        return await button.error("RANKS_MENU_INVALID_ROLE");
      const shouldRemove = button.member.roles.cache.has(roleId);
      if (shouldRemove)
        button.member = (await button.member.roles
          .remove(
            role,
            button.guild.language.get("RANKS_LEAVE_REASON") as string
          )
          .catch(() => button.member)) as FireMember;
      else
        button.member = (await button.member.roles
          .add(role, button.guild.language.get("RANKS_JOIN_REASON") as string)
          .catch(() => button.member)) as FireMember;

      if (!button.ephemeral) {
        const components = Rank.getRankButtons(button.guild, button.member);
        await ButtonMessage.editWithButtons(message, null, {
          embed: message.embeds[0],
          buttons: components as APIComponent[],
        }).catch(() => {});
      }
    }

    if (button.custom_id.startsWith("sk1er_support_")) {
      const type = button.custom_id.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      if (!message) return "no message";
      const component = message.components
        .map((component) =>
          component.type == ButtonType.ACTION_ROW
            ? component?.components ?? component
            : component
        )
        .flat()
        .find(
          (component) =>
            component.type == ButtonType.BUTTON &&
            component.style != ButtonStyle.LINK &&
            (component.custom_id == button.custom_id ||
              component.custom_id.slice(1) == button.custom_id)
        );
      if (
        component?.type != ButtonType.BUTTON ||
        component?.style == ButtonStyle.LINK
      )
        return "non button";
      if (!component.emoji?.name) return "unknown emoji";
      const emoji = component.emoji.name;

      button.flags += 64; // set ephemeral
      const confirmButton: APIComponent = {
        custom_id: `sk1er_confirm_${type}`,
        style: ButtonStyle.SUCCESS,
        type: ButtonType.BUTTON,
        emoji: { name: emoji },
        disabled: true,
      };
      const deleteSnowflake = SnowflakeUtil.generate();
      const deleteButton: APIComponent = {
        emoji: { id: "534174796938870792" },
        style: ButtonStyle.DESTRUCTIVE,
        type: ButtonType.BUTTON,
        custom_id: deleteSnowflake,
      };
      this.client.buttonHandlersOnce.set(deleteSnowflake, () => {
        button
          .edit(button.language.get("SK1ER_SUPPORT_CANCELLED"), {
            buttons: null,
          })
          .catch(() => {});
      });
      await button.channel.send(
        button.language.get("SK1ER_SUPPORT_CONFIRM"),
        {
          buttons: [confirmButton, deleteButton],
        },
        64
      );

      await this.client.util.sleep(5000);
      confirmButton.disabled = false;
      // user has not clicked delete button
      if (this.client.buttonHandlersOnce.has(deleteSnowflake))
        await button.edit(button.language.get("SK1ER_SUPPORT_CONFIRM_EDIT"), {
          buttons: [confirmButton, deleteButton],
        });
    } else if (button.custom_id.startsWith("sk1er_confirm_")) {
      const type = button.custom_id.slice(14);
      if (!type || !validSk1erTypes.includes(type)) return;
      const sk1erModule = this.client.getModule("sk1er") as Sk1er;
      if (!sk1erModule) return;

      // since this is an ephemeral message, it does not give us the components
      // so we need to fake them
      (button.message as EphemeralMessage & {
        components: APIComponent[];
      }).components = [
        {
          type: ButtonType.ACTION_ROW,
          components: [
            {
              custom_id: `sk1er_confirm_${type}`,
              style: ButtonStyle.SUCCESS,
              type: ButtonType.BUTTON,
              emoji: { name: sk1erTypeToEmoji[type] },
            },
          ],
        },
      ];

      const ticket = await sk1erModule
        .handleSupport(button, button.author)
        .catch((e: Error) => e);
      if (!(ticket instanceof FireTextChannel))
        return await button.error("SK1ER_SUPPORT_FAIL", ticket.toString());
    }

    if (
      message &&
      validPaginatorIds.includes(button.custom_id) &&
      message?.paginator &&
      message.paginator.ready &&
      message.paginator.owner?.id == button.author.id
    )
      await message?.paginator.buttonHandler(button).catch(() => {});
    else if (
      !button.channel.messages.cache.has(button.message?.id) &&
      button.custom_id == "close"
    )
      await message?.delete().catch(() => {});
  }
}
