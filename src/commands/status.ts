import { Incidents, Summary, Component } from "../../lib/interfaces/statuspage";
import { constants, titleCase } from "../../lib/util/constants";
import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import * as centra from "centra";

export default class DiscordStatus extends Command {
  constructor() {
    super("status", {
      description: (language: Language) =>
        language.get("STATUS_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["firestatus"],
      typing: true,
      category: "Main",
    });
  }

  async exec(message: FireMessage) {
    let summary: Summary, incidents: Incidents;
    try {
      summary = await (
        await centra(constants.url.fireStatus)
          .path("/api/v2/summary.json")
          .send()
      ).json();
      incidents = await (
        await centra(constants.url.fireStatus)
          .path("/api/v2/incidents.json")
          .send()
      ).json();
    } catch (e) {
      return await message.send("STATUS_FETCH_FAIL");
    }
    let components = [];
    const groups = summary.components
      .filter(
        (component) =>
          !(
            component.group_id == "jmsbww1qjnz5" &&
            component.status == "operational"
          )
      )
      .reduce((groups, component) => {
        const groupId = component.group_id;
        if (!(groupId in groups)) {
          groups[groupId].push(component);
        } else {
          groups[groupId] = [component];
        }
        return groups;
      }, {});
    summary.components.forEach((component) => {
      if (!component.group_id) {
        components.push(
          `├${constants.statuspage.emojis[component.status]} **${
            component.name
          }**: ${
            message.language.get("STATUSPAGE_COMPONENT_STATUS")[
              component.status.toLowerCase()
            ] || titleCase(component.status.replace("_", " "))
          }`
        );
        if (Object.keys(groups).includes(component.id))
          groups[component.id].forEach((groupComponent: Component) => {
            components.push(
              `├─${constants.statuspage.emojis[groupComponent.status]} **${
                groupComponent.name
              }**: ${
                message.language.get("STATUSPAGE_COMPONENT_STATUS")[
                  groupComponent.status.toLowerCase()
                ] || titleCase(groupComponent.status.replace("_", " "))
              }`
            );
          });
      }
    });
    const latest = incidents.incidents[0];
    let embed = {
      title:
        message.language.get("STATUSPAGE_PAGE_DESCRIPTIONS")[
          summary.status.description.toLowerCase()
        ] || titleCase(summary.status.description),
      description: components.join("\n"),
      color:
        constants.statuspage.colors[summary.status.indicator] ||
        message.member?.displayColor ||
        "#ffffff",
      fields: [
        {
          value: `[${latest.name}](${latest.shortlink})\n${message.language.get(
            "STATUS"
          )}: **${
            message.language.get("STATUSPAGE_INCIDENT_STATUS")[
              latest.status.toLowerCase()
            ] || titleCase(latest.status)
          }**`,
          name: message.language.get("STATUS_LATEST_INCIDENT"),
          inline: true,
        },
      ],
      timestamp: new Date(),
    };
    await message.channel.send({ embed });
  }
}
