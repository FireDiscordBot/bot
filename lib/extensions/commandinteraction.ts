import { APIAttachment } from "discord-api-types/v9";
import {
  ApplicationCommandOptionType,
  CacheType,
  Collection,
  CommandInteraction as CommandInteractionBase,
  CommandInteractionOption,
  CommandInteractionOptionResolver as CommandInteractionOptionResolverBase,
  CommandInteractionResolvedData,
  MessageAttachment,
  Snowflake,
  Structures,
} from "discord.js";
import { Fire } from "../Fire";
import {
  APIApplicationCommandOptionResolved,
  ApplicationCommandOptions,
} from "../interfaces/interactions";
import { FireGuild } from "./guild";
import { FireMember } from "./guildmember";
import { FireUser } from "./user";

interface TransformedOptionResult<Cached extends CacheType = CacheType>
  extends CommandInteractionOption {
  type: ApplicationCommandOptionType;
  options?: TransformedOptionResult[];
  attachment?: MessageAttachment;
}

type APIInteractionDataResolved = APIApplicationCommandOptionResolved & {
  attachments?: Record<Snowflake, APIAttachment>;
};

type ResolvedData = CommandInteractionResolvedData & {
  attachments?: Collection<Snowflake, MessageAttachment>;
};

export class CommandInteractionOptionResolver<
  Cached extends CacheType = CacheType
> extends CommandInteractionOptionResolverBase {
  public declare readonly resolved: Readonly<ResolvedData>;
  // public getAttachment(
  //   name: string,
  //   required?: boolean
  // ): MessageAttachment | null {
  //   // @ts-ignore
  //   const option = this._getTypedOption(
  //     name,
  //     // @ts-ignore
  //     "ATTACHMENT",
  //     ["attachment"],
  //     required
  //   ) as TransformedOptionResult;
  //   return option?.attachment ?? null;
  // }
}

export class CommandInteraction extends CommandInteractionBase {
  declare options: CommandInteractionOptionResolver;
  declare guild: FireGuild;
  declare client: Fire;
  targetId: Snowflake;

  constructor(client: Fire, data: any) {
    super(client, data);

    // if (data.data.options?.find((opt) => opt.type == 11))
    //   // likely changed above, retransform options
    //   this.options = new CommandInteractionOptionResolver(
    //     this.client,
    //     data.data.options?.map((option) =>
    //       this.transformOptionAgain(option, data.data.resolved)
    //     ) ?? [],
    //     this.transformResolvedAgain(data.data.resolved ?? {})
    //   );
  }

  private transformResolvedAgain({
    members,
    users,
    channels,
    roles,
    messages,
    attachments,
  }: APIInteractionDataResolved) {
    const result: ResolvedData = {};

    if (members) {
      result.members = new Collection();
      for (const [id, member] of Object.entries(members)) {
        const user = users[id];
        result.members.set(
          id,
          // @ts-ignore
          this.guild?.members._add({ user, ...member }) ?? member
        );
      }
    }

    if (users) {
      result.users = new Collection();
      for (const user of Object.values(users)) {
        // @ts-ignore
        result.users.set(user.id, this.client.users._add(user));
      }
    }

    if (roles) {
      result.roles = new Collection();
      for (const role of Object.values(roles)) {
        // @ts-ignore
        result.roles.set(role.id, this.guild?.roles._add(role) ?? role);
      }
    }

    if (channels) {
      result.channels = new Collection();
      for (const channel of Object.values(channels)) {
        result.channels.set(
          channel.id,
          // @ts-ignore
          this.client.channels._add(channel, this.guild) ?? channel
        );
      }
    }

    if (messages) {
      result.messages = new Collection();
      for (const message of Object.values(messages)) {
        result.messages.set(
          message.id,
          // @ts-ignore
          this.channel?.messages?._add(message) ?? message
        );
      }
    }

    if (attachments) {
      result.attachments = new Collection();
      for (const attachment of Object.values(attachments)) {
        result.attachments.set(
          attachment.id,
          new MessageAttachment(attachment.url, attachment.filename, attachment)
        );
      }
    }

    return result;
  }

  private transformOptionAgain(
    option: CommandInteractionOption,
    resolved: APIInteractionDataResolved
  ) {
    const result: TransformedOptionResult = {
      name: option.name,
      type: ApplicationCommandOptions[
        option.type
      ] as unknown as ApplicationCommandOptionType,
    };

    if ("value" in option) result.value = option.value;
    if ("options" in option)
      result.options = option.options.map((opt) =>
        this.transformOptionAgain(opt, resolved)
      );

    const valueStr = option.value?.toString();

    if (resolved) {
      const user = resolved.users?.[valueStr];
      // @ts-ignore
      if (user) result.user = this.client.users._add(user) as FireUser;

      const member = resolved.members?.[valueStr];
      if (member)
        result.member =
          // @ts-ignore
          (this.guild?.members._add({ user, ...member }) as FireMember) ??
          member;

      const channel = resolved.channels?.[valueStr];
      if (channel)
        // @ts-ignore
        result.channel =
          // @ts-ignore
          this.client.channels._add(channel, !!this.guild) ?? channel;

      const role = resolved.roles?.[valueStr];
      // @ts-ignore
      if (role) result.role = this.guild?.roles._add(role) ?? role;

      const attachment = resolved.attachments?.[valueStr];
      if (attachment)
        result.attachment = new MessageAttachment(
          attachment.url,
          attachment.filename,
          attachment
        );
    }

    return result;
  }
}

// @ts-ignore
Structures.extend("CommandInteraction", () => CommandInteraction);
