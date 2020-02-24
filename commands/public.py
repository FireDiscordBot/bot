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


class publiccmd(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(description='Makes the guild visible on https://fire.gaminggeek.space/discover')
    @commands.has_permissions(manage_guild=True)
    async def public(self, ctx):
        current = self.bot.configs[ctx.guild.id].get('utils.public')
        vanitys = [k for k, v in self.bot.vanity_urls.items() if v['gid'] == ctx.guild.id]
        if not vanitys:
            return await ctx.error(f'You must set a vanity url before your guild can be public')
        current = await self.bot.configs[ctx.guild.id].set('utils.public', not current)
        if current:
            return await ctx.success(f'Your guild is now public & visible on <https://fire.gaminggeek.space/discover>.'
                                     f'\nPeople will be able to use your guild\'s vanity url (<https://oh-my-god.wtf/{vanitys[0]}>)to join')
        else:
            return await ctx.success(f'Your guild is no longer public and will no longer show on the Fire website')


def setup(bot):
    try:
        bot.add_cog(publiccmd(bot))
        bot.logger.info(f'$GREENLoaded "public" command!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $BLUE"public"', exc_info=e)
