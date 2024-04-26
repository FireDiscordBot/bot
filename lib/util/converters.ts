import { FireGuild } from "@fire/lib/extensions/guild";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import Quote from "@fire/src/commands/Utilities/quote";
import * as centra from "centra";
import {
  CategoryChannel,
  Collection,
  DeconstructedSnowflake,
  Emoji,
  FetchMembersOptions,
  GuildChannel,
  GuildEmoji,
  GuildPreview,
  Role,
  Snowflake,
  SnowflakeUtil,
  StageChannel,
  ThreadChannel,
  VoiceChannel,
} from "discord.js";
import * as fuzz from "fuzzball";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { FireTextChannel } from "../extensions/textchannel";
import { constants } from "./constants";

const messageIdRegex =
  /^(?:(?<channel_id>\d{15,21})-)?(?<message_id>\d{15,21})$/im;
const userMentionRegex = /<@!?(\d{15,21})>$/im;
const channelMentionRegex = /<#(\d{15,21})>$/im;
const roleMentionRegex = /<@&(\d{15,21})>$/im;
const idOnlyRegex = /^(\d{15,21})$/im;
const idRegex = /(\d{15,21})/im;
const { regexes } = constants;

export const getIDMatch = (argument: string, extra = false) => {
  const match = extra ? idRegex.exec(argument) : idOnlyRegex.exec(argument);
  return match ? (match[1] as Snowflake) : null;
};

export const getUserMentionMatch = (argument: string) => {
  const match = userMentionRegex.exec(argument);
  return match ? (match[1] as Snowflake) : null;
};

const getMessageIDMatch = (argument: string) => argument.match(messageIdRegex);

const getMessageLinkMatch = (argument: string) =>
  regexes.discord.message.exec(argument);

const getChannelMentionMatch = (argument: string) => {
  const match = channelMentionRegex.exec(argument);
  return match ? (match[1] as Snowflake) : null;
};

const getRoleMentionMatch = (argument: string) => {
  const match = roleMentionRegex.exec(argument);
  return match ? (match[1] as Snowflake) : null;
};

export const snowflakeConverter = async (
  message: FireMessage | ApplicationCommandMessage,
  argument: string,
  silent = false
): Promise<({ snowflake: Snowflake } & DeconstructedSnowflake) | null> => {
  if (!argument) return;

  if (argument == "@me") argument = message.author.id;

  const type = message.util?.parsed?.command?.id == "server" ? "GUILD" : "USER";

  const snowflake = getIDMatch(argument.trim());
  if (!snowflake) {
    if (!silent) await message.error(`INVALID_SNOWFLAKE_${type}`);
    return null;
  }

  const deconstructed = SnowflakeUtil.deconstruct(snowflake);
  if (deconstructed.timestamp < 1420070400000) {
    if (!silent) await message.error(`INVALID_SNOWFLAKE_${type}`);
    return null;
  }

  return {
    snowflake,
    ...deconstructed,
  };
};

export const emojiConverter = async (
  message: FireMessage,
  argument: string
): Promise<Emoji | string | null> => {
  if (!argument) return;

  const isUnicode = regexes.unicodeEmoji.exec(argument);
  regexes.unicodeEmoji.lastIndex = 0;
  if (isUnicode?.length) return isUnicode[0];
  else if (!message.guild) return null;

  const emojis = (await message.guild.emojis.fetch(undefined, {
    force: true,
    cache: false,
  })) as unknown as Collection<Snowflake, GuildEmoji>;
  return message.client.util.resolveEmoji(argument, emojis, false, true);
};

export const guildPreviewConverter = async (
  message: FireMessage | ApplicationCommandMessage,
  argument: string,
  silent = false
): Promise<GuildPreview | FireGuild> => {
  if (!argument) return;

  const id = await snowflakeConverter(message, argument);
  if (!id) return null;

  if (message.client.guilds.cache.has(id.snowflake)) {
    const guild = message.client.guilds.cache.get(id.snowflake) as FireGuild;
    if (guild.isPublic()) return guild;
    const member = await guild.members.fetch(message.author.id).catch(() => {});
    if (member) return guild;
  }

  const preview = await message.client
    .fetchGuildPreview(id.snowflake)
    .catch(() => {});
  if (!preview) {
    if (!silent) await message.error("PREVIEW_NOT_FOUND");
    return null;
  }

  if (
    !preview.features.includes("DISCOVERABLE") &&
    !message.author.isSuperuser()
  ) {
    if (!message.client.manager.ws?.open) {
      const member = await message.client.req
        .guilds(preview.id)
        .members(message.author.id)
        .get()
        .catch(() => {});
      if (member) return preview;
      if (!silent) await message.error("PREVIEW_NOT_DISCOVERABLE");
      return null;
    }
    let isPublic = false;
    const publicGuildsReq = await centra(
      process.env.REST_HOST
        ? `https://${process.env.REST_HOST}/public`
        : `http://localhost:${process.env.REST_PORT}/public`
    )
      .header("User-Agent", message.client.manager.ua)
      .header("Authorization", process.env.WS_AUTH)
      .send();
    if (publicGuildsReq.statusCode == 200) {
      const publicGuilds: string[] = await publicGuildsReq.json();
      isPublic = publicGuilds.includes(preview.id);
    }
    if (!isPublic) {
      const member = await message.client.req
        .guilds(preview.id)
        .members(message.author.id)
        .get()
        .catch(() => {});
      if (member) return preview;
      if (!silent) await message.error("PREVIEW_NOT_DISCOVERABLE");
      return null;
    }
  }

  return preview;
};

