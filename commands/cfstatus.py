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
from fire.http import HTTPClient, Route
from discord.ext import commands
import traceback
import datetime
import discord


class CloudflareStatus(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.http.cfstatus = HTTPClient(
            'https://cloudflarestatus.com/api/v2',
            user_agent='Fire Discord Bot'
        )

    @commands.command(name='cfstatus')
    async def cfstatus(self, ctx):
        colors = {
            'none': ctx.author.color,
            'minor': discord.Color.gold(),
            'major': discord.Color.orange(),
            'critical': discord.Color.red(),
            'maintenance': discord.Color.blue()
        }
        emoji = {
            'operational': '<:operational:685538400639385649>',
            'degraded_performance': '<:degraded_performance:685538400228343808>',
            'partial_outage': '<:partial_outage:685538400555499675>',
            'major_outage': '<:major_outage:685538400639385706>',
            'under_maintenance': '<:maintenance:685538400337395743>'
        }
        sroute = Route(
            'GET',
            '/summary.json'
        )
        iroute = Route(
            'GET',
            '/incidents.json'
        )
        try:
            summary = await self.bot.http.cfstatus.request(sroute)
            incidents = await self.bot.http.cfstatus.request(iroute)
        except Exception:
            return await ctx.error(f'Failed to fetch Cloudflare status')
        # Cloudflare is a special little snowflake with a shit ton of compontents, too many for the embed description
        paginator = WrappedPaginator(prefix='', suffix='', max_size=1980)
        groups = {}
        for c in [c for c in summary['components'] if c['group_id']]:
            if c['status'] == 'operational':
                continue
            if c['group_id'] not in groups:
                groups[c['group_id']] = [c]
            else:
                groups[c['group_id']].append(c)
        for c in [c for c in summary['components'] if not c['group_id']]:
            paginator.add_line(f'├{emoji[c["status"]]} **{c["name"]}**: {c["status"].replace("_", " ").title()}')
            for s in groups.get(c['id'], []):
                paginator.add_line(f'├─{emoji[s["status"]]} **{s["name"]}**: {s["status"].replace("_", " ").title()}')
        embed = discord.Embed(color=colors[str(summary['status']['indicator'])], title=summary['status']['description'], timestamp=datetime.datetime.now(datetime.timezone.utc))
        incident = incidents['incidents'][0]
        embed.add_field(name='Latest Incident', value=f'[{incident["name"]}]({incident["shortlink"]})\nStatus: **{incident["status"].capitalize()}**')
        interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
        await interface.send_to(ctx)


def setup(bot):
    try:
        bot.add_cog(CloudflareStatus(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"cfstatus" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"cfstatus"', exc_info=e)
