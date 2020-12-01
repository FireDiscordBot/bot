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


from jishaku.models import copy_context_with
from discord.ext import commands
from fire.http import Route
import datetime
import asyncio
import discord
import re


class Message(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.uuidregex = r"[a-f0-9]{8}-?[a-f0-9]{4}-?4[a-f0-9]{3}-?[89ab][a-f0-9]{3}-?[a-f0-9]{12}"
        self.urlregex = r'(?:https:\/\/|http:\/\/)[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)'
        self.tokenregex = r'[MN][A-Za-z\d]{23}\.[\w-]{6}\.[\w-]{27}'
        self.gistheaders = {
            'Authorization': f'token {self.bot.config["github_token"]}'
        }

    def uuidgobyebye(self, text: str):
        return re.sub(self.uuidregex, '', text, 0, re.MULTILINE)

    def urlgobyebye(self, text: str):
        return re.sub(self.urlregex, '', text, 0, re.MULTILINE)

    async def token_gist(self, tokens, message):
        files = {}
        for t in tokens:
            now = datetime.datetime.now(datetime.timezone.utc).timestamp()
            files[f'token_leak_{now}.md'] = {'content': f'''
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
        route = Route(
            'POST',
            f'/gists'
        )
        try:
            gist = await self.bot.http.github.request(
                route,
                json=body,
                headers=self.gistheaders
            )
            await asyncio.sleep(30)
            route = Route(
                'DELETE',
                f'/gists/{gist["id"]}'
            )
            await self.bot.http.github.request(
                route,
                headers=self.gistheaders
            )
        except Exception as e:
            self.bot.logger.warn(
                f'$YELLOWFailed to create gist for tokens!', exc_info=e)

    @commands.Cog.listener()
    async def on_message(self, message):
        if not message.guild:
            return
        if message.guild.me.guild_permissions.manage_nicknames:
            try:
                await self.bot.dehoist(message.author)
                await self.bot.decancer(message.author)
            except Exception:
                pass
        if isinstance(message.author, discord.Member) and any(m in message.content for m in ['@everyone', '@here']):
            if self.bot.get_config(message.guild).get('mod.antieveryone') and not message.author.permissions_in(message.channel).mention_everyone:
                try:
                    return await message.delete()
                except Exception:
                    pass
        embeds = [str(e.to_dict()) for e in message.embeds]
        tokens = re.findall(self.tokenregex, str(
            message.system_content) + str(embeds), re.MULTILINE)
        config = self.bot.get_config(message.guild)
        if tokens and not self.bot.dev:
            try:
                await self.token_gist(tokens, message)
            except Exception as e:
                self.bot.logger.warn(
                    f'Failed to upload token to gist (to reset ofc)', exc_info=e)
        if message.channel.id == 600070909365059584 and message.embeds:
            if 'new commit' in message.embeds[0].title and self.bot.dev:
                try:
                    await message.publish()
                except Exception as e:
                    self.bot.logger.warn(
                        f'Failed to publish commit', exc_info=e)
        if message.channel.id == 388850472632451073:
            f = self.bot.get_channel(731330454422290463)
            if message.embeds[0].author.name in self.bot.config['datamine']:
                try:
                    m = await f.send(embed=message.embeds[0])
                    await m.publish()
                except Exception:
                    pass
        if not isinstance(message.author, discord.Member):
            return
        if message.author.bot:
            return
        if '--remind' in message.content and not self.bot.dev:
            content = re.sub(r'\s?--remind\s?', '',
                             message.content, 0, re.MULTILINE)
            ctx = await self.bot.get_context(message)
            alt_ctx = await copy_context_with(
                ctx,
                content=ctx.config.get('main.prefix') + f'remind {content}'
            )
            if alt_ctx.valid:
                await alt_ctx.command.invoke(alt_ctx)
        excluded = [int(e) for e in config.get('excluded.filter')]
        roleids = [r.id for r in message.author.roles]
        if message.author.id not in excluded and not any(r in excluded for r in roleids) and message.channel.id not in excluded:
            filters = self.bot.get_cog('Filters')
            # with suppress(Exception):
            await filters.run_all(message)
        if f'{message.content.strip()} ' in commands.when_mentioned(self.bot, message) and (await self.bot.blacklist_check(message)):
            prefix = self.bot.get_config(message.guild).get('main.prefix')
            await message.channel.send(f'Hey! My prefix here is `{prefix}` or you can mention me :)')


def setup(bot):
    try:
        bot.add_cog(Message(bot))
        bot.logger.info(f'$GREENLoaded event $CYANMessage!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while loading event $CYAN"Message"', exc_info=e)
