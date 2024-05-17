import {
  MessagePayload,
  Snowflake,
  WebhookClient,
  WebhookClientData,
  WebhookClientOptions,
  WebhookMessageOptions,
} from "discord.js";

export class ThreadhookClient extends WebhookClient {
  threadId: Snowflake;

  constructor(
    data: WebhookClientData,
    options?: WebhookClientOptions & { threadId?: Snowflake }
  ) {
    super(data, options);
    if (options?.threadId) this.threadId = options.threadId;
  }

  async send(options: string | MessagePayload | WebhookMessageOptions) {
    if (typeof options == "string")
      options = { content: options, threadId: this.threadId };
    else if (options instanceof MessagePayload)
      // @ts-ignore
      options.options.threadId = this.threadId;
    else options.threadId = this.threadId;
    return await super.send(options);
  }
}
