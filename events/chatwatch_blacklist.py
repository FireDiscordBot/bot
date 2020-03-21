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


class ChatwatchBlacklist(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_chatwatch_blacklist(self, data: dict):
        user = self.bot.get_user(int(data['user']['user']))
        self.bot.logger.warn(f'$BLUE{user} $YELLOWwas blacklisted on Chatwatch for $BLUE{data["user"]["blacklisted_reason"]}')
        for guild in [g for g in self.bot.guilds if g.get_member(int(data['user']['user'])) or g.id == 564052798044504084]:
            logch = self.bot.configs[guild.id].get('log.moderation')
            if logch:
                member = guild.get_member(int(data['user']['user']))
                if not member:
                    member = user
                embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.utcnow(), description=f'**{member.mention} was blacklisted on Chatwatch**')
                embed.set_author(name=member, icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
                embed.add_field(name='Reason', value=data['user']['blacklisted_reason'], inline=False)
                embed.add_field(name='Message Classifications', value=', '.join(data['classifications']), inline=False)
                embed.set_footer(text=f"Member ID: {member.id}")
                try:
                    await logch.send(embed=embed)
                except Exception:
                    pass


def setup(bot):
    try:
        bot.add_cog(ChatwatchBlacklist(bot))
        bot.logger.info(f'$GREENLoaded event $BLUEChatwatchBlacklist!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding event $BLUE"ChatwatchBlacklist"', exc_info=e)
