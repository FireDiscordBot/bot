import { MessageManager, SnowflakeUtil, Collection } from "discord.js";
import { FireMessage } from "../extensions/message";

const EmptyCollection = new Collection<string, FireMessage>();

type MessageSource = { messages: MessageManager };
type MessageCollection = Collection<string, FireMessage>;
type MessageOptions = {
  around?: Date | string;
  before?: Date | string;
  after?: Date | string;
  oldestFirst?: boolean;
  limit?: number;
};

export class MessageIterator {
  private strategy: (amount: number) => Promise<MessageCollection>;
  private filter: (message: FireMessage) => boolean;
  readonly start: () =>
    | Promise<any>
    | AsyncGenerator<FireMessage, void, unknown>;
  private next: number;
  source: MessageSource;
  reverse: boolean;
  before?: string;
  around?: string;
  after?: string;
  limit?: number;

  constructor(source: MessageSource, options: MessageOptions) {
    if (!(source.messages instanceof MessageManager))
      throw new TypeError(
        "Source must have a MessageManager instance as the messages property"
      );

    this.source = source;
    this.limit = options.limit ?? null;
    this.before = this.before ?? null;
    this.after = this.after ?? null;
    this.around = this.around ?? null;

    if (options.before instanceof Date)
      this.before = SnowflakeUtil.generate(options.before);
    if (options.after instanceof Date)
      this.after = SnowflakeUtil.generate(options.after);
    if (options.around instanceof Date)
      this.around = SnowflakeUtil.generate(options.around);

    if (typeof options.oldestFirst != "boolean")
      this.reverse = typeof this.after == "string";
    else this.reverse = options.oldestFirst;

    this.filter = null;

    if (this.around) {
      if (this.limit) throw new Error("Cannot use around with limit");
      if (this.limit > 101)
        throw new Error("Max limit of 101 when using around");
      if (this.limit == 101) this.limit = 100;

      this.strategy = this._around;
      if (this.before && this.after)
        this.filter = (message) =>
          message.id > this.after && message.id < this.before;
      else if (this.before) this.filter = (message) => message.id < this.before;
      else if (this.after) this.filter = (message) => message.id > this.after;
    } else {
      if (this.reverse) {
        this.strategy = this._after;
        if (this.before) this.filter = (message) => message.id < this.before;
      } else {
        this.strategy = this._before;
        if (this.after && this.after != "0")
          this.filter = (message) => message.id > this.after;
      }
    }
  }

  private get retrieve() {
    const l = this.limit;
    let r: number;
    if (typeof l != "number" || l > 100) r = 100;
    else r = l;
    this.next = r;
    return r > 0;
  }

  async flatten() {
    let data: MessageCollection;
    const messages: FireMessage[] = [];
    while (this.retrieve) {
      data = await this.strategy(this.next);
      if (data.size < 100) this.limit = 0;

      if (this.reverse) {
        const messageArray = data.array().reverse();
        data = new Collection<string, FireMessage>();
        for (const message of messageArray) data.set(message.id, message);
      }

      if (typeof this.filter == "function") data = data.filter(this.filter);

      for (const [, message] of data) messages.push(message);
    }

    return messages;
  }

  async *iterate() {
    while (this.retrieve) {
      const messages = await this.fill();
      for (const [, message] of messages) yield message;
    }
  }

  private async fill() {
    let data = await this.strategy(this.next);
    if (data.size < 100) this.limit = 0;

    if (this.reverse) {
      const messageArray = data.array().reverse();
      data = new Collection<string, FireMessage>();
      for (const message of messageArray) data.set(message.id, message);
    }

    if (typeof this.filter == "function") data = data.filter(this.filter);

    return data;
  }

  private async _around(amount: number): Promise<MessageCollection> {
    if (this.around) {
      const data = await this.source.messages
        .fetch({
          limit: amount,
          around: this.around,
        })
        .catch(() => {});
      delete this.around;
      if (data) return data as MessageCollection;
    }

    return EmptyCollection;
  }

  private async _after(amount: number): Promise<MessageCollection> {
    const data = await this.source.messages
      .fetch({
        limit: amount,
        after: this.after,
      })
      .catch(() => {});
    if (data && data.size) {
      if (typeof this.limit == "number") this.limit -= amount;
      this.after = data.firstKey();
      return data as MessageCollection;
    }

    return EmptyCollection;
  }

  private async _before(amount: number): Promise<MessageCollection> {
    const data = await this.source.messages
      .fetch({
        limit: amount,
        before: this.before,
      })
      .catch(() => {});
    if (data && data.size) {
      if (typeof this.limit == "number") this.limit -= amount;
      this.before = data.lastKey();
      return data as MessageCollection;
    }

    return EmptyCollection;
  }
}
