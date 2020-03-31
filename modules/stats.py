"""
MIT License
Copyright (c) 2020 GamingGeek

Permission is hereby granted, free of charge, to any person obtaining a copy of this software
and associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense,
and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE
FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
"""

from core.influx import (
    Shards,
    Guilds,
    Users,
    Ping,
    SocketResponses,
    Commands,
    Errors,
    Messages,
    Memory
)
from discord.ext import commands, tasks
from core.config import Config
import traceback
import aiofiles
import datetime
import discord
import psutil
import json
import os


process = psutil.Process(os.getpid())


class Stats(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        if not hasattr(self.bot, 'stats'):
            self.bot.stats = json.load(open('stats.json'))
        self.bot.stats['commands'] = 0
        self.bot.stats['messages'] = 0
        self.bot.stats['errors'] = 0
        self.save_stats.start()
        self.send_stats.start()

    def cog_unload(self):
        self.save_stats.cancel()
        self.send_stats.cancel()

    @commands.Cog.listener()
    async def on_socket_response(self, payload):
        t = payload['t']
        if t == 'GUILD_CREATE':
            guild = int(payload['d']['id'])
            if guild not in self.bot.configs:
                self.bot.configs[guild] = Config(guild, bot=self.bot, db=self.bot.db)
            await self.bot.configs[guild].load()
        if not t:
            if payload['op'] == 11:
                t = 'HEARTBEAT'
            elif payload['op'] == 10:
                t = 'HELLO'  # hi
            else:
                self.bot.logger.warn(f'$REDUnknown event, $BLUE{t}\n$REDPayload: $BLUE{payload}')
                return
        if t not in self.bot.stats['socket']:
            self.bot.logger.info(f'$GREENFound new event, $BLUE{t}')
            self.bot.stats['socket'][t] = 1
        else:
            self.bot.stats['socket'][t] += 1

    @commands.Cog.listener()
    async def on_command(self, ctx):
        self.bot.stats['commands'] += 1

    @commands.Cog.listener()
    async def on_command_error(self, ctx, error):
        self.bot.stats['errors'] += 1

    @commands.Cog.listener()
    async def on_message(self, message):
        self.bot.stats['messages'] += 1

    @tasks.loop(seconds=5)
    async def save_stats(self):
        f = await aiofiles.open('stats.json', 'w')
        await f.write(json.dumps(self.bot.stats))
        await f.close()

    @tasks.loop(seconds=4)
    async def send_stats(self):
        if not hasattr(self.bot, 'influx'):
            return
        await self.bot.wait_until_ready()
        try:
            dst = datetime.timedelta(hours=1)  # gotta love daylight savings
            when = str(datetime.datetime.utcnow() + dst)
            for s in self.bot.shards.values():
                sh = Shards(
                    when=when,
                    shard=s.id,
                    shard_id=s.id
                )
                await self.bot.influx.write(sh)
            shards = {
                s.id: {
                    'guilds': 0,
                    'unavailable': 0,
                    'users': {
                        'online': 0,
                        'total': 0
                    },
                    'ping': round(s.ws.latency * 1000)
                } for s in self.bot.shards.values()}
            for g in self.bot.guilds:
                shards[g.shard_id]['guilds'] += 1
                if g.unavailable:
                    shards[g.shard_id]['unavailable'] += 1
                shards[g.shard_id]['users']['total'] += g.member_count
                statuses = ['online', 'dnd']
                online = [m for m in g.members if str(m.status) in statuses]
                shards[g.shard_id]['users']['online'] += len(online)
            for sid, data in shards.items():
                g = Guilds(
                    when=when,
                    shard=sid,
                    guilds=data['guilds'],
                    unavailable=data['unavailable']
                )
                await self.bot.influx.write(g)
                u = Users(
                    when=when,
                    shard=sid,
                    total=data['users']['total'],
                    online=data['users']['online']
                )
                await self.bot.influx.write(u)
                p = Ping(
                    when=when,
                    shard=sid,
                    heartbeat=data['ping']
                )
                await self.bot.influx.write(p)
            sr = SocketResponses(
                when=when,
                shard=0,
                responses=sum(self.bot.stats['socket'].values())
            )
            await self.bot.influx.write(sr)
            c = Commands(
                when=when,
                shard=0,
                total=self.bot.stats['commands']
            )
            self.bot.stats['commands'] = 0
            await self.bot.influx.write(c)
            m = Messages(
                when=when,
                shard=0,
                total=self.bot.stats['messages']
            )
            self.bot.stats['messages'] = 0
            await self.bot.influx.write(m)
            e = Errors(
                when=when,
                shard=0,
                total=self.bot.stats['errors']
            )
            self.bot.stats['errors'] = 0
            await self.bot.influx.write(e)
            mem = Memory(
                when=when,
                shard=0,
                used=round((process.memory_info().rss / 1024) / 1000)
            )
            await self.bot.influx.write(mem)
        except Exception as e:
            self.bot.logger.warn(f'$YELLOWFailed to send to influx!', exc_info=e)


def setup(bot):
    try:
        bot.add_cog(Stats(bot))
        bot.logger.info(f'$GREENLoaded $BLUEStats $GREENmodule!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading module $BLUE"Stats"', exc_info=e)
