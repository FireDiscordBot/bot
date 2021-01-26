import { Incidents, Summary } from "../../../lib/interfaces/statuspage";
import { constants, titleCase } from "../../../lib/util/constants";
import { FireMessage } from "../../../lib/extensions/message";
import { Language } from "../../../lib/util/language";
import { Command } from "../../../lib/util/command";
import * as centra from "centra";
import { MessageEmbed } from "discord.js";

export default class DiscordStatus extends Command {
  constructor() {
    super("dstatus", {
      description: (language: Language) =>
        language.get("DSTATUS_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["discordstatus"],
      enableSlashCommand: true,
      restrictTo: "all",
      typing: true,
    });
  }

  async exec(message: FireMessage) {
    let responses: centra.Response[] = [];

    try {
      responses = await Promise.all([
        centra(constants.url.discordStatus).path("/api/v2/summary.json").send(),
        centra(constants.url.discordStatus)
          .path("/api/v2/incidents.json")
          .send(),
      ]);
    } catch (e) {
      return await message.send("DSTATUS_FETCH_FAIL");
    }

    const [summary, incidents] = (await Promise.all(
      responses.map((response) => response.json())
    )) as [Summary, Incidents];

    const components = summary.components
      .filter((component) => !component.group_id)
      .flatMap((group) => [
        `├${constants.statuspage.emojis[group.status]} **${group.name}**: ${
          message.language.get("STATUSPAGE_COMPONENT_STATUS")[
            group.status.toLowerCase()
          ] || titleCase(group.status.replace(/_/gim, " "))
        }`,
        ...summary.components
          .filter((component) => {
            return (
              component.group_id == group.id &&
              (!["jk03xttfcz9b", "ghlgk5p8wyt7"].includes(group.id) ||
                component.status != "operational")
            );
          })
          .map(
            (groupComponent) =>
              `├─${constants.statuspage.emojis[groupComponent.status]} **${
                groupComponent.name
              }**: ${
                message.language.get("STATUSPAGE_COMPONENT_STATUS")[
                  groupComponent.status.toLowerCase()
                ] || titleCase(groupComponent.status.replace(/_/gim, " "))
              }`
          ),
      ]);

    const latest = incidents.incidents[0];
    const embed = new MessageEmbed()
      .setTitle(
        message.language.get("STATUSPAGE_PAGE_DESCRIPTIONS")[
          summary.status.description.toLowerCase()
        ] || titleCase(summary.status.description)
      )
      .setDescription(components.join("\n"))
      .setColor(
        constants.statuspage.colors[summary.status.indicator] ||
          message.member?.displayHexColor ||
          "#ffffff"
      )
      .addField(
        message.language.get("STATUS_LATEST_INCIDENT"),
        `[${latest.name}](${latest.shortlink})\n${message.language.get(
          "STATUS"
        )}: **${
          message.language.get("STATUSPAGE_INCIDENT_STATUS")[
            latest.status.toLowerCase()
          ] || titleCase(latest.status)
        }**`,
        true
      )
      .setTimestamp();

    await message.channel.send({ embed });
  }
}
