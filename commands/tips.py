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


class Tips(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='tips', description='Toggle tips when running commands')
    async def tipscmd(self, ctx):
        current = ctx.uconfig.get('utils.tips')
        current = await ctx.uconfig.set('utils.tips', not current)
        if current:
            return await ctx.success(f'You now have a 10% chance of seeing a useful tip when running commands.')
        else:
            return await ctx.success(f'You will no longer see tips when running commands')

def setup(bot):
    try:
        bot.add_cog(Tips(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"tips" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"tips"', exc_info=e)
