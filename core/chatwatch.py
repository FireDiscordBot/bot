"""
MIT License
Copyright (c) 2019 GamingGeek

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

from chatwatch.cw import ChatWatch
from discord.ext import commands
import discord
import traceback
import json

config = json.load(open('config.json'))


class chatwatch(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        if not hasattr(self.bot, 'chatwatch'):
            self.bot.chatwatch = ChatWatch(config['chatwatch'])
            self.bot.chatwatch.register_listener(self.handle_message)

    async def handle_message(self, message):
        print(message.data)

    @commands.Cog.listener()
    async def on_message(self, message):
        if not message.guild:
            return
        payload = {
            "event": "msg_ingest",
            "data": {
                "guild": message.guild.id,
                "channel": message.channel.id,
                "message": message.content,
                "message_id": message.id,
                "user": message.author.id
            }
        }
        await self.bot.chatwatch.send(payload)


def setup(bot):
    try:
        bot.add_cog(chatwatch(bot))
    except Exception as e:
        errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        print(f'Error while adding cog "chatwatch";\n{errortb}')
