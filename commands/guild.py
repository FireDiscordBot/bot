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


region = {
    'brazil': '🇧🇷 Brazil',
    'europe': '🇪🇺 Europe',
    'hongkong': '🇭🇰 Hong Kong',
    'india': '🇮🇳 India',
    'japan': '🇯🇵 Japan',
    'russia': '🇷🇺 Russia',
    'singapore': '🇸🇬 Singapore',
    'southafrica': '🇿🇦 South Africa',
    'sydney': '🇦🇺 Sydney',
    'us-central': '🇺🇸 Central US',
    'us-south': '🇺🇸 US South',
    'us-east': '🇺🇸 US East',
    'us-west': '🇺🇸 US West'
}

featureslist = {
    'ENABLED_DISCOVERABLE_BEFORE': 'Enabled Discoverable Before',
    'WELCOME_SCREEN_ENABLED': 'Welcome Screen',
    'ANIMATED_ICON': 'Animated Icon',
    'INVITE_SPLASH': 'Invite Splash',
    'RELAY_ENABLED': 'Relay Enabled',
    'RELAY_FORCED': 'Relay Forced',
    'DISCOVERABLE': '[Discoverable](https://discord.com/guild-discovery)',
    'MORE_EMOJI': 'More Emoji',
    'FEATURABLE': 'Featurable',
    'VANITY_URL': 'Vanity URL',
    'COMMUNITY': 'Community',
    'PARTNERED': '[Partnered](https://dis.gd/partners)',
    'COMMERCE': '[Store Channels](https://dis.gd/sell-your-game)',
    'VERIFIED': '[Verified](https://dis.gd/vfs)',
    'BANNER': 'Banner',
    'NEWS': '[Announcement Channels](https://support.discord.com/hc/en-us/articles/360032008192)',
    # CUSTOM FEATURES
    'PREMIUM': '<:firelogo:665339492072292363> [Premium](https://gaminggeek.dev/premium)'
}

emotes = {  # Yes these are the statuspage emotes but idc
    'green': '<:operational:685538400639385649>',
    'yellow': '<:partial_outage:685538400555499675>',
    'red': '<:major_outage:685538400639385706>'
}


class GuildInfo(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    def get_badges(self, guild: discord.Guild):
        badges = []
        if guild.id == 564052798044504084:
            badges.append(
                str(discord.utils.get(self.bot.emojis, id=671243744774848512))
            )
        if 'PARTNERED' in guild.features:
            badges.append(
                str(discord.utils.get(self.bot.emojis, id=748876805011931188))
            )
        elif 'VERIFIED' in guild.features:
            badges.append(
                str(discord.utils.get(self.bot.emojis, id=647400543018287114))
            )
        if guild.id in self.bot.premium_guilds:
            badges.append(
                str(discord.utils.get(self.bot.emojis, id=680519037704208466))
            )
        if badges:
            badges.append(u'\u200b')  # Prevents huge emojis on mobile
        return badges

    def get_info(self, ctx: commands.Context, guild: discord.Guild):
        # This takes both context and guild to allow for showing public
        # guilds in the future
        created = guild.created_at.strftime('%b %-d %Y @ %I:%M %p')
        cdelta = humanfriendly.format_timespan(
            datetime.datetime.utcnow() - guild.created_at,
            max_units=2
        ) + ' ago'
        info = [
            f'**Created by {guild.owner or "Unknown#0000"} {cdelta}**',
            f'**Members:** {guild.member_count:,d}',
            f'**Region:** {region.get(str(guild.region), "❓ Deprecated Region")}'
        ]
        is_cached = len(guild.members) / guild.member_count
        if is_cached > 0.98 and guild.get_member(ctx.author):
            # is_cached should be 1.0 if cached but allow for discrepancies
            joinpos = sorted(
                guild.members,
                key=lambda m: m.joined_at or m.created_at
            ).index(ctx.author) + 1
            info.append(f'**Your Join Position:** {joinpos:,d}')
        return info

    def get_security(self, ctx: commands.Context, guild: discord.Guild):
        # This takes both context and guild to allow for showing public
        # guilds in the future
        info = []
        verification = str(guild.verification_level)
        if verification == 'extreme':
            info.append(
                f'{emotes.get("green")} **Extreme Verification Level**'
            )
        elif verification == 'high':
            info.append(
                f'{emotes.get("green")} **High Verification Level**'
            )
        elif verification == 'medium':
            info.append(
                f'{emotes.get("yellow")} **Medium Verification Level**'
            )
        elif verification in ['low', 'none']:
            if verification == 'none':
                verification = '**No Verification!**'
            else:
                verification = '**Low Verification Level**'
            info.append(f'{emotes.get("red")} {verification}')
        cfilter = guild.explicit_content_filter
        if cfilter == discord.ContentFilter.all_members:
            info.append(
                f'{emotes.get("green")} **Content Filter:** All Members'
            )
        elif cfilter == discord.ContentFilter.no_role:
            info.append(
                f'{emotes.get("yellow")} **Content Filter:** Without Role'
            )
        else:
            info.append(
                f'{emotes.get("red")} **Content Filter:** Disabled'
            )
        notifications = guild.default_notifications
        if notifications == discord.NotificationLevel.all_messages:
            info.append(
                f'{emotes.get("yellow")} **Default Notifications:** All Messages'
            )
        else:
            info.append(
                f'{emotes.get("green")} **Default Notifications:** Only @Mentions'
            )
        mfa = bool(guild.mfa_level)
        if mfa:
            info.append(
                f'{emotes.get("green")} **Two-Factor Auth:** Enabled'
            )
        else:
            info.append(
                f'{emotes.get("red")} **Two-Factor Auth:** Disabled'
            )
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
            'guildinfo',
            'infoguild',
            'serverinfo',
            'infoserver',
            'server'
        ],
        description='Check out the guild\'s info'
    )
    async def guild(self, ctx):
        guild: discord.Guild = ctx.guild
        badges = self.get_badges(guild)
        info = self.get_info(ctx, guild)
        secinfo = self.get_security(ctx, guild)
        embed = discord.Embed(
            colour=ctx.author.color,
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            description='  '.join(badges) if badges else discord.Embed.Empty
        ).set_author(
            name=str(guild),
            icon_url=str(guild.icon_url_as(
                static_format='png',
                size=2048
            ))
        ).add_field(
            name='» About',
            value='\n'.join(info),
            inline=False
        ).add_field(
            name='» Security',
            value='\n'.join(secinfo),
            inline=False
        ).add_field(
            name='» Features',
            value=', '.join(
                [featureslist[f]
                    for f in guild.features if f in featureslist] or ['No Features']
            ),
            inline=False
        )
        if isinstance(guild, discord.Guild):
            roles = [
                r.mention for r in sorted(
                    guild.roles,
                    key=lambda r: r.position
                ) if not r.is_default()
            ]
            if roles:
                embed.add_field(
                    name=f'» Roles [{len(guild.roles) - 1}]',
                    value=self.shorten(roles, sep=' - '),
                    inline=False
                )
        embed.set_footer(text=str(guild.id))
        await ctx.send(embed=embed)


def setup(bot):
    try:
        bot.add_cog(GuildInfo(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"guild" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"guild"', exc_info=e)
