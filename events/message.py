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
from contextlib import suppress
import functools
import traceback
import asyncio
import discord
import re


class Message(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.raidmsgs = {}
        self.msgraiders = {}
        self.dupecheck = {}
        self.uuidregex = r"[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}"

    def uuidgobyebye(self, text: str):
        return re.sub(self.uuidregex, '', text, 0, re.MULTILINE)

    async def safe_exc(self, coro, *args, **kwargs):
        try:
            await coro(*args, **kwargs)
        except Exception:
            pass

    @commands.Cog.listener()
    async def on_message(self, message):
        if not self.bot.dev and not message.author.bot:
            await self.bot.loop.run_in_executor(None, func=functools.partial(self.bot.datadog.gauge, 'bot.messages', self.bot.socketstats['MESSAGE_CREATE']))
        if not isinstance(message.author, discord.Member):
            return
        if message.author.bot:
            return
        if self.bot.configs[message.guild.id].get('mod.dupecheck'):
            lastmsg = self.uuidgobyebye(self.dupecheck.get(message.author.id, 'send this message and it will get yeeted'))
            thismsg = self.uuidgobyebye(message.content)
            excluded = self.bot.configs[message.guild.id].get('excluded.filter')
            roleids = [r.id for r in message.author.roles]
            if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
                if message.content != "" and len(message.attachments) < 1 and not message.author.bot:
                    if thismsg == lastmsg and not message.author.permissions_in(message.channel).manage_messages:
                        await message.delete()
            self.dupecheck[message.author.id] = message.content
        premium = self.bot.premiumGuilds
        if message.guild and message.guild.id in premium:
            raidmsg = self.raidmsgs.get(message.guild.id, False)
            if raidmsg and raidmsg in message.content:
                self.msgraiders.get(message.guild.id, []).append(message.author)
        excluded = self.bot.configs[message.guild.id].get('excluded.filter')
        roleids = [r.id for r in message.author.roles]
        if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
            filters = self.bot.get_cog('Filters')
            # with suppress(Exception):
            await self.safe_exc(filters.handle_invite, message)
            await self.safe_exc(filters.anti_malware, message)
            await self.safe_exc(filters.handle_paypal, message)
            await self.safe_exc(filters.handle_youtube, message)
            await self.safe_exc(filters.handle_twitch, message)
            await self.safe_exc(filters.handle_twitter, message)
        cmdresp = self.bot.cmdresp
        resps = sorted(cmdresp, key=lambda m: cmdresp[m].created_at)
        while len(cmdresp) > 8000:
            del cmdresp[resps[0]]
            del resps[0]
            if len(cmdresp) <= 8000:
                break


def setup(bot):
    try:
        bot.add_cog(Message(bot))
        bot.logger.info(f'$GREENLoaded event $BLUEMessage!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading event $BLUE"Message"', exc_info=e)
