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


from urllib.parse import quote_plus
from discord.ext import commands
import traceback
import discord
import aiohttp


class asciii(commands.Cog):  # 3 i's because ascii() already exists. ez fix
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='ascii', description='ascii text')
    async def asciicmd(self, ctx, *, text: str):
        async with aiohttp.ClientSession() as session:
            async with session.get(f'http://artii.herokuapp.com/make?text={quote_plus(text)}') as resp:
                body = await resp.text()
        try:
            asciimsg = discord.utils.escape_mentions(body).replace('`', '')
            await ctx.send(f'```{asciimsg}```')
        except discord.HTTPException as e:
            e = str(e)
            if 'Must be 2000 or fewer in length.' in e:
                return await ctx.send('That message is too long. Try a shorter one!')


def setup(bot):
    try:
        bot.add_cog(asciii(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"ascii" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"ascii"', exc_info=e)
