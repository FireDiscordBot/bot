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
from fire.http import Route
import traceback
import discord


class Modcore(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def modcoref(self, text):
        return text.replace('_', ' ').replace('STATIC', '(Static)').replace('DYNAMIC', '(Dynamic)').lower().title()

    @commands.command(description="Get a player's modcore profile")
    async def modcore(self, ctx, player: str = None):
        if player is None:
            return await ctx.error("You must provide a player to check their profile")
        uuid = await self.bot.get_cog('Hypixel Commands').name_to_uuid(player)
        if not uuid:
            raise commands.UserInputError('Couldn\'t find that player\'s UUID')
        route = Route(
            'GET',
            f'/profile/{uuid}'
        )
        try:
            profile = await self.bot.http.modcore.request(route)
        except Exception:
            return await ctx.error(f'Failed to fetch profile')
        purchases = [self.modcoref(c) for c, e in profile.get('purchase_profile', {'No Cosmetics': True}).items() if e]
        for c, s in profile.get('cosmetic_settings', {}).items():
            if s != {} and s.get('enabled', False):
                if 'STATIC' in c:
                    cid = s['id']
                    purchases = [p.replace(self.modcoref(c), f'**[{self.modcoref(c)}](https://api.modcore.sk1er.club/serve/cape/static/{cid})**') for p in purchases]
                elif 'DYNAMIC' in c:
                    cid = s['id']
                    purchases = [p.replace(self.modcoref(c), f'**[{self.modcoref(c)}](https://api.modcore.sk1er.club/serve/cape/dynamic/{cid})**') for p in purchases]
        purchases = ', '.join([i for i in purchases])
        embed = discord.Embed(title=f'{player}\'s Modcore Profile', color=ctx.author.color)
        embed.add_field(name='UUID', value=uuid, inline=False)
        embed.add_field(name='Enabled Cosmetics', value=purchases or 'No Cosmetics', inline=False)
        embed.add_field(name='Status' if profile['online'] else 'Last Seen', value=profile.get('status', 'Unknown'), inline=False)
        return await ctx.send(embed=embed)


def setup(bot):
    try:
        bot.add_cog(Modcore(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"Modcore" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"Modcore"', exc_info=e)
