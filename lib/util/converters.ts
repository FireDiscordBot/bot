import {
  Role,
  TextChannel,
  VoiceChannel,
  GuildChannel,
  SnowflakeUtil,
  CategoryChannel,
  FetchMembersOptions,
  DeconstructedSnowflake,
} from "discord.js";
import { FireMember } from "../extensions/guildmember";
import { FireMessage } from "../extensions/message";
import { FireUser } from "../extensions/user";
import { constants } from "./constants";

const { regexes } = constants;
const idOnlyRegex = /(1|\d{15,21})$/im;
const idRegex = /(1|\d{15,21})/im;
const userMentionRegex = /<@!?(1|\d{15,21})>$/im;
const messageIDRegex = /^(?:(?<channel_id>\d{15,21})-)?(?<message_id>\d{15,21})$/im;
const channelMentionRegex = /<#(\d{15,21})>$/im;
const roleMentionRegex = /<@&(\d{15,21})>$/im;

export const getIDMatch = (argument: string, extra = false) => {
  const match = extra ? idRegex.exec(argument) : idOnlyRegex.exec(argument);
  return match ? match[1] : null;
};

export const getUserMentionMatch = (argument: string) => {
  const match = userMentionRegex.exec(argument);
  return match ? match[1] : null;
};

const getMessageIDMatch = (argument: string) => argument.match(messageIDRegex);

const getMessageLinkMatch = (argument: string) =>
  regexes.discord.message.exec(argument);

const getChannelMentionMatch = (argument: string) => {
  const match = channelMentionRegex.exec(argument);
  return match ? match[1] : null;
};

const getRoleMentionMatch = (argument: string) => {
  const match = roleMentionRegex.exec(argument);
  return match ? match[1] : null;
};

export const snowflakeConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<({ snowflake: string } & DeconstructedSnowflake) | null> => {
  if (!argument) return;

  const snowflake = getIDMatch(argument.trim());
  if (!snowflake) {
    if (!silent) await message.error("INVALID_SNOWFLAKE");
    return null;
  }

  const deconstructed = SnowflakeUtil.deconstruct(snowflake);
  if (deconstructed.timestamp < 1420070400000) {
    if (!silent) await message.error("INVALID_SNOWFLAKE");
    return null;
  }

  return {
    snowflake,
    ...deconstructed,
  };
};

export const memberConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireMember | null> => {
  if (!argument) return;

  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  if (argument == "^" && message.channel.messages.cache.size >= 2)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id)
      .last().member as FireMember;

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (!userID) {
    let options: FetchMembersOptions = {
      query: argument,
      limit: 1,
    };
    // if (argument.includes("#")) {
    //   const [name] = argument.split("#");
    //   options.query = name;
    // }
    const member = await guild.members.fetch(options).catch(() => {});
    if (member && member.size) {
      return member.first() as FireMember;
    }

    if (!silent) await message.error("MEMBER_NOT_FOUND");
    return null;
  } else {
    const member = guild.members.cache.get(userID);
    if (member) {
      return member as FireMember;
    }

    if (!silent) await message.error("INVALID_MEMBER_ID");
    return null;
  }
};

export const userConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireUser | null> => {
  if (!argument) return;

  if (argument == "^" && message.channel.messages.cache.size >= 4)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id && m.author.id != message.author.id)
      .last().author as FireUser;

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

    if (argument.length > 5 && argument.slice(-5).startsWith("#")) {
      const discrim = argument.slice(-4);
      const name = argument.slice(0, -5);
      const match = message.client.users.cache.filter(
        (user) => user.username == name && user.discriminator == discrim
      );
      if (match.size) {
        return match.first() as FireUser;
      }
    }

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
): Promise<FireMessage | null> => {
  let linkMatch: RegExpExecArray, idMatch: RegExpMatchArray;
  if (argument) {
    linkMatch = getMessageLinkMatch(argument);
    idMatch = getMessageIDMatch(argument);
  }
  if (!linkMatch && !idMatch && !groups?.message_id) {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }

  let messageID: string, channelID: string;
  if (linkMatch || groups?.message_id) {
    groups =
      groups ||
      (linkMatch.groups as {
        guild_id: string;
        message_id: string;
        channel_id: string;
      });
    if (!groups) {
      if (!silent) await message.error("INVALID_MESSAGE");
      return null;
    }
    messageID = groups.message_id;
    channelID = groups.channel_id;
  } else {
    messageID = idMatch[0];
    channelID = message.channel.id;
  }
  const channel = (message.client.channels.cache.get(channelID) ||
    message.channel) as TextChannel;

  try {
    return (await channel.messages.fetch(messageID)) as FireMessage;
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
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel instanceof GuildChannel
      )
      .first();
    if (channel) {
      return channel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel instanceof GuildChannel) {
      return channel;
    }

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const textChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<TextChannel | null> => {
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel.type == "text"
      )
      .first();
    if (channel) {
      return channel as TextChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "text") {
      return channel as TextChannel;
    }

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const voiceChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<VoiceChannel | null> => {
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel.type == "voice"
      )
      .first();
    if (channel) {
      return channel as VoiceChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "voice") {
      return channel as VoiceChannel;
    }

    if (!silent) await message.error("INVALID_CHANNEL_ID");
    return null;
  }
};

export const categoryChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<CategoryChannel | null> => {
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) =>
          channel.name.toLowerCase() == argument.toLowerCase() &&
          channel.type == "category"
      )
      .first();
    if (channel) {
      return channel as CategoryChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "category") {
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
  const match = getIDMatch(argument) || getRoleMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
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
