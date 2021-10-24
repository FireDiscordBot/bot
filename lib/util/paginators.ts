import {
  TextBasedChannels,
  MessageActionRow,
  EmojiResolvable,
  ThreadChannel,
  MessageButton,
  MessageEmbed,
  NewsChannel,
  DMChannel,
} from "discord.js";
import {
  ApplicationCommandMessage,
  FakeChannel as AppFakeChannel,
} from "@fire/lib/extensions/appcommandmessage";
import { FakeChannel as ContextFakeChannel } from "../extensions/contextcommandmessage";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { ComponentMessage } from "../extensions/componentmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import Semaphore from "semaphore-async-await";
import { Fire } from "@fire/lib/Fire";

export interface PaginatorEmojiSettings {
  start: EmojiResolvable;
  back: EmojiResolvable;
  forward: EmojiResolvable;
  end: EmojiResolvable;
  close: EmojiResolvable;
}

const EMOJI_DEFAULTS: PaginatorEmojiSettings = {
  start: "⏮️" as EmojiResolvable,
  back: "◀️" as EmojiResolvable,
  forward: "▶️" as EmojiResolvable,
  end: "⏭️" as EmojiResolvable,
  close: "⏹️" as EmojiResolvable,
};

export class Paginator {
  prefix: string;
  suffix: string;
  lineSep: string;
  maxSize: number;

  currentPage: string;
  count: number;
  _pages: string[];

  constructor(prefix = "```", suffix = "```", maxSize = 2000, lineSep = "\n") {
    this.prefix = prefix;
    this.suffix = suffix;
    this.maxSize = maxSize;
    this.lineSep = lineSep;
    this.clear();
  }

  clear(clearPages = true) {
    if (this.prefix) {
      this.currentPage = this.prefix;
      this.count = this.prefix.length + this.lineSep.length;
    } else {
      this.currentPage = "";
      this.count = 0;
    }
    if (clearPages) this._pages = [];
  }

  addLine(line = "", empty = false) {
    const maxPageSize =
      this.maxSize -
      this.prefix.length -
      this.suffix.length -
      2 * this.lineSep.length;
    if (line.length > maxPageSize)
      throw new Error(`Line exceeds maximum page size ${maxPageSize}`);

    if (
      this.count + line.length + this.lineSep.length >
      this.maxSize - this.suffix.length
    )
      this.closePage();

    this.count += line.length + this.lineSep.length;
    this.currentPage += this.lineSep + line;

    if (empty) {
      this.currentPage += this.lineSep + "";
      this.count += this.lineSep.length;
    }
  }

  closePage() {
    if (this.suffix) this.currentPage += this.suffix;
    this._pages.push(this.currentPage);

    this.clear(false);
  }

  get length() {
    const total: number = this._pages
      .map((page) => page.length)
      .reduce((a, b) => a + b);
    return total + this.count;
  }

  get pages() {
    return [...this._pages, this.currentPage];
  }
}

export class WrappedPaginator extends Paginator {
  wrapOn: string[];
  includeWrapped: boolean;

  constructor(
    prefix = "```",
    suffix = "```",
    maxSize = 2000,
    wrapOn = ["\n", " "],
    includeWrapped = true
  ) {
    super(prefix, suffix, maxSize);
    this.wrapOn = wrapOn;
    this.includeWrapped = includeWrapped;
  }

  addLine(line = "", empty = false) {
    const trueMaxSize = this.maxSize - this.prefix.length - 2;

    while (line.length > trueMaxSize) {
      const searchString = line.slice(0, trueMaxSize - 1);
      let wrapped = false;

      for (const delimiter of this.wrapOn) {
        const position = searchString.lastIndexOf(delimiter);

        if (position > 0) {
          super.addLine(line.substring(0, position), empty);
          wrapped = true;

          if (this.includeWrapped) line = line.substring(position);
          else line = line.substring(position + delimiter.length);

          break;
        }
      }

      if (!wrapped) break;
    }

    super.addLine(line, empty);
  }
}

