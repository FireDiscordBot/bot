import {
  DMChannel,
  GuildChannel,
  NewsChannel,
  Snowflake,
  ThreadChannel,
} from "discord.js";
import { Fire } from "../Fire";
import { ApplicationCommandMessage } from "../extensions/appcommandmessage";
import { ComponentMessage } from "../extensions/componentmessage";
import { ContextCommandMessage } from "../extensions/contextcommandmessage";
import { FireGuild } from "../extensions/guild";
import { FireMessage } from "../extensions/message";
import { ModalMessage } from "../extensions/modalmessage";
import { FireTextChannel } from "../extensions/textchannel";

// basefakechannel more like basedfakechannel amirite
export class BaseFakeChannel {
  get name(): string {
    return this.real && !(this.real instanceof DMChannel)
      ? this.real?.name || ""
      : "fake";
  }
  get topic() {
    return "";
  }
  get type(): string {
    return this.real?.type ?? "GUILD_TEXT";
  }
  get guildId(): Snowflake {
    return this.real?.type == "DM" ? null : this.real?.guildId;
  }
  get position() {
    return 0;
  }
  get rawPosition() {
    return this.real instanceof GuildChannel ? this.real.rawPosition : 0;
  }
  get calculatedPosition() {
    return 0;
  }
  get createdAt(): Date {
    return this.real?.createdAt ?? new Date();
  }
  get createdTimestamp(): number {
    return this.real?.createdTimestamp ?? +new Date();
  }
  get lastMessageId() {
    return this.real?.lastMessageId;
  }
  get lastMessage() {
    return this.real?.lastMessage as FireMessage;
  }
  get lastPinTimestamp() {
    return this.real?.lastPinTimestamp;
  }
  get lastPinAt() {
    return this.real?.lastPinAt;
  }
  get deleted(): boolean {
    return this.real?.deleted ?? false;
  }
  get partial(): boolean {
    return this.real?.partial ?? false;
  }
  get rateLimitPerUser() {
    return this.real instanceof FireTextChannel ||
      this.real instanceof NewsChannel
      ? this.real?.rateLimitPerUser
      : 0;
  }
  setRateLimitPerUser(rateLimitPerUser: number, reason?: string) {
    return this.real instanceof FireTextChannel ||
      this.real instanceof NewsChannel
      ? this.real.setRateLimitPerUser(rateLimitPerUser, reason)
      : undefined;
  }
  get threads() {
    return this.real instanceof FireTextChannel ||
      this.real instanceof NewsChannel
      ? this.real.threads
      : undefined;
  }
  get nsfw() {
    return this.real?.type == "GUILD_TEXT" || this.real?.type == "GUILD_NEWS"
      ? this.real.nsfw
      : false;
  }
  get deletable() {
    return false;
  }
  get viewable() {
    return this.real?.isThread()
      ? this.real.joinable
      : (this.real as GuildChannel).viewable ?? true;
  }
  get manageable() {
    return this.real?.type == "DM" ? false : this.real?.manageable;
  }
  get members() {
    return this.real?.type == "DM" ? undefined : this.real?.members;
  }
  get parent() {
    return this.real?.type == "DM" ? undefined : this.real?.parent;
  }
  get parentId() {
    return this.real?.type == "DM" ? undefined : this.real?.parentId;
  }
  get permissionsLocked() {
    return this.real instanceof GuildChannel
      ? this.real?.permissionsLocked
      : false;
  }
  get permissionOverwrites() {
    return this.real?.type != "DM" && !this.real.isThread()
      ? this.real.permissionOverwrites
      : undefined;
  }
  message:
    | ApplicationCommandMessage
    | ContextCommandMessage
    | ComponentMessage
    | ModalMessage;
  real: FireTextChannel | NewsChannel | ThreadChannel | DMChannel;
  interactionId: Snowflake;
  guild?: FireGuild;
  token: string;
  id: Snowflake;
  client: Fire;

