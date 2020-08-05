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

import discord
from discord.ext import commands
from fire.filters.youtube import findvideo
from fire.http import Route
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from jishaku.cog import Jishaku
import googleapiclient.discovery
import functools
import datetime
import json


class YouTube(commands.Cog, name="YouTube API"):
    def __init__(self, bot):
        self.bot = bot
        self.youtube = googleapiclient.discovery.build(
            'youtube', 'v3', developerKey=bot.config['youtube']
        )
        self.loop = bot.loop

    def popular(self):
        request = self.youtube.videos().list(
            part="snippet,contentDetails,statistics",
            chart="mostPopular",
            maxResults=5,
            regionCode="US"
        )
        response = request.execute()
        videos = []
        for video in response.get("items", []):
            videos.append(video)
        return videos

    async def apopular(self):
        params = {
            'part': 'snippet,contentDetails,statistics',
            'chart': 'mostPopular',
            'maxResults': '5',
            'regionCode': 'US'
        }
        route = Route(
            'GET',
            '/videos',
        )
        response = await self.bot.http.youtube.request(route, params=params)
        videos = [v for v in response.get('items', [])]
        return videos

    def video_info(self, vid):
        request = self.youtube.videos().list(
            part="snippet,contentDetails,statistics",
            id=vid
        )
        response = request.execute()
        return response

    async def avideo_info(self, vid: str):
        params = {
            'part': 'snippet,contentDetails,statistics',
            'id': vid
        }
        route = Route(
            'GET',
            '/videos',
        )
        response = await self.bot.http.youtube.request(route, params=params)
        return [v for v in response.get('items', [])]

    def channel_info(self, channel):
        if channel.startswith('UC'):
            request = self.youtube.channels().list(
                part="snippet,contentDetails,statistics",
                id=channel
            )
        else:
            request = self.youtube.channels().list(
                part="snippet,statistics",
                forUsername=channel
            )
        response = request.execute()
        return response

    async def achannel_info(self, channel: str):
        params = {
            'part': 'snippet,contentDetails,statistics'
        }
        if channel.startswith('UC'):
            params.update({'id': channel})
        else:
            params.update({'forUsername': channel})
        route = Route(
            'GET',
            '/channels',
        )
        response = await self.bot.http.youtube.request(route, params=params)
        return response

    @commands.group(name="yt", aliases=['youtube'], description='YouTube commands.')
    async def yt(self, ctx):
        if ctx.invoked_subcommand:
            return
        try:
            videos = await self.apopular()
        except Exception:
            return await ctx.error('Failed to get trending videos.')
        embed = discord.Embed(title="Trending on YouTube (US)", color=ctx.author.color,
                              timestamp=datetime.datetime.now(datetime.timezone.utc))
        for video in videos:
            title = video['snippet']['title']
            vid = video['id']
            author = video['snippet']['channelTitle']
            authorid = video['snippet']['channelId']
            published = video['snippet']['publishedAt'].replace('T', ' ').split('.')[
                0]
            duration = video['contentDetails']['duration'].replace('PT', '').replace(
                'H', ' Hrs ').replace('M', ' Mins ').replace('S', 'Secs')
            views = format(int(video['statistics'].get('viewCount', 0)), ',d')
            likes = format(int(video['statistics'].get('likeCount', 0)), ',d')
            dislikes = format(
                int(video['statistics'].get('dislikeCount', 0)), ',d')
            comments = format(
                int(video['statistics'].get('commentCount', 0)), ',d')
            embed.add_field(name=video["snippet"]["title"],
                            value=f"» Link: [{title}](https://youtu.be/{vid} 'Click here to watch the video')\n» Author: [{author}](https://youtube.com/channel/{authorid} 'Click here to checkout {author} channel')\n» Published: {published}\n» Views: {views}\n» Likes: {likes}\n» Dislikes: {dislikes}\n» Comments: {comments}", inline=False)
        await ctx.send(embed=embed)

    @yt.command(name="info", description="Retrieve info from a video URL or ID")
    async def info(self, ctx, video: str):
        video = findvideo(video) or video
        try:
            videoinfo = await self.avideo_info(video)
            videoinfo = videoinfo[0]
        except Exception:
            return await ctx.error(f'Failed to fetch video. Ensure the id/url is correct.')
        title = videoinfo['snippet']['title']
        vid = videoinfo['id']
        author = videoinfo['snippet']['channelTitle']
        authorid = videoinfo['snippet']['channelId']
        published = videoinfo['snippet']['publishedAt'].replace('T', ' ').split('.')[
            0]
        duration = videoinfo['contentDetails']['duration'].replace('PT', '').replace(
            'H', ' Hrs ').replace('M', ' Mins ').replace('S', 'Secs')
        description = videoinfo['snippet']['description']
        paginator = WrappedPaginator(
            prefix='```\nDescription (Use controls to change page)\n', suffix='```', max_size=1895)
        for line in description.split('\n'):
            paginator.add_line(line)
        views = format(
            int(videoinfo.get('statistics', {}).get('viewCount', 0)), ',d')
        likes = format(
            int(videoinfo.get('statistics', {}).get('likeCount', 0)), ',d')
        dislikes = format(
            int(videoinfo.get('statistics', {}).get('dislikeCount', 0)), ',d')
        comments = format(
            int(videoinfo.get('statistics', {}).get('commentCount', 0)), ',d')
        embed = discord.Embed(
            title=f"Video info for {video}", color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc))
        embed.add_field(name=videoinfo["snippet"]["title"],
                        value=f"» Link: [{title}](https://youtu.be/{vid} 'Click here to watch the video')\n» Author: [{author}](https://youtube.com/channel/{authorid} 'Click here to checkout {author} channel')\n» Published: {published}\n» Views: {views}\n» Likes: {likes}\n» Dislikes: {dislikes}\n» Comments: {comments}", inline=False)
        interface = PaginatorEmbedInterface(
            ctx.bot, paginator, owner=ctx.author, _embed=embed)
        return await interface.send_to(ctx)


def setup(bot):
    bot.add_cog(YouTube(bot))
    bot.logger.info(f'$GREENLoaded YouTube cog!')
