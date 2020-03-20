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
import datetime


class ping(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='ping', description='Shows you my ping to discord\'s servers')
    async def pingcmd(self, ctx):
        latency = round(self.bot.latency * 1000)
        start = round(datetime.datetime.utcnow().timestamp() * 1000)
        msg = await ctx.send(content='Pinging...')
        end = round(datetime.datetime.utcnow().timestamp() * 1000)
        elapsed = round(end - start)
        color = ctx.author.color
        embed = discord.Embed(title=f':ping_pong: {elapsed}ms.\n:heartpulse: {latency}ms.', colour=color, timestamp=datetime.datetime.utcnow())
        await msg.edit(content='`Pong!`', embed=embed)


def setup(bot):
    try:
        bot.add_cog(ping(bot))
        bot.logger.info(f'$GREENLoaded $BLUE"ping" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $BLUE"ping"', exc_info=e)
