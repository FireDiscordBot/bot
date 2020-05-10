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
import functools
import traceback
import datetime
import discord
import aiohttp
import json


class CommandCompletion(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.watchedcmds = ['purge']

    @commands.Cog.listener()
    async def on_command_completion(self, ctx):
        if ctx.command.name in self.watchedcmds:
            if ctx.guild:
                logch = self.bot.configs[ctx.guild.id].get('log.action')
                if logch:
                    embed = discord.Embed(color=ctx.author.color, timestamp=datetime.datetime.now(datetime.timezone.utc), description=f'`{ctx.command.name}` **was used in** {ctx.channel.mention} **by {ctx.author.name}**')
                    embed.set_author(name=ctx.author, icon_url=str(ctx.author.avatar_url_as(static_format='png', size=2048)))
                    embed.add_field(name='Message', value=ctx.message.system_content, inline=False)
                    embed.set_footer(text=f"Author ID: {ctx.author.id} | Channel ID: {ctx.channel.id}")
                    if ctx.command.name == 'purge':
                        purged = None
                        reason = 'No Reason Provided'
                        try:
                            purged = self.bot.recentpurge[ctx.channel.id]
                            reason = self.bot.recentpurge.get(f'{ctx.channel.id}-reason', 'No Reason Provided')
                            self.bot.recentpurge[f'{ctx.channel.id}-reason'] = None
                            embed.add_field(name='Reason', value=reason, inline=False)
                            embed.set_field_at(0, name='Message', value=ctx.message.system_content.replace(f'--reason {reason}', ''), inline=False)
                        except KeyError as e:
                            pass
                        if purged:
                            try:
                                embed.add_field(
                                    name='Purged Messages',
                                    value=(await self.bot.haste(json.dumps(self.bot.recentpurge[ctx.channel.id], indent=4))),
                                    inline=False
                                )
                            except Exception:
                                embed.add_field(name='Purged Messages', value='Failed to upload messages to hastebin', inline=False)
                    try:
                        await logch.send(embed=embed)
                    except Exception:
                        pass


def setup(bot):
    try:
        bot.add_cog(CommandCompletion(bot))
        bot.logger.info(f'$GREENLoaded event $CYANCommandCompletion!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding event $CYAN"CommandCompletion"', exc_info=e)
