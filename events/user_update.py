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
from core.config import Config
import datetime
import discord
import functools
import traceback


class UserUpdate(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_user_update(self, before, after):
        for guild in self.bot.guilds:
            conf = self.bot.configs[guild.id]
            badname = conf.get('utils.badname') or f'John Doe {member.discriminator}'
            if before.name != after.name:
                try:
                    member = guild.get_member(after.id)
                    if not member:
                        return
                    if conf.get('mod.autodecancer') and guild.me.guild_permissions.manage_nicknames:
                        nitroboosters = discord.utils.get(member.guild.roles, id=585534346551754755)
                        if member.guild_permissions.manage_nicknames:
                            pass
                        if nitroboosters and nitroboosters in member.roles:
                            pass
                        else:
                            nick = after.name
                            if not self.bot.isascii(nick.replace('‘', '\'').replace('“', '"').replace('“', '"')):
                                return await member.edit(nick=badname, reason=f'Name changed due to auto-decancer. The name contains non-ascii characters')
                            else:
                                if member.nick and badname in member.nick:
                                    if not self.bot.ishoisted(nick):
                                        return await member.edit(nick=None, reason=f'Name is no longer hoisted or "cancerous" (non-ascii characters)')
                    if conf.get('mod.autodehoist') and guild.me.guild_permissions.manage_nicknames:
                        nitroboosters = discord.utils.get(member.guild.roles, id=585534346551754755)
                        if member.guild_permissions.manage_nicknames:
                            pass
                        if nitroboosters and nitroboosters in member.roles:
                            pass
                        else:
                            nick = after.name
                            if self.bot.ishoisted(nick):
                                return await member.edit(nick=badname, reason=f'Name changed due to auto-dehoist. The name starts with a hoisted character')
                            else:
                                if member.nick and badname in member.nick:
                                    # Technically this should never run because it should already be reset if not hoisted or cancerous
                                    return await member.edit(nick=None, reason=f'Name is no longer hoisted or "cancerous" (non-ascii characters)')
                except Exception:
                    pass


def setup(bot):
    try:
        bot.add_cog(UserUpdate(bot))
        bot.logger.info(f'$GREENLoaded event $CYANReady!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading event $CYAN"Ready"', exc_info=e)
