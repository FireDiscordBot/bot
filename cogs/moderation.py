import discord
from discord.ext import commands

class StaffCheck(commands.Converter):
	async def convert(self, ctx, argument):
		argument = await commands.MemberConverter().convert(ctx, argument)
		permission = argument.guild_permissions.manage_messages
		if not permission:
			return argument
		else:
			raise commands.BadArgument("You cannot punish other staff members")

class MuteCheck(commands.Converter):
	async def convert(self, ctx, argument):
		argument = await commands.MemberConverter().convert(ctx, argument)
		muted = discord.utils.get(ctx.guild.roles, name="Muted")
		if muted in argument.roles:
			return argument
		else:
			raise commands.BadArgument("The user was not muted.")
			
async def mute(ctx, user, reason):
	if not reason:
		reason = "No reason specified."
	muted = discord.utils.get(ctx.guild.roles, name="Muted")
	mutedchat = discord.utils.get(ctx.guild.text_channels, name="muted-chat")
	e = False
	if not muted:
		try:
			muted = await ctx.guild.create_role(name="Muted", reason="To use for muting", color=discord.Color().orange())
			e = await ctx.send('Can\'t find muted role. Making one now...')
			roles = ctx.guild.roles
			for role in roles:
				try:
					await muted.edit(position=role.position)
				except Exception:
					pass
			for channel in ctx.guild.channels:
				await channel.set_permissions(muted, send_messages=False,
											  read_message_history=False,
											  read_messages=False)
		except discord.Forbidden:
			return await ctx.send("I have no permissions to make a muted role")
		await user.add_roles(muted)
		if e:
			await e.delete()
		await ctx.send(f"{user.mention} has been muted for {reason}")
	else:
		await user.add_roles(muted)
		await ctx.send(f"{user.mention} has been muted for {reason}")
	   
	if not mutedchat:
		overwrites = {ctx.guild.default_role: discord.PermissionOverwrite(read_messages=False),
					  ctx.guild.me: discord.PermissionOverwrite(send_messages=True),
					  muted: discord.PermissionOverwrite(read_message_history=True, read_messages=True, send_messages=True)}
		try:
			channel = await ctx.guild.create_text_channel('muted-chat', overwrites=overwrites)
			await channel.send(f"Welcome {user.mention} to {channel.mention} You will spend your time here until you get unmuted. Enjoy the silence.")
		except discord.Forbidden:
			return await ctx.send("I have no permissions to make #muted-chat")
	else:
		await mutedchat.set_permissions(muted, send_messages=True,
											  read_message_history=True,
											  read_messages=True)
		await mutedchat.send(f"Welcome {user.mention} to {mutedchat.mention} You will spend your time here until you get unmuted. Enjoy the silence.")
			
