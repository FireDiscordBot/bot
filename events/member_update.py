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
import random


class MemberUpdate(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.deleted_roles = []
        self.last_role_fetch = {}

    @commands.Cog.listener()
    async def on_member_update(self, before, after):
        conf = self.bot.get_config(after.guild)
        badname = (await conf.get('utils.badname')) or f'John Doe {after.discriminator}'
        if before.nick != after.nick:
            try:
                if after.nick is not None and badname in after.nick:
                    raise Exception # Escapes the try
                if (await conf.get('mod.autodecancer')) and after.guild.me.guild_permissions.manage_nicknames:
                    sk1roles = [
                            discord.utils.get(after.guild.roles, id=585534346551754755),
                            discord.utils.get(after.guild.roles, id=436306157762773013),
                            discord.utils.get(after.guild.roles, id=698943379181928520)
                    ]
                    if not after.guild_permissions.manage_nicknames or not any(r for r in sk1roles if r in after.roles):
                        if not after.nick:
                            nick = after.name
                        else:
                            nick = after.nick
                        if not self.bot.isascii(nick.replace('‘', '\'').replace('“', '"').replace('“', '"')):
                            await after.edit(nick=badname, reason=f'Name changed due to auto-decancer. The name contains non-ascii characters (DEBUG: MEMBER_UPDATE)')
                        else:
                            change = True if (conf.get('mod.autodehoist') and not self.bot.ishoisted(nick) or not conf.get('mod.autodehoist')) else False
                            if change and badname not in str(m.nick):
                                await after.edit(nick=None, reason=f'Name is no longer hoisted or "cancerous" (non-ascii characters) (DEBUG: MEMBER_UPDATE)')
                if (await conf.get('mod.autodehoist')) and after.guild.me.guild_permissions.manage_nicknames:
                    sk1roles = [
                        discord.utils.get(after.guild.roles, id=585534346551754755),
                        discord.utils.get(after.guild.roles, id=436306157762773013),
                        discord.utils.get(after.guild.roles, id=698943379181928520)
                    ]
                    if not after.guild_permissions.manage_nicknames or not any(r for r in sk1roles if r in after.roles):
                        if not after.nick:
                            nick = after.name
                        else:
                            nick = after.nick
                        if self.bot.ishoisted(nick):
                            await after.edit(nick=badname, reason=f'Name changed due to auto-dehoist. The name starts with a hoisted character (DEBUG: MEMBER_UPDATE)')
                        elif badname not in str(m.nick):
                            await after.edit(nick=None, reason=f'Name is no longer hoisted or "cancerous" (non-ascii characters) (DEBUG: MEMBER_UPDATE)')
            except Exception:
                pass
            logch = await conf.get('log.action')
            if logch and after.nick and badname not in f'{before.nick} -> {after.nick}':
                embed = discord.Embed(
                    color=after.color,
                    timestamp=datetime.datetime.now(datetime.timezone.utc),
                    description=f'{after.mention}\'**s nickname was changed**'
                ).set_author(
                    name=after,
                    icon_url=str(after.avatar_url_as(
                        static_format='png',
                        size=2048
                    ))
                ).add_field(
                    name='Before',
                    value=before.nick,
                    inline=False
                ).add_field(
                    name='After',
                    value=after.nick,
                    inline=False
                ).set_footer(text=f"Author ID: {after.id}")
                try:
                    await logch.send(embed=embed)
                except Exception:
                    pass
        if before.roles != after.roles:
            groles = None
            for role in self.deleted_roles:
                if role in before.roles:
                    before.roles.remove(role)
            if not any(r for r in self.deleted_roles if r in after.guild.roles):
                if after.guild.id in self.last_role_fetch:
                    delta = datetime.datetime.now(datetime.timezone.utc) - self.last_role_fetch[after.guild.id]
                else:
                    self.last_role_fetch[after.guild.id] = datetime.datetime.now(datetime.timezone.utc)
                    delta = datetime.timedelta(seconds=1)
                if delta > datetime.timedelta(minutes=10):
                    try:
                        groles = await after.guild.fetch_roles()  # Hopefully this should stop deleted roles from being logged
                        self.last_role_fetch[after.guild.id] = datetime.datetime.now(datetime.timezone.utc)
                    except Exception:
                        groles = after.guild.roles  # Don't complain to me when your logs get spammed if you remove a role with a bunch of people in it lol
                    for role in after.guild.roles:
                        if role not in groles:
                            self.deleted_roles.append(role)
                            after.guild.roles.remove(role)
            if not groles:
                groles = after.guild.roles
            logch = await conf.get('log.action')
            if logch:
                broles = []
                aroles = []
                for role in before.roles:
                    broles.append(role.name)
                for role in after.roles:
                    aroles.append(role.name)
                s = set(aroles)
                removed = [x for x in broles if x not in s]
                s = set(broles)
                added = [x for x in aroles if x not in s]
                if len(added) >= 1:
                    roles = [r for r in [discord.utils.get(groles, name=a) for a in added] if r]
                    if roles:
                        mentions = ', '.join([r.mention for r in roles])
                        embed = discord.Embed(
                            color=random.choice(roles).color,
                            timestamp=datetime.datetime.now(datetime.timezone.utc),
                            description=f'{after.mention}\'s roles were changed\n**{after.name} was given the role(s)**\n{mentions}'
                        ).set_author(
                            name=after,
                            icon_url=str(after.avatar_url_as(
                                static_format='png',
                                size=2048)
                            )
                        ).set_footer(text=f"Member ID: {after.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass
                if len(removed) >= 1:
                    roles = [r for r in [discord.utils.get(groles, name=a) for a in removed] if r]
                    if roles:
                        mentions = ', '.join([r.mention for r in roles])
                        embed = discord.Embed(
                            color=random.choice(roles).color,
                            timestamp=datetime.datetime.now(datetime.timezone.utc),
                            description=f'{after.mention}\'s roles were changed\n**{after.name} was removed from the role(s)**\n{mentions}'
                        ).set_author(
                            name=after,
                            icon_url=str(after.avatar_url_as(
                                static_format='png',
                                size=2048)
                            )
                        ).set_footer(text=f"Member ID: {after.id}")
                        try:
                            await logch.send(embed=embed)
                        except Exception:
                            pass


def setup(bot):
    try:
        bot.add_cog(MemberUpdate(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMemberUpdate!')
    except Exception as e:
        bot.logger.error(f'$REDError while loading event $CYAN"MemberUpdate"', exc_info=e)
