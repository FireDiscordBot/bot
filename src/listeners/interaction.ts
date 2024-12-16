import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { AutocompleteInteraction } from "@fire/lib/extensions/autocompleteinteraction";
import { CommandInteraction } from "@fire/lib/extensions/commandinteraction";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireGuild } from "@fire/lib/extensions/guild";
import { MessageContextMenuInteraction } from "@fire/lib/extensions/messagecontextmenuinteraction";
import { ModalMessage } from "@fire/lib/extensions/modalmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireUser } from "@fire/lib/extensions/user";
import { UserContextMenuInteraction } from "@fire/lib/extensions/usercontextmenuinteraction";
import { Fire } from "@fire/lib/Fire";
import { IPoint } from "@fire/lib/interfaces/aether";
import { Listener } from "@fire/lib/util/listener";
import {
  ApplicationCommandOptionChoiceData,
  ContextMenuInteraction,
  DiscordAPIError,
  DMChannel,
  Interaction,
  MessageComponentInteraction,
  ModalSubmitInteraction,
  NewsChannel,
  ThreadChannel,
} from "discord.js";

const getShard = (interaction: Interaction) => {
  if (interaction.guild) return interaction.guild.shard;
  else if (interaction.guildId) {
    const shard = (interaction.client as Fire).util.getShard(
      interaction.guildId
    );
    if (interaction.client.ws.shards.has(shard))
      return interaction.client.ws.shards.get(shard);
    else return interaction.client.ws.shards.first();
  } else if (
    interaction.channel instanceof DMChannel &&
    interaction.client.ws.shards.has(0)
  )
    return interaction.client.ws.shards.get(0);
  else return interaction.client.ws.shards.first();
};

const getSource = (interaction: Interaction) =>
  interaction.guild
    ? `${interaction.guild} (${interaction.guild.id})`
    : interaction.guildId
    ? "User App"
    : (
        interaction.channel as
          | FireTextChannel
          | NewsChannel
          | ThreadChannel
          | DMChannel
      ).type == "DM"
    ? "DM"
    : "Unknown";

export default class InteractionListener extends Listener {
  constructor() {
    super("interaction", {
      emitter: "client",
      event: "interactionCreate",
    });
  }

  async exec(interaction: Interaction) {
    if (this.blacklistCheck(interaction)) {
      const useCommandName =
        interaction.isCommand() ||
        interaction.isMessageContextMenu() ||
        interaction.isUserContextMenu() ||
        interaction.isAutocomplete();
      const useCustomId =
        interaction.isMessageComponent() || interaction.isModalSubmit();
      this.client.writeToInflux([
        {
          measurement: "commands",
          tags: {
            type: "blocked",
            command: useCommandName
              ? // tsc yells without changing to an impl of Interaction for some reason
                // even though if useCommandName is true, interaction has a commandName property
                (interaction as CommandInteraction).commandName
              : useCustomId
              ? (interaction as MessageComponentInteraction).customId
              : "unknown",
            cluster: this.client.manager.id.toString(),
            shard: getShard(interaction).id.toString(),
            user_id: interaction.user.id, // easier to query tag
          },
          fields: {
            type: "blocked",
            command: useCommandName
              ? (interaction as CommandInteraction).commandName
              : useCustomId
              ? (interaction as MessageComponentInteraction).customId
              : "unknown",
            // TODO: possibly rename to "source" rather than guild?
            guild: getSource(interaction),
            user: `${interaction.user} (${interaction.user.id})`,
            message_id: interaction.id,
            reason: "blacklist",
          },
        },
      ]);
      return;
    }
    const point: IPoint = {
      measurement: "interaction",
      tags: {
        type: interaction.type,
        user_id: interaction.user?.id,
        cluster: this.client.manager.id.toString(),
        shard: getShard(interaction).id.toString(),
      },
      fields: {
        guild: getSource(interaction),
        user: `${interaction.user} (${interaction.user.id})`,
      },
    };
    if (interaction.isCommand()) {
      point.fields.command = interaction.commandName;
      point.fields.args = JSON.stringify(interaction.options.data);
    } else if (
      interaction.isMessageComponent() ||
      interaction.isModalSubmit()
    ) {
      point.fields.custom_id = interaction.customId;
      if (interaction.isMessageComponent())
        point.fields.component_type = interaction.componentType;
    } else if (interaction.isContextMenu()) {
      point.tags.type = "CONTEXT_COMMAND";
      point.fields.command = interaction.commandName;
      point.fields.context = interaction.targetType;
      point.fields.target_id = interaction.targetId;
    }
    this.client.writeToInflux([point]);
    if (interaction.isCommand())
      return await this.handleApplicationCommand(
        interaction as CommandInteraction
      );
    else if (interaction.isAutocomplete())
      return await this.handleCommandAutocomplete(
        interaction as AutocompleteInteraction
      );
    else if (interaction.isContextMenu())
      return await this.handleContextMenu(
        interaction as
          | UserContextMenuInteraction
          | MessageContextMenuInteraction
      );
    else if (interaction.isButton())
      return await this.handleButton(interaction);
    else if (interaction.isSelectMenu())
      return await this.handleSelect(interaction);
    else if (interaction.isModalSubmit())
      return await this.handleModalSubmit(interaction);
  }

