import { TextChannel, VoiceChannel, CategoryChannel } from "discord.js";
import { FireMessage } from "../extensions/message";

const idRegex = /([0-9]{15,21})$/im;
const userMentionRegex = /<@!?([0-9]+)>$/im;
const messageIDRegex = /^(?:(?<channel_id>[0-9]{15,21})-)?(?<message_id>[0-9]{15,21})$/im;
const messageLinkRegex = /^https?:\/\/(?:(ptb|canary)\.)?discord(?:app)?\.com\/channels\/(?:([0-9]{15,21})|(@me))\/(?<channel_id>[0-9]{15,21})\/(?<message_id>[0-9]{15,21})\/?$/im;
const channelMentionRegex = /<#([0-9]+)>$/im;

const getIDMatch = (argument: string) => {
  const match = idRegex.exec(argument);
  return match ? match[1] : null;
};

const getUserMentionMatch = (argument: string) => {
  const match = userMentionRegex.exec(argument);
  return match ? match[1] : null;
};

const getMessageIDMatch = (argument: string) => {
  return argument.match(messageIDRegex);
};

const getMessageLinkMatch = (argument: string) => {
  return argument.match(messageLinkRegex);
};

const getChannelMentionMatch = (argument: string) => {
  const match = channelMentionRegex.exec(argument);
  return match ? match[1] : null;
};

export const memberConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }
  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (!userID) {
    const member = await guild.fetchMember(argument);
    if (member) return member;
    else {
      if (!silent) await message.error("MEMBER_NOT_FOUND");
      return null;
    }
  } else {
    const member = guild.members.cache.get(userID);
    if (member) return member;
    else {
      if (!silent) await message.error("INVAlID_MEMBER_ID");
      return null;
    }
  }
};

export const userConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (userID) {
    const user =
      message.client.users.cache.get(userID) || message.mentions.has(userID)
        ? message.mentions.users.get(userID)
        : null;
    if (user) return user;
    else {
      const fetch = await message.client.users.fetch(userID);
      if (fetch) return fetch;
      else {
        if (!silent) await message.error("INVALID_USER_ID");
        return null;
      }
    }
  } else {
    if (argument[0] == "@") argument = argument.slice(1);

    if (argument.length > 5 && argument.slice(-5).startsWith("#")) {
      const discrim = argument.slice(-4);
      const name = argument.slice(0, -5);
      const match = message.client.users.cache.filter(
        (user) => user.username == name && user.discriminator == discrim
      );
      if (match.size) return match.first();
    }

    const match = message.client.users.cache.filter(
      (user) => user.username == argument
    );
    if (match.size) return match.first();
    else {
      if (!silent) await message.error("USER_NOT_FOUND");
      return null;
    }
  }
};

export const messageConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
  const match = getMessageIDMatch(argument) || getMessageLinkMatch(argument);
  if (!match) {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }
  const groups = match.groups;
  const messageID = groups.message_id;
  const channelID = groups.channel_id;
  const channel =
    (message.client.channels.cache.get(channelID) as TextChannel) ||
    (message.channel as TextChannel);
  try {
    return await channel.messages.fetch(messageID);
  } catch {
    if (!silent) await message.error("INVALID_MESSAGE");
    return null;
  }
};

export const textChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
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
          channel.name == argument &&
          (channel.type == "text" || channel.type == "news")
      )
      .first();
    if (channel) return channel as TextChannel;
    else {
      if (!silent) await message.error("CHANNEL_NOT_FOUND");
      return null;
    }
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && (channel.type == "text" || channel.type == "news"))
      return channel as TextChannel;
    else {
      if (!silent) await message.error("INVALID_CHANNEL_ID");
      return null;
    }
  }
};

export const voiceChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }
  if (!match) {
    const channel = guild.channels.cache
      .filter((channel) => channel.name == argument && channel.type == "voice")
      .first();
    if (channel) return channel as VoiceChannel;
    else {
      if (!silent) await message.error("CHANNEL_NOT_FOUND");
      return null;
    }
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "voice") return channel as VoiceChannel;
    else {
      if (!silent) await message.error("INVALID_CHANNEL_ID");
      return null;
    }
  }
};

export const categoryChannelConverter = async (
  message: FireMessage,
  argument: string,
  silent: boolean = false
) => {
  const match = getIDMatch(argument) || getChannelMentionMatch(argument);
  const guild = message.guild;
  if (!guild) {
    if (!silent) await message.error();
    return null;
  }
  if (!match) {
    const channel = guild.channels.cache
      .filter(
        (channel) => channel.name == argument && channel.type == "category"
      )
      .first();
    if (channel) return channel as CategoryChannel;
    else {
      if (!silent) await message.error("CHANNEL_NOT_FOUND");
      return null;
    }
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "category")
      return channel as CategoryChannel;
    else {
      if (!silent) await message.error("INVALID_CHANNEL_ID");
      return null;
    }
  }
};
