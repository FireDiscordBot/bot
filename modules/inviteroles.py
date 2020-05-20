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


from discord.ext import commands, tasks
from fire.converters import Role
import traceback
import discord


class InviteRoles(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.invite_roles = {}
        self.bot.loop.create_task(self.load_invroles())

    async def load_invroles(self):
        q = 'SELECT * FROM invroles;'
        invroles = await self.bot.db.fetch(q)
        for ir in invroles:
            if ir['gid'] not in self.bot.premium_guilds:
                continue
            if ir['gid'] not in self.invite_roles:
                self.invite_roles[ir['gid']] = []
            self.invite_roles[ir['gid']].append({
                'role': ir['rid'],
                'invite': ir['inv']
            })
        self.bot.logger.info('$GREENLoaded invite roles!')

    @commands.Cog.listener()
    async def on_invite_join(self, member: discord.Member, invite: str):  # member_join will dispatch this if a valid invite was used
        guild = member.guild
        if guild.id not in self.invite_roles:
            return
        invroles = [
            guild.get_role(i['rid']) for i in self.invite_roles[guild.id] if i['inv'] == invite and guild.get_role(i['rid'])
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
            q = 'DELETE FROM invroles WHERE inv=$1;'
            await self.bot.db.execute(q, invite.code)
        await self.bot.db.release(con)

    async def cog_check(self, ctx):
        if not ctx.guild or not ctx.guild.id in self.bot.premium_guilds:
            return False
        return True

    @commands.command()
    async def invrole(self, ctx, invite: str, *, role: Role):
        try:
            await self.bot.fetch_invite(invite)
        except discord.NotFound:
            return await ctx.error(f'You must provide a valid invite')
        except Exception:
            return await ctx.error(f'Something went wrong while attempting to check the invite')
        if ctx.guild.id not in self.invite_roles:
             self.invite_roles[ctx.guild.id] = []
        current = [
            i for i in self.invite_roles[guild.id] if i['inv'] == invite and i['rid'] == role.id
        ]
        if current:
            con = await self.bot.db.acquire()
            async with con.transaction():
                q = 'DELETE FROM invroles WHERE inv=$1 AND rid=$2;'
                await self.bot.db.execute(q, invite, role.id)
            await self.bot.db.release(con)
            return await ctx.success(f'Successfully deleted invite role {discord.utils.escape_mentions(role.name)} for discord.gg\/{invite}')
        con = await self.bot.db.acquire()
        async with con.transaction():
            query = 'INSERT INTO invroles (\"gid\", \"rid\", \"inv\") VALUES ($1, $2, $3);'
            await self.bot.db.execute(query, ctx.guild.id, role.id, invite)
        await self.bot.db.release(con)
        self.invite_roles[ctx.guild.id].append({
            'role': role.id,
            'invite': invite
        })
        return await ctx.success(f'Successfully added invite role {discord.utils.escape_mentions(role.name)} for discord.gg\/{invite}')


def setup(bot):
    try:
        bot.add_cog(InviteRoles(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"invite roles" $GREENmodule!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding module $CYAN"invite roles"', exc_info=e)
