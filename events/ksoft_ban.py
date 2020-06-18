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


class KsoftBan(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.recentgban = []

    @commands.Cog.listener()
    async def on_ksoft_ban(self, event: dict):
        try:
            user = await self.bot.fetch_user(int(event['id']))
        except Exception:
            return
        self.bot.logger.warn(f'$CYAN{user} ({user.id}) $YELLOWwas banned on KSoft for $CYAN{event["reason"]} $YELLOWby $CYAN{event["moderator_id"]}$YELLOW. Proof: $CYAN{event["proof"]}')
        for guild in self.bot.guilds:
            if (await self.bot.get_config(guild).get('mod.globalbans')):
                logch = await self.bot.get_config(guild).get('log.moderation')
                member = guild.get_member(user.id)
                if member:
                    try:
                        await guild.ban(member, reason=f'{member} was found on global ban list')
                        self.recentgban.append(f'{member.id}-{guild.id}')
                        if logch:
                            embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'**{member.mention} was banned**')
                            embed.set_author(name=str(member), icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
                            embed.add_field(name='Reason', value=f'{member} was found on global ban list\n\nBanned for: {event["reason"]}', inline=False)
                            embed.set_footer(text=f"Member ID: {member.id}")
                            try:
                                await logch.send(embed=embed)
                            except Exception:
                                pass
                    except discord.HTTPException:
                        pass


def setup(bot):
    try:
        bot.add_cog(KsoftBan(bot))
        bot.logger.info(f'$GREENLoaded event $CYANKsoftBan!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding event $CYAN"KsoftBan"', exc_info=e)
