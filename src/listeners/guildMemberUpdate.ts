import { FireMember } from "../../lib/extensions/guildmember";
import { Listener } from "../../lib/util/listener";
import { TextChannel } from "discord.js";
import Sk1er from "../modules/sk1er";

export default class GuildMemberUpdate extends Listener {
  constructor() {
    super("guildMemberUpdate", {
      emitter: "client",
      event: "guildMemberUpdate",
    });
  }

  async exec(oldMember: FireMember, newMember: FireMember) {
    // Both of these will check permissions & whether
    // dehoist/decancer is enabled so no need for checks here
    newMember.dehoistAndDecancer();

    if (
      newMember.guild.mutes.has(newMember.id) &&
      !newMember.roles.cache.has(newMember.guild.muteRole.id)
    ) {
      await newMember.roles.add(newMember.guild.muteRole).catch(() => {});
    }

    if (newMember.guild.persistedRoles.has(newMember.id)) {
      const ids = newMember.guild.persistedRoles.get(newMember.id);
      const roles = newMember.guild.persistedRoles
        .get(newMember.id)
        .map((id) => newMember.guild.roles.cache.get(id))
        .filter((role) => !!role);
      if (ids.length != roles.length && roles.length >= 1) {
        newMember.guild.persistedRoles.set(
          newMember.id,
          roles.map((role) => role.id)
        );
        await this.client.db
          .query("UPDATE rolepersists SET roles=$1 WHERE gid=$2 AND uid=$3;", [
            roles.map((role) => role.id),
            newMember.guild.id,
            newMember.id,
          ])
          .catch(() => {});
      } else if (ids.length != roles.length && !roles.length) {
        newMember.guild.persistedRoles.delete(newMember.id);
        await this.client.db
          .query("DELETE FROM rolepersists WHERE gid=$1 AND uid=$2;", [
            newMember.guild.id,
            newMember.id,
          ])
          .catch(() => {});
      }

      if (
        newMember.guild.settings.has("temp.log.moderation") &&
        ids.length != roles.length
      ) {
        const command = this.client.getCommand("rolepersist");
        // @ts-ignore (for now, need to actually make the method)
        await command.sendLog(newMember, roles, newMember.guild.me);
      }
    }

    if (!newMember.pending) {
      let autoroleId: string;
      const delay = newMember.guild.settings.get(
        "mod.autorole.waitformsg",
        false
      );
      if (newMember.user.bot)
        autoroleId = newMember.guild.settings.get("mod.autobotrole", null);
      else autoroleId = newMember.guild.settings.get("mod.autorole", null);

      if (
        autoroleId &&
        (newMember.user.bot || !delay) &&
        !newMember.roles.cache.has(autoroleId)
      ) {
        const role = newMember.guild.roles.cache.get(autoroleId);
        if (role && newMember.guild.me.hasPermission("MANAGE_ROLES"))
          await newMember.roles.add(role).catch(() => {});
      }
    }

    const sk1erModule = this.client.getModule("sk1er") as Sk1er;
    if (
      sk1erModule &&
      !newMember.partial &&
      newMember.guild.id == sk1erModule.guildId
    ) {
      if (!newMember.roles.cache.has("585534346551754755")) {
        const removed = await sk1erModule
          .removeNitroPerks(newMember)
          .catch(() => false);
        if (typeof removed == "boolean" && removed)
          (sk1erModule.guild.channels.cache.get(
            "411620457754787841"
          ) as TextChannel).send(
            sk1erModule.guild.language.get(
              "SK1ER_NITRO_PERKS_REMOVED",
              newMember.toMention()
            ),
            { allowedMentions: { users: [newMember.id] } }
          );
      }
    }
  }
}
