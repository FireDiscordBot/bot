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


from jishaku.paginators import PaginatorInterface, WrappedPaginator
from terminaltables import AsciiTable
from discord.ext import commands


def shorten(text):
    if not text:
        return None
    if len(text) >= 35:
        return text[:35] + '...'
    return text


class Guilds(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name="guilds", description="Shows you all the guilds I'm in.")
    async def listguilds(self, ctx):
        if not self.bot.isadmin(ctx.author):
            return await ctx.error('no')
        data = [
            ['Name', 'ID', 'Members', 'Channels', 'Boosts', 'Shard']
        ]
        for guild in sorted(self.bot.guilds, key=lambda g: g.member_count, reverse=True):
            data.append([
                shorten(guild.name),
                guild.id,
                format(guild.member_count, ',d'),
                len(guild.channels),
                guild.premium_subscription_count,
                guild.shard_id,
            ])
        table = AsciiTable(data)
        header = table.table.split('\n')[:3]
        paginator = WrappedPaginator(
            prefix='```\n' + '\n'.join(header), suffix='```', max_size=1950)
        for ln in table.table.split('\n'):
            if ln not in header:
                paginator.add_line(ln)
        interface = PaginatorInterface(ctx.bot, paginator, owner=ctx.author)
        return await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(Guilds(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"guilds" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"guilds"', exc_info=e)
