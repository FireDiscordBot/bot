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

from fire.http import HTTPClient, Route
from discord.ext import commands
import discord
import json


class DiscordBoats(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.http = HTTPClient(
            'https://discord.boats/api/v2',
            user_agent=f'Fire Discord Bot',
            headers={
                'Authorization': bot.config['dboats'],
                'content-type': 'application/json'
            }
        )

    async def post_guilds(self):
        route = Route(
            'POST',
            f'/bot/{self.bot.user.id}'
        )
        await self.http.request(
            route,
            json={
                'server_count': len(self.bot.guilds)
            }
        )
        self.bot.logger.info(f'$GREENPosted guild count $CYAN({len(self.bot.guilds)}) $GREENto $CYANtop.gg')

    async def get_bot(self, bot: int):
        route = Route(
            'GET',
            f'/bot/{bot}'
        )
        bot = await self.http.request(
            route
        )
        return bot

    async def check_vote(self, user: int):
        route = Route(
            'GET',
            f'/bot/{self.bot.user.id}/voted'
        )
        vote = await self.http.request(
            route,
            params={'id':user}
        )
        return vote


def setup(bot):
    if not bot.dev:
        bot.add_cog(DiscordBoats(bot))
        bot.logger.info(f'$GREENLoaded $CYANdiscord.boats $GREENmodule!')
