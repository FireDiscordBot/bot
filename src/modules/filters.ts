import { FireMessage } from "../../lib/extensions/message";
import { constants } from "../../lib/util/constants";
import { MessageEmbed, Invite } from "discord.js";
import { Module } from "../../lib/util/module";
import * as centra from "centra";

const { regexes } = constants;

export default class Filters extends Module {
  debug: string[];
  imgExt: string[];
  malware: string[];
  regexes: RegExp[];
  filters: {
    [key: string]: ((
      message: FireMessage,
      extra: string,
    ) => Promise<any>)[];
  };

  constructor() {
    super("filters");
    this.debug = [];
    this.malware = [];
    this.imgExt = [".png", ".jpg", ".gif"];
    this.regexes = [...regexes.invites];
    this.filters = {
      discord: [this.handleInvite],
    };
  }

  async init() {
    try {
      const malwareReq = await centra(
        "https://mirror.cedia.org.ec/malwaredomains/justdomains"
      ).send();
      if (malwareReq.statusCode == 200)
        this.malware = malwareReq.body.toString().split("\n");
      else throw new Error("Non 200 status code");
    } catch (e) {
      this.client.console.error(`Failed to fetch malware domains\n${e.stack}`);
    }
  }

  async safeExc(promise: Function, ...args: any[]) {
    try {
      await promise(...args);
    } catch {}
  }

  async runAll(
    message: FireMessage,
    extra: string = "",
    exclude: string[] = [],
  ) {
    if (message.author.bot) return;
    const enabled: string[] = message.guild.settings.get("mod.linkfilter", "");
    if (this.debug.includes(message.guild.id) && enabled.length)
      this.client.console.warn(
        `Running handler(s) for filters ${enabled.join(", ")} in guild ${
          message.guild
        }`
      );
    Object.keys(this.filters).forEach((name) => {
      if (!exclude.includes(name) && enabled.includes(name)) {
        if (this.debug.includes(message.guild.id))
          this.client.console.warn(`Running handler(s) for ${name}`);
        this.filters[name].map(
          async (handler) => await this.safeExc(handler, message, extra)
        );
      }
    });
  }

  runReplace(text: string) {
    this.regexes.forEach(
      (regex) =>
        (text = text.replace(regex, "[ hidden due to filtering rules ]"))
    );
    return text;
  }

  async handleInvite(
    message: FireMessage,
    extra: string = "",
  ) {
    const deleteInvite = async (inv: Invite) => {
      if (
        inv.guild.id != message.guild.id &&
        !constants.allowedInvites.includes(inv.guild.id)
      )
        await message
          .delete({
            reason: `Found invite for ${inv.guild} in message`,
          })
          .catch(() => {});
    };
    const deleteFail = async (e: Error) =>
      await message
        .delete({
          reason: `Failed to fetch info for invite found in message; ${e}`,
        })
        .catch(() => {});
    const searchString =
      message.content +
      message.embeds.map((embed) => embed.toJSON()).join("") +
      extra;
    let found: RegExpExecArray[] = [];
    regexes.invites.forEach((regex) => found.push(regex.exec(searchString)));
    found = found.filter((exec) => !exec || !exec.length); // remove non matches
    found.forEach(async (exec) => {
      let invite: Invite;
      try {
        invite = await this.getInviteFromExec(message, exec);
        await deleteInvite(invite);
      } catch (e) {
        await deleteFail(e);
      }
      const embed = new MessageEmbed()
        .setColor(message.member?.displayColor || "#ffffff")
        .setTimestamp(new Date())
        .setDescription(
          message.guild.language.get(
            "FILTER_INVITE_LOG_DESCRIPTION",
            message.channel
          )
        )
        .setAuthor(
          message.author.toString(),
          message.author.displayAvatarURL({
            size: 2048,
            format: "png",
            dynamic: true,
          })
        )
        .setFooter(message.author.id);
      if (invite) {
        embed
          .addField(
            message.guild.language.get("FILTER_INVITE_LOG_CODE"),
            invite.code,
            false
          )
          .addField(
            message.guild.language.get("GUILD"),
            `${invite.guild.name} (${invite.guild.id})`,
            false
          )
          .addField(
            message.guild.language.get("CHANNEL"),
            `${invite.channel.name} (${invite.channel.id})`,
            false
          )
          .addField(
            message.guild.language.get("MEMBERS"),
            `⬤ ${invite.presenceCount} | ⭘ ${invite.memberCount}`,
            false
          );
      }
      await message.guild.actionLog(embed).catch(() => {});
    });
  }

  async getInviteFromExec(message: FireMessage, exec: RegExpExecArray) {
    if (
      ["h.inv.wtf", "i.inv.wtf"].includes(exec.groups.domain) &&
      this.client.util.admins.includes(message.author.id)
    )
      return;
    if (message?.member.isModerator(message.channel)) return;
    let invite: Invite;
    if (
      [
        "discord.gg",
        "discord.com",
        "discordapp.com",
        "watchanimeattheoffice.com",
      ].includes(exec.groups.domain)
    ) {
      invite = await this.client.fetchInvite(exec.groups.code);
    } else if (exec.groups.domain == "inv.wtf") {
      const vanity = await (
        await centra(`https://inv.wtf/api/${exec.groups.code}`).send()
      ).json();
      invite = await this.client.fetchInvite(vanity.invite);
      if (!invite.guild.description && vanity.description)
        invite.guild.description = vanity.description;
    } else {
      const invReq = await centra(exec[0]).send();
      let inviteMatch: RegExpExecArray;
      if (regexes.discord.invite.test(invReq.headers.location))
        inviteMatch = regexes.discord.invite.exec(invReq.headers.location);
      else if (regexes.discord.invite.test(invReq.body.toString()))
        inviteMatch = regexes.discord.invite.exec(invReq.body.toString());
      if (inviteMatch && inviteMatch.groups.code) {
        invite = await this.client.fetchInvite(inviteMatch.groups.code);
      } else throw new Error("Could not find actual invite");
    }
    return invite;
  }
}
