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

    async def get_ksoft_ban(self, user: typing.Union[discord.User, discord.Member]):
        ksoftban = await self.bot.ksoft.bans.check(user.id)
        if ksoftban:
            ksoftban = await self.bot.ksoft.bans.info(user.id)
            return f'<:no:534174796938870792> Banned on [KSoft.Si](https://bans.ksoft.si/share?user={user.id}) for {ksoftban.reason} - [Proof]({ksoftban.proof})'
        return ''

    def get_badges(self, user: typing.Union[discord.User, discord.Member]):
        badge_checks = {
            'staff': discord.utils.get(
                self.bot.emojis, id=698344463281422371),
            'partner': discord.utils.get(
                self.bot.emojis, id=748876804562878504),
            'hypesquad': discord.utils.get(
                self.bot.emojis, id=698349980192079882),
            'bug_hunter': discord.utils.get(
                self.bot.emojis, id=698350213596971049),
            'bug_hunter_level_2': discord.utils.get(
                self.bot.emojis, id=698350544103669771),
            'early_supporter': discord.utils.get(
                self.bot.emojis, id=698350657073053726),
            'verified_bot': str(discord.utils.get(self.bot.emojis, id=700325427998097449)) +
            str(discord.utils.get(self.bot.emojis, id=700325521665425429)),
            'verified_bot_developer': discord.utils.get(
                self.bot.emojis, id=720179031785340938)
        }
        badges = [str(v) for k, v in badge_checks.items() if getattr(user.public_flags, k)]
        if self.bot.isadmin(user):
            badges.append(str(discord.utils.get(
                self.bot.emojis, id=671243744774848512)))
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
            try:
                gban = await self.get_ksoft_ban(uinfo)
            except Exception:
                pass
            notes = [n for n in [gban] if n]
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
