import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import { Command } from "@fire/lib/util/command";
import {
  LinkfilterExcluded,
  LinkfilterExcludedItem,
} from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  Channel,
  Collection,
  GuildChannel,
  MessageEmbed,
  Permissions,
  Role,
} from "discord.js";

type Arguments = {
  user?: FireMember;
  role?: Role;
  channel?: Channel;
};

type Excludable = FireMember | Role | Channel;

export default class LinkfilterExclude extends Command {
  constructor() {
    super("linkfilter-exclude", {
      description: (language: Language) =>
        language.get("LINKFILTER_EXCLUDE_COMMAND_DESCRIPTION"),
      clientPermissions: [Permissions.FLAGS.MANAGE_MESSAGES],
      userPermissions: [Permissions.FLAGS.MANAGE_GUILD],
      args: [
        {
          id: "user",
          type: "member",
          description: (language: Language) =>
            language.get("LINKFILTER_EXCLUDE_USER_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
        {
          id: "role",
          type: "role",
          description: (language: Language) =>
            language.get("LINKFILTER_EXCLUDE_ROLE_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
        {
          id: "channel",
          type: "channel",
          description: (language: Language) =>
            language.get("LINKFILTER_EXCLUDE_CHANNEL_ARGUMENT_DESCRIPTION"),
          default: undefined,
          required: false,
        },
      ],
      context: ["link filter exclude"],
      enableSlashCommand: true,
      parent: "linkfilter",
      restrictTo: "guild",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args?: Arguments
  ) {
    if (command instanceof ApplicationCommandMessage && !!args)
      return this.runSlash(command, args);
    else if (command instanceof ContextCommandMessage && command.getUser(false))
      return this.runContextUser(command);
    else if (
      command instanceof ContextCommandMessage &&
      command.getMessage(false)
    )
      return this.runContextMessage(command);
    else return await command.error("LINKFILTER_EXCLUDE_HOW");
  }

  async runSlash(command: ApplicationCommandMessage, args: Arguments) {
    const { user, role, channel } = args;
    if (channel && channel.isThread())
      return await command.error("LINKFILTER_EXCLUDE_THREAD");
    if (
      channel &&
      (!(channel instanceof GuildChannel) ||
        (channel instanceof GuildChannel && channel.guildId != command.guildId))
    )
      return await command.error("LINKFILTER_EXCLUDE_CHANNEL_NOT_GUILD");
    if (role && (!role.guild || role.guild.id != command.guildId))
      return await command.error("LINKFILTER_EXCLUDE_ROLE_NOT_GUILD");
    const excluded: Excludable[] = [];
    const unexcluded: Excludable[] = [];
    let current =
      command.guild.settings.get<LinkfilterExcluded>("linkfilter.exclude");
    const beforeLength = current.length;
    if (user) {
      const id: LinkfilterExcludedItem = `user:${user.id}`;
      if (!current.includes(id)) {
        excluded.push(user);
        current.push(id);
      } else {
        unexcluded.push(user);
        current = current.filter((e) => e != id);
      }
    }
    if (role) {
      const id: LinkfilterExcludedItem = `role:${role.id}`;
      if (!current.includes(id)) {
        excluded.push(role);
        current.push(id);
      } else {
        unexcluded.push(role);
        current = current.filter((e) => e != id);
      }
    }
    if (channel) {
      const id: LinkfilterExcludedItem = `channel:${channel.id}`;
      if (!current.includes(id)) {
        excluded.push(channel);
        current.push(id);
      } else {
        unexcluded.push(channel);
        current = current.filter((e) => e != id);
      }
    }
    if (current.length != beforeLength)
      command.guild.settings.set<LinkfilterExcluded>(
        "linkfilter.exclude",
        current
      );
    else return await command.error("LINKFILTER_EXCLUDE_NO_CHANGE");
    const excludedString = excluded.map((e) => e.toString()).join(", ");
    const unexcludedString = unexcluded.map((e) => e.toString()).join(", ");
    if (excluded.length && unexcluded.length)
      return await command.success("LINKFILTER_EXCLUDE_AND_UNEXCLUDE", {
        excluded: excludedString,
        unexcluded: unexcludedString,
      });
    else if (excluded.length)
      return await command.success("LINKFILTER_EXCLUDE_SUCCESS", {
        excluded: excludedString,
      });
    else if (unexcluded.length)
      return await command.success("LINKFILTER_UNEXCLUDE_SUCCESS", {
        unexcluded: unexcludedString,
      });
  }

  async runContextUser(command: ContextCommandMessage) {
    if (!command.guild) return await command.error("COMMAND_GUILD_ONLY");
    const user = command.getUser(true) as FireUser;
    const member = (await command.guild.members
      .fetch(user)
      .catch(() => {})) as FireMember;
    if (!member) return await command.error("MEMBER_NOT_FOUND_COMPONENT");
    let current =
      command.guild.settings.get<LinkfilterExcluded>("linkfilter.exclude");
    let direction: "exclude" | "unexclude";
    const id: LinkfilterExcludedItem = `user:${user.id}`;
    if (!current.includes(id)) {
      direction = "exclude";
      current.push(id);
    } else {
      direction = "unexclude";
      current = current.filter((e) => e != id);
    }
    command.guild.settings.set<LinkfilterExcluded>(
      "linkfilter.exclude",
      current
    );
    if (direction == "exclude")
      return await command.success("LINKFILTER_EXCLUDE_SUCCESS", {
        excluded: member.toString(),
      });
    else if (direction == "unexclude")
      return await command.success("LINKFILTER_UNEXCLUDE_SUCCESS", {
        unexcluded: member.toString(),
      });
    // idk how you'd ever get here but just in case
    else return await command.error("LINKFILTER_EXCLUDE_NO_CHANGE");
  }

  async runContextMessage(command: ContextCommandMessage) {
    if (!command.guild) return await command.error("COMMAND_GUILD_ONLY");
    const message = command.getMessage(true) as FireMessage;
    if (!message || !(message instanceof FireMessage))
      return await command.error("COMMAND_ERROR_GENERIC", {
        id: this.id,
      });
    let current =
      command.guild.settings.get<LinkfilterExcluded>("linkfilter.exclude");
    const { users, roles, channels } = message.mentions;
    if (!users?.size && !roles?.size && !channels?.size)
      return await command.error("LINKFILTER_EXCLUDE_CONTEXT_MENTIONS");
    if (users && users.size) {
      const excluded: FireMember[] = [];
      const unexcluded: FireMember[] = [];
      const beforeLength = current.length;
      const members = (await command.guild.members
        .fetch({
          user: users.map((u) => u.id),
        })
        .catch(() => {})) as Collection<string, FireMember>;
      if (members && members.size)
        for (const [, member] of members) {
          const id: LinkfilterExcludedItem = `user:${member.id}`;
          if (!current.includes(id)) {
            excluded.push(member);
            current.push(id);
          } else {
            unexcluded.push(member);
            current = current.filter((e) => e != id);
          }
        }
      if (current.length != beforeLength)
        await this.createAndSendSuccessEmbed(
          command,
          current,
          unexcluded,
          excluded
        );
    }
    if (roles && roles.size) {
      const excluded: Role[] = [];
      const unexcluded: Role[] = [];
      const beforeLength = current.length;
      for (const [, role] of roles) {
        if (!role.guild || role.guild.id != command.guildId) continue;
        const id: LinkfilterExcludedItem = `role:${role.id}`;
        if (!current.includes(id)) {
          excluded.push(role);
          current.push(id);
        } else {
          unexcluded.push(role);
          current = current.filter((e) => e != id);
        }
      }
      if (current.length != beforeLength)
        await this.createAndSendSuccessEmbed(
          command,
          current,
          unexcluded,
          excluded
        );
    }
    if (channels && channels.size) {
      const excluded: Channel[] = [];
      const unexcluded: Channel[] = [];
      const beforeLength = current.length;
      for (const [, channel] of channels) {
        if (channel.isThread()) continue;
        else if (
          !(channel instanceof GuildChannel) ||
          (channel instanceof GuildChannel &&
            channel.guildId != command.guildId)
        )
          continue;
        const id: LinkfilterExcludedItem = `channel:${channel.id}`;
        if (!current.includes(id)) {
          excluded.push(channel);
          current.push(id);
        } else {
          unexcluded.push(channel);
          current = current.filter((e) => e != id);
        }
      }
      if (current.length != beforeLength)
        await this.createAndSendSuccessEmbed(
          command,
          current,
          unexcluded,
          excluded
        );
    }
  }

  private async createAndSendSuccessEmbed(
    command: ContextCommandMessage,
    current: LinkfilterExcluded,
    unexcluded: Excludable[],
    excluded: Excludable[]
  ) {
    const language = command.language;
    await command.guild.settings.set<LinkfilterExcluded>(
      "linkfilter.exclude",
      current
    );
    const embed = new MessageEmbed().setColor("#2ECC71");
    const excludedString = excluded.map((e) => e.toString()).join(", ");
    const unexcludedString = unexcluded.map((e) => e.toString()).join(", ");
    if (excluded.length && unexcluded.length)
      embed.setDescription(
        language.getSuccess("LINKFILTER_EXCLUDE_AND_UNEXCLUDE", {
          excluded: excludedString,
          unexcluded: unexcludedString,
        })
      );
    else if (excluded.length)
      embed.setDescription(
        language.getSuccess("LINKFILTER_EXCLUDE_SUCCESS", {
          excluded: excludedString,
        })
      );
    else if (unexcluded.length)
      embed.setDescription(
        language.getSuccess("LINKFILTER_UNEXCLUDE_SUCCESS", {
          unexcluded: unexcludedString,
        })
      );
    await command.channel.send({ embeds: [embed] });
  }
}
