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


from fire.converters import Member, UserWithFallback
from discord.ext import commands
import humanfriendly
import traceback
import datetime
import discord
import typing


permissions = {
    'ban_members': 'Ban Members',
    'change_nickname': 'Change Nickname',
    'kick_members': 'Kick Members',
    'manage_channels': 'Manage Channels',
    'manage_emojis': 'Manage Emojis',
    'manage_guild': 'Manage Guild',
    'manage_messages': 'Manage Messages',
    'manage_nicknames': 'Manage Nicks',
    'manage_roles': 'Manage Roles',
    'manage_webhooks': 'Manage Webhooks',
    'mention_everyone': 'Mention Everyone',
    'view_audit_log': 'View Audit Logs',
    'view_guild_insights': 'View Server Insights'
}


class UserInfo(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def get_chatwatch(self, user: typing.Union[discord.User, discord.Member]):
        cwprofile = await self.bot.chatwatch.profile(user.id)
        if cwprofile:
            if cwprofile['blacklisted_reason'] and cwprofile['blacklisted']:
                return f'<:xmark:674359427830382603> Blacklisted on Chatwatch for **{cwprofile["blacklisted_reason"]}**'
            elif cwprofile['blacklisted_reason'] and not cwprofile['blacklisted']:
                return f'Previously blacklisted for **{cwprofile["blacklisted_reason"]}**'
        return ''

    async def get_ksoft_ban(self, user: typing.Union[discord.User, discord.Member]):
        ksoftban = await self.bot.ksoft.bans_check(user.id)
        if ksoftban:
            ksoftban = await self.bot.ksoft.bans_info(user.id)
            return f'<:xmark:674359427830382603> Banned on [KSoft.Si](https://bans.ksoft.si/share?user={user.id}) for {ksoftban.reason} - [Proof]({ksoftban.proof})'
        return ''

    # I will improve this when discord.py gets actual flags support
    def get_badges(self, user: typing.Union[discord.User, discord.Member]):
        badges = []
        if self.bot.isadmin(user):
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=671243744774848512)))
        if (user.flags & 1) == 1:  # Staff
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=698344463281422371)))
        if (user.flags & 2) == 2:  # Partner
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=631831109575114752)))
        if (user.flags & 1 << 2) == 1 << 2:  # Hypesquad Events
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=698349980192079882)))
        if (user.flags & 1 << 3) == 1 << 3:  # Bug Hunter (Level 1)
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=698350213596971049)))
        if (user.flags & 1 << 9) == 1 << 9:  # Early Supporter
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=698350657073053726)))
        if (user.flags & 1 << 14) == 1 << 14:  # Bug Hunter (Level 2)
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=698350544103669771)))
        if (user.flags & 1 << 16) == 1 << 16:  # Verified Bot
            badges.append(
                str(discord.utils.get(self.bot.emojis, id=700325427998097449)) +
                str(discord.utils.get(self.bot.emojis, id=700325521665425429))
            )
        if (user.flags & 1 << 17) == 1 << 17:  # Verified Bot Developer
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=720179031785340938)))
        if user.id in self.bot.premium_guilds.values():
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=680519037704208466)))
        if badges:
            badges.append(u'\u200b')  # Prevents huge emojis on mobile
        return badges

    def get_info(self, ctx: commands.Context, user: typing.Union[discord.User, discord.Member]):
        created = user.created_at.strftime('%b %-d %Y @ %I:%M %p')
        cdelta = humanfriendly.format_timespan(
            datetime.datetime.utcnow() - user.created_at,
            max_units=2
        ) + ' ago'
        info = [
            f'**Mention:** {user.mention}',
            f'**Created:** {created} ({cdelta})'
        ]
        if isinstance(user, discord.Member):
            joined = user.joined_at.strftime('%b %-d %Y @ %I:%M %p')
            jdelta = humanfriendly.format_timespan(
                datetime.datetime.utcnow() - user.joined_at,
                max_units=2
            ) + ' ago'
            if ctx.guild and ctx.guild.owner == user:
                info.append(f'**Created Guild:** {joined} ({jdelta})')
            else:
                info.append(f'**Joined:** {joined} ({jdelta})')
            is_cached = len(ctx.guild.members) / ctx.guild.member_count
            if is_cached > 0.98:  # is_cached should be 1.0 if cached but allow for discrepancies
                joinpos = sorted(
                    ctx.guild.members,
                    key=lambda m: m.joined_at or m.created_at
                ).index(user) + 1
                info.append(f'**Join Position:** {joinpos:,d}')
            if user.nick and user.nick != user.name:
                info.append(f'**Nickname:** {user.nick}')
        return info

    def shorten(self, items: list, max: int = 1000, sep: str = ', '):
        text = ''
        while len(text) < max and items:
            text = text + f'{items[0]}{sep}'
            items.pop(0)
        if text.endswith(sep):  # Remove trailing separator
            text = text[:(len(text) - len(sep))]
        if len(items) >= 1:
            return text + f' and {len(items)} more...'
        return text

    @commands.command(
        aliases=[
            'userinfo',
            'infouser',
            'whois',
            'u'
        ],
        description='Check out a user\'s info'
    )
    async def user(self, ctx, *, uinfo: typing.Union[Member, UserWithFallback] = None):
        if not uinfo:
            uinfo = ctx.author
        if ctx.guild and ctx.guild.get_member(uinfo.id):
            uinfo = ctx.guild.get_member(uinfo.id)
        if isinstance(uinfo, discord.ClientUser):
            uinfo = ctx.me
        color = uinfo.color if isinstance(
            uinfo, discord.Member) else ctx.author.color
        badges = self.get_badges(uinfo)
        info = self.get_info(ctx, uinfo)
        embed = discord.Embed(
            colour=color,
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            description='  '.join(badges) if badges else discord.Embed.Empty
        ).set_author(
            name=str(uinfo),
            icon_url=str(uinfo.avatar_url)
        ).add_field(
            name='» About',
            value='\n'.join(info),
            inline=False
        )
        if isinstance(uinfo, discord.Member):
            roles = [
                r.mention for r in sorted(
                    uinfo.roles,
                    key=lambda r: r.position
                ) if not r.is_default()
            ]
            if roles:
                embed.add_field(
                    name=f'» Roles [{len(uinfo.roles) - 1}]',
                    value=self.shorten(roles, sep=' - '),
                    inline=False
                )
            if not uinfo.guild_permissions.administrator:
                perms = []
                for perm, value in uinfo.guild_permissions:
                    if value and perm in permissions:
                        perms.append(permissions[perm])
                if perms:
                    embed.add_field(name="» Key Permissions",
                                    value=', '.join(perms), inline=False)
            else:
                embed.add_field(name="» Permissions",
                                value='Administrator', inline=False)
        if not uinfo.bot:
            gban = None
            cwbl = None
            try:
                gban = await self.get_ksoft_ban(uinfo)
            except Exception:
                pass
            if hasattr(self.bot, 'chatwatch') and self.bot.chatwatch.connected:
                try:
                    cwbl = await self.get_chatwatch(uinfo)
                except Exception:
                    pass
            notes = [n for n in [gban, cwbl] if n]
            if notes:
                embed.add_field(name=f'» Notes',
                                value='\n'.join(notes), inline=False)
        embed.set_footer(text=str(uinfo.id))
        await ctx.send(embed=embed)


def setup(bot):
    try:
        bot.add_cog(UserInfo(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"user" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"user"', exc_info=e)
