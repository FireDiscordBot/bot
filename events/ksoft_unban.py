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
import discord
import traceback
import datetime


class KsoftUnban(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_ksoft_unban(self, event: dict):
        try:
            user = await self.bot.fetch_user(int(event['id']))
        except Exception:
            return
        self.bot.logger.warn(f'$CYAN{user} ({user.id}) $YELLOWwas unbanned on KSoft with the reason $CYAN{event["appeal_reason"]}')
        for guild in self.bot.guilds:
            if self.bot.get_config(guild).get('mod.globalbans'):
                logch = await self.bot.get_config(guild).get('log.moderation')
                try:
                    ban = await guild.fetch_ban(user)
                except discord.NotFound:
                    continue
                if ban:
                    try:
                        await guild.unban(user, reason=f'{user} was unbanned from global ban list')
                        if logch:
                            embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{user.mention} was unbanned**')
                            embed.set_author(name=str(user), icon_url=str(user.avatar_url_as(static_format='png', size=2048)))
                            embed.add_field(name='Reason', value=f'{user} was unbanned from KSoft.Si Bans\n\nAppeal reason: {event["appeal_reason"]}', inline=False)
                            embed.set_footer(text=f"User ID: {user.id}")
                            try:
                                await logch.send(embed=embed)
                            except Exception:
                                pass
                    except discord.HTTPException:
                        pass


def setup(bot):
    try:
        bot.add_cog(KsoftUnban(bot))
        bot.logger.info(f'$GREENLoaded event $CYANKsoftUnban!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding event $CYAN"KsoftUnban"', exc_info=e)
