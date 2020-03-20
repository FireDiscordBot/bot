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


class GuildChannelDelete(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_channel_delete(self, channel):
        logch = self.bot.configs[channel.guild.id].get('log.action')
        if logch:
            deletedby = None
            if channel.guild.me.guild_permissions.view_audit_log:
                async for e in channel.guild.audit_logs(action=discord.AuditLogAction.channel_delete, limit=5):
                    if e.target.id == channel.id:
                        deletedby = e.user
                        break
            embed = discord.Embed(color=discord.Color.red(), timestamp=channel.created_at, description=f'**Channel deleted: #{channel.name}**')
            if deletedby:
                embed.add_field(name='Deleted By', value=f'{deletedby} ({deletedby.id})', inline=False)
            embed.set_author(name=channel.guild.name, icon_url=str(channel.guild.icon_url))
            embed.set_footer(text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
            try:
                await logch.send(embed=embed)
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(GuildChannelDelete(bot))
        bot.logger.info(f'$GREENLoaded event $BLUEGuildChannelDelete!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding event $BLUE"GuildChannelDelete"', exc_info=e)
