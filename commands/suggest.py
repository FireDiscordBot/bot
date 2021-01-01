"""
MIT License
Copyright (c) 2021 GamingGeek

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
import aiotrello
import datetime


class Suggest(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.trello = aiotrello.Trello(
            key=self.bot.config['trellokey'], token=self.bot.config['trellotoken'])

    @commands.command(name='suggest', description='Suggest a feature')
    @commands.cooldown(1, 600, commands.BucketType.user)
    async def suggestcmd(self, ctx, *, suggestion: str):
        if suggestion is None:
            await ctx.error('You can\'t suggest nothing!')
        else:
            board = await self.trello.get_board(lambda b: b.name == 'Fire')
            suggestions = await board.get_list(lambda l: l.name == 'Suggestions')
            card = await suggestions.create_card(suggestion, f'Suggested by {ctx.author.name} ({ctx.author.id})')
            now = datetime.datetime.now(datetime.timezone.utc).strftime(
                '%d/%m/%Y @ %I:%M:%S %p')
            await card.add_comment(f'Suggested in channel {ctx.channel.name} ({ctx.channel.id}) in guild {ctx.guild.name} ({ctx.guild.id}) at {now} UTC')
            await ctx.success(f'Thanks! Your suggestion was added to the Trello @ <{card.url}>. Make sure to check it every now and then for a response.'
                              f'\nAbuse of this command __**will**__ result in being blacklisted from Fire')


def setup(bot):
    try:
        bot.add_cog(Suggest(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"suggest" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"suggest"', exc_info=e)
