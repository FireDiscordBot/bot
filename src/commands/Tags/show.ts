import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";

const markdownRegex = /[_\\~|\*`]/gim;

// this exists purely for slash commands since
// you can't use the base command w/subcommands
export default class TagShow extends Command {
  constructor() {
    super("tag-show", {
      description: (language: Language) =>
        language.get("TAG_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "tag",
          type: "string",
          default: null,
          required: true,
        },
      ],
      aliases: [
        "tags-show",
        "dtag-show",
        "dtags-show",
        "tags-view",
        "dtag-view",
        "dtags-view",
      ],
      restrictTo: "guild",
      parent: "tag",
    });
  }

  async exec(message: FireMessage, args: { tag?: string }) {
    return await this.client.getCommand("tag").exec(message, args);
  }
}
