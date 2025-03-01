import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { Command } from "@fire/lib/util/command";
import { Language } from "@fire/lib/util/language";
import Redirects from "@fire/src/modules/redirects";
import * as centra from "centra";

const validityRegex = /^[a-zA-Z0-9]{2,25}$/gim;

export default class RedirectCreate extends Command {
  module: Redirects;

  constructor() {
    super("redirect-create", {
      description: (language: Language) =>
        language.get("REDIRECT_CREATE_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "code",
          type: "string",
          description: (language: Language) =>
            language.get("REDIRECT_CREATE_CODE_ARGUMENT_DESCRIPTION"),
          required: true,
          default: null,
        },
        {
          id: "url",
          type: "string",
          description: (language: Language) =>
            language.get("REDIRECT_CREATE_URL_ARGUMENT_DESCRIPTION"),
          required: true,
          match: "rest",
          default: null,
        },
      ],
      restrictTo: "guild",
      parent: "redirect",
      slashOnly: true,
    });
  }

  async run(
    command: ApplicationCommandMessage,
    args: { code: string; url: string }
  ) {
    if (!this.module)
      this.module = this.client.getModule("redirects") as Redirects;

    if (!command.author.premium)
      return await command.error("COMMAND_PREMIUM_USER_ONLY");

    if (
      !args.code ||
      (!validityRegex.test(args.code.trim()) && !command.author.isSuperuser())
    )
      return await command.error("REDIRECT_CREATE_CODE_INVALID");

    let destination: URL;
    try {
      destination = new URL(args.url);
      if (!command.author.isSuperuser()) this.checkURL(destination);
    } catch {
      destination = undefined;
    }

    if (!destination) return await command.error("REDIRECT_CREATE_URL_INVALID");

    const request = await centra(destination)
      .header("User-Agent", this.client.manager.browserua)
      .send();
    let location: URL;
    try {
      location = new URL(request.headers.location ?? request.coreRes.url);
      if (!command.author.isSuperuser()) this.checkURL(location);
    } catch (e) {
      // location won't be set if the URL is invalid
      if (location) return await command.error("REDIRECT_CREATE_URL_INVALID");
    }

    const created = await this.module.create(
      command.author,
      args.code,
      destination.toString()
    );
    if (!created) return await command.error("ERROR_CONTACT_SUPPORT");
    else if (typeof created == "string")
      return await command.error(`REDIRECT_CREATE_ERROR_${created}`);
    else
      return await command.success(
        location
          ? "REDIRECT_CREATE_SUCCESS_WITH_LOCATION"
          : "REDIRECT_CREATE_SUCCESS",
        {
          redirect: `${this.module.redirectDomain}/${created.get("code")}`,
          url: created.get("redirect"),
          location: location?.toString(),
        }
      );
  }

  private checkURL(url: URL) {
    if (url.protocol != "https:") throw new Error();
    else if (
      url.host.includes("inv.wtf") ||
      url.host.includes("discord.gg") ||
      url.host.includes("dsc.gg") ||
      url.host.includes("dis.gg")
    )
      throw new Error();
    else if (
      (url.host.includes("discord.com") ||
        url.host.includes("discordapp.com") ||
        url.hostname.includes("watchanimeattheoffice.com")) &&
      url.pathname.includes("invite")
    )
      throw new Error();
  }
}
