import { FireMessage } from "@fire/lib/extensions/message";
import { Components, Summary } from "@fire/lib/interfaces/instatus";
import { Command } from "@fire/lib/util/command";
import { constants, titleCase } from "@fire/lib/util/constants";
import { Language, LanguageKeys } from "@fire/lib/util/language";
import * as centra from "centra";
import { PermissionFlagsBits } from "discord-api-types/v9";
import { MessageEmbed } from "discord.js";

const statusToAppEmoji = {
  OPERATIONAL: "statuspage_operational",
  MINOROUTAGE: "statuspage_degraded",
  PARTIALOUTAGE: "statuspage_partial",
  MAJOROUTAGE: "statuspage_major",
  UNDERMAINTENANCE: "statuspage_maintenance",
};

const mainComponentSort = [
  "cm2m2a178000b6zjwmjiet402",
  "cm2m2a17l000d6zjwms87npci",
  "cm2m2hxob001enxpjgslvo2wv",
  "cm2m2hc5u000o6zjwl0z6704k",
  "cm2m2ipan00232aj9526nsipi",
];

const backendGroupId = "cm2m2hxob001enxpjgslvo2wv";
const backendComponentSort = [
  "cm2m2a17y000f6zjwb2oxxwp5",
  "cm2m2a18a000h6zjwinply92s",
];

const externalGroupId = "cm2m2hc5u000o6zjwl0z6704k";
const externalComponentSort = [
  "cm2m2gicr001cnxpjc1ooni6v",
  "cm2m2gjm8000m6zjw5crzye8j",
  "cm2m2gnal000912i933goea3p",
  "cm2m2l61x00126zjwk60tfp6z",
  "cm2m2lpjl000b12i9dah8knzk",
  "cm2m2mbl800146zjwq7jyodx0",
  "cm2m2mesm002f2aj91o37s8fx",
  "cm2m2nk7g000j12i939i2mxzg",
  "cm2m2wzj500176zjwh070wrtr",
  "cm2m2x0n7000l12i92xqxjxct",
  "cm2m2x5cb00196zjwjobx996c",
  "cm2m2xir4001b6zjwobvp5f2d",
];

const extrasGroupId = "cm2m2ipan00232aj9526nsipi";
const extrasComponentSort = ["cm2m2a18p000j6zjw4nf68ykf"];

const groupComponents = [backendGroupId, externalGroupId, extrasGroupId];

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
          .path("/summary.json")
          .header("User-Agent", this.client.manager.ua)
          .send(),
        centra(constants.url.fireStatus)
          .path("/v2/components.json")
          .header("User-Agent", this.client.manager.ua)
          .send(),
      ]);
    } catch (e) {
      return await message.send("STATUS_FETCH_FAIL");
    }

    const [summary, components] = (await Promise.all(
      responses.map((response) => response.json())
    )) as [Summary, Components];

    components.components = components.components.sort(
      (a, b) =>
        mainComponentSort.indexOf(a.id) - mainComponentSort.indexOf(b.id)
    );

    const componentsText = [
      components.components
        .filter(
          (component) =>
            component.group == null && !groupComponents.includes(component.id)
        )
        .flatMap(
          (component) =>
            `├${this.client.util.useEmoji(
              statusToAppEmoji[component.status]
            )} **${component.name}**: ${
              message.language.get(
                `INSTATUS_COMPONENT_STATUS.${component.status}` as LanguageKeys
              ) || titleCase(component.status.split("OUTAGE").join(" "))
            }`
        ),
      components.components
        .filter((component) => groupComponents.includes(component.id))
        .flatMap((group) => [
          `├${this.client.util.useEmoji(statusToAppEmoji[group.status])} **${
            group.name
          }**: ${
            message.language.get(
              `INSTATUS_COMPONENT_STATUS.${group.status}` as LanguageKeys
            ) || titleCase(group.status.split("OUTAGE").join(" "))
          }`,
          ...components.components
            .filter((component) => component.group?.id == group.id)
            .sort((a, b) => {
              if (group.id === backendGroupId) {
                return (
                  backendComponentSort.indexOf(a.id) -
                  backendComponentSort.indexOf(b.id)
                );
              } else if (group.id === externalGroupId) {
                return (
                  externalComponentSort.indexOf(a.id) -
                  externalComponentSort.indexOf(b.id)
                );
              } else if (group.id === extrasGroupId) {
                return (
                  extrasComponentSort.indexOf(a.id) -
                  extrasComponentSort.indexOf(b.id)
                );
              }
              return 0;
            })
            .map(
              (groupComponent) =>
                `├─${this.client.util.useEmoji(
                  statusToAppEmoji[groupComponent.status]
                )} **${groupComponent.name}**: ${
                  message.language.get(
                    `INSTATUS_COMPONENT_STATUS.${groupComponent.status}` as LanguageKeys
                  ) ||
                  titleCase(groupComponent.status.split("OUTAGE").join(" "))
                }`
            ),
        ]),
    ].flat();

    const embed = new MessageEmbed()
      .setTitle(
        message.language
          .get(
            `INSTATUS_PAGE_DESCRPTIONS.${summary.page.status}` as LanguageKeys,
            summary.page.status.startsWith("ONE")
              ? {
                  component:
                    components.components.find(
                      (component) =>
                        component.status == summary.page.status.slice(3)
                    )?.name || "",
                }
              : undefined
          )
          .trim()
      )
      .setDescription(componentsText.join("\n"))
      .setColor(
        constants.instatus.colors[summary.page.status] ||
          message.member?.displayColor ||
          "#FFFFFF"
      )
      // .addFields({
      //   name: message.language.get("STATUS_LATEST_INCIDENT"),
      //   value: `[${latest.name}](${latest.shortlink})\n${message.language.get(
      //     "STATUS"
      //   )}: **${
      //     message.language.get("STATUSPAGE_INCIDENT_STATUS", {
      //       returnObjects: true,
      //     })[latest.status.toLowerCase()] || titleCase(latest.status)
      //   }**`,
      // })
      .setTimestamp();

    if (summary.activeIncidents?.length)
      embed.addFields(
        summary.activeIncidents.map((incident) => ({
          name: `${message.language.get("STATUS_ACTIVE_INCIDENT")} - [${
            incident.name
          }](${incident.url})`,
          value:
            message.language.get(
              `INSTATUS_INCIDENT_STATUS.${incident.status}` as LanguageKeys
            ) || titleCase(incident.status),
        }))
      );

    if (summary.activeMaintenances?.length)
      embed.addFields(
        summary.activeMaintenances.map((maintenance) => ({
          name: `${message.language.get("STATUS_ACTIVE_MAINTENANCE")} - [${
            maintenance.name
          }](${maintenance.url})`,
          value:
            message.language.get(
              `INSTATUS_MAINTENANCE_STATUS.${maintenance.status}` as LanguageKeys
            ) || maintenance.status,
        }))
      );

    await message.channel.send({ embeds: [embed] });
  }
}
