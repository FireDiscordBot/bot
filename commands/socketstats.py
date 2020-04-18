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

from jishaku.paginators import WrappedPaginator, PaginatorInterface
from discord.ext import commands
import datetime
import discord
import traceback


class SocketStats(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def socketstats(self, ctx):
        if not hasattr(self.bot, 'stats'):
            return await ctx.error(f'Socket stats are not loaded')
        delta = datetime.datetime.utcnow() - self.bot.launchtime
        minutes = delta.total_seconds() / 60
        total = sum(self.bot.stats['socket'].values())
        stats = [f'[{k}] {v:,d}' for k, v in sorted(self.bot.stats['socket'].items(), key=lambda t: self.bot.stats['socket'][t[0]])]
        stats.reverse()
        paginator = WrappedPaginator(prefix='```ini', suffix='```', max_size=1000)
        paginator.add_line(f'{total:,d} events seen since January 20th 2020')
        for ln in stats:
            paginator.add_line(ln)
        interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
        await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(SocketStats(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"socketstats" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"socketstats"', exc_info=e)
