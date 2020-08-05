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
from core.config import GuildConfig


class SocketResponse(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_socket_response(self, payload):
        t = payload['t']
        if t == 'GUILD_CREATE':
            guild = int(payload['d']['id'])
            if guild not in self.bot.configs:
                self.bot.configs[guild] = GuildConfig(
                    guild, bot=self.bot, db=self.bot.db)
            if not self.bot.get_config(guild).loaded:
                await self.bot.get_config(guild).load()


def setup(bot):
    try:
        bot.add_cog(SocketResponse(bot))
        bot.logger.info(f'$GREENLoaded event $CYANSocketResponse!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"SocketResponse"', exc_info=e)
