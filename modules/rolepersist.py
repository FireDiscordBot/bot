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


from fire.converters import Role, Member, UserWithFallback
from discord.ext import commands
import traceback
import datetime
import discord
import typing
import json


class RolePersist(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.loop.create_task(self.load_role_persists())

    async def load_role_persists(self):
        await self.bot.wait_until_ready()
        q = 'SELECT * FROM rolepersists;'
        rps = {}
        persists = await self.bot.db.fetch(q)
        for rp in persists:
            if rp['gid'] not in self.bot.premium_guilds:
                continue
            if rp['gid'] not in rps:
                rps[rp['gid']] = {}
            rps[rp['gid']][rp['uid']] = rp['roles']
        await self.bot.redis.set('rolepersists', json.dumps(rps))
        self.bot.logger.info('$GREENLoaded persisted roles!')

    async def get_role_persists(self, guild: int):
        rps = json.loads((await self.bot.redis.get(
            'rolepersists',
            encoding='utf-8'
        )) or '{}')
        return rps if not guild else rps.get(str(guild), None)

    @commands.Cog.listener()
    async def on_member_join(self, member: discord.Member):
        guild = member.guild
        rps = await self.get_role_persists(guild.id)
        if not rps:
            return
        if str(member.id) not in rps:
            return
        persisted = [
            guild.get_role(r) for r in rps[str(member.id)] if guild.get_role(r)
        ]
        if persisted:
            try:
                await member.add_roles(*persisted, reason=f'Persisted Roles', atomic=False)
            except discord.HTTPException:
                pass

    @commands.Cog.listener()
    async def on_member_update(self, before, after):
        guild = after.guild
        rps = await self.get_role_persists(guild.id)
        if not rps:
            return
        if str(after.id) not in rps:
            return
        if before.roles != after.roles:
            broles = []
            aroles = []
            for role in before.roles:
                broles.append(role)
            for role in after.roles:
                aroles.append(role)
            s = set(aroles)
            removed = [x for x in broles if x not in s]
            if len(removed) >= 1:
                roleids = [r.id for r in removed]
                current = [r for r in rps[str(after.id)]]
                for rid in roleids:
                    if rid in current:
                        current.remove(rid)
                if current == rps[str(after.id)]:
                    return
                if current:
                    con = await self.bot.db.acquire()
                    async with con.transaction():
                        query = 'UPDATE rolepersists SET roles = $1 WHERE gid = $2 AND uid = $3;'
                        await self.bot.db.execute(query, current, guild.id, after.id)
                    await self.bot.db.release(con)
                else:
                    con = await self.bot.db.acquire()
                    async with con.transaction():
                        query = 'DELETE FROM rolepersists WHERE gid = $1 AND uid = $2;'
                        await self.bot.db.execute(query, guild.id, after.id)
                    await self.bot.db.release(con)
                await self.load_role_persists()
                names = ', '.join([
                    discord.utils.escape_mentions(guild.get_role(r).name) for r in current if guild.get_role(r)
                ])  # The check for if the role exists should be pointless but better to check than error
                logch = self.bot.get_config(
                    after.guild.id).get('log.moderation')
                if logch:
                    embed = discord.Embed(
                        color=discord.Color.green() if current else discord.Color.red(),
                        timestamp=datetime.datetime.now(datetime.timezone.utc)
                    )
                    embed.set_author(name=f'Role Persist | {after}', icon_url=str(
                        after.avatar_url_as(static_format='png', size=2048)))
                    embed.add_field(
                        name='User', value=f'{after} ({after.id})', inline=False)
                    embed.add_field(name='Moderator',
                                    value=guild.me.mention, inline=False)
                    if names:
                        embed.add_field(
                            name='Roles', value=names, inline=False)
                    embed.set_footer(
                        text=f'User ID: {after.id} | Mod ID: {guild.me.id}')
                    try:
                        await logch.send(embed=embed)
                    except Exception:
                        pass

    async def cog_check(self, ctx):
        if not ctx.guild or not ctx.guild.id in self.bot.premium_guilds:
            return False
        return True

    @commands.command(aliases=['rolepersists', 'persistroles', 'persistrole'])
    @commands.has_permissions(manage_roles=True)
    @commands.bot_has_permissions(manage_roles=True)
    async def rolepersist(self, ctx, user: typing.Union[Member, UserWithFallback], *roles: Role):
        insert = False
        delete = False
        if any(r.is_default() or r.position >= ctx.guild.me.top_role.position or r.managed for r in roles):
            return await ctx.error(f'I cannot give users this role')
        rps = await self.get_role_persists(ctx.guild.id)
        if not rps:
            rps = {}
        if str(user.id) not in rps:
            insert = True
            rps[str(user.id)] = []
        toremove = []
        roleids = [r.id for r in roles]
        current = [r for r in rps[str(user.id)]]
        for rid in roleids:
            if rid not in current:
                current.append(rid)
            else:
                current.remove(rid)
                toremove.append(ctx.guild.get_role(rid))
        if not current:
            delete = True
        if delete:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'DELETE FROM rolepersists WHERE gid = $1 AND uid = $2;'
                await self.bot.db.execute(query, ctx.guild.id, user.id)
            await self.bot.db.release(con)
        elif not insert:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'UPDATE rolepersists SET roles = $1 WHERE gid = $2 AND uid = $3;'
                await self.bot.db.execute(query, current, ctx.guild.id, user.id)
            await self.bot.db.release(con)
        else:
            con = await self.bot.db.acquire()
            async with con.transaction():
                query = 'INSERT INTO rolepersists (\"gid\", \"uid\", \"roles\") VALUES ($1, $2, $3);'
                await self.bot.db.execute(query, ctx.guild.id, user.id, current)
            await self.bot.db.release(con)
        await self.load_role_persists()
        donthave = [
            ctx.guild.get_role(r) for r in current if ctx.guild.get_member(user.id) and ctx.guild.get_role(r) not in user.roles
        ]
        toremove = [
            r for r in toremove if r and ctx.guild.get_member(user.id) and r in user.roles
        ]
        if donthave:
            await user.add_roles(*donthave, reason=f'Role persist by {ctx.author.id}', atomic=False)
        if toremove:
            await user.remove_roles(*toremove, reason=f'Role un-persist by {ctx.author.id}', atomic=False)
        names = ', '.join([
            discord.utils.escape_mentions(ctx.guild.get_role(r).name) for r in current if ctx.guild.get_role(r)
        ])  # The check for if the role exists should be pointless but better to check than error
        logch = ctx.config.get('log.moderation')
        if logch:
            embed = discord.Embed(
                color=discord.Color.green() if not delete else discord.Color.red(),
                timestamp=datetime.datetime.now(datetime.timezone.utc)
            )
            embed.set_author(name=f'Role Persist | {user}', icon_url=str(
                user.avatar_url_as(static_format='png', size=2048)))
            embed.add_field(
                name='User', value=f'{user} ({user.id})', inline=False)
            embed.add_field(name='Moderator',
                            value=ctx.author.mention, inline=False)
            if names:
                embed.add_field(name='Roles', value=names, inline=False)
            embed.set_footer(
                text=f'User ID: {user.id} | Mod ID: {ctx.author.id}')
            try:
                await logch.send(embed=embed)
            except Exception:
                pass
        if names:
            return await ctx.success(f'**{discord.utils.escape_mentions(str(user))}** now has the role(s) {names} persisted to them')
        else:
            return await ctx.success(f'**{discord.utils.escape_mentions(str(user))}** no longer has any persisted roles.')


def setup(bot):
    try:
        bot.add_cog(RolePersist(bot))
        bot.logger.info(f'$GREENLoaded $CYANRole Persist $GREENmodule!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding module $CYAN"role persist"', exc_info=e)
