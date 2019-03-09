import discord
from discord.ext import commands
import datetime
import json
import time

launchtime = datetime.datetime.utcnow()

print("utils.py has been loaded")

with open('config.json', 'r') as cfg:
	config = json.load(cfg)
	error_string = config['response_string']['error']
	success_string = config['response_string']['success']

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

async def getprefix(ctx):
	if not ctx.guild:
		return "$"
	with open('prefixes.json', 'r') as pfx:
		customprefix = json.load(pfx)
	try:
		prefix = customprefix[str(ctx.guild.id)]
	except Exception:
		prefix = "$"
	return prefix

snipes = {}
disabled = [264445053596991498, 110373943822540800]

def snipe_embed(context_channel, message, user):
	if message.author not in message.guild.members or message.author.color == discord.Colour.default():
		embed = discord.Embed(description = message.content, timestamp = message.created_at)
	else:
		embed = discord.Embed(description = message.content, color = message.author.color, timestamp = message.created_at)
	embed.set_author(name = str(message.author), icon_url = message.author.avatar_url)
	if message.attachments:
		embed.add_field(name = 'Attachment(s)', value = '\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
	if message.channel != context_channel:
		embed.set_footer(text = 'Sniped by: ' + str(user) + ' | in channel: #' + message.channel.name)
	else:
		embed.set_footer(text = 'Sniped by: ' + str(user))
	return embed

def quote_embed(context_channel, message, user):
	if not message.content and message.embeds and message.author.bot:
		embed = message.embeds[0]
	else:
		if message.author not in message.guild.members or message.author.color == discord.Colour.default():
			embed = discord.Embed(timestamp = message.created_at)
			embed.add_field(name='Message', value=message.content, inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		else:
			embed = discord.Embed(color = message.author.color, timestamp = message.created_at)
			embed.add_field(name='Message', value=message.content, inline=False)
			embed.add_field(name='Jump URL', value=f'[Click Here]({message.jump_url})', inline=False)
		if message.attachments:
			if message.channel.is_nsfw() and not context_channel.is_nsfw():
				embed.add_field(name = 'Attachments', value = ':underage: Quoted message is from an NSFW channel.')
			elif len(message.attachments) == 1 and message.attachments[0].url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.gifv', '.webp', '.bmp')):
				embed.set_image(url = message.attachments[0].url)
			else:
				for attachment in message.attachments:
					embed.add_field(name = 'Attachment', value = '[' + attachment.filename + '](' + attachment.url + ')', inline = False)
		embed.set_author(name = str(message.author), icon_url = message.author.avatar_url, url = 'https://discordapp.com/channels/' + str(message.guild.id) + '/' + str(message.channel.id) + '/' + str(message.id))
		if message.channel != context_channel:
			embed.set_footer(text = 'Quoted by: ' + str(user) + ' | #' + message.channel.name)
		else:
			embed.set_footer(text = 'Quoted by: ' + str(user))
	return embed

class utils(commands.Cog, name="Utility Commands"):
	def __init__(self, bot):
		self.bot = bot

	@commands.command(description='Bulk delete messages')
	@commands.has_permissions(manage_messages=True)
	async def purge(self, ctx, amount: int=None):
		"""Purge an amount of messages in a channel
		-------------------------
		Ex:
		$purge 50"""
		prefix = await getprefix(ctx)
		if amount is None:
			return await ctx.send(f'Hey, please do `{prefix}purge [amount]`!')
		if amount>500 or amount<0:
			return await ctx.send('Invalid amount. Maximum is 500')
		await ctx.message.delete()
		await ctx.message.channel.purge(limit=amount)
		await ctx.send(f'Sucesfully deleted **{int(amount)}** messages!', delete_after=5)

	@commands.Cog.listener()
	async def on_guild_remove(self, guild):
		try:
			del snipes[guild.id]
		except KeyError:
			pass

	@commands.Cog.listener()
	async def on_guild_channel_delete(self, channel):
		try:
			del snipes[channel.guild.id][channel.id]
		except KeyError:
			pass

	@commands.Cog.listener()
	async def on_message_delete(self, message):
		if message.guild and not message.author.bot:
			try:
				snipes[message.guild.id][message.channel.id] = message
			except KeyError:
				snipes[message.guild.id] = {message.channel.id: message}

	@commands.command(description='Get the last deleted message')
	async def snipe(self, ctx, channel: discord.TextChannel = None):
		"""Get the last deleted message"""
		if not channel:
			channel = ctx.channel

		if not ctx.author.permissions_in(channel).read_messages:
			return

		try:
			sniped_message = snipes[ctx.guild.id][channel.id]
		except KeyError:
			return await ctx.send(content = ':x: **No available messages.**')
		else:
			await ctx.send(embed = snipe_embed(ctx.channel, sniped_message, ctx.author))

	@commands.Cog.listener()
	async def on_raw_reaction_add(self, payload):
		if str(payload.emoji) == '💬' and not self.bot.get_guild(payload.guild_id).get_member(payload.user_id).bot:
			guild = self.bot.get_guild(payload.guild_id)
			channel = guild.get_channel(payload.channel_id)
			user = guild.get_member(payload.user_id)

			if user.permissions_in(channel).send_messages:
				try:
					message = await channel.get_message(payload.message_id)
				except discord.NotFound:
					return
				except discord.Forbidden:
					return
				else:
					if not message.content and message.embeds and message.author.bot:
						await channel.send(content = 'Raw embed from `' + str(message.author).strip('`') + '` in ' + message.channel.mention, embed = quote_embed(channel, message, user))
					else:
						await channel.send(embed = quote_embed(channel, message, user))

	@commands.Cog.listener()
	async def on_message(self, message):
		if message.guild.id in disabled:
			return
		perms = message.guild.me.permissions_in(message.channel)
		if not perms.send_messages or not perms.embed_links or message.author.bot:
			return

		for i in message.content.split():
			word = i.lower().strip('<>')
			if word.startswith('https://canary.discordapp.com/channels/'):
				word = word.strip('https://canary.discordapp.com/channels/')
			elif word.startswith('https://ptb.discordapp.com/channels/'):
				word = word.strip('https://ptb.discordapp.com/channels/')
			elif word.startswith('https://discordapp.com/channels/'):
				word = word.strip('https://discordapp.com/channels/')
			else:
				continue

			list_ids = word.split('/')
			if len(list_ids) == 3:
				del list_ids[0]

				try:
					channel = self.bot.get_channel(int(list_ids[0]))
				except:
					continue

				if channel and isinstance(channel, discord.TextChannel):
					try:
						msg_id = int(list_ids[1])
					except:
						continue

					try:
						msg_found = await channel.get_message(msg_id)
					except:
						continue
					else:
						if not msg_found.content and msg_found.embeds and msg_found.author.bot:
							await message.channel.send(content = 'Raw embed from `' + str(msg_found.author).strip('`') + '` in ' + msg_found.channel.mention, embed = quote_embed(message.channel, msg_found, message.author))
						else:
							await message.channel.send(embed = quote_embed(message.channel, msg_found, message.author))

	@commands.command(description="Quote a message from an id")
	async def quote(self, ctx, msg_id: int = None):
		"""Quote a message from an id"""
		if not msg_id:
			return await ctx.send(content = error_string + ' Please specify a message ID to quote.')

		message = None
		try:
			message = await ctx.channel.get_message(msg_id)
		except:
			for channel in ctx.guild.text_channels:
				perms = ctx.guild.me.permissions_in(channel)
				if channel == ctx.channel or not perms.read_messages or not perms.read_message_history:
					continue

				try:
					message = await channel.get_message(msg_id)
				except:
					continue
				else:
					break

		if message:
			if not message.content and message.embeds and message.author.bot:
				await ctx.send(content = 'Raw embed from `' + str(message.author).strip('`') + '` in ' + message.channel.mention, embed = quote_embed(ctx.channel, message, ctx.author))
			else:
				await ctx.send(embed = quote_embed(ctx.channel, message, ctx.author))
		else:
			await ctx.send(content = error_string + ' I couldn\'t find that message...')

	@commands.command(description="Got a HTTP Error Code? My cat knows what it means.", name="http.cat")
	async def httpcat(self, ctx, error: int = 200):
		"""Got a HTTP Error Code? My cat knows what it means."""
		embed = discord.Embed(color=ctx.author.color)
		embed.set_image(url=f'https://http.cat/{error}')
		await ctx.send(embed=embed)

	@commands.command(description='Find a user from their id')
	async def fetchuser(self, ctx, user: int = None):
		"""Find a user from their id"""
		if user == None:
			user = ctx.message.author.id
		try:
			fetched = self.bot.get_user(user)
		except Exception as e:
			await ctx.send(f'Fire did an oopsie! ```{e}```')
		if fetched == None:
			if isadmin(ctx):
				try:
					fetched = await self.bot.get_user_info(user)
				except discord.NotFound:
					await ctx.send('Hmm.... I can\'t seem to find that user', delete_after=10)
					return
				except discord.HTTPException:
					await ctx.send('Something went wrong when trying to find that user...', delete_after=10)
					return
			else:
				await ctx.send('Hmm.... I can\'t seem to find that user', delete_after=10)
				return
		userInfo = {
			'name': fetched.name,
			'discrim': fetched.discriminator,
			'id': fetched.id,
			'bot': fetched.bot,
			'avatar': fetched.avatar
		}
		user = json.dumps(userInfo, indent=2)
		embed = discord.Embed(title=f"Found user {fetched}", description=f"```json\n{user}```")
		await ctx.send(embed=embed)
		
def setup(bot):
	bot.add_cog(utils(bot))