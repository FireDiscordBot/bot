import { FireMessage } from "@fire/lib/extensions/message";
import { Incidents, Summary } from "@fire/lib/interfaces/statuspage";
import { Command } from "@fire/lib/util/command";
import { constants, titleCase } from "@fire/lib/util/constants";
import { Language } from "@fire/lib/util/language";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";

// TODO: remove need for returnObjects here and in dstatus

const statusToAppEmoji = {
  operational: "statuspage_operational",
  degraded_performance: "statuspage_degraded",
  partial_outage: "statuspage_partial",
  major_outage: "statuspage_major",
  under_maintenance: "statuspage_maintenance",
};

export default class FireStatus extends Command {
  constructor() {
    super("status", {
      description: (language: Language) =>
        language.get("STATUS_COMMAND_DESCRIPTION"),
      clientPermissions: [
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.EmbedLinks,
      ],
      enableSlashCommand: true,
      aliases: ["firestatus"],
      restrictTo: "all",
      typing: true,
    });
  }

  async exec(message: FireMessage) {
    let responses: centra.Response[] = [];

    try {
      responses = await Promise.all([
        centra(constants.url.fireStatus)
          .path("/api/v2/summary.json")
          .header("User-Agent", this.client.manager.ua)
          .send(),
        centra(constants.url.fireStatus)
          .path("/api/v2/incidents.json")
          .header("User-Agent", this.client.manager.ua)
          .send(),
      ]);
    } catch (e) {
      return await message.send("STATUS_FETCH_FAIL");
    }

    const [summary, incidents] = (await Promise.all(
      responses.map((response) => response.json())
    )) as [Summary, Incidents];

    const components = summary.components
      .filter((component) => !component.group_id)
      .flatMap((group) => [
        `├${this.client.util.useEmoji(statusToAppEmoji[group.status])} **${
          group.name
        }**: ${
          message.language.get("STATUSPAGE_COMPONENT_STATUS", {
            returnObjects: true,
          })[group.status.toLowerCase()] ||
          titleCase(group.status.replace(/_/gim, " "))
        }`,
        ...summary.components
          .filter((component) => {
            return (
              component.group_id == group.id &&
              (group.id != "jmsbww1qjnz5" || component.status != "operational")
            );
          })
          .map(
            (groupComponent) =>
              `├─${this.client.util.useEmoji(
                statusToAppEmoji[groupComponent.status]
              )} **${groupComponent.name}**: ${
                message.language.get("STATUSPAGE_COMPONENT_STATUS", {
                  returnObjects: true,
                })[groupComponent.status.toLowerCase()] ||
                titleCase(groupComponent.status.replace(/_/gim, " "))
              }`
          ),
      ]);

    const latest = incidents.incidents[0];
    const embed = new MessageEmbed()
      .setTitle(
        message.language.get("STATUSPAGE_PAGE_DESCRIPTIONS", {
          returnObjects: true,
        })[summary.status.description.toLowerCase()] ||
          titleCase(summary.status.description)
      )
      .setDescription(components.join("\n"))
      .setColor(
        constants.statuspage.colors[summary.status.indicator] ||
          message.member?.displayColor ||
          "#FFFFFF"
      )
      .addFields({
        name: message.language.get("STATUS_LATEST_INCIDENT"),
        value: `[${latest.name}](${latest.shortlink})\n${message.language.get(
          "STATUS"
        )}: **${
          message.language.get("STATUSPAGE_INCIDENT_STATUS", {
            returnObjects: true,
          })[latest.status.toLowerCase()] || titleCase(latest.status)
        }**`,
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
}
