import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import ReminderSendEvent from "../ws/events/ReminderSendEvent";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { EventType } from "@fire/lib/ws/util/constants";
import { Formatters, Permissions, Snowflake } from "discord.js";
import { Listener } from "@fire/lib/util/listener";
import LinkfilterToggle from "../commands/Configuration/linkfilter-toggle";

const reminderSnoozeTimes = [
  300000, 1800000, 3600000, 21600000, 43200000, 86400000, 259200000, 604800000,
  1209600000, 2628060000,
];

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

    let message = select.message as FireMessage;

    const guild = select.guild;

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

    if (select.customId.startsWith(`snooze:${select.author.id}:`)) {
      const event = this.client.manager.eventHandler?.store?.get(
        EventType.REMINDER_SEND
      ) as ReminderSendEvent;
      if (!event) return await select.error("REMINDER_SNOOZE_ERROR");
      const snoozeTime = parseInt(select.values[0]);
      if (!reminderSnoozeTimes.includes(snoozeTime))
        return await select.error("REMINDER_SNOOZE_TIME_INVALID");
      const currentRemind = event.sent.find((r) =>
        select.customId.endsWith(r.timestamp.toString())
      );
      if (!currentRemind || !currentRemind.link)
        return await select.error("REMINDER_SNOOZE_UNKNOWN");
      const time = +new Date() + snoozeTime;
      const remind = await select.author.createReminder(
        new Date(time),
        currentRemind.text,
        currentRemind.link
      );
      if (!remind) return await select.error("REMINDER_SNOOZE_FAILED");
      return await select.channel.update({
        components: [],
        content: select.author.language.getSuccess("REMINDER_CREATED_SINGLE", {
          time: Formatters.time(new Date(time), "R"),
        }),
      });
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
            (r) => !r.components.find((c) => c.type == "SELECT_MENU")
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
      if (!select.member?.permissions.has(Permissions.FLAGS.MANAGE_GUILD))
        return await select
          .error("MISSING_PERMISSIONS_USER", {
            permissions: this.client.util.cleanPermissionName(
              "MANAGE_GUILD",
              select.language
            ),
            command: "linkfilter",
          })
          .catch(() => {});

      const linkfilter = this.client.getCommand(
        "linkfilter"
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
  }
}
