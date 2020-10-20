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
import datetime
import discord
import json


class Purge(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_purge(self, ctx, channel: discord.TextChannel, reason: str = None, purged: list = []):
        embed = (
            discord.Embed(
                color=ctx.author.color,
                timestamp=datetime.datetime.now(datetime.timezone.utc),
                description=f"**{len(purged)} messages were purged in #{channel.name}**",
            )
            .set_author(
                name=ctx.author,
                icon_url=str(
                    ctx.author.avatar_url_as(static_format="png", size=2048)
                ),
            )
            .set_footer(
                text=f"Author ID: {ctx.author.id} | Channel ID: {channel.id}"
            )
        )
        if reason:
            embed.add_field(name="Reason", value=reason, inline=False)
        if purged:
            try:
                embed.add_field(
                    name="Purged Messages",
                    value=(
                        await self.bot.haste(
                            json.dumps(
                                purged,
                                indent=4,
                            )
                        )
                    ),
                    inline=False,
                )
            except Exception:
                embed.add_field(
                    name="Purged Messages",
                    value="Failed to upload messages to hastebin",
                    inline=False,
                )
        try:
            await ctx.actionlog(embed=embed)
        except Exception as e:
            pass


def setup(bot):
    try:
        bot.add_cog(Purge(bot))
        bot.logger.info(f"$GREENLoaded event $CYANPurge!")
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding event $CYAN"Purge"', exc_info=e
        )