export class PaginatorInterface {
  bot: Fire;
  paginator: Paginator;
  owner: FireMember | FireUser;
  emojis: PaginatorEmojiSettings;
  timeout: number;
  deleteMessage: boolean;

  slashMessage?: ApplicationCommandMessage;
  #channel: TextBasedChannels;
  #messageId: string;
  _displayPage: number;
  maxPageSize: number;

  ready: boolean;
  updateLock: Semaphore;
  closed: boolean = false;
  streaming: boolean = true;
  lastInteraction: number = 0;

  buttonHandler: (button: ComponentMessage) => Promise<any>;

  constructor(
    bot: Fire,
    paginator: Paginator,
    options: {
      owner?: FireMember | FireUser;
      emoji?: PaginatorEmojiSettings;
      timeout?: number;
      deleteMessage?: boolean;
      maxPageSize?: number;
      updateMax?: number;
    }
  ) {
    if (!(paginator instanceof Paginator))
      throw new TypeError(
        "Paginator must be an instance of the Paginator class"
      );
    this._displayPage = 0;
    if (
      options.maxPageSize > 2000 &&
      !(this instanceof PaginatorEmbedInterface)
    )
      this.maxPageSize = 2000;
    else this.maxPageSize = options.maxPageSize ?? 2000;

    this.bot = bot;
    this.paginator = paginator;

    this.owner = options.owner;
    this.emojis = options.emoji || EMOJI_DEFAULTS;
    this.timeout = options.timeout || 600000;
    this.deleteMessage = options.deleteMessage ?? true;

    this.updateLock = new Semaphore(options.updateMax ?? 2);

    if (this.pageSize > this.maxPageSize) {
      throw new Error(
        `Paginator passed has too large of a page size for this interface. (${this.pageSize} > ${this.maxPageSize})`
      );
    }

    this.buttonHandler = async (button: ComponentMessage) => {
      this.lastInteraction = +new Date();
      if (button.customId == "close") {
        this.closed = true;
        return (
          this.deleteMessage && (await this.message.delete().catch(() => {}))
        );
      } else if (button.customId == "start") this._displayPage = 0;
      else if (button.customId == "end") this._displayPage = this.pageCount;
      else if (button.customId == "back") this._displayPage -= 1;
      else if (button.customId == "forward") this._displayPage += 1;
      else return;

      if (this.streaming) this.streaming = false;

      this.update(true);
    };
  }

  get locked() {
    return this.updateLock.getPermits() == 0;
  }

  get pages() {
    return [
      ...this.paginator._pages,
      this.paginator.currentPage + this.paginator.suffix,
    ];
  }

  get pageCount() {
    return this.pages.length;
  }

  get displayPage() {
    this._displayPage = Math.max(
      0,
      Math.min(this.pageCount - 1, this._displayPage)
    );
    return this._displayPage;
  }

  set displayPage(page: number) {
    this._displayPage = Math.max(0, Math.min(this.pageCount - 1, page));
  }

  get pageSize() {
    return (
      this.paginator.maxSize +
      `\nPage ${this.pageCount}/${this.pageCount}`.length
    );
  }

  get sendArgs(): string | MessageEmbed {
    const displayPage = this.displayPage;
    const pageNum = `\nPage ${displayPage + 1}/${this.pageCount}`;
    return this.pages[displayPage] + pageNum;
  }

  get message() {
    return this.#channel.messages.cache.get(this.#messageId) as FireMessage;
  }

  set message(message: FireMessage) {
    this.#channel = message.channel;
    this.#messageId = message.id;
  }

  addLine(line = "", empty = false) {
    if (this.closed) return;
    const displayPage = this.displayPage;
    const pageCount = this.pageCount;

    this.paginator.addLine(line, empty);

    const newPageCount = this.pageCount;

    if (
      displayPage + 1 == pageCount &&
      newPageCount > pageCount &&
      !this.streaming
    ) {
      this._displayPage = newPageCount;
      this.update(true);
    } else this.update();
  }