export const memberConverter = async (
  message: FireMessage | ApplicationCommandMessage,
  argument: string,
  silent = false
): Promise<FireMember | null> => {
  if (!argument) return;

  if (argument == "@me" && message.member) return message.member;

  if (message instanceof ApplicationCommandMessage) {
    const predicate = (_: unknown, key: string) => key == argument;
    const resolved = message.slashCommand.options.resolved;
    if (resolved.members?.find(predicate) instanceof FireMember)
      return resolved.members.find(predicate) as FireMember;
  }

  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (
    argument == "^" &&
    message.util.parsed?.command?.categoryID == "Moderation"
  ) {
    if (!silent) await message.error("MEMBER_NOT_FOUND");
    return null;
  } else if (argument == "^" && message.channel.messages.cache.size >= 4)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last().member as FireMember;
  else if (argument == "^") {
    const messages = await message.channel.messages
      .fetch({ limit: 5 })
      .catch(() => {});
    if (!messages || !messages.size) {
      await message.error("ERROR_CONTACT_SUPPORT");
      return null;
    }
    const authoredMessage = messages
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last() as FireMessage;
    if (authoredMessage.member) return authoredMessage.member as FireMember;
    else argument = authoredMessage.author.id; // continue on with author id
  }

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (!userID) {
    const alias = message.client.aliases.findKey((aliases) =>
      aliases.includes(argument.toLowerCase())
    );
    if (alias) argument = alias;
    let options: FetchMembersOptions = {
      query: argument,
      limit: 1,
      withPresences: true,
    };
    let member;
    if (argument.includes("#")) {
      const [name] = argument.split("#");
      options.query = name;
      delete options.limit;
      const members = await guild.members.fetch(options).catch(() => {});
      member = members
        ? members.find((member: FireMember) => member.toString() == argument)
        : null;
    } else
      member = await guild.members
        .fetch(options)
        .then((coll) => coll.first())
        .catch(() => {});

    if (member instanceof FireMember) return member;

    if (!silent) await message.error("MEMBER_NOT_FOUND");
    return null;
  } else {
    const member = await guild.members
      .fetch({ user: userID, limit: 1, withPresences: true })
      .catch(() => {});
    if (member instanceof Collection && member.size) {
      return member.first() as FireMember;
    } else if (member instanceof FireMember) return member;

    if (!silent) await message.error("INVALID_MEMBER_ID");
    return null;
  }
};

export const userConverter = async (
  message: FireMessage | ApplicationCommandMessage,
  argument: string,
  silent = false
): Promise<FireUser | null> => {
  if (!argument) return;

  if (argument == "@me") return message.author;

  if (message instanceof ApplicationCommandMessage) {
    const predicate = (_: unknown, key: string) => key == argument;
    const resolved = message.slashCommand.options.resolved;
    if (resolved.users?.find(predicate) instanceof FireUser)
      return resolved.users.find(predicate) as FireUser;
  }

  if (argument == "^" && message.channel.messages.cache.size >= 4)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last().author as FireUser;
  else if (argument == "^") {
    const messages = await message.channel.messages
      .fetch({ limit: 5 })
      .catch(() => {});
    if (!messages || !messages.size) {
      await message.error("ERROR_CONTACT_SUPPORT");
      return null;
    }
    const authoredMessage = messages
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last() as FireMessage;
    if (authoredMessage.author) return authoredMessage.author as FireUser;
    else {
      await message.error("INVALID_USER_ID");
      return null;
    }
  }

  const alias = message.client.aliases.findKey((aliases) =>
    aliases.includes(argument.toLowerCase())
  );
  if (alias) argument = alias;

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (userID) {
    const user =
      message.client.users.cache.get(userID) || message.mentions.has(userID)
        ? message.mentions.users.get(userID)
        : null;

    if (user) {
      return user as FireUser;
    }

    const fetch = await message.client.users.fetch(userID).catch(() => {});
    if (fetch) {
      return fetch as FireUser;
    }

    if (!silent) await message.error("INVALID_USER_ID");
    return null;
  } else {
    if (argument.charAt(0) == "@") argument = argument.slice(1);

    const match = message.client.users.cache.filter(
      (user) => user.username?.toLowerCase() == argument?.toLowerCase()
    );

    if (match.size > 0) {
      return match.first() as FireUser;
    }

    if (!silent) await message.error("USER_NOT_FOUND");
    return null;
  }
};