  // async delete(reason?: string) {
  //   await this.real?.delete(reason);
  //   return this;
  // }
  // async fetch() {
  //   await this.real?.fetch();
  //   return this;
  // }
  // isText(): boolean {
  //   return this.real?.isText() ?? true;
  // }
  // isVoice(): boolean {
  //   return this.real?.isVoice() ?? false;
  // }
  // isThread(): boolean {
  //   return this.real?.isThread() ?? false;
  // }
  // toJSON() {
  //   return Util.flatten(this);
  // }
  // valueOf() {
  //   return this.id;
  // }
  // private memberPermissions(member: FireMember) {
  //   if (!this.guild) return new Permissions(0n);
  //   if (member.id === this.guild.ownerId)
  //     return new Permissions(Permissions.ALL).freeze();

  //   const roles = member.roles.cache;
  //   const permissions = new Permissions(roles.map((role) => role.permissions));

  //   if (permissions.has(PermissionFlagsBits.Administrator))
  //     return new Permissions(Permissions.ALL).freeze();

  //   const overwrites = this.overwritesFor(member, true, roles);

  //   return permissions
  //     .remove(overwrites.everyone?.deny ?? 0n)
  //     .add(overwrites.everyone?.allow ?? 0n)
  //     .remove(
  //       overwrites.roles.length > 0
  //         ? overwrites.roles.map((role) => role.deny)
  //         : 0n
  //     )
  //     .add(
  //       overwrites.roles.length > 0
  //         ? overwrites.roles.map((role) => role.allow)
  //         : 0n
  //     )
  //     .remove(overwrites.member?.deny ?? 0n)
  //     .add(overwrites.member?.allow ?? 0n)
  //     .freeze();
  // }
  // private rolePermissions(role: Role) {
  //   if (role.permissions.has(PermissionFlagsBits.Administrator))
  //     return new Permissions(Permissions.ALL).freeze();

  //   const channel = this.real;
  //   if (
  //     !channel ||
  //     channel.isThread() ||
  //     !channel.isText() ||
  //     channel.type == "DM"
  //   )
  //     return new Permissions(0n);

  //   const everyoneOverwrites = channel.permissionOverwrites?.cache.get(
  //     this.guild.id
  //   );
  //   const roleOverwrites = channel.permissionOverwrites.cache.get(role.id);

  //   return role.permissions
  //     .remove(everyoneOverwrites?.deny ?? 0n)
  //     .add(everyoneOverwrites?.allow ?? 0n)
  //     .remove(roleOverwrites?.deny ?? 0n)
  //     .add(roleOverwrites?.allow ?? 0n)
  //     .freeze();
  // }
  // overwritesFor(
  //   member: FireMember,
  //   verified = false,
  //   roles: Collection<string, Role> = null
  // ) {
  //   if (
  //     !member ||
  //     !this.guild ||
  //     !this.real ||
  //     this.real.isThread() ||
  //     this.real.type == "DM"
  //   )
  //     return { everyone: null, roles: [], member: null };
  //   if (!verified) member = this.guild.members.resolve(member) as FireMember;

  //   roles = roles ?? member.roles.cache;
  //   const roleOverwrites = [];
  //   let memberOverwrites: PermissionOverwrites;
  //   let everyoneOverwrites: PermissionOverwrites;

  //   for (const overwrite of this.real?.permissionOverwrites.cache.values()) {
  //     if (overwrite.id === this.guild.id) {
  //       everyoneOverwrites = overwrite;
  //     } else if (roles.has(overwrite.id)) {
  //       roleOverwrites.push(overwrite);
  //     } else if (overwrite.id === member.id) {
  //       memberOverwrites = overwrite;
  //     }
  //   }

  //   return {
  //     everyone: everyoneOverwrites,
  //     roles: roleOverwrites,
  //     member: memberOverwrites,
  //   };
  // }
}
