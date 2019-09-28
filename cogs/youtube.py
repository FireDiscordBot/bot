import discord
from discord.ext import commands
from fire.youtube import findvideo
from jishaku.paginators import WrappedPaginator, PaginatorEmbedInterface
from jishaku.cog import Jishaku
import googleapiclient.discovery
import functools
import datetime
import json

print("youtube.py has been loaded")

with open('config_prod.json', 'r') as cfg:
	config = json.load(cfg)

def isadmin(ctx):
	"""Checks if the author is an admin"""
	if str(ctx.author.id) not in config['admins']:
		admin = False
	else:
		admin = True
	return admin

class youtube(commands.Cog, name="YouTube API"):
	def __init__(self, bot):
		self.bot = bot
		self.key = config['youtube']
		self.apiname = 'youtube'
		self.apiver = 'v3'
		self.loop = bot.loop

	async def cog_check(self, ctx: commands.Context):
		if ctx.guild.id == 411619823445999637:
			if ctx.channel.id == 577203509863251989:
				return True
			return False
		return True

	def popular(self):
		youtube = googleapiclient.discovery.build(
        self.apiname, self.apiver, developerKey=self.key)

		request = youtube.videos().list(
			part="snippet,contentDetails,statistics",
			chart="mostPopular",
			maxResults=5,
			regionCode="US"
		)
		response = request.execute()
		videos = []
		for video in response["items"]:
			videos.append(video)
		return videos
	
	def video_info(self, vid):
		youtube = googleapiclient.discovery.build(
        self.apiname, self.apiver, developerKey=self.key)

		request = youtube.videos().list(
			part="snippet,contentDetails,statistics",
			id=vid
		)
		response = request.execute()
		return response

	@commands.group(name="yt", aliases=['youtube'], invoke_without_command=True, description='YouTube commands.')
	async def yt(self, ctx):
		'''PFXyt [<info <video id>>]'''
		videos = await self.loop.run_in_executor(None, func=self.popular)
		embed = discord.Embed(title="Trending on YouTube (US)", color=ctx.author.color, timestamp=datetime.datetime.utcnow())
		for video in videos:
			title = video['snippet']['title']
			vid = video['id']
			author = video['snippet']['channelTitle']
			authorid = video['snippet']['channelId']
			published = video['snippet']['publishedAt'].replace('T', ' ').split('.')[0]
			duration = video['contentDetails']['duration'].replace('PT', '').replace('H', ' Hrs ').replace('M', ' Mins ').replace('S', 'Secs')
			views = format(int(video['statistics']['viewCount']), ',d')
			likes = format(int(video['statistics']['likeCount']), ',d')
			dislikes = format(int(video['statistics']['dislikeCount']), ',d')
			comments = format(int(video['statistics']['commentCount']), ',d')
			embed.add_field(name=video["snippet"]["title"], value=f"» Link: [{title}](https://youtu.be/{vid} 'Click here to watch the video')\n» Author: [{author}](https://youtube.com/channel/{authorid} 'Click here to checkout {author} channel')\n» Published: {published}\n» Views: {views}\n» Likes: {likes}\n» Dislikes: {dislikes}\n» Comments: {comments}", inline=False)
		await ctx.send(embed=embed)

	@yt.command(name="info", description="Retrieve info from a video URL or ID")
	async def info(self, ctx, video: str):
		if findvideo(video):
			video = findvideo(video)
		videoinfo = await self.loop.run_in_executor(None, func=functools.partial(self.video_info, video))
		videoinfo = videoinfo['items'][0]
		title = videoinfo['snippet']['title']
		vid = videoinfo['id']
		author = videoinfo['snippet']['channelTitle']
		authorid = videoinfo['snippet']['channelId']
		published = videoinfo['snippet']['publishedAt'].replace('T', ' ').split('.')[0]
		duration = videoinfo['contentDetails']['duration'].replace('PT', '').replace('H', ' Hrs ').replace('M', ' Mins ').replace('S', 'Secs')
		description: str = videoinfo['snippet']['description']
		paginator = WrappedPaginator(prefix='```\nDescription (Use controls to change page)\n', suffix='```', max_size=1895)
		for line in description.split('\n'):
			paginator.add_line(line)
		views = format(int(videoinfo['statistics']['viewCount']), ',d')
		likes = format(int(videoinfo['statistics']['likeCount']), ',d')
		dislikes = format(int(videoinfo['statistics']['dislikeCount']), ',d')
		comments = format(int(videoinfo['statistics']['commentCount']), ',d')
		embed = discord.Embed(title=f"Video info for {video}", color=ctx.author.color, timestamp=datetime.datetime.utcnow())
		embed.add_field(name=videoinfo["snippet"]["title"], value=f"» Link: [{title}](https://youtu.be/{vid} 'Click here to watch the video')\n» Author: [{author}](https://youtube.com/channel/{authorid} 'Click here to checkout {author} channel')\n» Published: {published}\n» Views: {views}\n» Likes: {likes}\n» Dislikes: {dislikes}\n» Comments: {comments}", inline=False)
		interface = PaginatorEmbedInterface(ctx.bot, paginator, owner=ctx.author, _embed=embed)
		return await interface.send_to(ctx)
		


def setup(bot):
	bot.add_cog(youtube(bot))