export const messageConverter = async (
  message: FireMessage,
  argument: string,
  silent = false,
  groups: { guild_id: string; message_id: string; channel_id: string } = null
): Promise<FireMessage | "cross_cluster" | null> => {
  let linkMatch: RegExpExecArray, idMatch: RegExpMatchArray;
  if (argument) {
    linkMatch = getMessageLinkMatch(argument);
    idMatch = getMessageIDMatch(argument);
  }
  if (!linkMatch && !idMatch && !groups?.message_id) {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }

  const quoteCommand = message.client.getCommand("quote") as Quote;
  const link = `${linkMatch?.groups?.guild_id}/${linkMatch?.groups?.channel_id}/${linkMatch?.groups?.message_id}`;
  if (quoteCommand && quoteCommand.savedQuotes.has(link)) {
    const saved = quoteCommand.savedQuotes.get(link);
    if (
      saved instanceof FireMessage &&
      saved.savedToQuoteBy == message.author.id
    )
      return saved;
  }

  if (
    linkMatch?.groups?.guild_id &&
    linkMatch?.groups?.guild_id != "@me" &&
    !(message.client.options.shards as number[]).includes(
      message.client.util.getShard(linkMatch?.groups?.guild_id)
    ) &&
    message.util?.parsed?.command?.id == "quote"
  )
    return "cross_cluster";

  let messageId: Snowflake, channelId: Snowflake;
  if (linkMatch || groups?.message_id) {
    groups =
      groups ||
      (linkMatch.groups as {
        guild_id: Snowflake;
        message_id: Snowflake;
        channel_id: Snowflake;
      });
    if (!groups) {
      if (!silent) await message.error("INVALID_MESSAGE");
      return null;
    }
    messageId = groups.message_id as Snowflake;
    channelId = groups.channel_id as Snowflake;
  } else {
    messageId = idMatch[0] as Snowflake;
    channelId = message.channelId;
  }
  // this should only actually make a request for closed threads
  const channel = (await message.client.channels
    .fetch(channelId)
    .catch(() => {})) as FireTextChannel | ThreadChannel | VoiceChannel;
  if (!channel) {
    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }

  try {
    return (await channel.messages.fetch(messageId)) as FireMessage;
  } catch {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }
};

export const guildChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<GuildChannel | null> => {
  if (!argument) return;

  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (!match) {
    const channel = guild.guildChannels.cache
      .filter((channel) => channel.name.toLowerCase() == argument.toLowerCase())
      .first();
    if (channel) return channel;

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.guildChannels.cache.get(match);
    if (channel) return channel;

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const textChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireTextChannel | null> => {
  if (!argument) return;

  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel.type == "GUILD_TEXT"
      )
      .first();
    if (channel) {
      return channel as FireTextChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "GUILD_TEXT") {
      return channel as FireTextChannel;
    }

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const voiceChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<VoiceChannel | StageChannel | null> => {
  if (!argument) return;

  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          (channel.name.toLowerCase() == argument.toLowerCase() &&
            channel.type == "GUILD_VOICE") ||
          channel.type == "GUILD_STAGE_VOICE"
      )
      .first();
    if (channel && channel.type == "GUILD_VOICE")
      return channel as VoiceChannel;
    else if (channel && channel.type == "GUILD_STAGE_VOICE")
      return channel as StageChannel;

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "GUILD_VOICE")
      return channel as VoiceChannel;
    else if (channel && channel.type == "GUILD_STAGE_VOICE")
      return channel as StageChannel;

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const categoryChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<CategoryChannel | null> => {
  if (!argument) return;

  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel.type == "GUILD_CATEGORY"
      )
      .first();
    if (channel) {
      return channel as CategoryChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "GUILD_CATEGORY") {
      return channel as CategoryChannel;
    }

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const roleConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<Role | null> => {
  if (!argument) return;

  const match = getIDMatch(argument) || getRoleMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error("ERROR_CONTACT_SUPPORT");
    return null;
  }

  if (!match) {
    const role = guild.roles.cache
      .filter(
        (role) =>
          role.name.toLowerCase() == argument.toLowerCase().toLowerCase()
      )
      .first();
    if (role) {
      return role as Role;
    }

    const fuzzy = guild.roles.cache.find(
      (role) =>
        fuzz.ratio(
          role.name.trim().toLowerCase(),
          argument.trim().toLowerCase()
        ) >= 75
    );
    if (fuzzy) return fuzzy;

    if (!silent) await message.error("ROLE_NOT_FOUND");
    return null;
  } else {
    const role = guild.roles.cache.get(match);
    if (role) {
      return role as Role;
    }

    if (!silent) await message.error("INVALID_ROLE_ID");
    return null;
  }
};
