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

from jishaku.paginators import WrappedPaginator, PaginatorInterface
from fire.converters import Member
from discord.ext import commands
from core.context import Context
import humanfriendly
import traceback
import datetime
import discord
import asyncio


class richPresence(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def getSpotify(self, member: discord.Member, activity: discord.Spotify):
        adict = activity.to_dict()
        embed = discord.Embed(color=activity.color, timestamp=datetime.datetime.utcnow())
        embed.set_author(name=f'{member}\'s Spotify Info', icon_url='https://cdn.discordapp.com/emojis/471412444716072960.png')
        embed.add_field(name='Song', value=activity.title, inline=False)
        embed.add_field(name='Artists', value=', '.join(activity.artists), inline=False)
        embed.add_field(name='Album', value=activity.album, inline=False)
        duration = humanfriendly.format_timespan(activity.duration)
        now = datetime.datetime.utcnow()
        elapsed = humanfriendly.format_timespan(now - activity.start)
        left = humanfriendly.format_timespan(activity.end - now)
        if 'day' in left:
            left = '0:00:00'
        embed.add_field(name='Times', value=f'Duration: {duration}\nElapsed: {elapsed}\nLeft: {left}', inline=False)
        embed.add_field(name='Listen to this track', value=f'[{activity.title}](https://open.spotify.com/track/{activity.track_id})', inline=False)
        embed.set_thumbnail(url=activity.album_cover_url)
        return embed

    def getTwitch(self, member: discord.Member, activity: discord.Streaming):
        embed = discord.Embed(color=discord.Color.purple(), timestamp=datetime.datetime.utcnow())
        embed.set_author(name=f'{member}\'s Twitch Info', icon_url='https://cdn.discordapp.com/emojis/603188557242433539.png')
        if member.bot:
            embed.add_field(name='Title', value=activity.name, inline=False)
        else:
            embed.add_field(name='Title', value=activity.name, inline=False)
            embed.add_field(name='Twitch Name', value=activity.twitch_name, inline=False)
            if activity.details is not None:
                embed.add_field(name='Game', value=activity.game or 'Unknown', inline=False)
            embed.add_field(name='URL', value=f'[{activity.twitch_name}]({activity.url})', inline=False)
        return embed

    def getYoutube(self, member: discord.Member, activity: discord.Streaming):
        embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow())
        embed.set_author(name=f'{member}\'s YouTube Info', icon_url='https://cdn.discordapp.com/emojis/471627092463976448.png')
        if member.bot:
            embed.add_field(name='Title', value=activity.name, inline=False)
        else:
            embed.add_field(name='Title', value=activity.name, inline=False)
            embed.add_field(name='URL', value=f'{activity.url}', inline=False)
            if activity.assets.get('large_image', ''):
                ytid = activity.assets.get('large_image').split('youtube:')[-1]
                embed.set_thumbnail(url=f'https://img.youtube.com/vi/{ytid}/hqdefault.jpg')
        return embed

    def getGenericStream(self, member: discord.Member, activity: discord.Streaming):
        embed = discord.Embed(color=discord.Color.green(), timestamp=datetime.datetime.utcnow())
        embed.set_author(name=f'{member}\'s Stream Info')
        embed.add_field(name='Title', value=activity.name, inline=False)
        embed.add_field(name='URL', value=f'{activity.url}', inline=False)
        return embed

    def getCustomStatus(self, member: discord.Member, activity: discord.CustomActivity):
        embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow())
        emoji: discord.PartialEmoji = activity.emoji
        if emoji and (discord.utils.get(self.bot.emojis, id=emoji.id) or emoji.is_unicode_emoji()):
            embed.add_field(name='Status', value=f'{emoji} {activity.name}')
            embed.set_author(name=f'{member}\'s Custom Status', icon_url=str(member.avatar_url_as(static_format='png')))
        else:
            embed.add_field(name='Status', value=f'{activity.name}')
            if emoji and emoji.is_custom_emoji():
                embed.set_author(name=f'{member}\'s Custom Status', icon_url=str(emoji.url))
        return embed

    def getGenericActivity(self, member: discord.Member, activity: discord.Activity):
        embed = discord.Embed(color=member.color, timestamp=datetime.datetime.utcnow())
        if activity.small_image_url is not None:
            embed.set_author(name=f'{member}\'s Game Info', icon_url=activity.small_image_url)
        else:
            embed.set_author(name=f'{member}\'s Game Info')
        embed.add_field(name='Game', value=activity.name, inline=False)
        now = datetime.datetime.utcnow()
        elapsed = None
        if activity.start:
            elapsed = humanfriendly.format_timespan(now - activity.start)
        if activity.details is not None and activity.state is not None and elapsed is not None:
            embed.add_field(name='Details', value=f'{activity.details}\n{activity.state}\n{elapsed} elapsed', inline=False)
        elif activity.state is not None and elapsed is not None:
            embed.add_field(name='Details', value=f'{activity.state}\n{elapsed} elapsed', inline=False)
        elif activity.details is not None and elapsed is not None:
            embed.add_field(name='Details', value=f'{activity.details}\n{elapsed} elapsed', inline=False)
        elif activity.details is not None and activity.state is not None and elapsed is None:
            embed.add_field(name='Details', value=f'{activity.details}\n{activity.state}', inline=False)
        elif activity.state is not None and elapsed is None:
            embed.add_field(name='Details', value=f'{activity.state}', inline=False)
        elif activity.details is not None and elapsed is None:
            embed.add_field(name='Details', value=f'{activity.details}', inline=False)
        if activity.large_image_url is not None:
            embed.set_thumbnail(url=activity.large_image_url)
        return embed

    @commands.command(name='rpc', description='View someone\'s rich presence')
    async def rpc(self, ctx, *, member: Member = None, MSG: discord.Message = None, ACT: int = 0):
        if not member:
            member = ctx.author
        if ACT == -1:
            try:
                await self.rpcReactController(ctx, member, MSG, 0)
            except discord.NotFound:
                return
        try:
            activity = member.activities[ACT]
        except IndexError:
            if ACT != 0:
                try:
                    await self.rpcReactController(ctx, member, MSG, ACT - 1)
                except discord.NotFound:
                    return
            activity = None
        embed = None
        if activity is not None:
            if isinstance(activity, discord.Spotify):
                embed = self.getSpotify(member, activity)
            elif isinstance(activity, discord.Streaming):
                if activity.platform.lower() == 'twitch':
                    embed = self.getTwitch(member, activity)
                elif activity.platform.lower() == 'youtube':
                    embed = self.getYoutube(member, activity)
                else:
                    embed = self.getGenericStream(member, activity)
            elif isinstance(activity, discord.CustomActivity):
                embed = self.getCustomStatus(member, activity)
            elif type(activity) == discord.Activity:
                embed = self.getGenericActivity(member, activity)
            if embed:
                if MSG:
                    await MSG.edit(embed=embed)
                    try:
                        await self.rpcReactController(ctx, member, MSG, ACT)
                    except discord.NotFound:
                        return
                else:
                    MSG = await ctx.send(embed=embed)
                    try:
                        await MSG.add_reaction('⏹')
                        await MSG.add_reaction('◀')
                        await MSG.add_reaction('▶')
                    except discord.HTTPException:
                        return
                    try:
                        await self.rpcReactController(ctx, member, MSG, ACT)
                    except discord.NotFound:
                        return
            else:
                if ACT == 0:
                    await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))} doesn\'t seem to be playing something with rich presence integration...')
        else:
            if ACT == 0:
                await ctx.error(f'{discord.utils.escape_mentions(discord.utils.escape_markdown(str(member)))} doesn\'t seem to be playing something with rich presence integration...')

    async def rpcReactController(self, ctx: Context, member: discord.Member, MSG: discord.Message, ACT: int):
        def react_check(reaction, user):
            return user.id == ctx.author.id
        try:
            reaction, user = await self.bot.wait_for('reaction_add', check=react_check, timeout=120)
        except asyncio.TimeoutError:
            return await MSG.clear_reactions()
        if reaction.emoji == '⏹':
            return await MSG.delete()
        elif reaction.emoji == '◀':
            try:
                await MSG.remove_reaction('◀', ctx.author)
            except discord.Forbidden:
                pass
            await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT - 1)
        elif reaction.emoji == '▶':
            try:
                await MSG.remove_reaction('▶', ctx.author)
            except discord.Forbidden:
                pass
            await ctx.invoke(self.bot.get_command('rpc'), member=member, MSG=MSG, ACT=ACT + 1)


def setup(bot):
    try:
        bot.add_cog(richPresence(bot))
        bot.logger.info(f'$GREENLoaded "richPresence" command!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $BLUE"richPresence"', exc_info=e)
