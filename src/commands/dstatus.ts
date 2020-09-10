import { constants, titleCase } from "../../lib/util/constants";
import { FireMessage } from "../../lib/extensions/message";
import { Language } from "../../lib/util/language";
import { Command } from "../../lib/util/command";
import { Request } from "centra";
import * as centra from "centra";
import { Incidents, Summary } from "../../lib/interfaces/statuspage";

export default class DiscordStatus extends Command {
  constructor() {
    super("dstatus", {
      description: (language: Language) =>
        language.get("DSTATUS_COMMAND_DESCRIPTION"),
      clientPermissions: ["EMBED_LINKS", "SEND_MESSAGES"],
      aliases: ["discordstatus"],
      typing: true,
    });
  }

  async exec(message: FireMessage) {
    let summary: Summary, incidents: Incidents;
    try {
      summary = await (
        await centra(constants.url.discordStatus)
          .path("/api/v2/summary.json")
          .send()
      ).json();
      incidents = await (
        await centra(constants.url.discordStatus)
          .path("/api/v2/incidents.json")
          .send()
      ).json();
    } catch (e) {
      this.client.sentry.captureException(e);
      return await message.send("DSTATUS_FETCH_FAIL");
    }
    let components = [];
    let groups = {};
    summary.components.forEach((component) => {
      if (
        component?.group_id &&
        !(
          ["jk03xttfcz9b", "ghlgk5p8wyt7"].includes(component.group_id) &&
          component.status == "operational"
        )
      ) {
        if (!Object.keys(groups).includes(component.group_id))
          groups[component.group_id] = [component];
        else groups[component.group_id]?.push(component);
      } else if (!component?.group_id) {
        components.push(
          `├${constants.statuspage.emojis[component.status]} **${
            component.name
          }**: ${titleCase(component.status.replace("_", " "))}`
        );
        if (groups.hasOwnProperty(component.id)) {
          groups[component.id].forEach((groupComponent) => {
            components.push(
              `├─${constants.statuspage.emojis[groupComponent.status]} **${
                groupComponent.name
              }**: ${titleCase(groupComponent.status.replace("_", " "))}`
            );
          });
        }
      }
    });
    const latest = incidents.incidents[0];
    let embed = {
      title: summary.status.description,
      description: components.join("\n"),
      color:
        constants.statuspage.colors[summary.status.indicator] ||
        message.member?.displayColor ||
        "#ffffff",
      fields: [
        {
          value: `[${latest.name}](${latest.shortlink})\nStatus: **${titleCase(
            latest.status
          )}**`,
          name: "Latest Incident",
          inline: true,
        },
      ],
      timestamp: new Date(),
    };
    await message.channel.send({ embed });
  }
}
