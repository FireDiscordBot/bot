import {
  PermissionOverwriteOptions,
  PermissionOverwrites,
  MessageEmbed,
  Permissions,
  Collection,
} from "discord.js";
import { categoryChannelConverter } from "@fire/lib/util/converters";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { humanize } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";

const update = (
  overwrite: PermissionOverwrites,
  options: PermissionOverwriteOptions
) => {
  const { allow, deny } = PermissionOverwrites.resolveOverwriteOptions(
    options,
    overwrite
  );
  overwrite.allow = allow;
  overwrite.deny = deny;
  return overwrite;
};

export default class Lockdown extends Command {
  constructor() {
    super("lockdown", {
      description: (language: Language) =>
        language.get("LOCKDOWN_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.MANAGE_CHANNELS,
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.EMBED_LINKS,
      ],
      userPermissions: [Permissions.FLAGS.MANAGE_CHANNELS],
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
      requiresExperiment: { id: 1387469587, bucket: 1 },
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
    let excluded = message.guild.settings.get<string[]>("mod.lockdownexcl", []);
    if (!excluded.length && args.action != "exclude")
      return await message.error("LOCKDOWN_EXCLUDE_REQUIRED");
    if (args.action == "exclude") {
      const category = await categoryChannelConverter(message, args.reason);
      if (!category) return;
      if (!excluded.includes(category.id)) excluded.push(category.id);
      message.guild.settings.set<string[]>("mod.lockdownexcl", excluded);
      return await message.success();
    } else if (args.action == "start")
      return await this.start(message, args.reason);
    else if (args.action == "end") return await this.end(message, args.reason);
  }

  async start(message: FireMessage, reason: string) {
    message.react("▶️").catch(() => {});
    let locked: string[] = [];
    const channels = message.guild.channels.cache.filter(
      (channel) =>
        channel.type == "text" &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has(Permissions.FLAGS.VIEW_CHANNEL) &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has(Permissions.FLAGS.SEND_MESSAGES)
    ) as Collection<string, FireTextChannel>;
    const startReason = message.guild.language.get(
      "LOCKDOWN_REASON",
      message.author.toString(),
      reason
    ) as string;
    const embed = new MessageEmbed()
      .setColor("#ef5350")
      .setDescription(startReason);
    let failed: string[] = [],
      lockdownMessages = message.guild.settings.get<string[]>(
        "mod.lockdownmessages",
        []
      );
    const start = +new Date();
    for (const channel of channels.values())
      await channel
        .overwritePermissions(
          [
            ...channel.permissionOverwrites
              .mapValues((overwrite) =>
                update(overwrite, { SEND_MESSAGES: false })
              )
              .values(),
            channel.permissionOverwrites.has(this.client.user.id)
              ? update(channel.permissionOverwrites.get(this.client.user.id), {
                  SEND_MESSAGES: true,
                })
              : {
                  id: this.client.user.id,
                  allow: ["SEND_MESSAGES"],
                  type: "member",
                },
          ],
          startReason
        )
        .then(() => {
          locked.push(channel.id);
          channel
            .send({ embeds: [embed] })
            .then((m) => lockdownMessages.push(`${channel.id}-${m.id}`))
            .catch(() => {});
        })
        .catch((e) => {
          this.client.console.debug(
            `Lockdown permission overwrite failed for ${channel.name} (${channel.id})\n${e.stack}`
          );
          failed.push(channel.toString());
        });
    message.guild.settings.set<string[]>("mod.locked", locked);
    message.guild.settings.set<string[]>(
      "mod.lockdownmessages",
      lockdownMessages
    );
    if (failed.length == channels.size) await message.error();
    else {
      const end = +new Date();
      message.success().catch(() => {});
      await message
        .success(
          "LOCKDOWN_FINISH",
          humanize(end - start, message.language.id.split("-")[0]),
          failed,
          locked.map((id) => channels.get(id).toString())
        )
        .then((m) => {
          if (m instanceof FireMessage) {
            lockdownMessages.push(`${message.channel.id}-${m.id}`);
            message.guild.settings.set<string[]>(
              "mod.lockdownmessages",
              lockdownMessages
            );
          }
        });
    }
  }

  async end(message: FireMessage, reason: string) {
    message.react("▶️").catch(() => {});
    const locked = message.guild.settings.get<string[]>("mod.locked", []);
    if (!locked.length) return await message.error("LOCKDOWN_END_NONE_LOCKED");
    const channels = message.guild.channels.cache.filter(
      (channel) =>
        channel.type == "text" &&
        channel
          .permissionsFor(message.guild.roles.everyone)
          .has(Permissions.FLAGS.VIEW_CHANNEL) &&
        !channel
          .permissionsFor(message.guild.roles.everyone)
          .has(Permissions.FLAGS.SEND_MESSAGES) &&
        locked.includes(channel.id)
    ) as Collection<string, FireTextChannel>;
    let lockdownMessages = message.guild.settings.get<string[]>(
      "mod.lockdownmessages",
      []
    );
    const endReason = message.guild.language.get(
      "LOCKDOWN_END_REASON",
      message.author.toString(),
      reason
    ) as string;
    let failed: string[] = [];
    for (const channel of channels.values()) {
      if (lockdownMessages.find((msg) => msg?.startsWith(channel.id))) {
        const lockdownMessage = lockdownMessages
          .find((msg) => msg.startsWith(channel.id))
          .split("-")[1];
        await this.deleteMessage(channel.id, lockdownMessage, endReason)
          .then(
            () =>
              (lockdownMessages = lockdownMessages.filter(
                (msg) => msg != `${channel.id}-${lockdownMessage}`
              ))
          )
          .catch(() => {});
      }
      await channel
        .overwritePermissions(
          [
            ...channel.permissionOverwrites
              .mapValues((overwrite) =>
                update(overwrite, { SEND_MESSAGES: null })
              )
              .values(),
            channel.permissionOverwrites.has(this.client.user.id)
              ? update(channel.permissionOverwrites.get(this.client.user.id), {
                  SEND_MESSAGES: null,
                })
              : {
                  id: this.client.user.id,
                  allow: ["SEND_MESSAGES"],
                  type: "member",
                },
          ],
          endReason
        )
        .catch(() => failed.push(channel.toString()));
    }
    message.guild.settings.delete("mod.locked");
    lockdownMessages.length
      ? message.guild.settings.set<string[]>(
          "mod.lockdownmessages",
          lockdownMessages
        )
      : message.guild.settings.delete("mod.lockdownmessages");
    failed.length
      ? await message.error("LOCKDOWN_END_FAIL", failed)
      : await message.success();
  }

  async deleteMessage(channel: string, message: string, reason: string) {
    await this.client.req
      .channels(channel)
      .messages(message)
      .delete<void>({ reason });
  }
}