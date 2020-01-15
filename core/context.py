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

from discord.ext import commands
import discord


class Context(commands.Context):
    def __init__(self, **kwargs):
        super().__init__(**kwargs)

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
