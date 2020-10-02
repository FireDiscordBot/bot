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

from discord.ext import commands
from core.config import Config
from fire import exceptions
import functools
import asyncio
import asyncpg
import discord
import traceback


class GuildAdd(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_join(self, guild):
        if guild.id not in self.bot.configs:
            self.bot.configs[guild] = Config(
                guild.id, bot=self.bot, db=self.bot.db)
            await self.bot.get_config(guild).load()
        fire = self.bot.get_guild(564052798044504084)
        desc = self.bot.get_cog('Description')
        await desc.set_desc(fire, f'Fire is an open-source, multi-purpose bot '
                                  f'with {len(self.bot.commands)} commands and is used in '
                                  f'{len(self.bot.guilds)} servers.'
                            )
        self.bot.logger.info(f'$GREENFire joined a new guild! '
                             f'$CYAN{guild.name}({guild.id}) '
                             f'$GREENwith $CYAN{guild.member_count} $GREENmembers'
                             )
        botlists = [
            self.bot.get_cog('TopGG'),
            self.bot.get_cog('DiscordBoats')
        ]
        for l in botlists:
            try:
                await l.post_guilds()
            except Exception as e:
                self.bot.logger.warn(
                    f'$YELLOWFailed to post guild count to $CYAN{l.name}', exc_info=e)
        try:
            await guild.chunk()
        except Exception as e:
            self.bot.logger.error(f'$REDFailed to chunk guild $CYAN{guild}', exc_info=e)


def setup(bot):
    if not bot.dev:
        try:
            bot.add_cog(GuildAdd(bot))
            bot.logger.info(f'$GREENLoaded event $CYANGuildAdd!')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            bot.logger.error(
                f'$REDError while adding event $CYAN"GuildAdd"', exc_info=e)
