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


from fire.converters import UserWithFallback, TextChannel
from discord.ext import commands, flags
from fire.invite import findinvite
import traceback
import discord


class Purge(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def basic_purge(self, ctx, amount):
        self.bot.recentpurge[ctx.channel.id] = []
        async for message in ctx.channel.history(limit=amount):
            self.bot.recentpurge[ctx.channel.id].append({
                'author': str(message.author),
                'author_id': str(message.author.id),
                'content': message.system_content or '',
                'bot': message.author.bot,
                'embeds': [e.to_dict() for e in message.embeds]
            })
        try:
            await ctx.channel.purge(limit=amount)
        except discord.NotFound:
            return await ctx.error(f'I couldn\'t delete some messages, maybe you set the amount too high?')
        except Exception:
            return await ctx.error(f'Failed to purge')
        finally:
            return await ctx.channel.send(
                f'Successfully deleted **{len(self.bot.recentpurge[ctx.channel.id])}** messages!',
                delete_after=5
            )

    async def flag_purge(self, ctx, amount, opt):
        user = opt['user']
        match = opt['match']
        nomatch = opt['nomatch']
        startswith = opt['startswith']
        endswith = opt['endswith']
        attachments = opt['attachments']
        bot = opt['bot']
        invite = opt['invite']
        text = opt['text']
        channel = opt['channel'] or ctx.channel
        reason = opt['reason'] or 'No Reason Provided'

        def purgecheck(m):
            completed = []
            if user:
                completed.append(m.author.id == user.id)
            if match:
                completed.append(match.lower() in m.content.lower())
            if nomatch:
                completed.append(nomatch.lower() not in m.content.lower())
            if startswith:
                completed.append(m.content.lower().startswith(startswith.lower()))
            if endswith:
                completed.append(m.content.lower().endswith(endswith.lower()))
            if attachments:
                completed.append(len(m.attachments) >= 1)
            if bot:
                completed.append(m.author.bot)
            elif bot is False:  # not includes None meaning "not bot" would be triggered if not included
                completed.append(not m.author.bot)
            if invite:
                completed.append(findinvite(m.content))
            if text is False:  # same as bot
                completed.append(not m.content)
            return len([c for c in completed if not c]) == 0
        self.bot.recentpurge[channel.id] = []
        self.bot.recentpurge[f'{channel.id}-reason'] = reason
        async for message in channel.history(limit=amount):
            if purgecheck(message):
                self.bot.recentpurge[channel.id].append({
                    'author': str(message.author),
                    'author_id': str(message.author.id),
                    'content': message.system_content or '',
                    'bot': message.author.bot,
                    'embeds': [e.to_dict() for e in message.embeds]
                })
        try:
            await channel.purge(limit=amount, check=purgecheck)
        except discord.NotFound:
            return await ctx.error(f'I couldn\'t delete some messages, maybe you set the amount too high?')
        except Exception:
            return await ctx.error(f'Failed to purge')
        finally:
            return await channel.send(
                f'Successfully deleted **{len(self.bot.recentpurge[channel.id])}** messages!',
                delete_after=5
            )

    @commands.command(description='Bulk delete messages', aliases=['prune'])
    @commands.has_permissions(manage_messages=True)
    async def purge(self, ctx, amount: int = -1, *, opt: flags.FlagParser(
        user=UserWithFallback,
        match=str,
        nomatch=str,
        startswith=str,
        endswith=str,
        attachments=bool,
        bot=bool,
        invite=bool,
        text=bool,
        channel=TextChannel,
        reason=str
    ) = flags.EmptyFlags):
        if amount > 500 or amount < 0:
            return await ctx.send('Invalid amount. Minumum is 1, Maximum is 500')
        try:
            await ctx.message.delete()
        except Exception:
            pass
        if isinstance(opt, dict):
            await self.flag_purge(ctx, amount, opt)
        else:
            await self.basic_purge(ctx, amount)


def setup(bot):
    try:
        bot.add_cog(Purge(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"purge" $GREENcommand!')
    except Exception as e:
        # errortb = ''.join(traceback.format_exception(type(e), e, e.__traceback__))
        bot.logger.error(f'$REDError while adding command $CYAN"purge"', exc_info=e)
