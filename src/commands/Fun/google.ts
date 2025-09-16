import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import {
  MessageActionRow,
  MessageButton,
  MessageSelectMenu,
  SnowflakeUtil,
} from "discord.js";

enum GoogleAssistantActions {
  GET_AUTHENTICATE_URL,
  TEXT_QUERY,
  // These two are currently unused
  UPDATE_VOLUME,
  SWITCH_LOCALE,
}

type GoogleAssistantData =
  | { action: GoogleAssistantActions.GET_AUTHENTICATE_URL; userId: string }
  | {
      action: GoogleAssistantActions.TEXT_QUERY;
      userId: string;
      name: string;
      input: string;
      image: boolean;
    }
  | {
      action: GoogleAssistantActions.UPDATE_VOLUME;
      userId: string;
      volume: number;
    }
  | {
      action: GoogleAssistantActions.SWITCH_LOCALE;
      userId: string;
      languageCode: string;
    };

type AssistantErrorCodes =
  | "UNKNOWN"
  | "TEXT_TOO_LONG"
  | "ACCESS_REVOKED"
  | "INVALID_GRANT"
  | "VOLUME_OUT_OF_RANGE"
  | "LOCALE_UNSUPPORTED";

type AssistantAuthErrorCodes =
  | "NO_CLIENT"
  | "ALREADY_AUTHENTICATED"
  | "CONFIG_UNAVAILABLE"
  | "CONFIG_UPDATE_FAILED";

type AssistantTextQueryResponse =
  | {
      success: true;
      response: {
        text?: string;
        screen?: { type: "Buffer"; data: number[] };
        audio: { type: "Buffer"; data: number[] };
        deviceAction?: Record<string, any>;
        suggestions?: string[];
        screenshot?:
          | {
              success: true;
              image: { type: "Buffer"; data: number[] };
            }
          | { success: false; error: string };
      };
    }
  | { success: false; error: AssistantErrorCodes };

export default class Google extends Command {
  constructor() {
    super("google", {
      description: (language: Language) =>
        language.get("GOOGLE_COMMAND_DESCRIPTION"),
      restrictTo: "all",
      args: [
        {
          id: "query",
          type: "string",
          description: (language: Language) =>
            language.get("GOOGLE_ARGUMENT_QUERY_DESCRIPTION"),
          required: true,
        },
      ],
      enableSlashCommand: true,
      context: ["google it"],
      slashOnly: true,
      cooldown: 5000,
      lock: "user",
    });
  }

  async run(command: ApplicationCommandMessage, args: { query: string }) {
    if (!this.client.manager.ws?.open)
      return await command.send("GOOGLE_NOT_READY_YET");

    let useDefaultCreds = true;
    if (command.author.hasExperiment(2100999090, 1)) {
      const hasCredentials = await this.client.db
        .query("SELECT uid FROM assistant WHERE uid = $1", [command.author.id])
        .first()
        .catch(() => null);
      if (
        typeof hasCredentials != "undefined" &&
        hasCredentials &&
        hasCredentials.get("uid") &&
        hasCredentials.get("uid") != command.author.id
      )
        return await command.send("GOOGLE_CREDENTIAL_CHECK_FAILED");
      useDefaultCreds = !hasCredentials;
    }

    if (command.author.settings.has("assistant.authstate"))
      await command.author.settings.delete("assistant.authstate");

    // context menu shenanigans
    if (command instanceof ContextCommandMessage)
      args.query =
        (command as ContextCommandMessage).getMessage()?.content || "Hi";

    // Adding a way to undo never showing the auth prompt again
    if (args.query == "SUPER_SECRET_SETTING_RESET") {
      args.query = "Hello!";
      await command.author.settings.delete("assistant.noauthprompt");
    }

    const assist = await this.sendAssistantQuery(
      command,
      args.query,
      useDefaultCreds
    ).catch(() => {});
    if (!assist) return await command.send("GOOGLE_ERROR_UNKNOWN");
    else if (assist.success == false) {
      if (command.language.has(`GOOGLE_ERROR_${assist.error}`))
        return await command.send(`GOOGLE_ERROR_${assist.error}`);
      else return await command.send("GOOGLE_ERROR_UNKNOWN");
    }
    let components: MessageActionRow[] = [],
      files = [];
    if (assist.response.suggestions?.length)
      components.push(
        new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId(`!google:${command.author.id}`)
            .setPlaceholder(command.language.get("GOOGLE_SUGGESTIONS"))
            .setOptions(
              assist.response.suggestions.map((suggestion) => ({
                label: suggestion,
                value: suggestion,
              }))
            )
            .setMinValues(1)
            .setMaxValues(1)
        )
      );
    if (
      useDefaultCreds &&
      command.author.hasExperiment(2100999090, 1) &&
      !command.author.settings.get("assistant.noauthprompt", false) &&
      (command.author.isSuperuser()
        ? // Allow on dev & prod for superusers
          process.env.NODE_ENV != "staging"
        : process.env.NODE_ENV == "production")
    )
      components.push(
        new MessageActionRow().addComponents([
          new MessageButton()
            .setStyle("SECONDARY")
            .setLabel(command.language.get("GOOGLE_AUTHENTICATE"))
            .setCustomId("!googleauth")
            .setEmoji("769207087674032129"),
          new MessageButton()
            .setStyle("DANGER")
            .setLabel(command.language.get("GOOGLE_AUTHENTICATE_DONT"))
            .setCustomId("!googleauthn't")
            .setEmoji("769207087674032129"),
        ])
      );
    if (assist.response.screenshot?.success) {
      const screenshot = Buffer.from(assist.response.screenshot.image.data);
      files.push({ attachment: screenshot, name: "google.png" });
    }
    return await command.channel.send({
      content: !files.length
        ? command.language.get("GOOGLE_NO_RESPONSE")
        : undefined,
      files,
      components,
    });
  }

  async sendAssistantQuery(
    command: ApplicationCommandMessage | ComponentMessage,
    input: string,
    useDefaultCreds: boolean = false
  ): Promise<AssistantTextQueryResponse> {
    return new Promise((resolve, reject) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.GOOGLE_ASSISTANT,
            {
              action: GoogleAssistantActions.TEXT_QUERY,
              userId: command.author.id,
              useDefaultCreds,
              name:
                command.member?.nickname ||
                command.author.globalName ||
                command.author.username,
              input,
              image: true,
            } as GoogleAssistantData,
            nonce
          )
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          reject();
        }
      }, 30000);
    });
  }

  async getAssistantAuthUrl(button: ComponentMessage): Promise<
    | { success: true; url: string }
    | {
        success: false;
        error: AssistantAuthErrorCodes;
      }
  > {
    return new Promise((resolve, reject) => {
      const nonce = SnowflakeUtil.generate();
      this.client.manager.ws.handlers.set(nonce, resolve);
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(
            EventType.GOOGLE_ASSISTANT,
            {
              action: GoogleAssistantActions.GET_AUTHENTICATE_URL,
              userId: button.author.id,
            } as GoogleAssistantData,
            nonce
          )
        )
      );

      setTimeout(() => {
        // if still there, a response has not been received
        if (this.client.manager.ws.handlers.has(nonce)) {
          this.client.manager.ws.handlers.delete(nonce);
          reject();
        }
      }, 5000);
    });
  }
}
