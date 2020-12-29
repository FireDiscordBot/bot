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
from random import randint
import humanfriendly
import datetime
import discord


class MemberJoin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_member_join(self, member):
        if member.id == 764995504526327848:
            try:
                self.bot.has_ts_bot_raw.push(member.guild.id)
                self.bot.no_ts_bot.remove(member.guild.id)
            except Exception:
                pass
        premium = self.bot.premium_guilds
        usedinvite = None
        if not member.bot:
            if member.guild.id in premium:
                before = await self.bot.get_invites(member.guild.id)
                after = await self.bot.load_invites(member.guild.id)
                for inv in before:
                    a = after.get(inv, False)
                    b = before[inv]
                    if b != a:
                        usedinvite = inv
            if usedinvite:
                self.bot.dispatch('invite_join', member, usedinvite)
            if not usedinvite and 'DISCOVERABLE' in member.guild.features:
                usedinvite = 'Joined without an invite (Lurking/Server Discovery)'
        conf = self.bot.get_config(member.guild)
        logch = conf.get('log.moderation')
        if conf.get('mod.globalbans'):
            try:
                banned = await self.bot.ksoft.bans.check(member.id)
                if banned:
                    try:
                        await member.guild.ban(member, reason=f'{member} was found on global ban list')
                        self.recentgban.append(
                            f'{member.id}-{member.guild.id}')
                        if logch:
                            embed = discord.Embed(color=discord.Color.red(), timestamp=datetime.datetime.now(
                                datetime.timezone.utc), description=f'**{member.mention} was banned**')
                            embed.set_author(name=member, icon_url=str(
                                member.avatar_url_as(static_format='png', size=2048)))
                            embed.add_field(
                                name='Reason', value=f'{member} was found on global ban list', inline=False)
                            embed.set_footer(text=f"Member ID: {member.id}")
                            try:
                                return await logch.send(embed=embed)
                            except Exception:
                                pass
                    except discord.HTTPException:
                        return
            except Exception:
                pass
        if conf.get('greet.joinmsg'):
            joinchan = conf.get('greet.joinchannel')
            joinmsg = conf.get('greet.joinmsg')
            vars = {
                '{user.mention}': member.mention,
                '{user}': discord.utils.escape_markdown(str(member)),
                '{user.name}': discord.utils.escape_markdown(member.name),
                '{user.discrim}': member.discriminator,
                '{server}': discord.utils.escape_markdown(str(member.guild)),
                '{guild}': discord.utils.escape_markdown(str(member.guild)),
                '{count}': str(member.guild.member_count)
            }

            if joinchan and joinmsg:
                message = joinmsg
                for var, value in vars.items():
                    message = message.replace(var, value)
                await joinchan.send(message, allowed_mentions=discord.AllowedMentions(users=True))
        if logch:
            embed = discord.Embed(title='Member Joined', url='https://i.giphy.com/media/Nx0rz3jtxtEre/giphy.gif',
                                  color=discord.Color.green(), timestamp=datetime.datetime.now(datetime.timezone.utc))
            embed.set_author(name=f'{member}', icon_url=str(
                member.avatar_url_as(static_format='png', size=2048)))
            embed.add_field(name='Account Created', value=humanfriendly.format_timespan(
                datetime.datetime.utcnow() - member.created_at) + ' ago', inline=False)
            if usedinvite and member.guild.id in premium:
                embed.add_field(name='Invite Used',
                                value=usedinvite, inline=False)
            # Nice
            if member.guild.id not in premium and randint(0, 100) == 69:
                embed.add_field(name='Want to see what invite they used?',
                                value='Fire Premium allows you to do that and more.\n[Learn More](https://gaminggeek.dev/premium)', inline=False)
            if member.bot:
                try:
                    async for e in member.guild.audit_logs(action=discord.AuditLogAction.bot_add, limit=10):
                        if e.target.id == member.id:
                            embed.add_field(
                                name='Invited By', value=f'{e.user} ({e.user.id})', inline=False)
                            break
                except Exception as e:
                    pass
            embed.set_footer(text=f'User ID: {member.id}')
            try:
                await logch.send(embed=embed)
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(MemberJoin(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMemberJoin!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"MemberJoin"', exc_info=e)
