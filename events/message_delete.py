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
import asyncio
import discord
import traceback


class MessageDelete(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    @commands.Cog.listener()
    async def on_message_delete(self, message):
        self.bot.cmdresp.pop(message.id, 0)
        if message.guild and not message.author.bot:
            logch = await self.bot.get_config(message.guild).get('log.action')
            if logch:
                deletedby = None
                if message.guild.me.guild_permissions.view_audit_log:
                    async for e in message.guild.audit_logs(action=discord.AuditLogAction.message_delete, limit=2):
                        if e.target == message.author:
                            deletedby = e.user
                            break
                embed = discord.Embed(color=message.author.color, timestamp=message.created_at, description=f'{message.author.mention}\'**s message in** {message.channel.mention} **was deleted**\n{message.system_content}')
                embed.set_author(name=message.author, icon_url=str(message.author.avatar_url_as(static_format='png', size=2048)))
                if message.attachments:
                    embed.add_field(name='Attachment(s)', value='\n'.join([attachment.filename for attachment in message.attachments]) + '\n\n__Attachment URLs are invalidated once the message is deleted.__')
                if deletedby:
                    embed.add_field(name='Potentially Deleted By', value=f'{deletedby} ({deletedby.id})', inline=False)
                embed.set_footer(text=f"Author ID: {message.author.id} | Message ID: {message.id} | Channel ID: {message.channel.id}")
                try:
                    await logch.send(embed=embed)
                except Exception:
                    pass


def setup(bot):
    try:
        bot.add_cog(MessageDelete(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMessageDelete!')
    except Exception as e:
        bot.logger.error(f'$REDError while loading event $CYAN"MessageDelete"', exc_info=e)
