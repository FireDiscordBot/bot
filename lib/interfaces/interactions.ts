import { Snowflake } from "discord-api-types/globals";
import {
  APIActionRowComponent,
  APIComponentInActionRow,
  APIGuildMember,
  APIInteractionDataResolvedChannel,
  APIInteractionGuildMember,
  APIMessage,
  APIRole,
  APIUser,
  ApplicationCommandOptionType,
  ApplicationIntegrationType,
  InteractionContextType,
  RESTPostAPIChatInputApplicationCommandsJSONBody,
} from "discord-api-types/v9";
import { ApplicationCommandOptionTypes } from "discord.js/typings/enums";

export type FireAPIApplicationCommand =
  RESTPostAPIChatInputApplicationCommandsJSONBody & {
    id?: Snowflake;
    integration_types: ApplicationIntegrationType[];
    contexts: InteractionContextType[];
  };

export enum IntegrationTypes {
  GUILD_INSTALL,
  USER_INSTALL,
}

export enum InteractionContexts {
  GUILD,
  BOT_DM,
  PRIVATE_CHANNEL,
}

interface BaseInteraction {
  application_id: Snowflake;
  member?: APIGuildMember;
  guild_locale?: string;
  channel_id: Snowflake;
  guild_id?: Snowflake;
  type: 2 | 3 | 4 | 5;
  locale?: string;
  version: number;
  user?: APIUser;
  id: Snowflake;
  token: string;
}

export interface ButtonInteraction extends BaseInteraction {
  message: APIMessage;
  data: ComponentData;
  type: 3;
}

export interface ModalInteraction extends BaseInteraction {
  message: APIMessage;
  data: ModalData;
  type: 5;
}

export interface Option {
  type?: ApplicationCommandOptionTypes;
  value?: string | number | boolean;
  options?: Option[];
  focused?: boolean;
  name: string;
}

export interface ApplicationCommandOptionChoice {
  name: string;
  value: string | number;
}

export enum ApplicationCommandOptions {
  SUB_COMMAND = ApplicationCommandOptionType.Subcommand,
  SUB_COMMAND_GROUP = ApplicationCommandOptionType.SubcommandGroup,
  STRING = ApplicationCommandOptionType.String,
  INTEGER = ApplicationCommandOptionType.Integer,
  BOOLEAN = ApplicationCommandOptionType.Boolean,
  USER = ApplicationCommandOptionType.User,
  CHANNEL = ApplicationCommandOptionType.Channel,
  ROLE = ApplicationCommandOptionType.Role,
  MENTIONABLE = ApplicationCommandOptionType.Mentionable,
  NUMBER = ApplicationCommandOptionType.Number,
  ATTACHMENT = ApplicationCommandOptionType.Attachment,
}

export enum ApplicationCommandPermissionType {
  ROLE = 1,
  USER = 2,
}

export interface ApplicationCommandPermissions {
  id: string;
  type: ApplicationCommandPermissionType;
  permission: boolean; // true to allow, false, to disallow
}

export interface ComponentData {
  component_type: number;
  custom_id: string;
}

export interface ModalData {
  custom_id: string;
  components: APIActionRowComponent<APIComponentInActionRow>[];
}

export enum ButtonStyle {
  PRIMARY = 1,
  SECONDARY,
  SUCCESS,
  DESTRUCTIVE,
  LINK,
}

export enum ButtonType {
  ACTION_ROW = 1,
  BUTTON,
}

export type ActionRow = {
  type: ButtonType.ACTION_ROW;
  components: APIComponent[];
};

export type ButtonEmoji = {
  id?: string;
  name?: string;
};

export type APIComponent =
  // interaction button with label
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      emoji?: ButtonEmoji;
      disabled?: boolean;
      custom_id: string;
      label: string;
    }
  // interaction button with emoji
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      disabled?: boolean;
      emoji: ButtonEmoji;
      custom_id: string;
      label?: string;
    }
  // interaction button with label and emoji
  | {
      style: Exclude<ButtonStyle, "LINK">;
      type: ButtonType.BUTTON;
      disabled?: boolean;
      emoji: ButtonEmoji;
      custom_id: string;
      label: string;
    }
  // link button with label
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      label: string;
      url: string;
    }
  // link button with emoji
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      emoji: ButtonEmoji;
      url: string;
    }
  // link button with label and emoji
  | {
      type: ButtonType.BUTTON;
      style: ButtonStyle.LINK;
      disabled?: boolean;
      emoji: ButtonEmoji;
      label: string;
      url: string;
    }
  | {
      type: ButtonType.ACTION_ROW;
      components: APIComponent[];
    };

export interface APIApplicationCommandOptionResolved {
  users?: Record<Snowflake, APIUser>;
  members?: Record<Snowflake, APIInteractionGuildMember>;
  roles?: Record<Snowflake, APIRole>;
  channels?: Record<Snowflake, APIInteractionDataResolvedChannel>;
  messages?: Record<Snowflake, APIMessage>;
}
