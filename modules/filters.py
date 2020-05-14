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


from fire.filters.youtube import findchannel, findvideo
from fire.filters.twitter import findtwitter
from fire.filters.invite import findinvite
from fire.filters.paypal import findpaypal
from fire.filters.twitch import findtwitch
from discord.ext import commands
import functools
import datetime
import aiohttp
import discord


class Filters(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.imgext = ['.png', '.jpg', '.gif']
        self.malware = []
        self.allowed_invites = [inv for inv in open('allowed_invites.txt').read().split('\n') if inv] # Remove empty strings
        self.bot.loop.create_task(self.get_malware())

    async def get_malware(self):
        try:
            async with aiohttp.ClientSession() as s:
                malware = await (await s.get('https://mirror.cedia.org.ec/malwaredomains/justdomains')).text()
                await s.close()
            self.malware = list(filter(None, malware.split('\n')))
        except Exception as e:
            self.bot.logger.error(f'$REDFailed to fetch malware domains', exc_info=e)

    async def handle_invite(self, message):
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        codes = findinvite(tosearch)
        invite = None
        for fullurl, code in codes:
            if fullurl in self.allowed_invites:
                continue
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'discord' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        invite = await self.bot.fetch_invite(url=code)
                        if invite.guild.id != message.guild.id:
                            await message.delete()
                    except discord.NotFound:
                        vanitydomains = ['oh-my-god.wtf', 'inv.wtf', 'floating-through.space', 'i-live-in.space', 'i-need-personal.space', 'get-out-of-my-parking.space']
                        if any(d in fullurl for d in vanitydomains):
                            invite = await self.bot.get_vanity(code)
                            if not invite or invite['gid'] != message.guild.id:
                                try:
                                    await message.delete()
                                except Exception:
                                    pass
                        else:
                            if not (any(f'i.inv.wtf/{code}{e}' in message.system_content for e in self.imgext) and self.bot.isadmin(message.author)):
                                try:
                                    await message.delete()
                                except Exception:
                                    pass
                            else:
                                continue
                    except discord.Forbidden:
                        pass
                    logch = self.bot.get_config(message.guild).get('log.action')
                    if logch:
                        embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Invite link sent in** {message.channel.mention}')
                        embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                        embed.add_field(name='Invite Code', value=code, inline=False)
                        if isinstance(invite, dict):
                            invite = await self.bot.fetch_invite(url=invite['invite'])
                        if isinstance(invite, discord.Invite):
                            embed.add_field(name='Guild', value=f'{invite.guild.name}({invite.guild.id})', inline=False)
                            embed.add_field(name='Channel', value=f'#{invite.channel.name}({invite.channel.id})', inline=False)
                            embed.add_field(name='Members', value=f'{invite.approximate_member_count} ({invite.approximate_presence_count} active)', inline=False)
                        embed.set_footer(text=f"Author ID: {message.author.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass

    async def anti_malware(self, message):  # Get it? It gets rid of malware links so it's, anti malware. I'm hilarious!
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        if any(l in tosearch for l in self.malware):
            if 'malware' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                try:
                    await message.delete()
                except Exception:
                    try:
                        await message.channel.send(f'A blacklisted link was found in a message send by {message.author} and I was unable to delete it!')
                    except Exception:
                        pass
                logch = self.bot.get_config(message.guild).get('log.action')
                if logch:
                    embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Known malware link sent in** {message.channel.mention}')
                    embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                    embed.set_footer(text=f"Author ID: {message.author.id}")
                    try:
                        await logch.send(embed=embed)
                    except Exception:
                        pass

    async def handle_paypal(self, message):
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        paypal = findpaypal(tosearch)
        if paypal:
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'paypal' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        await message.delete()
                    except Exception:
                        pass
                    logch = self.bot.get_config(message.guild).get('log.action')
                    if logch:
                        embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**PayPal link sent in** {message.channel.mention}')
                        embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                        embed.add_field(name='Link', value=f'[{paypal}](https://paypal.me/{paypal})', inline=False)
                        embed.set_footer(text=f"Author ID: {message.author.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass

    async def handle_youtube(self, message):
        ytcog = self.bot.get_cog('YouTube API')
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        video = findvideo(tosearch)
        channel = findchannel(tosearch)
        invalidvid = False
        invalidchannel = False
        if video:
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'youtube' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        await message.delete()
                    except Exception:
                        pass
                    videoinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.video_info, video))
                    videoinfo = videoinfo.get('items', [])
                    if len(videoinfo) >= 1:
                        videoinfo = videoinfo[0]
                        logch = self.bot.get_config(message.guild).get('log.action')
                        if logch:
                            embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube video sent in** {message.channel.mention}')
                            embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                            embed.add_field(name='Video ID', value=video, inline=False)
                            if not invalidvid:
                                embed.add_field(name='Title', value=f'[{videoinfo.get("snippet", {}).get("title", "Unknown")}](https://youtu.be/{video})', inline=False)
                                embed.add_field(name='Channel', value=f'[{videoinfo.get("snippet", {}).get("channelTitle", "Unknown")}](https://youtube.com/channel/{videoinfo.get("snippet", {}).get("channelId", "Unknown")})', inline=False)
                                views = format(int(videoinfo['statistics'].get('viewCount', 0)), ',d')
                                likes = format(int(videoinfo['statistics'].get('likeCount', 0)), ',d')
                                dislikes = format(int(videoinfo['statistics'].get('dislikeCount', 0)), ',d')
                                comments = format(int(videoinfo['statistics'].get('commentCount', 0)), ',d')
                                embed.add_field(name='Stats', value=f'{views} views, {likes} likes, {dislikes} dislikes, {comments} comments', inline=False)
                            embed.set_footer(text=f"Author ID: {message.author.id}")
                            try:
                                await logch.send(embed=embed)
                            except Exception:
                                pass
        if channel:
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'youtube' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        await message.delete()
                    except Exception:
                        pass
                    channelinfo = await self.bot.loop.run_in_executor(None, func=functools.partial(ytcog.channel_info, channel))
                    channelinfo = channelinfo.get('items', [])
                    if len(channelinfo) >= 1:
                        channelinfo = channelinfo[0]
                        logch = self.bot.get_config(message.guild).get('log.action')
                        if logch:
                            embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**YouTube channel sent in** {message.channel.mention}')
                            embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                            if not invalidchannel:
                                embed.add_field(name='Name', value=f'{channelinfo.get("snippet", {}).get("title", "Unknown")}', inline=False)
                                embed.add_field(name='Channel', value=f'https://youtube.com/channel/{channel}')
                                embed.add_field(name='Custom URL', value=f'https://youtube.com/{channelinfo.get("snippet", {}).get("customUrl", "N/A")}', inline=False)
                                subs = format(int(channelinfo['statistics'].get('subscriberCount', 0)), ',d') if not channelinfo['statistics'].get('hiddenSubscriberCount', False) else 'Hidden'
                                views = format(int(channelinfo['statistics'].get('viewCount', 0)), ',d')
                                videos = format(int(channelinfo['statistics'].get('videoCount', 0)), ',d')
                                embed.add_field(name='Stats', value=f'{subs} subscribers, {views} total views, {videos} videos', inline=False)
                            embed.set_footer(text=f"Author ID: {message.author.id}")
                            try:
                                await logch.send(embed=embed)
                            except Exception:
                                pass

    async def handle_twitch(self, message):
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        twitch = findtwitch(tosearch)
        if twitch:
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'twitch' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        await message.delete()
                    except Exception:
                        pass
                    logch = self.bot.get_config(message.guild).get('log.action')
                    if logch:
                        embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitch link sent in** {message.channel.mention}')
                        embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                        embed.add_field(name='Link', value=f'[{twitch}](https://twitch.tv/{twitch})', inline=False)
                        embed.set_footer(text=f"Author ID: {message.author.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass

    async def handle_twitter(self, message):
        tosearch = str(message.system_content) + str([e.to_dict() for e in message.embeds])
        twitter = findtwitter(tosearch)
        if twitter:
            if not message.author.permissions_in(message.channel).manage_messages:
                if 'twitter' in self.bot.get_config(message.guild).get('mod.linkfilter'):
                    try:
                        await message.delete()
                    except Exception:
                        pass
                    logch = self.bot.get_config(message.guild).get('log.action')
                    if logch:
                        embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'**Twitter link sent in** {message.channel.mention}')
                        embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                        embed.add_field(name='Link', value=f'[{twitter}](https://twitter.com/{twitter})', inline=False)
                        embed.set_footer(text=f"Author ID: {message.author.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass


def setup(bot):
    bot.add_cog(Filters(bot))
    bot.logger.info(f'$GREENLoaded $CYANFilters $GREENmodule!')
