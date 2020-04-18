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

from core.http import HTTPClient, Route
from discord.ext import commands
import discord


class TopGG(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.http = HTTPClient(
            'https://top.gg/api',
            user_agent=f'Fire Discord Bot',
            headers={
                'Authorization': bot.config['dbl']
            }
        )

    async def post_guilds(self):
        route = Route(
            'POST',
            f'/bots/{self.bot.user.id}/stats'
        )
        await self.http.request(
            route,
            json={
                'server_count': len(self.bot.guilds)
            }
        )
        self.bot.logger.info(f'$GREENPosted guild count $CYAN({len(self.bot.guilds)}) $GREENto $CYANtop.gg')


def setup(bot):
    if not bot.dev:
        bot.add_cog(TopGG(bot))
        bot.logger.info(f'$GREENLoaded $CYANtop.gg $GREENmodule!')
