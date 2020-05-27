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


from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from discord.ext import commands
from fire.http import Route
import traceback
import datetime
import discord


class Mod(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='mod', description="Get info about a Sk1er mod", aliases=['mods'])
    async def skiermod(self, ctx, *, mod: str = None):
        if mod is None:
            return await ctx.error("You need to provide a mod name")
        route = Route(
            'GET',
            f'/mods'
        )
        try:
            mods = await self.bot.http.sk1er.request(route)
        except Exception:
            return await ctx.error(f'Failed to fetch mods')
        names = {}
        for m in mods:
            names[mods[m]['display'].lower()] = m
            for mod_id in mods[m]['mod_ids']:
                names[mod_id.lower()] = m
        if mod.lower() not in names:
            return await ctx.error(f'Unknown mod.')
        else:
            mod = mods[names[mod.lower()]]
        route = Route(
            'GET',
            f'/mods_analytics'
        )
        try:
            analytics = await self.bot.http.sk1er.request(route)
            analytics = analytics.get(mod['mod_ids'][0], {})
        except Exception:
            return await ctx.error(f'Failed to fetch mod analytics')
        embed = discord.Embed(
            title=mod['display'],
            colour=ctx.author.color,
            url=f"https://sk1er.club/mods/{mod['mod_ids'][0]}",
            description=mod['short'],
            timestamp=datetime.datetime.now(datetime.timezone.utc)
        )
        embed.add_field(name="Versions", value='\n'.join([f'**{k}**: {v}' for k, v in mod['latest'].items()]), inline=False)
        embed.add_field(name="Creator", value=f'''**__{mod['vendor']['name']}__**
[Website]({mod['vendor']['website']})
[Twitter]({mod['vendor']['twitter']})
[YouTube]({mod['vendor']['youtube']})
''', inline=False)
        if analytics:
            embed.add_field(name="Analytics", value=f"Total: {analytics['total']:,d}, Online: {analytics['online']:,d}, Last Day: {analytics['day']:,d}, Last Week: {analytics['week']:,d}", inline=False)
        await ctx.send(embed=embed)
        paginator = WrappedPaginator(prefix='', suffix='', max_size=490)
        for mcv in mod['changelog']:
            paginator.add_line(f'**__{mcv}__**')
            for v in mod['changelog'][mcv]:
                changelog = mod["changelog"][mcv][v][0]
                time = datetime.datetime.fromtimestamp(changelog["time"] / 1000, datetime.timezone.utc).strftime('%d/%m/%Y @ %I:%M:%S %p')
                paginator.add_line(f'**{v}**: {changelog["text"]} ({time})')
            paginator.add_line('-----------------')
        embed = discord.Embed(color=ctx.author.color, title='Changelogs', timestamp=datetime.datetime.now(datetime.timezone.utc))
        interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
        await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(Mod(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"Mod" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"Mod"', exc_info=e)