  async send(
    destination:
      | FireTextChannel
      | NewsChannel
      | ThreadChannel
      | DMChannel
      | AppFakeChannel
      | ContextFakeChannel
  ) {
    const message = (await destination.send({
      content: typeof this.sendArgs == "string" ? this.sendArgs : null,
      embeds: this.sendArgs instanceof MessageEmbed ? [this.sendArgs] : null,
      components: this.getButtons(),
    })) as FireMessage | ApplicationCommandMessage;
    if (message instanceof ApplicationCommandMessage) {
      this.slashMessage = message;
      this.message = await message.getRealMessage();
    } else this.message = message as FireMessage;
    if (!this.message) return;
    this.lastInteraction = +new Date();
    this.bot.util.paginators.set(this.#messageId, this);

    if (!this.ready) this.ready = true;

    return this;
  }

  private getButtons() {
    if (this.pageCount == 1)
      return [
        new MessageActionRow().addComponents(
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId("close")
            .setEmoji("835140711489863701")
        ),
      ];
    else
      return [
        new MessageActionRow().addComponents([
          new MessageButton()
            .setEmoji("835140711606124574")
            .setDisabled(this.displayPage == 0)
            .setStyle("PRIMARY")
            .setCustomId("start"),
          new MessageButton()
            .setEmoji("835140710982352907")
            .setDisabled(this.displayPage == 0)
            .setStyle("PRIMARY")
            .setCustomId("back"),
          new MessageButton()
            .setStyle("DANGER")
            .setCustomId("close")
            .setEmoji("835140711489863701"),
          new MessageButton()
            .setEmoji("835140711476494346")
            .setDisabled(this.displayPage == this.pageCount - 1)
            .setStyle("PRIMARY")
            .setCustomId("forward"),
          new MessageButton()
            .setEmoji("835140711388676116")
            .setDisabled(this.displayPage == this.pageCount - 1)
            .setStyle("PRIMARY")
            .setCustomId("end"),
        ]),
      ];
  }

  async update(force: boolean = false) {
    if ((this.locked && !force) || this.closed) return;

    await this.updateLock.acquire();

    try {
      if (!this.message) await this.bot.util.sleep(1000);

      this.slashMessage
        ? await this.slashMessage.edit({
            content: typeof this.sendArgs == "string" ? this.sendArgs : null,
            embeds:
              this.sendArgs instanceof MessageEmbed ? [this.sendArgs] : null,
            components: this.getButtons(),
          })
        : await this.message.edit({
            content: typeof this.sendArgs == "string" ? this.sendArgs : null,
            embeds:
              this.sendArgs instanceof MessageEmbed ? [this.sendArgs] : null,
            components: this.getButtons(),
          });
    } catch {}
    this.updateLock.release();
  }
}

export class PaginatorEmbedInterface extends PaginatorInterface {
  embed: MessageEmbed;
  footer: { text: string; iconURL?: string };

  constructor(
    bot: Fire,
    paginator: Paginator,
    options: {
      owner?: FireMember | FireUser;
      emoji?: PaginatorEmojiSettings;
      timeout?: number;
      deleteMessage?: boolean;
      maxPageSize?: number;
      updateMax?: number;
      embed: MessageEmbed;
      footer?: { text: string; iconURL?: string };
    }
  ) {
    if (options.maxPageSize > 4096 || typeof options.maxPageSize == "undefined")
      options.maxPageSize = 4096;
    super(bot, paginator, options);
    this.embed = options.embed;
    this.footer = options.footer || { text: "" };
  }

  get sendArgs() {
    const displayPage = this.displayPage;
    this.embed.setDescription(this.pages[displayPage].toString());
    if (this.footer.text)
      this.footer.iconURL
        ? this.embed.setFooter(
            `Page ${displayPage + 1}/${this.pageCount} | ${this.footer.text}`,
            this.footer.iconURL
          )
        : this.embed.setFooter(
            `Page ${displayPage + 1}/${this.pageCount} | ${this.footer.text}`
          );
    else this.embed.setFooter(`Page ${displayPage + 1}/${this.pageCount}`);
    return this.embed;
  }

  get pageSize() {
    return this.paginator.maxSize;
  }
}
