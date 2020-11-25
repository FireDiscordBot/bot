import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { MessageEmbed, Util } from "discord.js";
import { Argument } from "discord-akairo";

export default class Tag extends Command {
  constructor() {
    super("tag", {
      description: (language: Language) =>
        language.get("TAG_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
      args: [
        {
          id: "action",
          type: Argument.union(
            ["raw", "create", "delete", "edit", "alias"],
            "string"
          ),
          readableType: "tag name|raw|create|delete|edit|alias",
          default: null,
          required: false,
        },
        {
          id: "tag",
          type: "string",
          default: null,
          required: false,
        },
        {
          id: "content",
          type: "string",
          match: "rest",
          default: null,
          required: false,
        },
      ],
      restrictTo: "guild",
      aliases: ["tags", "dtag", "dtags"],
    });
  }

  async exec(
    message: FireMessage,
    args: {
      action?: "raw" | "create" | "delete" | "edit" | "alias" | string;
      tag?: string;
      content?: string;
    }
  ) {
    if (!args.action) return await this.sendTagsList(message);
    switch (args.action) {
      case "raw": {
        if (!args.tag) return await message.error("TAGS_RAW_MISSING_ARG");
        return await this.sendTagRaw(message, args.tag);
      }
      case "delete": {
        if (!args.tag) return await message.error("TAGS_DELETE_MISSING_ARG");
        if (!message.member.permissions.has("MANAGE_GUILD"))
          return await message.error(
            "MISSING_PERMISSIONS_USER",
            this.client.util.cleanPermissionName(
              "MANAGE_GUILD",
              message.language
            ),
            "tag delete"
          );
        return await this.deleteTag(message, args.tag);
      }
      case "create": {
        if (!args.tag) return await message.error("TAGS_CREATE_MISSING_NAME");
        if (!args.content)
          return await message.error("TAGS_CREATE_MISSING_CONTENT");
        if (!message.member.permissions.has("MANAGE_GUILD"))
          return await message.error(
            "MISSING_PERMISSIONS_USER",
            this.client.util.cleanPermissionName(
              "MANAGE_GUILD",
              message.language
            ),
            "tag create"
          );
        return await this.createTag(message, args.tag, args.content);
      }
      case "edit": {
        if (!args.tag) return await message.error("TAGS_EDIT_MISSING_NAME");
        if (!args.content)
          return await message.error("TAGS_EDIT_MISSING_CONTENT");
        if (!message.member.permissions.has("MANAGE_GUILD"))
          return await message.error(
            "MISSING_PERMISSIONS_USER",
            this.client.util.cleanPermissionName(
              "MANAGE_GUILD",
              message.language
            ),
            "tag edit"
          );
        return await this.editTag(message, args.tag, args.content);
      }
      case "alias": {
        if (!args.tag) return await message.error("TAGS_ALIAS_MISSING_NAME");
        if (!args.content)
          return await message.error("TAGS_ALIAS_MISSING_ALIAS");
        if (!message.member.permissions.has("MANAGE_GUILD"))
          return await message.error(
            "MISSING_PERMISSIONS_USER",
            this.client.util.cleanPermissionName(
              "MANAGE_GUILD",
              message.language
            ),
            "tag alias"
          );
        return await this.addAlias(message, args.tag, args.content);
      }
      default: {
        return await this.sendTag(message, args.action);
      }
    }
  }

  async sendTagsList(message: FireMessage) {
    const manager = message.guild.tags;
    const names = manager.cache.size ? manager.cache.keyArray() : manager.names;
    if (!names.length) return await message.error("TAG_NONE_FOUND");
    const embed = new MessageEmbed()
      .setAuthor(
        message.language.get("TAG_LIST", message.guild.name),
        message.guild.iconURL({ size: 2048, format: "png", dynamic: true })
      )
      .setColor(message?.member.displayColor || "#ffffff")
      .setDescription(names.join(", "));
    return await message.channel.send(embed);
  }

  async sendTag(message: FireMessage, tag: string) {
    if (["dtag", "dtags"].includes(message.util?.parsed?.alias))
      message.delete();
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    await manager.useTag(cachedTag.name);
    return await message.channel.send(cachedTag.content);
  }

  async sendTagRaw(message: FireMessage, tag: string) {
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    const content = Util.escapeMarkdown(cachedTag.content)
      .replace("<", "\\<")
      .replace(">", "\\>");
    return await message.channel.send(content);
  }

  async deleteTag(message: FireMessage, tag: string) {
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    const deleted = await manager.deleteTag(tag).catch(() => false);
    if (typeof deleted == "boolean" && !deleted) return await message.error();
    else return await message.success();
  }

  async createTag(message: FireMessage, tag: string, content: string) {
    if (["raw", "create", "delete", "edit", "alias"].includes(tag))
      return await message.error("TAGS_CREATE_COMMAND_NAME");
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (cachedTag) return await message.error("TAGS_CREATE_ALREADY_EXISTS");
    if (
      manager.cache.size >= 20 &&
      !this.client.util.premium.has(message.guild.id)
    )
      return await message.error("TAGS_CREATE_LIMIT");
    const newTag = await manager.createTag(tag, content, message.member);
    if (typeof newTag == "boolean" && !newTag) return await message.error();
    else return await message.success();
  }

  async editTag(message: FireMessage, tag: string, content: string) {
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    try {
      await manager.editTag(tag, content);
      return await message.success();
    } catch {
      return await message.error();
    }
  }

  async addAlias(message: FireMessage, tag: string, alias: string) {
    const manager = message.guild.tags;
    const cachedTag = await manager.getTag(tag, false);
    if (!cachedTag) return await message.error("TAG_INVALID_TAG", tag);
    const aliased = await manager.addAlias(tag, alias);
    if (typeof aliased == "boolean" && !aliased) return await message.error();
    else return await message.success();
  }
}
