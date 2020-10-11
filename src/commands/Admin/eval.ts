import { FireMessage } from "../../../lib/extensions/message";
import { MessageAttachment, MessageEmbed } from "discord.js";
import { zws, constants } from "../../../lib/util/constants";
import { Codeblock } from "../../arguments/codeblock";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import { Type } from "@klasa/type";
import { inspect } from "util";

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
      clientPermissions: ["SEND_MESSAGES", "EMBED_LINKS"],
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
      ],
      aliases: ["ev"],
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

  async exec(message: FireMessage, args: { code: Codeblock; async: any }) {
    const { success, result, type } = await this.eval(message, args);
    if (success && result == null) return;
    const input = codeBlock(args.code.language || "ts", args.code.content);
    const output = codeBlock("js", result);
    if (output.length > 1024) {
      try {
        const haste = await this.client.util.haste(result);
        return await message.success("EVAL_TOO_LONG", haste + ".js");
      } catch {
        return await message.error("EVAL_TOO_LONG");
      }
    }
    const embed = new MessageEmbed()
      .setTitle(
        success
          ? `${emojis.success} Evaluation Complete`
          : `${emojis.error} Evaluation Failed`
      )
      .setColor(success ? message.member.displayColor || "#ffffff" : "#ef5350")
      .setDescription(type.toString() != "any" ? `Output Type: ${type}` : null)
      .addField(":inbox_tray: Input", input, false);
    if (!type.toString().includes("void") && output && output != "undefined")
      embed.addField(":outbox_tray: Output", output);
    success ? await message.success() : await message.error();
    return await this.send(message, embed);
  }

  async eval(message: FireMessage, args: { code: Codeblock; async: any }) {
    let {
      code: { content },
    } = args;
    content = content.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");
    let success: boolean, result: any;
    let type: Type;
    try {
      if (args.async) content = `(async () => {\n${content}\n})();`;
      result = eval(content);
      type = new Type(result);
      if (this.client.util.isPromise(result)) {
        result = await result;
      }
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

    if (typeof result !== "string") {
      result = inspect(result, {
        depth: 0,
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
