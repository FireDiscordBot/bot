import { ApplicationCommandMessage } from "@fire/lib/extensions/appcommandmessage";
import { ContextCommandMessage } from "@fire/lib/extensions/contextcommandmessage";
import { FireMessage } from "@fire/lib/extensions/message";
import { Command } from "@fire/lib/util/command";
import { titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { MessageAttachment, MessageEmbed } from "discord.js";

export interface EssentialFile {
  organization: Organization;
  mod: Mod;
  versions: Version[];
}

export interface Organization {
  id: string;
  slug: string;
}

export interface Mod {
  id: string;
  slug: string;
}

export interface Version {
  version: string;
  branches: any[];
  platforms: string[];
  id: string;
}

type CommandArgs = {
  hash?: string;
};

export default class VerifyEssentialMod extends Command {
  essentialOrgId: string;

  constructor() {
    // renamed from verify to check because "users are retarded"
    super("check-essential-mod", {
      description: (language: Language) =>
        language.get("VERIFY_ESSENTIAL_MOD_COMMAND_DESCRIPTION"),
      args: [
        {
          id: "hash",
          type: "string",
          description: (language: Language) =>
            language.get("VERIFY_ESSENTIAL_MOD_ARGUMENT_HASH_DESCRIPTION"),
          default: null,
          required: false,
        },
      ],
      guilds: ["864592657572560958"],
      context: ["verify mod file"],
      enableSlashCommand: true,
      restrictTo: "guild",
      slashOnly: true,
      ephemeral: false,
      deferAnyways: false,
    });
    this.essentialOrgId = "61853a125d653656b5e732b8";
  }

  async run(
    command: ApplicationCommandMessage | ContextCommandMessage,
    args?: CommandArgs
  ) {
    if (command instanceof ApplicationCommandMessage)
      return this.runSlash(command, args);
    else if (command instanceof ContextCommandMessage)
      return this.runContext(command);
  }

  async runSlash(command: ApplicationCommandMessage, args?: CommandArgs) {
    if ((command.flags & 64) == 64) command.flags -= 64;
    await command.channel.ack(false);
    if (!args?.hash)
      return await command.error("VERIFY_ESSENTIAL_MOD_NO_ARGUMENTS");
    const file = await this.getEssentialFileForChecksum(args.hash);
    if (!file) return await command.error("VERIFY_ESSENTIAL_MOD_INVALID_HASH");
    return await command.channel.send({
      embeds: [this.getFileEmbed(file, command)],
    });
  }

  async runContext(command: ContextCommandMessage) {
    await command.channel.ack(true);
    const message = command.getMessage(false);
    if (!message) return await command.error("VERIFY_ESSENTIAL_MOD_NO_MESSAGE");
    if (!message.attachments.size)
      return await command.error("VERIFY_ESSENTIAL_MOD_NO_ATTACHMENT");

    const etags: Record<string, string> = {};
    for (const [, attachment] of message.attachments) {
      const req = await centra(attachment.url, "HEAD")
        .header("User-Agent", this.client.manager.ua)
        .send()
        .catch(() => {});
      if (!req) continue;
      const etagHeader = req.headers["etag"];
      if (etagHeader) etags[attachment.id] = etagHeader.slice(1, -1);
    }

    const validEssentialVersions: Record<string, EssentialFile> = {};
    for (const checksum of Object.values(etags)) {
      const file = await this.getEssentialFileForChecksum(checksum);
      if (file) validEssentialVersions[checksum] = file;
    }

    if (!Object.keys(validEssentialVersions).length)
      return await command.error("VERIFY_ESSENTIAL_MOD_NO_VALID_FILES");

    const embeds: MessageEmbed[] = [];
    for (const [id, checksum] of Object.entries(etags)) {
      if (!validEssentialVersions[checksum]) continue;
      const file = validEssentialVersions[checksum];
      embeds.push(
        this.getFileEmbed(file, command, message.attachments.get(id), message)
      );
    }

    if (!embeds.length)
      return await command.error("VERIFY_ESSENTIAL_MOD_NO_VALID_FILES");

    await message.reply({ embeds });
    return await command.success(
      "VERIFY_ESSENTIAL_MOD_VALID_FOUND_AND_REPLIED"
    );
  }

  private async getEssentialFileForChecksum(checksum: string) {
    const filesReq = await centra(
      `https://api.essential.gg/mods/v1/versions/files/?checksum=${checksum}`
    )
      .header("User-Agent", this.client.manager.ua)
      .send();
    if (filesReq.statusCode != 200) return null;
    const files = (await filesReq.json()) as Record<string, EssentialFile>;
    if (
      !files[checksum] ||
      files[checksum].organization.id != this.essentialOrgId
    )
      return null;
    return files[checksum];
  }

  private getFileEmbed(
    file: EssentialFile,
    command: ApplicationCommandMessage | ContextCommandMessage,
    attachment?: MessageAttachment,
    message?: FireMessage | ApplicationCommandMessage | ContextCommandMessage
  ) {
    message ??= command;
    const embed = new MessageEmbed()
      .setAuthor({
        name: this.getTitleForSlug(file.mod.slug, command.language),
        iconURL: command.guild?.iconURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      })
      .setColor(message.member?.displayColor || "#FFFFFF")
      .setTimestamp(message.createdAt)
      .addFields(
        [
          file.versions.length == 1
            ? {
                name: command.language.get("VERIFY_ESSENTIAL_MOD_VERSION"),
                value: file.versions[0].version,
              }
            : {
                name: command.language.get("VERIFY_ESSENTIAL_MOD_VERSIONS"),
                value: file.versions
                  .map((v) => v.version)
                  .filter((ver, index, all) => all.indexOf(ver) == index)
                  .join(" - "),
              },
          {
            name: command.language.get("VERIFY_ESSENTIAL_MOD_PLATFORMS"),
            value: file.versions
              .flatMap((v) => v.platforms)
              .map((platform) => this.cleanPlatformName(platform))
              .join(" - "),
          },
          file.versions.find((v) => v.branches.length)
            ? {
                name: command.language.get("VERIFY_ESSENTIAL_MOD_BRANCHES"),
                value: file.versions
                  .flatMap((v) => v.branches)
                  .map((branch) => this.cleanPlatformName(branch))
                  .join(" - "),
              }
            : undefined,
        ].filter((field) => !!field)
      );
    if (attachment)
      embed.setFooter({
        text: command.language.get("VERIFY_ESSENTIAL_MOD_FOOTER", {
          fileName: attachment.name,
          id: attachment.id,
          author: command.author.id,
        }),
        iconURL: command.author.displayAvatarURL({
          size: 2048,
          format: "png",
          dynamic: true,
        }),
      });
    return embed;
  }

  private cleanPlatformName(platform: string) {
    let [loader, version] = platform.split("_");
    loader = titleCase(loader);
    version = version.replaceAll("-", ".");
    return `${loader} ${version}`;
  }

  private getTitleForSlug(slug: string, language: Language) {
    switch (slug) {
      case "essential-pinned":
        return language.get("VERIFY_ESSENTIAL_MOD_TITLE_PINNED");
      case "loader-stage2":
        return language.get("VERIFY_ESSENTIAL_MOD_TITLE_STAGE2");
      case "container":
        return language.get("VERIFY_ESSENTIAL_MOD_TITLE_CONTAINER");
      default:
        return language.get("VERIFY_ESSENTIAL_MOD_TITLE");
    }
  }
}
