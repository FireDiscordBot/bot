import { MessageUtil } from "../../../lib/ws/util/MessageUtil";
import { FireMessage } from "../../../lib/extensions/message";
import { MessageAttachment, MessageEmbed } from "discord.js";
import { zws, constants } from "../../../lib/util/constants";
import { EventType } from "../../../lib/ws/util/constants";
import { Codeblock } from "../../arguments/codeblock";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Message } from "../../../lib/ws/Message";
import { transpile } from "typescript";
import { Type } from "@klasa/type";
import { inspect } from "util";
import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "../../../lib/util/paginators";

const { emojis } = constants;

const codeBlock = (lang: string, expression: any) => {
  return `\`\`\`${lang}\n${expression || zws}\`\`\``;
};

export default class Eval extends Command {
  response: { id: string; message: FireMessage };
  constructor() {
    super("eval", {
      description: (language: Language) =>
        language.get("EVAL_COMMAND_DESCRIPTION"),
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS", "ADD_REACTIONS"],
      ownerOnly: true,
      args: [
        {
          id: "code",
          type: "codeblock",
          match: "rest",
          required: true,
          default: null,
        },
        {
          id: "async",
          match: "flag",
          flag: "--async",
          default: null,
        },
        {
          id: "depth",
          match: "option",
          flag: "--depth",
          default: 0,
        },
        // {
        //   id: "broadcast",
        //   match: "flag",
        //   flag: "--broadcast",
        //   default: null,
        // },
      ],
      aliases: ["ev"],
      restrictTo: "all",
    });
    this.response = { id: null, message: null };
  }

  // Allows editing previous response
  async send(message: FireMessage, embed: MessageEmbed) {
    if (message.editedAt && this.response.id == message.id)
      return await this.response.message.edit(null, embed);
    else {
      const newMessage = (await message.channel.send(embed)) as FireMessage;
      this.response = { id: message.id, message: newMessage };
      return newMessage;
    }
  }

  async exec(
    message: FireMessage,
    args: { code: Codeblock; async?: string; depth: number; broadcast?: string }
  ) {
    if (args.broadcast) {
      return this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.BROADCAST_EVAL, {
            messageId: message.id,
            channelId: message.channel.id,
          })
        )
      );
    }
    if (args.code.language == "ts")
      args.code.content = transpile(args.code.content);
    const { success, result, type } = await this.eval(message, args);
    if (this.client.manager.ws) {
      let input, output;
      try {
        input = await this.client.util.haste(args.code.content);
        output = await this.client.util.haste(result);
      } catch {
        input = "Unknown";
        output = "Unknown";
      }
      this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.ADMIN_ACTION, {
            user: `${message.author} (${message.author.id})`,
            guild: message.guild
              ? `${message.guild} (${message.guild.id})`
              : "N/A",
            shard: message.guild ? message.guild.shardID : 0,
            cluster: this.client.manager.id,
            action: `Eval Command Ran. Input: ${input} | Output: ${output}`,
          })
        )
      );
    }
    if (success && result == null) return;
    const input = codeBlock(args.code.language || "ts", args.code.content);
    const embed = new MessageEmbed()
      .setTitle(
        success
          ? `${emojis.success} Evaluation Complete`
          : `${emojis.error} Evaluation Failed`
      )
      .setColor(success ? message.member?.displayColor || "#ffffff" : "#ef5350")
      .setDescription(type.toString() != "any" ? `Output Type: ${type}` : null)
      .addField(":inbox_tray: Input", input);
    embed.setFooter(`Cluster ID: ${this.client.manager.id}`);
    if (embed.description == "null") embed.description = null;
    if (result.length > 1024) {
      const paginator = new WrappedPaginator("```js", "```", 1200);
      result.split("\n").forEach((line) => paginator.addLine(line));
      const paginatorEmbed = new MessageEmbed().setColor(
        success ? message.member?.displayColor || "#ffffff" : "#ef5350"
      );
      const paginatorInterface = new PaginatorEmbedInterface(
        message.client,
        paginator,
        {
          owner: message.author,
          embed: paginatorEmbed,
        }
      );
      await this.send(message, embed);
      return await paginatorInterface.send(message.channel);
    }
    const output = codeBlock("js", result);
    if (!type.toString().includes("void") && output && output != "undefined")
      embed.addField(":outbox_tray: Output", output);
    success ? await message.success() : await message.error();
    return await this.send(message, embed);
  }

  async eval(
    message: FireMessage,
    args: { code: Codeblock; async?: string; depth: number }
  ) {
    let {
      code: { content },
    } = args;
    content = content.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    let success: boolean, result: any;
    let type: Type;
    try {
      if (args.async) content = `(async () => {\n${content}\n})();`;
      const me = message.member,
        fire = message.client,
        guild = message.guild,
        channel = message.channel; // variables for eval since I can't really inject a scope
      result = eval(content);
      if (this.client.util.isPromise(result)) {
        result = await result;
      }
      type = new Type(result);
      success = true;
    } catch (error) {
      if (!type) type = new Type(error);
      result = error;
      success = false;
    }

    if (result instanceof MessageAttachment || result instanceof MessageEmbed) {
      try {
        await message.channel.send(result);
        return { success: true, type, result: null };
      } catch {
        return { success: false, type, result: result };
      }
    } else if (result instanceof FireMessage && result.id > message.id)
      return { success: true, type, result: null };

    if (
      typeof result == "object" ||
      typeof result == "function" ||
      typeof result == "symbol" ||
      typeof result == "undefined"
    ) {
      result = inspect(result, {
        depth: args.depth,
        showHidden: false,
      });
    }
    result = result
      .toString()
      .replace(this.client.token, "[ no token for you ]");
    this.client.token
      .split(".")
      .forEach((t) => (result = result.replace(t, "[ no token for you ]")));
    return {
      success,
      type,
      result,
    };
  }
}
