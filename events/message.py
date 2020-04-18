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
import datetime
import asyncio
import aiohttp
import discord
import base64
import json
import re


class Message(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.raidmsgs = {}
        self.msgraiders = {}
        self.dupecheck = {}
        self.uuidregex = r"[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}"
        self.urlregex = r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)'
        self.tokenregex = r'[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}'
        self.gistheaders = {'Authorization': f'token {self.bot.config["github_token"]}'}

    def uuidgobyebye(self, text: str):
        return re.sub(self.uuidregex, '', text, 0, re.MULTILINE)

    def urlgobyebye(self, text: str):
        return re.sub(self.urlregex, '', text, 0, re.MULTILINE)

    async def safe_exc(self, coro, *args, **kwargs):
        try:
            await coro(*args, **kwargs)
        except Exception:
            pass

    async def token_gist(self, tokens, message):
        files = {}
        for t in tokens:
            now = datetime.datetime.utcnow().timestamp()
            files[f'token_leak_{now}.md'] = {'content':f'''
Oh no, it seems a token has been leaked! Fire (Fire#0682) scans for tokens in Discord messages and uploads them to GitHub to be reset.
You can learn more about GitHub's token scanning at https://help.github.com/en/github/administering-a-repository/about-token-scanning

The token in question was found in a message sent by {message.author} in the channel #{message.channel} in the guild {message.guild}.
Here's the link to the message: {message.jump_url}

The token in question *was* {t}

Discord should send the owner of this bot a system message letting them know their token has been leaked pretty much instantly.
If you are the owner of said bot, you should look into how this happened and try prevent it in the future!

Examples of how you can protect your token is by using a config file or environment variables.
This ensures the token is not directly in your code.
If you have an eval command, make sure only **you** can use it

I hope you keep your token safe in the future :)

If you have any queries about this gist, feel free to email tokens@gaminggeek.dev or leave a comment.
'''}
        body = {
            'description': '',
            'public': True,
            'files': files
        }
        async with aiohttp.ClientSession(headers=self.gistheaders) as session:
            async with session.post('https://api.github.com/gists', json=body) as r:
                if r.status != 201:
                    self.bot.logger.warn(f'Failed to create gist for tokens! Status: {r.status}')
            await session.close()


    @commands.Cog.listener()
    async def on_message(self, message):
        if not message.guild:
            return
        embeds = [str(e.to_dict()) for e in message.embeds]
        tokens = re.findall(self.tokenregex, str(message.system_content) + str(embeds), re.MULTILINE)
        config = self.bot.configs[message.guild.id]
        if tokens and not self.bot.dev and config.get('utils.tokendetect'):
            try:
                await self.token_gist(tokens, message)
            except Exception as e:
                self.bot.logger.warn(f'Failed to upload token to gist (to reset ofc)', exc_info=e)
        if not isinstance(message.author, discord.Member):
            return
        if message.author.bot:
            return
        if config.get('mod.dupecheck'):
            lastmsg = self.dupecheck.get(message.author.id, 'send this message and it will get yeeted')
            lastmsg = self.urlgobyebye(self.uuidgobyebye(lastmsg)).strip()
            thismsg = self.urlgobyebye(self.uuidgobyebye(message.content)).strip()
            excluded = config.get('excluded.filter')
            roleids = [r.id for r in message.author.roles]
            if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
                if message.content != "" and len(message.attachments) < 1 and not message.author.bot and len(thismsg) > 10:
                    if thismsg == lastmsg and not message.author.permissions_in(message.channel).manage_messages:
                        await message.delete()
            self.dupecheck[message.author.id] = message.content
        premium = self.bot.premiumGuilds
        if message.guild and message.guild.id in premium:
            raidmsg = self.raidmsgs.get(message.guild.id, False)
            if raidmsg and raidmsg in message.content:
                self.msgraiders.get(message.guild.id, []).append(message.author)
        excluded = config.get('excluded.filter')
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


def setup(bot):
    try:
        bot.add_cog(Message(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMessage!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while loading event $CYAN"Message"', exc_info=e)
