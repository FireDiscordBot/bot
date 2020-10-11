import { describe, ProcessDescription } from "pm2";
import { version as djsver } from "discord.js";
import * as express from "express";
import { promisify } from "util";
import * as pm2 from "pm2";

const describePromise = promisify(describe.bind(pm2));

const humanFileSize = (size: number) => {
  let i = size == 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
  return (
    Number((size / Math.pow(1024, i)).toFixed(2)) * 1 +
    " " +
    ["B", "kB", "MB", "GB", "TB"][i]
  );
};

export async function statsRoute(req: express.Request, res: express.Response) {
  const client = req.app.client;
  let processInfo: ProcessDescription[] = [];
  if (client.manager.pm2) {
    try {
      processInfo = await describePromise(process.env.name || "fire");
    } catch {}
  }
  res.json({
    uptime: client.launchTime.toISOString(true),
    cpu: processInfo.length ? `${processInfo[0].monit.cpu}%` : "Unknown%",
    ram: processInfo.length
      ? humanFileSize(processInfo[0].monit.memory)
      : "Unknown MB",
    pid: process.pid,
    version: `Discord.JS v${djsver} | Node.JS ${process.version}`,
    guilds: client.guilds.cache.size,
    users: client.guilds.cache
      .map((guild) => guild.memberCount)
      .reduce((a, b) => a + b),
    commands: client.commandHandler.modules.size,
  });
}
