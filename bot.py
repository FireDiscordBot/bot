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
import traceback

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
bot.bl = db['blacklist']

extensions = [
	"cogs.fire",
	"cogs.music",
	"cogs.pickle",
	"cogs.ksoft",
	"cogs.skier",
	"cogs.utils",
	"cogs.help_cmd",
	"cogs.dbl",
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
	
	ignored = (commands.CommandNotFound, commands.CheckFailure, KeyError)
	
	# Allows us to check for original exceptions raised and sent to CommandInvokeError.
	# If nothing is found. We keep the exception passed to on_command_error.
	error = getattr(error, 'original', error)

	# Anything in ignored will return and prevent anything happening.
	if isinstance(error, ignored):
		if 'permission' in str(error):
			pass
		else:
			return
	
	if isinstance(error, commands.CommandOnCooldown):
		embed = discord.Embed(title='Command on cooldown...', colour=ctx.author.color, url="https://http.cat/429", description=f"Here's what happened\n```py\n{error}```", timestamp=datetime.datetime.now())
		embed.set_footer(text="Just wait a bit and it'll be fine!")
		await ctx.send(embed=embed)
		return

	messages = ['Fire did an oopsie!', 'Oh no, it be broke.', 'this was intentional...', 'Well this slipped through quality assurance', 'How did this happen?', 'rip', 'Can we get an L in the chat?', 'Can we get an F in the chat?', 'he do not sing', 'lmao who did this?']
	chosenmessage = random.choice(messages)
	embed = discord.Embed(title=chosenmessage, colour=ctx.author.color, url="https://http.cat/500", description=f"Here's the error. You might not be able to do anything about it though... I've sent this to my developer!\n```py\n{error}```", timestamp=datetime.datetime.now())
	embed.set_footer(text="this may or may not be fixed soon. it may not even be broken.")
	await ctx.send(embed=embed)
	embed = discord.Embed(title=chosenmessage, colour=ctx.author.color, url="https://http.cat/500", description=f"hi. someone did something and this happened. pls fix now!\n```py\n{error}```", timestamp=datetime.datetime.now())
	embed.add_field(name='User', value=ctx.author, inline=False)
	embed.add_field(name='Guild', value=ctx.guild, inline=False)
	embed.add_field(name='Message', value=ctx.message.content, inline=False)
	me = bot.get_user(287698408855044097)
	nomsg = (commands.BotMissingPermissions, commands.MissingPermissions, commands.UserInputError)
	if isinstance(error, nomsg):
		print('not sending message to dms')
	else:
		await me.send(embed=embed)

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

@bot.event
async def on_message(message):
	if message.author.bot == True:
		return
	if message.content == "":
		return
	await bot.process_commands(message)

@bot.event
async def on_message_edit(before,after):
	await bot.process_commands(after)

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

@bot.check
async def blacklist_check(ctx):
	blacklist = bot.bl.find_one(uid=ctx.author.id)
	if blacklist != None:
		if ctx.author.id == bot.owner_id:
			return True
		else:
			return False
	else:
		return True

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