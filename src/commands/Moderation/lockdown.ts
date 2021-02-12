import { TextChannel, MessageEmbed, Collection, Role } from "discord.js";
import { categoryChannelConverter } from "@fire/lib/util/converters";
import { FireMessage } from "@fire/lib/extensions/message";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

export default class Lockdown extends Command {
  constructor() {
    super("lockdown", {
      description: (language: Language) =>
        language.get("LOCKDOWN_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "MANAGE_CHANNELS", "EMBED_LINKS"],
      userPermissions: ["MANAGE_CHANNELS"],
      args: [
        {
          id: "action",
          type: ["start", "end", "exclude"],
          slashCommandType: "action",
          default: null,
          required: true,
        },
        {
          id: "reason",
          type: "string",
          match: "rest",
          default: "No Reason Provided.",
          required: false,
        },
      ],
      requiresExperiment: { id: "H78gbvKTG6pepfWgPYxDR", treatmentId: 1 },
      enableSlashCommand: true,
      moderatorOnly: true,
      restrictTo: "guild",
    });
  }

  async exec(
    message: FireMessage,
    args: {
      action?: "start" | "end" | "exclude";
      reason?: string;
    }
  ) {
    if (!args.action) return await message.error("LOCKDOWN_ACTION_REQUIRED");
    let excluded: string[] = message.guild.settings.get("mod.lockdownexcl", []);
    if (!excluded.length && args.action != "exclude")
      return await message.error("LOCKDOWN_EXCLUDE_REQUIRED");
    if (args.action == "exclude") {
      const category = await categoryChannelConverter(message, args.reason);
      if (!category) return;
      if (!excluded.includes(category.id)) excluded.push(category.id);
      message.guild.settings.set("mod.lockdownexcl", excluded);
      return await message.success();
    } else if (args.action == "start")
      return await this.start(message, args.reason);
    else if (args.action == "end") return await this.end(message, args.reason);
  }

  async start(message: FireMessage, reason: string) {
    await message.react("▶️");
    let failed = new Collection<TextChannel, Role[]>();
    let locked: string[] = [];
    const channels = message.guild.channels.cache.filter(
      (channel) =>
        channel.type == "text" &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has("VIEW_CHANNEL") &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has("SEND_MESSAGES")
    ) as Collection<string, TextChannel>;
    channels.forEach(
      async (channel) =>
        await channel
          .updateOverwrite(message.guild.me, { SEND_MESSAGES: true })
          .catch(() => {})
    );
    const startReason = message.guild.language.get(
      "LOCKDOWN_REASON",
      message.author.toString(),
      reason
    ) as string;
    const embed = new MessageEmbed()
      .setColor("#ef5350")
      .setDescription(startReason);
    for (const role of message.guild.roles.cache.values()) {
      for (const channel of channels.values()) {
        await channel
          .updateOverwrite(
            role,
            {
              SEND_MESSAGES: false,
            },
            startReason
          )
          .catch(() => {
            if (failed.has(channel)) {
              const fail = failed.get(channel);
              fail.push(role);
              failed.set(channel, fail);
            } else failed.set(channel, [role]);
          });
        if (!failed.has(channel)) locked.push(channel.id);
      }
    }
    message.guild.settings.set("mod.locked", locked);
    let lockdownMessages: string[] = message.guild.settings.get(
      "mod.lockdownmessages",
      []
    );
    for (const channel of channels.values()) {
      const message = await channel.send(embed);
      lockdownMessages.push(`${channel.id}-${message.id}`);
    }
    message.guild.settings.set("mod.lockdownmessages", lockdownMessages);
    return await message.success();
  }

  async end(message: FireMessage, reason: string) {
    await message.react("▶️");
    let failed = new Collection<TextChannel, Role[]>();
    const locked: string[] = message.guild.settings.get("mod.locked", []);
    if (!locked.length) return await message.error("LOCKDOWN_END_NONE_LOCKED");
    const channels = message.guild.channels.cache.filter(
      (channel) =>
        channel.type == "text" &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has("VIEW_CHANNEL") &&
        !channel
          .permissionsFor(message.guild.roles.everyone)
          .has("SEND_MESSAGES") &&
        locked.includes(channel.id)
    ) as Collection<string, TextChannel>;
    channels.forEach(
      async (channel) =>
        await channel.updateOverwrite(message.guild.me, { SEND_MESSAGES: null })
    );
    let lockdownMessages: string[] = message.guild.settings.get(
      "mod.lockdownmessages",
      []
    );
    const endReason = message.guild.language.get(
      "LOCKDOWN_END_REASON",
      message.author.toString(),
      reason
    ) as string;
    for (const role of message.guild.roles.cache.values()) {
      for (const channel of channels.values()) {
        if (lockdownMessages.find((msg) => msg?.startsWith(channel.id))) {
          const lockdownMessage = lockdownMessages
            .find((msg) => msg.startsWith(channel.id))
            .split("-")[1];
          lockdownMessages = lockdownMessages.filter(
            (msg) => msg != `${channel.id}-${lockdownMessage}`
          );
          await this.deleteMessage(
            channel.id,
            lockdownMessage,
            endReason
          ).catch(() => {});
        }
        await channel
          .updateOverwrite(
            role,
            {
              SEND_MESSAGES: null,
            },
            endReason
          )
          .catch(() => {
            if (failed.has(channel)) {
              const fail = failed.get(channel);
              fail.push(role);
              failed.set(channel, fail);
            } else failed.set(channel, [role]);
          });
      }
    }
    message.guild.settings.delete("mod.locked");
    lockdownMessages.length
      ? message.guild.settings.set("mod.lockdownmessages", lockdownMessages)
      : message.guild.settings.delete("mod.lockdownmessages");
    await message.success();
  }

  async deleteMessage(channel: string, message: string, reason: string) {
    // @ts-ignore
    await this.client.api
      // @ts-ignore
      .channels(channel)
      .messages(message)
      .delete({ reason });
  }
}
