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


class Debug(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.error = '<:no:534174796938870792>'
        self.check = '<:yes:534174796888408074>'
        self.admin_cmds = ['plonk', 'unplonk', 'guilds']
        self.common_perms = [
            'attach_files',
            'read_message_history',
            'external_emojis',
            'add_reactions'
        ]

    @commands.command(name="debug")
    @commands.guild_only()
    async def debug(self, ctx, *, cmd: str = None):
        if not cmd:
            return await ctx.error('You must provide a command to debug')
        detail = []
        cmd = self.bot.get_command(cmd)
        if not cmd:
            detail.append(f'{self.error} Command not found')
        elif cmd.cog.__class__.__name__ == 'Jishaku' and ctx.author.id != 287698408855044097:
            detail.append(f'{self.error} This command is owner only')
        elif cmd.name in self.admin_cmds and not self.bot.isadmin(ctx.author):
            detail.append(f'{self.error} This command is restricted')
        else:
            try:
                can_run = await cmd.can_run(ctx)
                if can_run:
                    detail.append(f'{self.check} All checks passed')
                else:
                    detail.append(
                        f'{self.error} An unknown issue is stopping the command from being run')
            except Exception as e:
                detail.append(f'{self.error} {e}')
            missing = [p for p, v in ctx.me.permissions_in(
                ctx.channel) if not v]
            if any(p in self.common_perms for p in missing):
                detail.append(f'{self.error} Fire is missing one or more common permissions.\n'
                              f'This may cause issues with this command')
            else:
                detail.append(f'{self.check} Fire has all common permissions')
            disabled = ctx.config.get('disabled.commands')
            if cmd.name in disabled:
                if ctx.author.permissions_in(ctx.channel).manage_messages:
                    detail.append(
                        f'{self.check} Command is disabled but you are bypassed')
                else:
                    detail.append(f'{self.error} Command is disabled.')
            else:
                detail.append(f'{self.check} Command is not disabled')
            if cmd.name == 'mute':
                bypass = []
                for key in ctx.channel.overwrites.keys():
                    if ctx.channel.overwrites_for(key).send_messages is True:
                        bypass.append(key.mention)
                if bypass:
                    detail.append(
                        f'{self.error} The following users/roles will bypass mutes in {ctx.channel.mention}')
                    detail.append(', '.join(bypass))
                else:
                    detail.append(
                        f'{self.check} Nobody can bypass mutes in {ctx.channel.mention}')
        issues = [d for d in detail if d.startswith(self.error)]
        if issues:
            status = f'{len(issues)} issues found'
        else:
            status = 'No issues found'
        embed = discord.Embed(
            title=status,
            color=ctx.author.color,
            timestamp=datetime.datetime.now(datetime.timezone.utc),
            description='\n'.join(detail)
        )
        if ctx.me.permissions_in(ctx.channel).embed_links:
            return await ctx.send(embed=embed)
        else:
            detail.append(f'{self.error} Fire cannot send embeds')
            return await ctx.send('\n'.join(detail))


def setup(bot):
    try:
        bot.add_cog(Debug(bot))
        bot.logger.info(f'$GREENLoaded $CYAN"debug" $GREENcommand!')
    except Exception as e:
        bot.logger.error(
            f'$REDError while adding command $CYAN"debug"', exc_info=e)
