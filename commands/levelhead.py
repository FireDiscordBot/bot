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
from io import BytesIO
from PIL import Image
from cogs import mcfont
import traceback
import datetime
import aiohttp
import discord
import re


remcolor = r'&[0-9A-FK-OR]'


class Levelhead(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(description="Get a player's levelhead info")
    async def levelhead(self, ctx, player: str = None):
        if player is None:
            return await ctx.send("What user should I check?")
        route = Route(
            'GET',
            f'/levelheadv5/{player}/LEVEL'
        )
        try:
            levelhead = await self.bot.http.sk1er.request(route)
        except Exception:
            return await ctx.error(f'Failed to fetch levelhead info')
        uuid = levelhead.get('uuid', '')
        if not uuid:
            strlevel = levelhead['strlevel']
            try:
                hcolor = levelhead['header_obj']['color']
                fcolor = levelhead['footer_obj']['color']
            except KeyError:
                hcolor = '§b'
                fcolor = '§e'
            fulllvlhead = f'{hcolor}Level: {fcolor}{levelhead["level"]}'
            parsedtxt = mcfont.parse(fulllvlhead)
            width = mcfont.get_width(parsedtxt)
            img = Image.new('RGBA', (width + 25, 42))
            mcfont.render((5, 0), parsedtxt, img)
            buf = BytesIO()
            img.save(buf, format='PNG')
            buf.seek(0)
            customlvl = discord.File(buf, 'mitchplshireme.png')
            embed = discord.Embed(title=f"{player}'s Levelhead", colour=ctx.author.color, url="https://purchase.sk1er.club/category/1050972", timestamp=datetime.datetime.now(datetime.timezone.utc))
            embed.add_field(name="IGN", value=player, inline=False)
            embed.set_image(url='attachment://mitchplshireme.png')
            return await ctx.send(embed=embed, file=customlvl)
        if len(uuid) < 28:
            return await ctx.error('Malformed UUID. Check the spelling of the player\'s name')
        route = Route(
            'GET',
            f'/levelhead_purchase_status/{uuid}'
        )
        try:
            purchase = await self.bot.http.sk1er.request(route)
        except Exception:
            return await ctx.error(f'Failed to fetch levelhead purchase status')
        async with aiohttp.ClientSession() as session:
            async with session.get(f'https://api.hyperium.cc/levelhead_propose/{uuid}') as resp:
                await session.close()
                try:
                    proposal = await resp.json()
                except Exception:
                    proposal = None
        header = re.sub(remcolor, '', levelhead.get('header', 'Level'), 0, re.IGNORECASE)
        strlevel = re.sub(remcolor, '', levelhead['strlevel'], 0, re.IGNORECASE)
        level = levelhead['level']
        nocustom = True if header == "Level" else False
        tab = 'Purchased!' if purchase.get('tab', False) else 'Not Purchased'
        chat = 'Purchased!' if purchase.get('chat', False) else 'Not Purchased'
        head = purchase['head']
        embed = discord.Embed(title=f"{player}'s Levelhead", colour=ctx.author.color, url="https://purchase.sk1er.club/category/1050972", timestamp=datetime.datetime.now(datetime.timezone.utc))
        embed.set_footer(text="Want more integrations? Use the suggest command to suggest some")
        if nocustom:
            embed.add_field(name="IGN", value=player, inline=False)
            embed.add_field(name="Levelhead", value=f"Level: {levelhead['level']}", inline=False)
            embed.add_field(name="Other items", value=f"Tab: {tab} \nChat: {chat} \nAddon Head Layers: {head}", inline=False)
        else:
            embed.add_field(name="Custom Levelhead?", value="Yeah!", inline=False)
            embed.add_field(name="IGN", value=player, inline=False)
            embed.add_field(name="Levelhead", value=f"{header}:{strlevel}", inline=False)
            if proposal:
                nheader = re.sub(remcolor, '', proposal['header'], 0, re.IGNORECASE)
                nstrlevel = re.sub(remcolor, '', proposal['strlevel'], 0, re.IGNORECASE)
                embed.add_field(name='Proposed Levelhead', value=f'{nheader}:{nstrlevel}', inline=False)
                embed.add_field(name='Denied?', value=proposal['denied'], inline=False)
            embed.add_field(name="Other items", value=f"Tab: {tab} \nChat: {chat} \nAddon Head Layers: {head}", inline=False)
        return await ctx.send(embed=embed)


def setup(bot):
    try:
        bot.add_cog(Levelhead(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"levelhead" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"levelhead"', exc_info=e)
