import { TextChannel, VoiceChannel, CategoryChannel, Role } from "discord.js";
import { FireMessage } from "../extensions/message";
import { FireMember } from "../extensions/guildmember";
import { FireUser } from "../extensions/user";

const idRegex = /(\d{15,21})$/im;
const userMentionRegex = /<@!?(\d{15,21})>$/im;
const messageIDRegex = /^(?:(?<channel_id>\d{15,21})-)?(?<message_id>\d{15,21})$/im;
const messageLinkRegex = /^https?:\/\/(?:(ptb|canary)\.)?discord(?:app)?\.com\/channels\/(?:(\d{15,21})|(@me))\/(?<channel_id>\d{15,21})\/(?<message_id>\d{15,21})\/?$/im;
const channelMentionRegex = /<@#(\d{15,21})>$/im;
const roleMentionRegex = /<@&(\d{15,21})>$/im;

const getIDMatch = (argument: string) => {
  const match = idRegex.exec(argument);
  return match ? match[1] : null;
};

const getUserMentionMatch = (argument: string) => {
  const match = userMentionRegex.exec(argument);
  return match ? match[1] : null;
};

const getMessageIDMatch = (argument: string) => argument.match(messageIDRegex);

const getMessageLinkMatch = (argument: string) =>
  argument.match(messageLinkRegex);

const getChannelMentionMatch = (argument: string) => {
  const match = channelMentionRegex.exec(argument);
  return match ? match[1] : null;
};

const getRoleMentionMatch = (argument: string) => {
  const match = roleMentionRegex.exec(argument);
  return match ? match[1] : null;
};

export const memberConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireMember | null> => {
  if (!argument) {
    return message.member;
  }

  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (!userID) {
    const member = await guild.fetchMember(argument);
    if (member) {
      return member;
    }

    if (!silent) await message.error("MEMBER_NOT_FOUND");
    return null;
  } else {
    const member = guild.members.cache.get(userID);
    if (member) {
      return member as FireMember;
    }

    if (!silent) await message.error("INVAlID_MEMBER_ID");
    return null;
  }
};

export const userConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireUser | null> => {
  if (!argument) {
    return message.member?.user || message.author;
  }

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (userID) {
    const user =
      message.client.users.cache.get(userID) || message.mentions.has(userID)
        ? message.mentions.users.get(userID)
        : null;

    if (user) {
      return user as FireUser;
    }

    const fetch = await message.client.users.fetch(userID);
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
      (user) => user.username.toLowerCase() == argument.toLowerCase()
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
  silent = false
): Promise<FireMessage | null> => {
  const match = getMessageIDMatch(argument) || getMessageLinkMatch(argument);
  if (!match) {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }

  const groups = match.groups;
  const messageID = groups.message_id;
  const channelID = groups.channel_id;
  const channel = (message.client.channels.cache.get(channelID) ||
    message.channel) as TextChannel;

  try {
    return (await channel.messages.fetch(messageID)) as FireMessage;
  } catch {
    if (!silent) await message.error("INVALID_MESSAGE");
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
          (channel.type == "text" || channel.type == "news")
      )
      .first();
    if (channel) {
      return channel as TextChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && (channel.type == "text" || channel.type == "news")) {
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
