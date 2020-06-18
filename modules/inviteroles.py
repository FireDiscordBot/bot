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


from fire.filters.invite import findinvite
from discord.ext import commands
from fire.converters import Role
import traceback
import discord
import json


class InviteRoles(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.bot.loop.create_task(self.load_invroles())

    async def load_invroles(self):
        await self.bot.wait_until_ready()
        q = 'SELECT * FROM invrole;'
        iroles = {}
        invroles = await self.bot.db.fetch(q)
        for ir in invroles:
            if ir['gid'] not in self.bot.premium_guilds:
                continue
            if ir['gid'] not in iroles:
                iroles[ir['gid']] = []
            iroles[ir['gid']].append({
                'role': ir['rid'],
                'invite': ir['inv']
            })
        await self.bot.redis.set('invroles', json.dumps(iroles))
        self.bot.logger.info('$GREENLoaded invite roles!')

    async def get_invroles(self, guild: int):
        rps = json.loads((await self.bot.redis.get(
            'invroles',
            encoding='utf-8'
        )) or '{}')
        return rps if not guild else rps.get(str(guild), None)

    @commands.Cog.listener()
    async def on_invite_join(self, member: discord.Member, invite: str):  # member_join will dispatch this if a valid invite was used
        guild = member.guild
        invroles = await self.get_invroles(guild.id)
        if not invroles:
            return
        invroles = [
            guild.get_role(i['role']) for i in invroles if i['invite'] == invite and guild.get_role(i['role'])
        ]
        if invroles:
            try:
                await member.add_roles(*invroles, reason=f'Invite role for {invite}', atomic=False)
            except discord.HTTPException:
                pass

    @commands.Cog.listener()
    async def on_invite_delete(self, invite: discord.Invite):
        con = await self.bot.db.acquire()
        async with con.transaction():
            q = 'DELETE FROM invrole WHERE inv=$1;'
            await self.bot.db.execute(q, invite.code)
        await self.bot.db.release(con)
        await self.load_invroles()

    async def cog_check(self, ctx):
        if not ctx.guild or not ctx.guild.id in self.bot.premium_guilds:
            return False
        return True

    @commands.command(aliases=['inviterole', 'inviteroles', 'invroles'])
    @commands.has_permissions(manage_roles=True)
    @commands.bot_has_permissions(manage_roles=True)
    async def invrole(self, ctx, invite: discord.Invite, *, role: Role):
        if role.is_default() or role.position >= ctx.guild.me.top_role.position or role.managed:
            return await ctx.error(f'I cannot give users this role')
        if invite.guild.id != ctx.guild.id:
            return await ctx.error(f'The invite must be for this guild')
        invite = invite.code
        invroles = await self.get_invroles(ctx.guild.id)
        if not invroles:
             invroles = []
        current = [
            i for i in invroles if i['invite'] == invite and i['role'] == role.id
        ]
        if current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                q = 'DELETE FROM invrole WHERE inv=$1 AND rid=$2;'
                await self.bot.db.execute(q, invite, role.id)
            await self.bot.db.release(con)
            await self.load_invroles()
            return await ctx.success(f'Successfully deleted invite role {discord.utils.escape_mentions(role.name)} for discord.gg\/{invite}')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO invrole (\"gid\", \"rid\", \"inv\") VALUES ($1, $2, $3);'
            await self.bot.db.execute(query, ctx.guild.id, role.id, invite)
        await self.bot.db.release(con)
        await self.load_invroles()
        return await ctx.success(f'Successfully added invite role {discord.utils.escape_mentions(role.name)} for discord.gg\/{invite}')


def setup(bot):
    try:
        bot.add_cog(InviteRoles(bot))
        bot.logger.info(f'$GREENLoaded $CYANInvite Roles $GREENmodule!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding module $CYAN"invite roles"', exc_info=e)
