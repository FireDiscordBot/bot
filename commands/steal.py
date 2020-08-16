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


from discord.ext import commands
import traceback
import discord
import datetime
import typing
import re


class Steal(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.command(description="Steal an emote so you can use it in your own server")
    async def steal(self, ctx, emoji: typing.Union[discord.PartialEmoji, int, str]):
        if isinstance(emoji, discord.PartialEmoji):
            try:
                raw = await emoji.url.read()
            except discord.HTTPException as e:
                return await ctx.error(f"Failed to fetch image ({e.status})")
            try:
                stolen = await guild.create_custom_emoji(
                    name=emoji.name, image=raw, reason=f"Stolen by {ctx.author}"
                )
            except discord.DiscordException as e:
                return await ctx.error(f"Failed to create the emote")
            return await ctx.success(f"Successfully stole emote, {stolen}")
        elif isinstance(emoji, int):
            asset = discord.Asset(self.bot._connection, f"/emojis/{emoji}")
            try:
                raw = await asset.read()
            except discord.HTTPException as e:
                return await ctx.error(
                    f"Failed to fetch image, make sure the id is a valid emote id ({e.status})"
                )
            stolen = await guild.create_custom_emoji(
                name="stolen_emoji", image=raw, reason=f"Stolen by {ctx.author}"
            )
            return await ctx.success(
                f"Successfully stole emote, {stolen} (you might wanna rename it)"
            )
        elif isinstance(emoji, str):
            try:
                asset_url = (
                    re.findall(
                        r"https?:\/\/cdn\.discordapp\.com(\/emojis\/739956106373365770)\.\w{3,4}",
                        emoji,
                        re.MULTILINE,
                    )
                )[
                    0
                ]  # napkin pls don't kill me for shit regex
            except IndexError:
                return await ctx.error(
                    f"You must provide a valid emote, emote id or emote url"
                )
            asset = discord.Asset(self.bot._connection, asset_url)
            try:
                raw = await asset.read()
            except discord.HTTPException as e:
                return await ctx.error(
                    f"Failed to fetch image, make sure the url is a valid emote url ({e.status})"
                )
            stolen = await guild.create_custom_emoji(
                name="stolen_emoji", image=raw, reason=f"Stolen by {ctx.author}"
            )
            return await ctx.success(
                f"Successfully stole emote, {stolen} (you might wanna rename it)"
            )


def setup(bot):
    try:
        bot.add_cog(Steal(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"steal" $GREENcommand!')
    except Exception as e:
        bot.logger.error(f'$REDError while adding command $CYAN"steal"', exc_info=e)
