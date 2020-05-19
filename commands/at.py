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
import traceback
import discord
import asyncio


class Autotip(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.channel = 600068336331522079

    @commands.command()
    @commands.is_owner()
    async def at(self, ctx, *, content: str = '/atstats'):
        await self.bot.get_channel(self.channel).send(f'|at {content}')
        try:
            m = await self.bot.wait_for(
                'message',
                 check=lambda m: m.channel.id == self.channel and m.attachments,
                 timeout=15
            )
            return await ctx.send(file=(await m.attachments[0].to_file()))
        except asyncio.TimeoutError:
            return await ctx.error('Got no response :(')


def setup(bot):
    try:
        bot.add_cog(Autotip(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"at" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"at"', exc_info=e)
