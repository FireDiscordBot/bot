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


class Public(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='public', description='Makes the guild visible on https://fire.gaminggeek.dev/discover')
    @commands.has_permissions(manage_guild=True)
    async def publiccmd(self, ctx):
        current = await ctx.config.get('utils.public')
        query = 'SELECT * FROM vanity WHERE gid=$1 AND redirect IS NULL'
        vanitys = await self.bot.db.fetch(query, ctx.guild.id)
        if not vanitys:
            return await ctx.error(f'You must set a vanity url with `{ctx.prefix}vanityurl` before your guild can be public')
        current = await ctx.config.set('utils.public', not current)
        if current:
            await ctx.success(f'Your guild is now public & visible on <https://fire.gaminggeek.dev/discover>.'
                                     f'\nPeople will be able to use your guild\'s vanity url (<https://inv.wtf/{vanitys[0]["code"]}>) to join')
            log = await ctx.config.get('log.action')
            if log:
                await log.send(f'<:operational:685538400639385649> Ths server is now public and will appear on Fire\'s public server list')
        else:
            await ctx.success(f'Your guild is no longer public and will no longer show on the Fire website')
            log = await ctx.config.get('log.action')
            if log:
                await log.send(f'<:major_outage:685538400639385706> Ths server was manually removed from Fire\'s public server list by {ctx.author}')


def setup(bot):
    try:
        bot.add_cog(Public(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"public" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"public"', exc_info=e)
