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


from discord.ext import commands, tasks
from core.config import GuildConfig
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
        if 'commands' not in self.bot.stats:
            self.bot.stats['commands'] = {}
        self.save_stats.start()

    def cog_unload(self):
        self.save_stats.cancel()

    @commands.Cog.listener()
    async def on_socket_response(self, payload):
        t = payload['t']
        if t == 'GUILD_CREATE':
            guild = int(payload['d']['id'])
            if guild not in self.bot.configs:
                self.bot.configs[guild] = GuildConfig(guild, bot=self.bot, db=self.bot.db)
            if not self.bot.get_config(guild).loaded:
                await self.bot.get_config(guild).load()
        if not t:
            if payload['op'] == 11:
                t = 'HEARTBEAT'
            elif payload['op'] == 10:
                t = 'HELLO'  # hi
            elif payload['op'] == 9:
                t = 'INVALID_SESSION'
            elif payload['op'] == 7:
                t = 'RECONNECT'
            else:
                self.bot.logger.warn(f'$REDUnknown event, $CYAN{t}\n$REDPayload: $CYAN{payload}')
                return
        if t not in self.bot.stats['socket']:
            self.bot.logger.info(f'$GREENFound new event, $CYAN{t}')
            self.bot.stats['socket'][t] = 1
        else:
            self.bot.stats['socket'][t] += 1

    @commands.Cog.listener()
    async def on_command(self, ctx):
        name = ctx.command.name
        if not name in self.bot.stats['commands']:
            self.bot.stats['commands'][name] = 0
        self.bot.stats['commands'][name] += 1

    @tasks.loop(seconds=5)
    async def save_stats(self):
        f = await aiofiles.open('stats.json', 'w')
        await f.write(json.dumps(self.bot.stats))
        await f.close()


def setup(bot):
    try:
        bot.add_cog(Stats(bot))
        bot.logger.info(f'$GREENLoaded $CYANStats $GREENmodule!')
    except Exception as e:
        bot.logger.error(f'$REDError while loading module $CYAN"Stats"', exc_info=e)
