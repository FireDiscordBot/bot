"""
MIT License
Copyright (c) 2021 GamingGeek

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


from fire.converters import TextChannel, Category
from discord.ext import commands
import discord
import typing


class Slowmode(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='slowmode')
    @commands.has_permissions(manage_channels=True)
    @commands.bot_has_permissions(manage_channels=True)
    async def slowmodecmd(self, ctx, delay: int = 0, channel: typing.Union[TextChannel, Category] = None):
        if not channel:
            channel = ctx.channel
        if isinstance(channel, discord.CategoryChannel):
            channels = channel.channels.copy()
            for c in channels:
                try:
                    await c.edit(slowmode_delay=delay)
                    channels.remove(c)
                except Exception:
                    pass
            if channels:
                return await ctx.error(f'Failed to set slowmode for {", ".join([c.name for c in channels])}')
            return await ctx.success(f'Successfully set slowmode for all channels in {channel}')
        try:
            await channel.edit(slowmode_delay=delay)
            return await ctx.success(f'Successfully set slowmode for {channel}')
        except Exception:
            return await ctx.error(f'Failed to set slowmode for {channel}')


def setup(bot):
    try:
        bot.add_cog(Slowmode(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"slowmode" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"slowmode"', exc_info=e)
