import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { constants, zws } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import {
  PaginatorEmbedInterface,
  WrappedPaginator,
} from "@fire/lib/util/paginators";
import { Message } from "@fire/lib/ws/Message";
import { EventType } from "@fire/lib/ws/util/constants";
import { MessageUtil } from "@fire/lib/ws/util/MessageUtil";
import { Codeblock } from "@fire/src/arguments/codeblock";
import { MessageEmbed } from "discord.js";
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
      ownerOnly: true,
      args: [
        {
          id: "code",
          type: "codeblock",
          match: "rest",
          // optional since normal users will get hit with eval deez nuts regardless, much easier to not require content if nothing is done with it
          // might make it open a modal in the future if invoked via slash command
          required: false,
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
          type: "number",
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
      enableSlashCommand: true,
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
    if (message.author.id != process.env.OWNER) return;
    if (!args.code?.content) return await message.error("EVAL_NO_CONTENT");
    if (args.broadcast) {
      return this.client.manager.ws.send(
        MessageUtil.encode(
          new Message(EventType.BROADCAST_EVAL, {
            messageId: message.id,
            channelId: message.channelId,
          })
        )
      );
    }
    const { success, result, type } = await this.eval(message, args);
    if (message instanceof FireMessage)
      success
        ? await message.react(emojis.success)?.catch(() => {})
        : await message.react(emojis.error)?.catch(() => {});
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
    if ((success && result == null) || result == "undefined")
      return message instanceof ApplicationCommandMessage
        ? await message.success("SLASH_COMMAND_HANDLE_SUCCESS")
        : undefined;
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
      const paginator = new WrappedPaginator("```js", "```", 1500);
      for (const line of result.split("\n")) paginator.addLine(line);
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
    let type: string = "void";
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
      type = result?.constructor.name ?? typeof result;
      success = !(result instanceof Error);
    } catch (error) {
      if (!type) type = error.constructor.name;
      result = error;
      success = false;
    }

    if (result instanceof MessageEmbed) {
      try {
        await message.channel.send({
          embeds: [result],
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
