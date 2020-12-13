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
from fire.filters.youtube import findvideo
from discord.ext import commands
import googleapiclient.discovery
from fire.http import Route
import datetime
import discord


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


def setup(bot):
    bot.add_cog(YouTube(bot))
    bot.logger.info(f'$GREENLoaded YouTube cog!')
