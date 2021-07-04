import { ComponentMessage } from "@fire/lib/extensions/componentmessage";
import { FireMember } from "@fire/lib/extensions/guildmember";
import { FireMessage } from "@fire/lib/extensions/message";
import { Listener } from "@fire/lib/util/listener";
import { Snowflake } from "discord.js";

export default class Select extends Listener {
  constructor() {
    super("select", {
      emitter: "client",
      event: "select",
    });
  }

  // used to handle generic dropdowns like the rank selector
  async exec(select: ComponentMessage) {
    if (select.type != "SELECT_MENU") return;

    let message: FireMessage;
    if (!select.ephemeral) message = select.message as FireMessage;

    const guild = message?.guild;

    if (
      select.customID == `rank:${guild?.id}` &&
      select.member instanceof FireMember
    ) {
      const ranks = guild.settings
        .get<Snowflake[]>("utils.ranks", [])
        .map((id) => guild.roles.cache.get(id))
        .filter((role) => !!role);

      const roleIds = select.values.filter(
        (id) =>
          guild.roles.cache.has(id as Snowflake) &&
          ranks.find((role) => role.id == id)
      ) as Snowflake[];
      const join = roleIds.filter(
        (id: Snowflake) => !select.member.roles.cache.has(id)
      );
      const leave = roleIds.filter((id: Snowflake) =>
        select.member.roles.cache.has(id)
      );

      if (!join.length && !leave.length)
        return await select.error("RANKS_SELECT_NONE");

      const newRoles = select.member.roles.cache
        .map((role) => role.id)
        .filter((id) => !leave.includes(id));
      newRoles.push(...join);

      const set = await select.member.roles.set(newRoles).catch(() => {});
      if (!set) return;

      const mapRoles = (roles: Snowflake[]) =>
        roles
          .map((id) => guild.roles.cache.get(id)?.name)
          .filter((name) => !!name)
          .map((name) => `**${name}**`)
          .join(", ");

      select.flags = 64;
      if (leave.length && !join.length)
        return leave.length == 1
          ? await select.success("RANKS_SELECT_LEAVE_SINGLE", {
              role: guild.roles.cache.get(leave[0])?.name,
            })
          : await select.success("RANKS_SELECT_LEAVE_MULTI", {
              roles: mapRoles(leave),
            });
      else if (join.length && !leave.length)
        return join.length == 1
          ? await select.success("RANKS_SELECT_JOIN_SINGLE", {
              role: guild.roles.cache.get(join[0])?.name,
            })
          : await select.success("RANKS_SELECT_JOIN_MULTI", {
              roles: mapRoles(join),
            });
      else if (join.length == 1 && leave.length == 1)
        return await select.success("RANKS_SELECT_JOIN_LEAVE_SINGLE", {
          join: guild.roles.cache.get(join[0])?.name,
          leave: guild.roles.cache.get(leave[0])?.name,
        });
      else if (join.length == 1)
        return await select.success("RANKS_SELECT_JOIN_SINGLE_LEAVE_MULTI", {
          join: guild.roles.cache.get(join[0])?.name,
          left: mapRoles(leave),
        });
      else
        return await select.success("RANKS_SELECT_JOIN_LEAVE_MULTI", {
          joined: mapRoles(join),
          left: mapRoles(leave),
        });
    }
  }
}