class Moderation(commands.Cog, name="Mod Commands"):
	"""Commands used to moderate your guild"""
	
	def __init__(self, bot):
		self.bot = bot
	
	async def __error(self, ctx, error):
		if isinstance(error, commands.BadArgument):
			await ctx.send(error)
			
	@commands.command(aliases=["banish"], description="Ban a user from the server")
	@commands.has_permissions(ban_members=True)
	@commands.bot_has_permissions(ban_members=True)
	async def ban(self, ctx, user: StaffCheck = None, reason = None, messages: int = 0):
		"""PFXban <user> [<reason> <amount of days: 1-7>]"""
		await ctx.trigger_typing()
		
		if not user:
			return await ctx.send("You must specify a user")

		if messages > 7:
			raise commands.ArgumentParsingError('I can only delete up to 7 days of messages')
		elif messages < 0:
			raise commands.ArgumentParsingError('That\'s not a valid number of days. It should be 1-7')
		
		try:
			if reason:
				await ctx.guild.ban(user, reason=f"Banned by {ctx.author} for {reason}", delete_message_days=messages)
				await ctx.send(f"{user.mention} has been banished from {ctx.guild.name} for {reason}.")
			else:
				await ctx.guild.ban(user, reason=f"Banned by {ctx.author}", delete_message_days=messages)
				await ctx.send(f"{user.mention} has been banished from {ctx.guild.name}")
		except discord.Forbidden:
			raise commands.MissingPermissions("Ban failed. Are you trying to ban someone higher than the bot?")

	@commands.command(description="Temporarily restricts access to this server.")
	@commands.has_permissions(ban_members=True)
	@commands.bot_has_permissions(ban_members=True)
	async def softban(self, ctx, user: StaffCheck = None, reason = None, messages: int = 0):
		"""PFXsoftban <user> [<reason> <amount of days: 1-7>]"""
		await ctx.trigger_typing()

		if not user:
			return await ctx.send("You must specify a user")
		
		if messages > 7:
			raise commands.ArgumentParsingError('I can only delete up to 7 days of messages')
		elif messages < 0:
			raise commands.ArgumentParsingError('That\'s not a valid number of days. It should be 1-7')

		try:
			if reason:
				await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author} for {reason}", delete_message_days=messages) 
				await ctx.guild.unban(user, reason="Temporarily Banned")
			else:
				await ctx.guild.ban(user, reason=f"Softbanned by {ctx.author}", delete_message_days=messages) 
				await ctx.guild.unban(user, reason="Temporarily Banned")
			await ctx.send(f"{user.mention} has been temporarily banished from {ctx.guild.name}")
		except discord.Forbidden:
			raise commands.MissingPermissions("Soft-ban failed. Are you trying to soft-ban someone higher than the bot?")
	
	@commands.command(description="Mute a user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def mute(self, ctx, user: StaffCheck, *, reason = None):
		"""PFXmute <user> [<reason>]"""
		await ctx.trigger_typing()
		await mute(ctx, user, reason or "No reason provided.")
	
	@commands.command(description="Kick a user.")
	@commands.has_permissions(kick_members=True)
	@commands.bot_has_permissions(kick_members=True)
	async def kick(self, ctx, user: StaffCheck = None, *, reason = None):
		"""PFXkick <user> [<reason>]"""
		await ctx.trigger_typing()
		if not user:
			return await ctx.send("You must specify a user")
		
		try:
			if reason:
				await ctx.guild.kick(user, reason=f"Kicked by {ctx.author} for {reason}")
			else:
				 await ctx.guild.kick(user, reason=f"Kicked by {ctx.author}")
		except discord.Forbidden:
			raise commands.MissingPermissions("Kick failed. Are you trying to kick someone higher than the bot?")
	
	@commands.command(description="Unmute a muted user.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unmute(self, ctx, user: MuteCheck):
		"""PFXunmute <user>"""
		await ctx.trigger_typing()
		await user.remove_roles(discord.utils.get(ctx.guild.roles, name="Muted"))
		await ctx.send(f"{user.mention} has been unmuted")

	@commands.command(description="Mute a user in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def block(self, ctx, user: StaffCheck = None, *, reason = None):
		"""PFXblock <user> [<reason>]"""
		await ctx.trigger_typing()
		if not user:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(user, send_messages=False, reason=reason or 'No reason specified.')
		await ctx.send(f'Successfully blocked {user.mention} from chatting in {ctx.channel.mention}.')
	
	@commands.command(description="Unmute a user who has been blocked in the current channel.")
	@commands.has_permissions(manage_messages=True)
	@commands.bot_has_permissions(manage_roles=True)
	async def unblock(self, ctx, user: StaffCheck = None, *, reason = None):
		"""PFXunblock <user> [<reason>]"""
		await ctx.trigger_typing()
		if not user:
			return await ctx.send("You must specify a user")
		
		await ctx.channel.set_permissions(user, send_messages=True, reason=reason or 'No reason specified.')
		await ctx.send(f'Successfully unblocked {user.mention}. Welcome back!')
								
								
def setup(bot):
	bot.add_cog(Moderation(bot))