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
import traceback
import discord


class Conf(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(description='View the server config', aliases=['conf'])
    @commands.has_permissions(manage_guild=True)
    async def config(self, ctx, option: str = None):
        if not option:
            paginator = WrappedPaginator(
                prefix='```ini', suffix='```', max_size=600)
            gconf = ctx.config
            for opt, data in gconf.options.items():
                current = gconf.get(opt)
                if isinstance(current, list):
                    current = ', '.join([str(c) for c in current])
                accepted = data["accepts"]
                if isinstance(accepted, list):
                    accepted = f'List of {accepted[0].__name__}'
                else:
                    accepted = accepted.__name__
                paginator.add_line(
                    f'[{opt}]\n{data["description"].split(" | ")[-1]}\nDefault: {data["default"]}\nCurrent: {gconf.get(opt)}\nAccepts: {accepted}\n')
            interface = PaginatorInterface(
                ctx.bot, paginator, owner=ctx.author)
            return await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(Conf(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"config" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"config"', exc_info=e)
