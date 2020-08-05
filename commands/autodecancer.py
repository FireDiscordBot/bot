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


class AutoDecancer(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='autodecancer', description='Toggle renaming those with "cancerous" (non-ascii) names')
    @commands.has_permissions(manage_nicknames=True)
    @commands.bot_has_permissions(manage_nicknames=True)
    async def autodecancercmd(self, ctx):
        current = ctx.config.get('mod.autodecancer')
        current = await ctx.config.set('mod.autodecancer', not current)
        if current:
            await ctx.success(f'Enabled autodecancer. **New** users with "cancerous" (non-ascii) names will be renamed')
        else:
            await ctx.success(f'Disabled autodecancer. **New** users with "cancerous" (non-ascii) names will no longer be renamed')


def setup(bot):
    try:
        bot.add_cog(AutoDecancer(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"autodecancer" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"autodecancer"', exc_info=e)
