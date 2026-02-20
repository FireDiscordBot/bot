import { Snowflake } from "discord-api-types/globals";
import { APIGuildMember } from "discord-api-types/v9";

export enum JoinSourceType {
  UNSPECIFIED,
  BOT,
  INTEGRATION,
  DISCOVERY,
  HUB,
  INVITE,
  VANITY_URL,
  MANUAL_MEMBER_VERIFICATION,
}

export const integrationEmojis = {
  twitch: "icons_TWITCH",
  youtube: "icons_YOUTUBE",
};

export interface MembersSearchResult {
  guild_id: Snowflake;
  members: [
    {
      member: APIGuildMember;
      source_invite_code: string;
      join_source_type: JoinSourceType;
      inviter_id: Snowflake;
      integration_type?: number;
    },
  ];
  page_result_count: number;
  total_result_count: number;
}
