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
import random


class Context(commands.Context):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

    async def success(self, message: str):
        await self.send(f'<:check:674359197378281472> {message}')

    async def warning(self, message: str):
        await self.send(f'<a:fireWarning:660148304486727730> {message}')

    async def error(self, message: str):
        await self.send(f'<:xmark:674359427830382603> {message}')

    async def send(self, content=None, *, tts=False, embed=None, file=None, files=None, delete_after=None):
        if content:
            content = str(content).replace('@everyone', u'@\u200beveryone').replace('@here', u'@\u200bhere')
        if not content and random.randint(0, 25) == 25:
            content = random.choice(self.bot.tips)
        if self.message.id in self.bot.cmdresp and not (file or files):
            resp = self.bot.cmdresp[self.message.id]
            edited = self.message.edited_at
            if resp and edited and edited > (resp.edited_at or self.message.created_at):
               try:
                   await resp.edit(content=content, tts=tts, embed=embed, delete_after=delete_after)
                   return resp
               except Exception:
                   pass
        resp = await super().send(content=content, tts=tts, embed=embed, file=file, files=files, delete_after=delete_after)
        if not delete_after and not (file or files):
            self.bot.cmdresp[self.message.id] = resp
        return resp

    async def dm(self, content=None, *, tts=False, embed=None, file=None, files=None, delete_after=None):
        return await self.author.send(content=content, tts=tts, embed=embed, file=file, files=files, delete_after=delete_after)

    def has_override(self, build: str = None):
        build = self.bot.overrides.get(build, {})
        return self.author.id in build.get('active', [])

    # Unfinished permissions system

    # def has_permission(self, permission: str):
    #     if permission in self.bot.permissions.get(self.guild.id, {}).get('global', {})['denied']:
    #         return False
    #     if permission in self.bot.permissions.get('global', {}).get('users', {}).get(self.author.id, []):
    #         return True
    #     if permission in self.bot.permissions.get(self.guild.id, {}).get('members', {}).get(self.author.id, []):
    #         return True
    #     for role in self.author.roles:
    #         if permission in self.bot.permissions.get(self.guild.id, {}).get('roles', {}).get(self.role.id, []):
    #             return True
    #     if permission in self.bot.permissions.get(self.guild.id, {}).get('global', {})['allowed']:
    #         return True
    #     if permission in self.bot.permissions.get('global', {}).get('defaults', []):
    #         return True
    #     return False
