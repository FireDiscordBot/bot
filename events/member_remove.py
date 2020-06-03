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
import datetime
import discord
import traceback


class MemberRemove(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_remove(self, member):
        if not [g for g in self.bot.guilds if g.get_member(member.id)]:
            self.bot.configs.pop(member.id, None)
        conf = self.bot.get_config(member.guild)
        if conf.get('greet.leavemsg'):
            leavechan = conf.get('greet.leavechannel')
            leavemsg = conf.get('greet.leavemsg')
            if leavechan and leavemsg:
                vars = {
                    '{user.mention}': member.mention,
                    '{user}': str(member),
                    '{user.name}': member.name,
                    '{user.discrim}': member.discriminator,
                    '{server}': str(member.guild),
                    '{guild}': str(member.guild),
                    '{count}': str(member.guild.member_count),
                    '@everyone': u'@\u200beveryone',  # Nobody needs @everyone in a join/leave message
                    '@here': u'@\u200bhere'
                }
                message = leavemsg
                for var, value in vars.items():
                    message = message.replace(var, value)
                await leavechan.send(message)
        logch = conf.get('log.moderation')
        if logch:
            moderator = None
            action = None
            if member.guild.me.guild_permissions.view_audit_log:
                async for e in member.guild.audit_logs(limit=5):
                    if e.action in [discord.AuditLogAction.kick, discord.AuditLogAction.ban] and e.target.id == member.id:
                        moderator = e.user
                        if moderator == member.guild.me:
                            moderator = None
                            break
                        if e.action == discord.AuditLogAction.kick:
                            action = 'Kicked'
                            reason = e.reason
                        if e.action == discord.AuditLogAction.ban:
                            action = 'Banned'
                            reason = e.reason
                        break
            embed = discord.Embed(title='Member Left', url='https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif', color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
            embed.set_author(name=f'{member}', icon_url=str(member.avatar_url_as(static_format='png', size=2048)))
            if member.nick:
                embed.add_field(name='Nickname', value=member.nick, inline=False)
            roles = [role.mention for role in member.roles if role != member.guild.default_role]
            if roles:
                embed.add_field(name='Roles', value=', '.join(roles), inline=False)
            if moderator and action:
                embed.add_field(name=f'{action} By', value=f'{moderator} ({moderator.id})', inline=False)
            if action and reason:
                embed.add_field(name=f'{action} for', value=reason, inline=False)
            embed.set_footer(text=f'User ID: {member.id}')
            try:
                await logch.send(embed=embed)
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(MemberRemove(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMemberRemove!')
    except Exception as e:
        bot.logger.error(f'$REDError while loading event $CYAN"MemberRemove"', exc_info=e)
