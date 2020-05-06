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
from fire import exceptions
import functools
import asyncio
import discord
import traceback


class GuildRemove(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_remove(self, guild):
        self.bot.configs.pop(guild.id)
        fire = self.bot.get_guild(564052798044504084)
        await fire.edit(description=f'Fire is an open-source, multi-purpose bot '
                                    f'with {len(self.bot.commands)} commands and is used in '
                                    f'{len(self.bot.guilds)} servers.'
        )
        self.bot.logger.info(f'$REDFire left a guild! '
                             f'$CYAN{guild.name}({guild.id}) '
                             f'$REDwith $CYAN{guild.member_count} $REDmembers '
                             f'owned by {guild.owner}'
        )
        botlists = [
            self.bot.get_cog('TopGG'),
            self.bot.get_cog('DiscordBoats')
        ]
        for l in botlists:
            try:
                await l.post_guilds()
            except Exception as e:
                self.bot.logger.warn(f'$YELLOWFailed to post guild count to $CYAN{l.name}', exc_info=e)


def setup(bot):
    if not bot.dev:
        try:
            bot.add_cog(GuildRemove(bot))
            bot.logger.info(f'$GREENLoaded event $CYANGuildRemove!')
        except Exception as e:
            # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
            bot.logger.error(f'$REDError while loading event $CYAN"GuildRemove"', exc_info=e)
