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

class utils:
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

	async def on_guild_remove(self, guild):
		try:
			del snipes[guild.id]
		except KeyError:
			pass

	async def on_guild_channel_delete(self, channel):
		try:
			del snipes[channel.guild.id][channel.id]
		except KeyError:
			pass

	async def on_message_delete(self, message):
		if message.guild and not message.author.bot:
			try:
				snipes[message.guild.id][message.channel.id] = message
			except KeyError:
				snipes[message.guild.id] = {message.channel.id: message}

	@commands.command(description='Get the last deleted message')
	async def snipe(self, ctx, channel: discord.TextChannel = None):
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

	@commands.command(description='Find a user from their id')
	async def fetchuser(self, ctx, user: int = None):
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