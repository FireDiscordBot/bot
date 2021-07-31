import {
  WebhookMessageOptions,
  WebhookClientOptions,
  MessagePayload,
  WebhookClient,
  Snowflake,
} from "discord.js";

export class ThreadhookClient extends WebhookClient {
  threadId: Snowflake;

  constructor(
    id: Snowflake,
    token: string,
    options?: WebhookClientOptions & { threadId?: Snowflake }
  ) {
    super(id, token, options);
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