  async handleApplicationCommand(command: CommandInteraction) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(command.channelId).catch(() => {});
      const message = new ApplicationCommandMessage(this.client, command);
      await message.init();
      if (
        message.command?.requiresExperiment?.id &&
        !message.hasExperiment(
          message.command.requiresExperiment.id,
          message.command.requiresExperiment.bucket
        )
      ) {
        await message.error("COMMAND_EXPERIMENT_REQUIRED");
        // subcommands will always be global so we ignore if parent is set
        if (message.guild && !message.command.parent)
          return await message.guild.commands
            .delete(message.slashCommand.id)
            .catch((e: Error) => {
              if (!(e instanceof DiscordAPIError && e.code == 10063))
                this.client.console.error(
                  `[Commands] Failed to delete locked slash command "${message.command.id}" in ${message.guild.name} (${message.guild.id})\n${e.stack}`
                );
            });
        else return;
      }

      this.client.console.debug(
        message.guild
          ? `[Commands] Handling slash command request for command /${command.commandName} from ${message.author} (${message.author.id}) in ${message.guild.name} (${message.guild.id})`
          : `[Commands] Handling slash command request for command /${command.commandName} from ${message.author} (${message.author.id})`
      );
      if (!message.command) {
        this.client.console.warn(
          `[Commands] Got slash command request for unknown command, /${command.commandName}`
        );
        return await message.error("UNKNOWN_COMMAND");
      } else if (!message.guild && message.command.channel == "guild")
        return await message.error("SLASH_COMMAND_BOT_REQUIRED", {
          invite: this.client.config.inviteLink,
        });
      // await message.generateContent();
      await this.client.commandHandler.handleSlash(message);
      // if (message.sent != "message")
      //   await message.sourceMessage?.delete().catch(() => {});
    } catch (error) {
      const guild = this.client.guilds.cache.get(command.guildId);
      if (!guild)
        await this.error(command, error).catch(() => {
          command.reply(
            `${this.client.util.useEmoji("error")} Something went wrong...`
          );
        });
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.captureException(error, {
          extra: {
            slashCommand: JSON.stringify(command, (_, value) =>
              typeof value === "bigint" ? `${value}n` : value
            ),
            member: command.member
              ? command.member.toString()
              : command.user.toString(),
            channel_id: command.channelId,
            guild_id: command.guildId,
            env: process.env.NODE_ENV,
          },
          user: {
            id: command.user.id,
            username: command.user.toString(),
          },
        });
      }
    }
  }

  async handleCommandAutocomplete(interaction: AutocompleteInteraction) {
    const message = new ApplicationCommandMessage(this.client, interaction);
    await message.init();
    if (!message.command || typeof message.command.autocomplete !== "function")
      return;
    const focused = interaction.options.data.find((option) => option.focused);
    if (!focused) return await interaction.respond([]);
    if (message.command.channel == "guild" && !message.guild)
      return await interaction.respond([
        {
          name: message.language.get("COMMAND_GUILD_ONLY", {
            invite: this.client.config.inviteLink.slice(8),
          }),
          value: "COMMAND_GUILD_ONLY",
        },
      ]);
    let autocomplete = await message.command.autocomplete(message, focused);
    // @ts-ignore no idea why this is complaining but whatever
    if (autocomplete.every((option) => typeof option === "string"))
      // allow returning an array of strings if name & value should be the same
      autocomplete = autocomplete.map((a) => ({
        name: a,
        value: a,
      }));
    if (autocomplete.length > 25) autocomplete = autocomplete.slice(0, 25);
    return await interaction.respond(
      autocomplete as ApplicationCommandOptionChoiceData[]
    );
  }

  async handleButton(button: MessageComponentInteraction) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(button.channelId).catch(() => {});
      const message = new ComponentMessage(this.client, button);
      if (message.customId.startsWith("?")) await message.channel.defer(true);
      if (
        !message.customId.startsWith("!") &&
        !message.customId.startsWith("?") &&
        !message.customId.startsWith("ticket_close") // temp, new tickets start with !
      )
        await message.channel.ack();
      else if (!message.customId.startsWith("ticket_close"))
        message.customId = message.customId.slice(1);
      this.client.emit("button", message);
      if (!message.message) await message.getRealMessage().catch(() => {});
    } catch (error) {
      await this.error(button, error).catch(() => {
        button.reply(
          `${this.client.util.useEmoji("error")} Something went wrong...`
        );
      });
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.captureException(error, {
          extra: {
            button: JSON.stringify(button),
            member: button.member
              ? button.member.toString()
              : button.user.toString(),
            channel_id: button.channelId,
            guild_id: button.guildId,
            env: process.env.NODE_ENV,
          },
          user: {
            id: button.user.id,
            username: button.user.toString(),
          },
        });
      }
    }
  }

  async handleSelect(select: MessageComponentInteraction) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(select.channelId).catch(() => {});
      const message = new ComponentMessage(this.client, select);
      if (!message.customId.startsWith("!")) await message.channel.ack();
      else message.customId = message.customId.slice(1);
      this.client.emit("select", message);
    } catch (error) {
      await this.error(select, error).catch(() => {
        select.reply(
          `${this.client.util.useEmoji("error")} Something went wrong...`
        );
      });
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.captureException(error, {
          extra: {
            button: JSON.stringify(select),
            member: select.member
              ? select.member.toString()
              : select.user.toString(),
            channel_id: select.channelId,
            guild_id: select.guildId,
            env: process.env.NODE_ENV,
          },
          user: {
            id: select.user.id,
            username: select.user.toString(),
          },
        });
      }
    }
  }

  async handleModalSubmit(modal: ModalSubmitInteraction) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(modal.channelId).catch(() => {});
      const message = new ModalMessage(this.client, modal);
      this.client.emit("modal", message);
    } catch (error) {
      const guild = this.client.guilds.cache.get(modal.guildId);
      if (!guild)
        await this.error(modal, error).catch(() => {
          modal.reply(
            `${this.client.util.useEmoji("error")} Something went wrong...`
          );
        });
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.captureException(error, {
          extra: {
            modal: JSON.stringify(modal),
            member: modal.member
              ? modal.member.toString()
              : modal.user.toString(),
            channel_id: modal.channelId,
            guild_id: modal.guildId,
            env: process.env.NODE_ENV,
          },
          user: {
            id: modal.user.id,
            username: modal.user.toString(),
          },
        });
      }
    }
  }

  async handleContextMenu(
    context: UserContextMenuInteraction | MessageContextMenuInteraction
  ) {
    try {
      // should be cached if in guild or fetch if dm channel
      await this.client.channels.fetch(context.channelId).catch(() => {});
      const message = new ContextCommandMessage(this.client, context);
      // await message.channel.ack((message.flags & 64) != 0);
      if (!message.command) {
        this.client.console.warn(
          `[Commands] Got application command request for unknown context menu, ${context.commandName}`
        );
        return await message.error("UNKNOWN_COMMAND");
      } else if (!message.guild && message.command.channel == "guild")
        return await message.error("SLASH_COMMAND_BOT_REQUIRED", {
          invite: this.client.config.inviteLink,
        });
      await this.client.commandHandler.handleSlash(message);
    } catch (error) {
      const guild = this.client.guilds.cache.get(context.guildId);
      if (!guild)
        await this.error(context, error).catch(() => {
          context.reply(
            `${this.client.util.useEmoji("error")} Something went wrong...`
          );
        });
      if (typeof this.client.sentry != "undefined") {
        const sentry = this.client.sentry;
        sentry.captureException(error, {
          extra: {
            // contextCommand: JSON.stringify(context),
            member: context.member
              ? context.member.toString()
              : context.user.toString(),
            channel_id: context.channelId,
            guild_id: context.guildId,
            env: process.env.NODE_ENV,
          },
          user: {
            id: context.user.id,
            username: context.user.toString(),
          },
        });
      }
    }
  }

  async error(
    interaction:
      | CommandInteraction
      | ContextMenuInteraction
      | MessageComponentInteraction
      | ModalSubmitInteraction,
    error: Error
  ) {
    return interaction.reply({
      content: `${this.client.util.useEmoji(
        "error"
      )} An error occured while trying to handle this interaction that may be caused by being in DMs or the bot not being present...

      If this is a slash command, try inviting the bot to a server (<${
        this.client.config.inviteLink
      }>) if you haven't already and try again.

      Error Message: ${error.message}`,
      ephemeral: true,
    });
  }

  blacklistCheck(interaction: Interaction) {
    const guild = interaction.guild as FireGuild;
    const user = interaction.user as FireUser;

    return this.client.util.isBlacklisted(
      user,
      guild,
      interaction.isCommand() ? interaction.commandName : null
    );
  }
}
