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


class AutoDehoist(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='autodehoist', description='Toggle renaming those with hoisted names')
    @commands.has_permissions(manage_nicknames=True)
    @commands.bot_has_permissions(manage_nicknames=True)
    async def autodehoistcmd(self, ctx):
        current = await ctx.config.get('mod.autodehoist')
        current = await ctx.config.set('mod.autodehoist', not current)
        if current:
            await ctx.success(f'Enabled autodehoist. **New** users with hoisted names will be renamed')
        else:
            await ctx.success(f'Disabled autodehoist. **New** users with hoisted names will no longer be renamed')

def setup(bot):
    try:
        bot.add_cog(AutoDehoist(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"autodehoist" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"autodehoist"', exc_info=e)
