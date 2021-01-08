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


from discord.ext import commands, has_permissions, bot_has_permissions
from fire.converters import Role
import discord
import typing


class Autorole(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(
        name="autorole", description="Automatically add a role to a user when they join"
    )
    @has_permissions(manage_roles=True)
    @bot_has_permissions(manage_roles=True)
    @commands.guild_only()
    async def autorole(self, ctx, role: typing.Union[Role, str] = None):
        if not role:
            await ctx.config.set("mod.autorole", None)
            return await ctx.success(
                f"Successfully disabled auto-role in {ctx.guild.name}"
            )
        if isinstance(role, str) and role in ["delay", "wait"]:
            current = ctx.config.get("mod.autorole.waitformsg")
            current = await ctx.config.set("mod.autorole.waitformsg", not current)
            if not current:
                return await ctx.success(
                    f"I will no longer wait for a message to give users your auto-role."
                )
            else:
                return await ctx.success(
                    f"I will now wait for a message before giving your auto-role. This will also apply to existing users who don't have the role."
                )
        elif isinstance(role, str):
            raise commands.BadArgument('Role not found :(')
        if role.position >= ctx.guild.me.top_role.position:
            return await ctx.error(
                "That role is higher than my top role, I cannot give it to anyone."
            )
        if role.managed or role.is_default():
            return await ctx.error(
                "That role is managed by an integration or the default role, I cannot give it to anyone."
            )
        else:
            await ctx.config.set("mod.autorole", role)
            return await ctx.success(
                f"Successfully enabled auto-role in {ctx.guild.name}! All new members will recieve the {role.name} role."
            )

    # events don't go here but I cba just be grateful i am giving premium feature for free
    @commands.Cog.listener()
    async def on_member_join(self, member):
        if await self.bot.has_ts_bot(member.guild) or "PREVIEW_ENABLED" in member.guild.features:
            return
        try:
            config = self.bot.get_config(member.guild)
            role = config.get("mod.autorole")
            wait = config.get("mod.autorole.waitformsg")
            if role is not None and not wait and not role in member.roles:
                await member.add_roles(role, reason="Auto-Role")
        except Exception:
            pass

    @commands.Cog.listener()
    async def on_member_update(self, before, after):
        if await self.bot.has_ts_bot(after.guild):
            return
        if not after.pending:
            try:
                config = self.bot.get_config(after.guild)
                role = config.get("mod.autorole")
                wait = config.get("mod.autorole.waitformsg")
                if role is not None and not wait and not role in after.roles:
                    await after.add_roles(role, reason="Auto-Role")
            except Exception:
                pass

    @commands.Cog.listener()
    async def on_message(self, message):
        if await self.bot.has_ts_bot(message.guild):
            return
        member = message.author if isinstance(
            message.author, discord.Member) else None
        if member and not member.pending:
            try:
                config = self.bot.get_config(member.guild)
                role = config.get("mod.autorole")
                wait = config.get("mod.autorole.waitformsg")
                if role is not None and wait and role not in member.roles:
                    await member.add_roles(
                        role, reason="Auto-Role (Waited for message before adding)"
                    )
            except Exception:
                pass


def setup(bot):
    try:
        bot.add_cog(Autorole(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"autorole" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"autorole"', exc_info=e)
