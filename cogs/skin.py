import discord
from discord.ext import commands


class Skin(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(name='skin', description='Show a skin of a Minecraft User')
    async def skincmd(self, ctx, *, username: str = None):
        if str is None:
            # Defines the embed and sets basic options
            embed = discord.Embed(colour=discord.Color.red(
            ), title='Error!', description="You need to supply a username!")

            embed.set_footer(text=f"Requested by: {ctx.author.name}#{ctx.author.discriminator}", icon_url=str(
                ctx.author.avatar_url))  # Sets the footer of the embed
            await ctx.send(embed=embed)  # Sends the embed
        else:
            # Defines the embed and sets basic options
            embed = discord.Embed(colour=ctx.author.color,
                                  title=f"Skin for: {username}")
            embed.set_image(url=f'https://minotar.net/body/{username}/100.png')
            embed.set_footer(text=f"Requested by: {ctx.author.name}#{ctx.author.discriminator}", icon_url=str(
                ctx.author.avatar_url))  # Sets the footer of the embed
            await ctx.send(embed=embed)  # Sends the embed


def setup(bot):
    bot.add_cog(Skin(bot))
