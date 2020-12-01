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


class UserUpdate(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_user_update(self, before, after):
        for guild in self.bot.guilds:
            if before.name != after.name and not guild.get_member(764995504526327848):
                try:
                    member = guild.get_member(after.id)
                    if not member:
                        continue
                    try:
                        if member.guild.me.guild_permissions.manage_nicknames and not member.guild.get_member(764995504526327848):
                            await self.bot.dehoist(member)
                            await self.bot.decancer(member)
                    except Exception:
                        pass


def setup(bot):
    try:
        bot.add_cog(UserUpdate(bot))
        bot.logger.info(f'$GREENLoaded event $CYANUserUpdate!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"UserUpdate"', exc_info=e)
