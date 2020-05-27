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


class BadName(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='badname', description='Change the name used for auto dehoist/decancer')
    @commands.has_permissions(manage_nicknames=True)
    async def badnamecmd(self, ctx, *, newname: str = None):
        current = ctx.config.get('utils.badname')
        if newname and newname == current:
            return await ctx.success(f'I did absolutely nothing because that\'s already set as the "bad name"')
        current = await ctx.config.set('utils.badname', newname)
        if current:
            await ctx.success(f'I have set the "bad name" to {newname}. This will **not** rename existing users')
        else:
            await ctx.success(f'I have reset the "bad name" to John Doe 0000 (with 0000 being their discriminator). '
                              f'This will **not** rename existing users')

def setup(bot):
    try:
        bot.add_cog(BadName(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"badname" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"badname"', exc_info=e)
