import {
  ReactionUserManager,
  EmojiResolvable,
  ReactionEmoji,
  MessageEmbed,
  NewsChannel,
  GuildEmoji,
  DMChannel,
} from "discord.js";
import {
  FakeChannel,
  SlashCommandMessage,
} from "@fire/lib/extensions/slashCommandMessage";
import {
  APIComponent,
  ButtonStyle,
  ButtonType,
} from "../interfaces/interactions";
import { FireTextChannel } from "@fire/lib/extensions/textchannel";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { ButtonMessage } from "../extensions/buttonMessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { FireUser } from "@fire/lib/extensions/user";
import Semaphore from "semaphore-async-await";
import { Fire } from "@fire/lib/Fire";
import { FireGuild } from "../extensions/guild";

export interface PaginatorEmojiSettings {
  start: EmojiResolvable;
  back: EmojiResolvable;
  forward: EmojiResolvable;
  end: EmojiResolvable;
  close: EmojiResolvable;
}

const EMOJI_DEFAULTS: PaginatorEmojiSettings = {
  start: "⏮️",
  back: "◀️",
  forward: "▶️",
  end: "⏭️",
  close: "⏹️",
};

export class Paginator {
  prefix: string;
  suffix: string;
  maxSize: number;

  currentPage: string[];
  count: number;
  _pages: string[];

  constructor(prefix = "```", suffix = "```", maxSize = 2000) {
    this.prefix = prefix;
    this.suffix = suffix;
    this.maxSize = maxSize;
    this.clear();
  }

  clear(clearPages = true) {
    if (this.prefix != null) {
      this.currentPage = [this.prefix];
      this.count = this.prefix.length + 1;
    } else {
      this.currentPage = [];
      this.count = 0;
    }
    if (clearPages) this._pages = [];
  }

  get prefixLength() {
    return this.prefix?.length || 0;
  }

  get suffixLength() {
    return this.suffix.length || 0;
  }

  addLine(line = "", empty = false) {
    const maxPageSize =
      this.maxSize - this.prefixLength - this.suffixLength - 2;
    if (line.length > maxPageSize)
      throw new Error(`Line exceeds maximum page size ${maxPageSize}`);

    if (this.count + line.length + 1 > this.maxSize - this.suffixLength)
      this.closePage();

    this.count += line.length + 1;
    this.currentPage.push(line);

    if (empty) {
      this.currentPage.push("");
      this.count += 1;
    }
  }

  closePage() {
    if (this.suffix != null) this.currentPage?.push(this.suffix);
    this._pages.push(this.currentPage.join("\n"));

    this.clear(false);
  }

  get length() {
    let total: number;
    if (this._pages.length)
      total = this._pages.map((page) => page.length).reduce((a, b) => a + b);
    else
      total = this.currentPage
        .map((line) => line.length)
        .reduce((a, b) => a + b);
    return total + this.count;
  }

  get pages() {
    if (this.currentPage.length > (this.prefix ? 1 : 0)) this.closePage();
    return this._pages;
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

  slashMessage?: SlashCommandMessage;
  sentPageReactions: boolean;
  message: FireMessage;
  _displayPage: number;
  maxPageSize: number;

  ready: boolean;
  updateLock: Semaphore;

  reactionHandler: (
    emoji: EmojiResolvable,
    users: ReactionUserManager
  ) => Promise<void>;
  buttonHandler: (button: ButtonMessage) => Promise<any>;

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
    if (options.maxPageSize > 2000) this.maxPageSize = 2000;
    else this.maxPageSize = options.maxPageSize;

    this.bot = bot;
    this.paginator = paginator;

    this.owner = options.owner;
    this.emojis = options.emoji || EMOJI_DEFAULTS;
    this.timeout = options.timeout || 600000;
    this.deleteMessage = options.deleteMessage || true;

    this.updateLock = new Semaphore(options.updateMax || 2);

    if (this.pageSize > this.maxPageSize) {
      throw new Error(
        `Paginator passed has too large of a page size for this interface. (${this.pageSize} > 2000)`
      );
    }

    this.reactionHandler = async (
      emoji: ReactionEmoji,
      users: ReactionUserManager
    ) => {
      if (emoji.name == this.emojis.close) {
        try {
          if (this.deleteMessage) await this.message.delete();
          else {
            await this.message.reactions.removeAll();
          }
        } catch {}
        return;
      }

      if (emoji.name == this.emojis.start) this._displayPage = 0;
      else if (emoji.name == this.emojis.end)
        this._displayPage = this.pageCount;
      else if (emoji.name == this.emojis.back) this._displayPage -= 1;
      else if (emoji.name == this.emojis.forward) this._displayPage += 1;

      this.update();

      await Promise.all(
        users.cache
          .filter((user: FireUser) => user.id != this.bot.user.id)
          .map((user) => users.remove(user).catch(() => {}))
      ).catch(() => {});
    };

    this.buttonHandler = async (button: ButtonMessage) => {
      if (button.custom_id == "close")
        return (
          this.deleteMessage && (await this.message.delete().catch(() => {}))
        );
      else if (button.custom_id == "start") this._displayPage = 0;
      else if (button.custom_id == "end") this._displayPage = this.pageCount;
      else if (button.custom_id == "back") this._displayPage -= 1;
      else if (button.custom_id == "forward") this._displayPage += 1;
      else return;

      this.update();
    };
  }

