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


import discord
from discord.ext import commands
from discord.ext.commands import has_permissions, bot_has_permissions

# from moviepy.editor import VideoFileClip, TextClip, CompositeVideoClip
from fire.converters import Member, Role, TextChannel
import datetime
import typing


class Premium(commands.Cog, name="Premium Commands"):
    def __init__(self, bot):
        self.bot = bot
        self.loop = bot.loop
        self.bot.premium_guilds = {}
        # self.reactroles = {}
        self.bot.loop.create_task(self.load_premium())

    async def load_premium(self):
        await self.bot.wait_until_ready()
        self.bot.logger.info(f"$YELLOWLoading premium guilds...")
        self.bot.premium_guilds = {}
        query = "SELECT * FROM premium;"
        premium = await self.bot.db.fetch(query)
        for p in premium:
            self.bot.premium_guilds.update({int(p["gid"]): int(p["uid"])})
        self.bot.logger.info(f"$GREENLoaded premium guilds!")

    async def cog_check(self, ctx: commands.Context):
        """
        Local check, makes all commands in this cog premium only
        """
        if ctx.guild.id in self.bot.premium_guilds:
            return True
        if self.bot.isadmin(ctx.author):
            return True
        return False

    async def member_guild_check(self, member: discord.Member):
        """
        Check if the guild from a member is premium
        """
        if member.guild.id in self.bot.premium_guilds:
            return True
        if await self.bot.is_owner(member):
            return True
        else:
            return False

    #     def gencrabrave(self, t, filename):
    #         clip = VideoFileClip("crabtemplate.mp4")
    #         text = TextClip(t[0], fontsize=48, color='white', font='Verdana')
    #         text2 = TextClip("____________________", fontsize=48, color='white', font='Verdana')\
    #             .set_position(("center", 210)).set_duration(15.4)
    #         text = text.set_position(("center", 200)).set_duration(15.4)
    #         text3 = TextClip(t[1], fontsize=48, color='white', font='Verdana')\
    #             .set_position(("center", 270)).set_duration(15.4)
    #
    #         video = CompositeVideoClip([clip, text.crossfadein(1), text2.crossfadein(1), text3.crossfadein(1)]).set_duration(15.4)
    #
    #         video.write_videofile(filename, preset='superfast', verbose=False)
    #         clip.close()
    #         video.close()
    #
    #     @commands.command(name='crabrave', description='Make a Crab Rave meme!', hidden=True)
    #     async def crabmeme(self, ctx, *, text: str):
    #         '''Limited to owner only (for now, it may return) due to this command using like 90% CPU'''
    #         if not await self.bot.is_owner(ctx.author):
    #             return
    #         if not '|' in text:
    #             raise commands.ArgumentParsingError('Text should be separated by |')
    #         if not text:
    #             raise commands.MissingRequiredArgument('You need to provide text for the meme')
    #         filename = str(ctx.author.id) + '.mp4'
    #         t = text.upper().replace('| ', '|').split('|')
    #         if len(t) != 2:
    #             raise commands.ArgumentParsingError('Text should have 2 sections, separated by |')
    #         if (not t[0] and not t[0].strip()) or (not t[1] and not t[1].strip()):
    #             raise commands.ArgumentParsingError('Cannot use an empty string')
    #         msg = await ctx.send('🦀 Generating Crab Rave 🦀')
    #         await self.loop.run_in_executor(None, func=functools.partial(self.gencrabrave, t, filename))
    #         meme = discord.File(filename, 'crab.mp4')
    #         await msg.delete()
    #         await ctx.send(file=meme)
    #         os.remove(filename)

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

    @commands.command(
        name="addrank",
        description="Add a role that users can join through the rank command.",
    )
    @has_permissions(manage_roles=True)
    @bot_has_permissions(manage_roles=True)
    @commands.guild_only()
    async def addrank(self, ctx, *, role: Role):
        if role.position >= ctx.guild.me.top_role.position:
            return await ctx.error("You cannot add a role that is above my top role.")
        if role.managed:
            return await ctx.error(
                "You cannot add a role that is managed by an integration."
            )
        current = ctx.config.get("utils.ranks")
        if role in current:
            return await ctx.error("You cannot add an existing rank.")
        current.append(role)
        await ctx.config.set("utils.ranks", current)
        await ctx.success(
            f"Successfully added the rank {role.name}!"
        )
        embed = (
            discord.Embed(
                color=discord.Color.green(),
                timestamp=datetime.datetime.now(datetime.timezone.utc),
            )
            .set_author(
                name=f"Rank Added | {role.name}", icon_url=str(ctx.guild.icon_url)
            )
            .add_field(name="User", value=ctx.author.mention, inline=False)
            .add_field(name="Role", value=f"{role.mention}", inline=False)
            .set_footer(text=f"User ID: {ctx.author.id} | Role ID: {role.id}")
        )
        try:
            await ctx.modlog(embed=embed)
        except Exception:
            pass

    @commands.command(
        name="delrank", description="Remove a rank from the list of joinable roles."
    )
    @has_permissions(manage_roles=True)
    @bot_has_permissions(manage_roles=True)
    @commands.guild_only()
    async def delrank(self, ctx, *, role: Role):
        current = ctx.config.get("utils.ranks")
        if role not in current:
            return await ctx.error("You cannot remove a rank that doesn't exist")
        current.remove(role)
        await ctx.config.set("utils.ranks", current)
        await ctx.success(
            f"Successfully removed the rank {role.name}!"
        )
        embed = (
            discord.Embed(
                color=discord.Color.red(),
                timestamp=datetime.datetime.now(datetime.timezone.utc),
            )
            .set_author(
                name=f"Rank Removed | {role.name}", icon_url=str(ctx.guild.icon_url)
            )
            .add_field(name="User", value=ctx.author.mention, inline=False)
            .add_field(name="Role", value=f"{role.mention}", inline=False)
            .set_footer(text=f"User ID: {ctx.author.id} | Role ID: {role.id}")
        )
        try:
            await ctx.modlog(embed=embed)
        except Exception:
            pass

    @commands.command(
        name="rank",
        description="List all available ranks and join a rank",
        aliases=["ranks"],
    )
    @bot_has_permissions(manage_roles=True)
    @commands.guild_only()
    async def rank(self, ctx, *, role: Role = None):
        ranks = [r for r in ctx.config.get("utils.ranks") if r]
        ranks_raw = ctx.config.get("utils.ranks")
        if ranks != ranks_raw:
            await ctx.config.set("utils.ranks", ranks)
        if not role:
            if not ranks:
                return await ctx.error(
                    "Seems like there's no ranks set for this guild :c"
                )
            roles = []
            is_cached = len(ctx.guild.members) / ctx.guild.member_count
            for r in ranks:
                roles.append(
                    f"> {r.mention} ({len(r.members):,d} members)"
                    if is_cached > 0.98
                    else f"> {r.mention}"
                )
            embed = discord.Embed(
                color=ctx.author.color,
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                description="\n".join(roles),
            )
            embed.set_author(
                name=f"{ctx.guild.name}'s ranks", icon_url=str(ctx.guild.icon_url)
            )
            await ctx.send(embed=embed)
        else:
            if role.id == 595626786549792793:
                return await ctx.error(f"Please use `/rank Beta Testing` instead.")
            if role not in ranks:
                return await ctx.error(
                    f"I cannot find the rank **{discord.utils.escape_markdown(role.name)}**. Type '{ctx.prefix}rank' to see a list of ranks"
                )
            if role in ctx.author.roles:
                await ctx.author.remove_roles(role, reason="Left rank")
                await ctx.success(
                    f"You successfully left the {discord.utils.escape_markdown(role.name)} rank."
                )
            else:
                await ctx.author.add_roles(role, reason="Joined rank")
                await ctx.success(
                    f"You successfully joined the {discord.utils.escape_markdown(role.name)} rank."
                )

    # @commands.Cog.listener()
    # async def on_reaction_add(self, reaction, member):
    #     if type(member) == discord.Member:
    #         try:
    #             if await self.member_guild_check(member):
    #                 guild = user.guild
    #                 message = reaction.message
    #                 rr = self.reactroles[guild.id]
    #                 roleid = rr["role"]
    #                 msgid = rr["message"]
    #                 emote = rr["emote"]
    #                 if roleid is not None:
    #                     if msgid is not None:
    #                         if emote is not None:
    #                             emotecheck = None
    #                             try:
    #                                 emote = int(emote)
    #                                 if emote == reaction.emoji.id:
    #                                     emotecheck = True
    #                             except Exception:
    #                                 emote = str(emote)
    #                                 if emote == reaction.emoji:
    #                                     emotecheck = True
    #                             if emotecheck:
    #                                 role = discord.utils.get(guild.roles, id=roleid)
    #                                 if role is not None:
    #                                     try:
    #                                         await user.add_roles(role, reason='Reaction Role')
    #                                     except Exception:
    #                                         pass
    #         except Exception:
    #             return

    # @commands.Cog.listener()
    # async def on_reaction_remove(self, reaction, user):
    #     if type(user) == discord.Member:
    #         try:
    #             if await self.member_guild_check(user):
    #                 guild = user.guild
    #                 message = reaction.message
    #                 rr = self.reactroles[guild.id]
    #                 roleid = rr["role"]
    #                 msgid = rr["message"]
    #                 emote = rr["emote"]
    #                 if roleid is not None:
    #                     if msgid is not None:
    #                         if emote is not None:
    #                             emotecheck = None
    #                             try:
    #                                 emote = int(emote)
    #                                 if emote == reaction.emoji.id:
    #                                     emotecheck = True
    #                             except Exception:
    #                                 emote = str(emote)
    #                                 if emote == reaction.emoji:
    #                                     emotecheck = True
    #                             if emotecheck:
    #                                 role = discord.utils.get(guild.roles, id=roleid)
    #                                 if role is not None:
    #                                     try:
    #                                         await user.remove_roles(role, reason='Reaction Role')
    #                                     except Exception:
    #                                         pass
    #         except Exception:
    #             return

    @commands.Cog.listener()
    async def on_member_join(self, member):
        if await self.bot.has_ts_bot(member.guild):
            return
        if member.guild.id in self.bot.premium_guilds:
            try:
                role = self.bot.get_config(member.guild).get("mod.autorole")
                wait = self.bot.get_config(member.guild).get(
                    "mod.autorole.waitformsg")
                if role is not None and not wait and not role in member.roles:
                    await member.add_roles(role, reason="Auto-Role")
            except Exception:
                pass

    @commands.Cog.listener()
    async def on_message(self, message):
        if await self.bot.has_ts_bot(message.guild):
            return
        member = message.author if isinstance(
            message.author, discord.Member) else None
        if member and member.guild.id in self.bot.premium_guilds:
            try:
                config = self.bot.get_config(member.guild)
                role = config.get("mod.autorole")
                wait = config.get("mod.autorole.waitformsg")
                if role is not None and wait and role not in member.roles:
                    await member.add_roles(
                        role, reason="Auto-Role (Waited for message before adding)"
                    )
            except Exception as e:
                pass


def setup(bot):
    bot.add_cog(Premium(bot))
    bot.logger.info(f"$GREENLoaded Premium cog!")
