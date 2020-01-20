"""
MIT License
Copyright (c) 2019 GamingGeek

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


class socketStats(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command()
    async def socketstats(self, ctx):
        if not hasattr(self.bot, 'socketstats'):
            return await ctx.error(f'Socket stats are not loaded')
        delta = datetime.datetime.utcnow() - self.bot.launchtime
        minutes = delta.total_seconds() / 60
        total = sum(socketresp.stats.values())
        cpm = total / minutes
        stats = [f'[{k}] {v}' for k, v in sored(self.bot.socketstats.items(), key=lambda t: self.bot.socketstats[t])]
        paginator = WrappedPaginator(prefix='```ini', suffix='```', max_size=1000)
        paginator.add_line(f'{total} events seen, {cpm:.2f} events per minute')
        for ln in stats:
            paginator.add_line(ln)
        interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
        await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(socketStats(bot))
    except Exception as e:
        errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        print(f'Error while adding command "socketstats";\n{errortb}')