  get locked() {
    return this.updateLock.getPermits() == 0;
  }

  get pages() {
    let paginatorPages = this.paginator._pages;
    if (this.paginator.currentPage.length > 1) this.paginator.closePage();
    return paginatorPages;
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

  async addLine(line = "", empty = false) {
    const displayPage = this.displayPage;
    const pageCount = this.pageCount;

    this.paginator.addLine(line, empty);

    const newPageCount = this.pageCount;

    if (displayPage + 1 == pageCount) {
      this._displayPage = newPageCount;
      await this.update();
    }
  }

  async send(
    destination: FireTextChannel | NewsChannel | DMChannel | FakeChannel
  ) {
    // if (destination instanceof FakeChannel) destination = destination.real;
    let message: FireMessage | SlashCommandMessage;
    if (
      destination instanceof DMChannel ||
      !(destination.guild as FireGuild).hasExperiment(
        "OQv4baDP7A_Pk60M9zYR9",
        1
      )
    )
      message = (await destination.send(this.sendArgs)) as
        | FireMessage
        | SlashCommandMessage;
    else if (destination instanceof FakeChannel)
      message = await destination.send(this.sendArgs, {
        buttons: this.getButtons(),
      });
    else
      message = (await ButtonMessage.sendWithButtons(
        destination,
        this.sendArgs,
        {
          buttons: this.getButtons(),
        }
      )) as FireMessage;
    if (message instanceof SlashCommandMessage) {
      this.slashMessage = message;
      this.message = await message.getRealMessage();
    } else this.message = message as FireMessage;
    this.message.paginator = this;

    if (
      !this.sentPageReactions &&
      (destination instanceof DMChannel ||
        !(destination.guild as FireGuild).hasExperiment(
          "OQv4baDP7A_Pk60M9zYR9",
          1
        ))
    )
      await this.sendAllReactions();

    if (!this.ready) this.ready = true;

    return this;
  }

  async sendAllReactions() {
    if (this.pageCount == 1)
      return this.message.react(this.emojis.close).catch(() => {});
    Object.values(this.emojis)
      .filter((value) => !!value)
      .filter(
        (emoji: EmojiResolvable) =>
          !this.message.reactions.cache.has(
            emoji instanceof GuildEmoji || emoji instanceof ReactionEmoji
              ? emoji.id
              : emoji
          )
      )
      .forEach((emoji: EmojiResolvable) => {
        this.message.react(emoji).catch(() => {});
      });
    this.sentPageReactions = true;
  }

  private getButtons(): APIComponent[] {
    if (this.pageCount == 1)
      return [
        {
          style: ButtonStyle.DESTRUCTIVE,
          custom_id: "close",
          type: ButtonType.BUTTON,
          emoji: { id: "835140711489863701" },
        },
      ];
    else
      return [
        {
          emoji: { id: "835140711606124574" },
          disabled: this.displayPage == 0,
          style: ButtonStyle.PRIMARY,
          type: ButtonType.BUTTON,
          custom_id: "start",
        },
        {
          emoji: { id: "835140710982352907" },
          disabled: this.displayPage == 0,
          style: ButtonStyle.PRIMARY,
          type: ButtonType.BUTTON,
          custom_id: "back",
        },
        {
          emoji: { id: "835140711489863701" },
          style: ButtonStyle.DESTRUCTIVE,
          type: ButtonType.BUTTON,
          custom_id: "close",
        },
        {
          disabled: this.displayPage == this.pageCount - 1,
          emoji: { id: "835140711476494346" },
          style: ButtonStyle.PRIMARY,
          type: ButtonType.BUTTON,
          custom_id: "forward",
        },
        {
          disabled: this.displayPage == this.pageCount - 1,
          emoji: { id: "835140711388676116" },
          style: ButtonStyle.PRIMARY,
          type: ButtonType.BUTTON,
          custom_id: "end",
        },
      ];
  }

  async update() {
    if (this.locked) return;

    await this.updateLock.acquire();
    try {
      if (this.locked) await this.bot.util.sleep(1000);

      if (!this.message) await this.bot.util.sleep(500);

      if (
        (this.slashMessage
          ? this.slashMessage.guild
          : this.message.guild
        )?.hasExperiment("OQv4baDP7A_Pk60M9zYR9", 1)
      )
        this.slashMessage
          ? this.slashMessage.edit(this.sendArgs, {
              buttons: this.getButtons(),
            })
          : await ButtonMessage.editWithButtons(this.message, this.sendArgs, {
              buttons: this.getButtons(),
            });
      else {
        if (!this.sentPageReactions) this.sendAllReactions();
        this.slashMessage
          ? this.slashMessage.edit(this.sendArgs)
          : await this.message.edit(this.sendArgs);
      }
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
    if (options.maxPageSize > 2048) options.maxPageSize = 2048;
    super(bot, paginator, options);
    this.embed = options.embed;
    this.footer = options.footer || { text: "" };
  }

  get sendArgs() {
    const displayPage = this.displayPage;
    this.embed.setDescription(this.pages[displayPage]);
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
