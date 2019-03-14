from discord.ext import commands
from discord.ext.commands import has_permissions, MissingPermissions
import discord
import logging
import datetime
import os
import json
import aiohttp
import time
import asyncio
import random
import dataset

db = dataset.connect('sqlite:///fire.db')
prefixes = db['prefixes']

with open('config.json', 'r') as cfg:
	config = json.load(cfg)

logging.basicConfig(filename='bot.log',level=logging.INFO)

def isadmin(ctx):
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

async def get_pre(bot, message):
	if not message.guild:
		return "$"
	prefixraw = prefixes.find_one(gid=message.guild.id)
	if prefixraw != None:
		prefix = prefixraw['prefix']
	else:
		prefix = "$"
	return commands.when_mentioned_or(prefix)(bot, message)

bot = commands.Bot(command_prefix=get_pre, status=discord.Status.idle, activity=discord.Game(name="Loading..."), case_insensitive=True)

extensions = [
	"cogs.fire",
	"cogs.music",
	"cogs.pickle",
	"cogs.ksoft",
	"cogs.skier",
	"cogs.utils",
	"jishaku"
]

for cog in extensions:
	try:
		bot.load_extension(cog)
	except Exception as e:
	   print(f"Error while loading {cog}: {e}")


async def pushbullet(msgtype: str, title: str, message: str):
	print("Attempting to send a request to pushbullet")
	headers = {
		'USER-AGENT': 'Fire',
		'CONTENT-TYPE': 'application/json',
		'ACCESS-TOKEN': config['pushbullet']}
	body = {
		'type': f'{msgtype}',
		'title': f'{title}',
		'body': f'{message}',
		'url': 'https://discordapp.com/channels/@me'}
	url = "https://api.pushbullet.com/v2/pushes"
	async with aiohttp.ClientSession(headers=headers) as session:
		async with session.post(url, json=body) as resp:
			status = resp.status
			if status == 200:
				print("Pushbullet request completed successfully")
			else:
				print(f"Pushbullet request was unsuccessful!\n Status code: {status}")

@bot.event
async def on_command_error(ctx, error):

	# This prevents any commands with local handlers being handled here in on_command_error.
	if hasattr(ctx.command, 'on_error'):
		return
	
	ignored = (commands.CommandNotFound, commands.UserInputError)
	
	# Allows us to check for original exceptions raised and sent to CommandInvokeError.
	# If nothing is found. We keep the exception passed to on_command_error.
	error = getattr(error, 'original', error)
	
	# Anything in ignored will return and prevent anything happening.
	if isinstance(error, ignored):
		return

	elif isinstance(error, commands.DisabledCommand):
		return await ctx.send(f'{ctx.command} has been disabled.')

	elif isinstance(error, commands.MissingPermissions):
		return await ctx.send(f'{ctx.message.author}, you lack the required permission for this command.')

	elif isinstance(error, commands.NoPrivateMessage):
		try:
			return await ctx.author.send(f'{ctx.command} can not be used in Private Messages.')
		except:
			pass
	
	elif isinstance(error, commands.NotOwner):
		try:
			await ctx.send(f'{ctx.command} requires bot admin, which you lack...')
		except:
			pass

@bot.event
async def on_ready():
	print("-------------------------")
	print(f"Bot: {bot.user}")
	print(f"ID: {bot.user.id}")
	print(f"Guilds: {len(bot.guilds)}")
	print(f"Users: {len(bot.users)}")
	print("-------------------------")
	logging.info("-------------------------")
	logging.info(f"Bot: {bot.user}")
	logging.info(f"ID: {bot.user.id}")
	logging.info(f"Guilds: {len(bot.guilds)}")
	logging.info(f"Users: {len(bot.users)}")
	logging.info("-------------------------")
	print("Loaded!")
	logging.info(f"LOGGING START ON {datetime.datetime.now()}")
	await game_changer()

@bot.check
async def hve_block(ctx):
	if ctx.message.author.id == 261418273009041408:
		return False
	else:
		return True

