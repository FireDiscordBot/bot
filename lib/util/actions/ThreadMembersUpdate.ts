import { Snowflake } from "discord-api-types/globals";
import { Constants, ThreadChannel, ThreadMember } from "discord.js";
import { GenericAction } from "../GenericAction";

const { Events } = Constants;

export class ThreadMembersUpdateAction extends GenericAction {
  handle(data) {
    const client = this.client;
    const thread = client.channels.cache.get(data.id) as ThreadChannel;
    if (thread) {
      const old = thread.members.cache.clone();

      // fill in fake thread members from removed ids
      // to allow for knowing who was removed
      // without the members being cached
      if (data.removed_member_ids)
        for (const id of data.removed_member_ids.filter(
          (id: Snowflake) => !old.has(id)
        ))
          old.set(
            id,
            // fake thread member
            new ThreadMember(thread, {
              id: thread.id,
              user_id: id,
              join_timestamp: "2069-04-20T00:00:00+00:00",
              flags: 0,
            })
          );

      thread.memberCount = data.member_count;

      data.added_members?.forEach((rawMember) => {
        // @ts-ignore we're replacing internals so we need to use this
        thread.members._add(rawMember);
      });

      data.removed_member_ids?.forEach((memberId) => {
        thread.members.cache.delete(memberId);
      });

      /**
       * Emitted whenever members are added or removed from a thread. Requires `GUILD_MEMBERS` privileged intent
       * @event Client#threadMembersUpdate
       * @param {Collection<Snowflake, ThreadMember>} oldMembers The members before the update
       * @param {Collection<Snowflake, ThreadMember>} newMembers The members after the update
       */
      client.emit(Events.THREAD_MEMBERS_UPDATE, old, thread.members.cache);
    }
    return {};
  }
}
