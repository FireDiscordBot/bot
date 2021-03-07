import {
  Role,
  Collection,
  VoiceChannel,
  GuildChannel,
  GuildPreview,
  SnowflakeUtil,
  CategoryChannel,
  FetchMembersOptions,
  DeconstructedSnowflake,
} from "discord.js";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireTextChannel } from "../extensions/textchannel";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireGuild } from "@fire/lib/extensions/guild";
import { FireUser } from "@fire/lib/extensions/user";
import { constants } from "./constants";
import * as fuzz from "fuzzball";
import * as centra from "centra";

const { regexes } = constants;
const idOnlyRegex = /^(\d{15,21})$/im;
const idRegex = /(\d{15,21})/im;
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

export const guildPreviewConverter = async (
  message: FireMessage,
  argument: string,
  silent = false
): Promise<GuildPreview | FireGuild> => {
  if (!argument) return;

  const id = await snowflakeConverter(message, argument);
  if (!id) return null;

  if (message.client.guilds.cache.has(id.snowflake)) {
    const guild = message.client.guilds.cache.get(id.snowflake) as FireGuild;
    if (guild.isPublic()) return guild;
  }

  const preview = await message.client
    .fetchGuildPreview(id.snowflake)
    .catch(() => {});
  if (!preview) {
    if (!silent) await message.error("PREVIEW_NOT_FOUND");
    return null;
  }

  if (!preview.features.includes("DISCOVERABLE")) {
    if (!message.client.manager.ws?.open) {
      if (!silent) await message.error("PREVIEW_NOT_DISCOVERABLE");
      return null;
    }
    let isPublic = false;
    const publicGuildsReq = await centra(
      process.env.REST_HOST
        ? `https://${process.env.REST_HOST}/public`
        : `http://localhost:${process.env.REST_PORT}/public`
    )
      .header("User-Agent", "Fire Discord Bot")
      .header("Authorization", process.env.WS_AUTH)
      .send();
    if (publicGuildsReq.statusCode == 200) {
      const publicGuilds: string[] = await publicGuildsReq.json();
      if (publicGuilds.includes(preview.id)) isPublic = true;
    }
    if (!isPublic) {
      if (!silent) await message.error("PREVIEW_NOT_DISCOVERABLE");
      return null;
    }
  }

  return preview;
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

  if (argument == "^" && message.channel.messages.cache.size >= 4)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last().member as FireMember;
  else if (argument == "^") {
    const messages = await message.channel.messages
      .fetch({ limit: 5 })
      .catch(() => {});
    if (!messages || !messages.size) {
      await message.error();
      return null;
    }
    const authoredMessage = messages
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last() as FireMessage;
    if (authoredMessage.member) return authoredMessage.member as FireMember;
    else argument = authoredMessage.author.id; // continue on with author id
  }

  const alias = message.client.aliases.findKey((aliases) =>
    aliases.includes(argument.toLowerCase())
  );
  if (alias) argument = alias;

  const userID = getIDMatch(argument) || getUserMentionMatch(argument);
  if (!userID) {
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
  message: FireMessage,
  argument: string,
  silent = false
): Promise<FireUser | null> => {
  if (!argument) return;

  if (argument == "^" && message.channel.messages.cache.size >= 4)
    return message.channel.messages.cache
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last().author as FireUser;
  else if (argument == "^") {
    const messages = await message.channel.messages
      .fetch({ limit: 5 })
      .catch(() => {});
    if (!messages || !messages.size) {
      await message.error();
      return null;
    }
    const authoredMessage = messages
      .filter((m) => m.id < message.id && m.author?.id != message.author?.id)
      .last() as FireMessage;
    if (authoredMessage.author) return authoredMessage.author as FireUser;
    else {
      await message.error();
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

  if (
    linkMatch?.groups?.guild_id &&
    !(message.client.options.shards as number[]).includes(
      message.client.util.getShard(linkMatch?.groups?.guild_id)
    ) &&
    message.util?.parsed?.command?.id == "quote"
  )
    return "cross_cluster";

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
    message.channel) as FireTextChannel;

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
  if (!argument) return;

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
): Promise<FireTextChannel | null> => {
  if (!argument) return;

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
      return channel as FireTextChannel;
    }

    if (!silent) await message.error("CHANNEL_NOT_FOUND");
    return null;
  } else {
    const channel = guild.channels.cache.get(match);
    if (channel && channel.type == "text") {
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
): Promise<VoiceChannel | null> => {
  if (!argument) return;

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
  if (!argument) return;

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
  if (!argument) return;

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
