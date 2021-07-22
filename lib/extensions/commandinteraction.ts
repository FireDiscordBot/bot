import {
  CommandInteractionOptionResolver as CommandInteractionOptionResolverBase,
  CommandInteraction as CommandInteractionBase,
  GuildChannel,
  Structures,
  Snowflake,
  Role,
} from "discord.js";
import {
  APIApplicationCommandOptionResolved,
  ApplicationCommandOptionType,
  Option,
} from "../interfaces/interactions";
import { FireTextChannel } from "./textchannel";
import { FireMember } from "./guildmember";
import { FireMessage } from "./message";
import { FireGuild } from "./guild";
import { FireUser } from "./user";
import { Fire } from "../Fire";

type OptionType = keyof typeof ApplicationCommandOptionType;

interface TransformedOptionResult {
  name: string;
  type: OptionType;
  value?: string | number | boolean;
  options?: TransformedOptionResult[];
  user?: FireUser;
  member?: FireMember;
  channel?: FireTextChannel | GuildChannel;
  role?: Role;
  message?: FireMessage;
}

export class CommandInteractionOptionResolver extends CommandInteractionOptionResolverBase {
  public getMessage(name: string, required: true): NonNullable<FireMessage>;
  public getMessage(
    name: string,
    required?: boolean
  ): NonNullable<FireMessage> | null {
    // @ts-ignore
    const option = this._getTypedOption(
      name,
      // @ts-ignore
      "MESSAGE",
      ["message"],
      required
    ) as TransformedOptionResult;
    return option?.message ?? null;
  }
}

export class CommandInteraction extends CommandInteractionBase {
  declare options: CommandInteractionOptionResolver;
  declare guild: FireGuild;
  declare client: Fire;
  targetId: Snowflake;

  constructor(client: Fire, data: any) {
    super(client, data);
    this.targetId = data.data.target_id ?? null;

    if (this.targetId in (data.data.resolved?.users ?? {})) {
      data.data.options = [
        {
          name: "user",
          type: 6,
          value: this.targetId,
        },
      ];
    } else if (this.targetId in (data.data.resolved?.messages ?? {})) {
      data.data.options = [
        {
          name: "message",
          type: 11, // doesn't actually exist,
          value: this.targetId,
        },
      ];
    }

    if (data.data.options.find((opt) => opt.value == this.targetId))
      // likely changed above, retransform options
      this.options = new CommandInteractionOptionResolver(
        this.client,
        data.data.options?.map((option) =>
          this.transformOptionAgain(option, data.data.resolved)
        ) ?? []
      );
  }

  private transformOptionAgain(
    option: Option,
    resolved: APIApplicationCommandOptionResolved
  ) {
    const result: TransformedOptionResult = {
      name: option.name,
      type: ApplicationCommandOptionType[option.type] as OptionType,
    };

    if ("value" in option) result.value = option.value;
    if ("options" in option)
      result.options = option.options.map((opt) =>
        this.transformOptionAgain(opt, resolved)
      );

    if (resolved) {
      const user = resolved.users?.[option.value as any];
      // @ts-ignore
      if (user) result.user = this.client.users._add(user) as FireUser;

      const member = resolved.members?.[option.value as any];
      if (member)
        result.member =
          // @ts-ignore
          (this.guild?.members._add({ user, ...member }) as FireMember) ??
          member;

      const channel = resolved.channels?.[option.value as any];
      if (channel)
        result.channel =
          // @ts-ignore
          this.client.channels._add(channel, this.guild) ?? channel;

      const role = resolved.roles?.[option.value as any];
      // @ts-ignore
      if (role) result.role = this.guild?.roles._add(role) ?? role;

      const message = resolved.messages?.[option.value as any];
      if (message)
        // @ts-ignore
        result.message = this.channel.messages._add(message) as FireMessage;
    }

    return result;
  }

  isContext() {
    return this.targetId !== null;
  }

  isUserContext() {
    return (
      this.isContext() &&
      this.options.data.find(
        (opt) => opt.type == "USER" && opt.value == this.targetId
      )
    );
  }

  isMessageContext() {
    return (
      this.isContext() &&
      this.options.data.find(
        // @ts-ignore
        (opt) => opt.type == "MESSAGE" && opt.value == this.targetId
      )
    );
  }
}

Structures.extend("CommandInteraction", () => CommandInteraction);
