import { Manager } from "@fire/lib/Manager";
import { getCommitHash } from "@fire/lib/util/gitUtils";
import { Event } from "@fire/lib/ws/event/Event";
import { EventType } from "@fire/lib/ws/util/constants";
import { exec, ExecOptions } from "child_process";
import { MessageEmbed } from "discord.js";

export default class Deploy extends Event {
  deployLog: { out: any[]; err: any[] };
  lastCommand: string;

  constructor(manager: Manager) {
    super(manager, EventType.DEPLOY);
    this.deployLog = {
      out: [],
      err: [],
    };
  }

  async run(data: {
    commit: string;
    branch: "master" | "deploy";
    requireInstall: boolean;
  }) {
    this.console.warn(
      `Received request to deploy commit ${data.commit} on branch ${data.branch}`,
      data.requireInstall ? "(requires install)" : ""
    );
    // check what commit we're currently on first
    if (getCommitHash() == data.commit) {
      this.console.info(`Already on commit ${data.commit}, no need to pull`);
      // no need to pull from git, but we may need to restart if it doesn't match what is loaded
      // (another cluster on the same machine may have already deployed this commit meaning it has already pulled and compiled)
      if (this.manager.commit != data.commit)
        return this.manager.kill("deploy");
      else return;
    }
    try {
      await this.execPromise("git pull");
      await this.execPromise(`git checkout ${data.commit}`);
      if (data.requireInstall) {
        await this.execPromise("rm -rf node_modules");
        await this.execPromise("pnpm install");
      }
      await this.execPromise("pnpm compile");
      await this.execPromise(`git checkout ${data.branch}`);
      return this.manager.kill("deploy");
    } catch (e) {
      this.console.error(
        `[Aether] Error while deploying commit ${data.commit} on branch ${data.branch}`,
        `Last command ran: "${this.lastCommand}"`,
        e
      );
      await this.execPromise(`git checkout ${data.branch}`).catch(() => {}); // switch back if not already
      await this.sendFailure(data, e);
    }
    this.deployLog = {
      out: [],
      err: [],
    };
  }

  execPromise(command: string, options: ExecOptions = {}) {
    this.lastCommand = command;
    return new Promise((resolve, reject) => {
      exec(command, options, (except, out: string, err: string) => {
        this.deployLog.out.push(out);
        this.deployLog.err.push(err);
        if (except) reject(except);
        else resolve({ out, err });
      });
    }) as Promise<{ out: string; err: string }>;
  }

  async sendFailure(
    data: {
      commit: string;
      branch: "master" | "deploy";
      requireInstall: boolean;
    },
    error: Error
  ) {
    const outHaste = await this.manager.client.util.haste(
      this.deployLog.out.join("\n"),
      "stdout.sh",
      data,
      true
    );
    const errHaste = await this.manager.client.util.haste(
      this.deployLog.err.join("\n"),
      "stderr.sh",
      data,
      true
    );
    const embed = new MessageEmbed()
      .setAuthor({
        name: `Deploy Failed | Cluster ${this.manager.id}`,
        iconURL: this.manager.client.user.displayAvatarURL({
          size: 4096,
        }),
      })
      .setColor("RED")
      .addFields([
        {
          name: "stdout log",
          value: outHaste,
        },
        {
          name: "stderr log",
          value: errHaste,
        },
        {
          name: "Error",
          value: "```js\n" + error.stack + "```",
        },
      ]);
    if (this.manager.client.channels.cache.has("851548726895575071")) {
      const channel =
        this.manager.client.channels.cache.get("851548726895575071");
      if (channel.isText())
        return await channel.send({
          content: "@everyone",
          allowedMentions: { parse: ["everyone"] },
          embeds: [embed],
        });
    } else {
      return await this.manager.client.req
        .channels("851548726895575071")
        .messages.post({
          data: {
            content: "@everyone",
            allowed_mentions: { parse: ["everyone"] },
            embeds: [embed.toJSON()],
          },
        });
    }
  }
}
