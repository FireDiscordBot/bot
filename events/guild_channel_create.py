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
import asyncio
import discord


class GuildChannelCreate(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_guild_channel_create(self, channel):
        muted = self.bot.get_config(channel.guild).get(
            'mod.mutedrole') or discord.utils.get(channel.guild.roles, name="Muted")
        mute_perm_fail = False
        if muted and channel.guild.me.guild_permissions.manage_roles:
            try:
                await channel.set_permissions(muted, read_messages=False)
            except discord.HTTPException:
                mute_perm_fail = True
        logch = self.bot.get_config(channel.guild).get('log.action')
        if logch:
            createdby = None
            if channel.guild.me.guild_permissions.view_audit_log:
                async for e in channel.guild.audit_logs(action=discord.AuditLogAction.channel_create, limit=5):
                    if e.target.id == channel.id:
                        createdby = e.user
                        break
            embed = discord.Embed(color=discord.Color.green(
            ), timestamp=channel.created_at, description=f'**New channel created: #{channel.name}**')
            if createdby:
                embed.add_field(
                    name='Created By', value=f'{createdby} ({createdby.id})', inline=False)
            if mute_perm_fail:
                embed.add_field(
                    name='Warning', value='''I was unable to set permissions for the muted role in this channel, users may be able to bypass mutes here.
Make sure I have permission to manage roles''', inline=False)
            embed.set_author(name=channel.guild.name,
                             icon_url=str(channel.guild.icon_url))
            embed.set_footer(
                text=f"Channel ID: {channel.id} | Guild ID: {channel.guild.id}")
            try:
                await logch.send(embed=embed)
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(GuildChannelCreate(bot))
        bot.logger.info(f'$GREENLoaded event $CYANGuildChannelCreate!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding event $CYAN"GuildChannelCreate"', exc_info=e)
