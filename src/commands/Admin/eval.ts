import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { MessageAttachment, MessageEmbed, Permissions } from "discord.js";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { FireMessage } from "@fire/lib/extensions/message";
import { zws, constants } from "@fire/lib/util/constants";
import { Codeblock } from "@fire/src/arguments/codeblock";
import { EventType } from "@fire/lib/ws/util/constants";
import { Language } from "@fire/lib/util/language";
import { Command } from "@fire/lib/util/command";
import { Message } from "@fire/lib/ws/Message";
import { Type } from "@klasa/type";
import { inspect } from "util";

const { emojis } = constants;

const codeBlock = (lang: string, expression: any) => {
  return `\`\`\`${lang}\n${expression || zws}\`\`\``;
};

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

const reserved = [
  "break",
  "case",
  "catch",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "finally",
  "for",
  "function",
  "if",
  "in",
  "instanceof",
  "new",
  "return",
  "switch",
  "throw",
  "try",
  "var",
  "while",
  "with",
];

export default class Eval extends Command {
  response: { id: string; message: FireMessage };
  constructor() {
    super("eval", {
      description: (language: Language) =>
        language.get("EVAL_COMMAND_DESCRIPTION"),
      clientPermissions: [
        Permissions.FLAGS.SEND_MESSAGES,
        Permissions.FLAGS.ADD_REACTIONS,
        Permissions.FLAGS.EMBED_LINKS,
      ],
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
      return await this.response.message.edit({ embeds: [embed] });
    else {
      const newMessage = (await message.channel.send({
        embeds: [embed],
      })) as FireMessage;
      this.response = { id: message.id, message: newMessage };
      return newMessage;
    }
  }

  async exec(
    message: FireMessage,
    args: { code: Codeblock; async?: string; depth: number; broadcast?: string }
  ) {
    if (!args.code?.content) return await message.error("EVAL_NO_CONTENT");
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
    const { success, result, type } = await this.eval(message, args);
    success
      ? await message.success()?.catch(() => {})
      : await message.error()?.catch(() => {});
    if (this.client.manager.ws) {
      let input: string, output: string;
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
            shard: message.guild ? message.guild.shardId : 0,
            action: `Eval Command Ran. Input: ${input} | Output: ${output}`,
          })
        )
      );
    }
    if (
      (success && result == null) ||
      type.toString() == "void" ||
      type.toString() == "Promise<void>"
    )
      return;
    const input = codeBlock(args.code.language || "ts", args.code.content);
    const embed = new MessageEmbed()
      .setTitle(
        success
          ? `${emojis.success} Evaluation Complete`
          : `${emojis.error} Evaluation Failed`
      )
      .setColor(success ? message.member?.displayColor : "#ef5350")
      .setDescription(
        type.toString() != "any" ? `Output Type: ${type}` : "fuck"
      );
    if (input.length <= 1024) embed.addField(":inbox_tray: Input", input);
    embed.setFooter(`Cluster ID: ${this.client.manager.id}`);
    if (embed.description == "fuck") embed.description = null;
    if (result.length > 1014) {
      const paginator = new WrappedPaginator("```js", "```", 1200);
      result.split("\n").forEach((line: string) => paginator.addLine(line));
      const paginatorEmbed = new MessageEmbed().setColor(
        success ? message.member?.displayColor : "#ef5350"
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
    if (output && output != "undefined")
      embed.addField(":outbox_tray: Output", output);
    return await this.send(message, embed);
  }

  async eval(
    message: FireMessage,
    args: { code: Codeblock; async?: string; depth: number }
  ) {
    let {
      code: { content },
    } = args;
    content = content
      .replace(/[“”]/gim, '"')
      .replace(/[‘’]/gim, "'")
      .split(/;\s/g)
      .map((ln) => ln.trim())
      .join(";\n");
    const lines = content.split("\n");
    if (
      !content.includes("return ") &&
      !reserved.some((keyword) => lines[lines.length - 1].startsWith(keyword))
    ) {
      lines[lines.length - 1] = "return " + lines[lines.length - 1];
      content = lines.join("\n");
    }
    let success: boolean, result: any;
    let type: Type;
    try {
      setTimeout(async () => {
        if (typeof success == "undefined") await message.react("▶️");
      }, 1000);
      const scope = {
        require,
        exports,
        message,
        me: message.member ?? message.author,
        fire: message.client,
        guild: message.guild,
        channel: message.channel,
      };
      result =
        args.async || content.includes("await ")
          ? new AsyncFunction(
              ...Object.keys(scope),
              "try {\n  " + content + "\n} catch (err) {\n  return err;\n}"
            )(...Object.values(scope))
          : new Function(
              ...Object.keys(scope),
              "try {\n  " + content + "\n} catch (err) {\n  return err;\n}"
            )(...Object.values(scope));
      if (this.client.util.isPromise(result)) {
        result = await result;
      }
      type = new Type(result);
      success = !(result instanceof Error);
    } catch (error) {
      if (!type) type = new Type(error);
      result = error;
      success = false;
    }

    if (result instanceof MessageAttachment || result instanceof MessageEmbed) {
      try {
        await message.channel.send({
          embeds: result instanceof MessageEmbed ? [result] : null,
          files: result instanceof MessageAttachment ? [result] : null,
        });
        return { success: true, type, result: null };
      } catch {
        return { success: false, type, result: result };
      }
    } else if (
      (result instanceof FireMessage && result.id > message.id) ||
      (typeof result?.trim == "function" && result?.trim() == "")
    )
      return { success: true, type, result: null };

    if (
      typeof result == "object" ||
      typeof result == "function" ||
      typeof result == "symbol" ||
      typeof result == "undefined"
    ) {
      result = inspect(result, {
        depth: +args.depth,
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
