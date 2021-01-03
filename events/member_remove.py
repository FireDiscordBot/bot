"""
MIT License
Copyright (c) 2021 GamingGeek

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
import humanfriendly
import datetime
import discord


class MemberRemove(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    # This doesn't get dispatched if the user isn't cached so I'm going to trigger it manually
    # with different args to compensate for the lack of a member instance

    # @commands.Cog.listener()
    async def on_member_remove(self, user: discord.User, guild: discord.Guild):
        conf = self.bot.get_config(guild)
        if conf.get('greet.leavemsg'):
            leavechan = conf.get('greet.leavechannel')
            leavemsg = conf.get('greet.leavemsg')
            if leavechan and leavemsg:
                vars = {
                    '{user.mention}': user.mention,
                    '{user}': discord.utils.escape_markdown(str(user)),
                    '{user.name}': discord.utils.escape_markdown(user.name),
                    '{user.discrim}': user.discriminator,
                    '{server}': discord.utils.escape_markdown(str(guild)),
                    '{guild}': discord.utils.escape_markdown(str(guild)),
                    '{count}': str(guild.member_count)
                }
                message = leavemsg
                for var, value in vars.items():
                    message = message.replace(var, value)
                await leavechan.send(message, allowed_mentions=discord.AllowedMentions(users=True))
        logch = conf.get('log.moderation')
        if logch:
            moderator = None
            action = None
            reason = None
            if guild.me.guild_permissions.view_audit_log:
                async for e in guild.audit_logs(limit=5):
                    if e.action in [discord.AuditLogAction.kick, discord.AuditLogAction.ban] and e.target.id == user.id:
                        moderator = e.user
                        if moderator == guild.me:
                            moderator = None
                            break
                        if e.action == discord.AuditLogAction.kick:
                            action = 'Kicked'
                            reason = e.reason
                        if e.action == discord.AuditLogAction.ban:
                            action = 'Banned'
                            reason = e.reason
                        break
            embed = discord.Embed(title='Member Left', url='https://i.giphy.com/media/5C0a8IItAWRebylDRX/source.gif',
                                  color=discord.Color.red(), timestamp=datetime.datetime.now(datetime.timezone.utc))
            embed.set_author(name=f'{user}', icon_url=str(
                user.avatar_url_as(static_format='png', size=2048)))
            if moderator and action:
                embed.add_field(
                    name=f'{action} By', value=f'{moderator} ({moderator.id})', inline=False)
            if action and reason:
                embed.add_field(name=f'{action} for',
                                value=reason, inline=False)
            embed.set_footer(text=f'User ID: {user.id}')
            try:
                await logch.send(embed=embed)
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(MemberRemove(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMemberRemove!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"MemberRemove"', exc_info=e)