@bot.event
async def on_message(message):
	if message.author.bot == True:
		return
	if message.content == "":
		return
	await bot.process_commands(message)

@bot.event
async def on_guild_join(guild):
	print(f"Fire joined a new guild! {guild.name}({guild.id}) with {guild.member_count} members")
	pushb = await pushbullet("note", "Fire joined a new guild!", f"Fire joined {guild.name}({guild.id}) with {guild.member_count} members")
	if pushb == "Success":
		print("Pushbullet request completed successfully")
	if pushb == "Unauthorized":
		print("Pushbullet request was not successful...")
	users = format(len(bot.users), ',d')
	guilds = format(len(bot.guilds), ',d')
	await bot.change_presence(status=discord.Status.idle, activity=discord.Game(name=f"{users} users in {guilds} guilds"))


@bot.event
async def on_guild_remove(guild):
	print(f"Fire left the guild {guild.name}({guild.id}) with {guild.member_count} members! Goodbye o/")
	await pushbullet("link", "Fire left a guild!", f"Fire left {guild.name}({guild.id}) with {guild.member_count} members! Goodbye o/")
	users = format(len(bot.users), ',d')
	guilds = format(len(bot.guilds), ',d')
	await bot.change_presence(status=discord.Status.idle, activity=discord.Game(name=f"{users} users in {guilds} guilds"))
	prefixraw = prefixes.find_one(gid=guild.id)
	if prefixraw == None:
		return
	else:
		dbid = prefixraw['id']
		prefixes.delete(id=dbid)

@bot.command(description="Change my prefix for this guild.")
@has_permissions(administrator=True)
@commands.guild_only()
async def prefix(ctx, pfx: str = None):
	"""Change my prefix for this guild."""
	if pfx == None:
		await ctx.send("Missing argument for prefix! (Note: For prefixes with a space, surround it in \"\")")
	else:
		prefixraw = prefixes.find_one(gid=ctx.guild.id)
		if prefixraw == None:
			prefixes.insert(dict(name=ctx.guild.name, gid=ctx.guild.id, prefix=pfx))
		else:
			pfxid = prefixraw['id']
			prefixes.update(dict(id=pfxid, prefix=pfx), ['id'])
		await ctx.send(f'Ok, {ctx.guild.name}\'s prefix is now {pfx}!')

@bot.command(hidden=True)
async def shutdown(ctx):
	if isadmin(ctx):
		for VoiceClient in bot.voice_clients:
			await VoiceClient.disconnect()
		await ctx.send("bye bitch")
		await bot.logout()
		quit()
	else:
		await ctx.send("no.")

@bot.command(hidden=True)
async def reload(ctx, cog: str = None):
	if isadmin(ctx):
		if cog == None:
			await ctx.send("provide a cog to reload you fucking idot")
			return
		else:
			if "cogs." not in cog:
				if cog == 'jishaku':
					bot.unload_extension(cog)
					bot.load_extension(cog)
				else:
					await ctx.send("cogs start with `cogs.` you fucking idot")
					return
			else:
				try:
					bot.unload_extension(cog)
					bot.load_extension(cog)
				except Exception as e:
					await ctx.send(f"Fire did an oopsie ```{e}```")
				else:
					await ctx.send(f"i think i reloaded {cog} but if it broke then blame yourself not me")
	else:
		await ctx.send("no.")

async def game_changer():
	while True:
		print("Changing game...")
		randint = random.randint(1, 3)
		users = format(len(bot.users), ',d')
		guilds = format(len(bot.guilds), ',d')
		if randint == 1:
	   		await bot.change_presence(status=discord.Status.idle, activity=discord.Game(name=f"{users} users in {guilds} guilds"))
		if randint == 2:
			await bot.change_presence(status=discord.Status.dnd, activity=discord.Game(name="Fire is currently in BETA"))
		if randint == 3:
			me = bot.get_user(287698408855044097)
			await bot.change_presence(status=discord.Status.idle, activity=discord.Game(name=f"Created by {me}"))
		print("Game changed. going to sleep for 60 seconds")
		await asyncio.sleep(60)

bot.run(config['token'])