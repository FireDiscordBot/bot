class Member():

    @property
    def game(self):
        game = str(self.activities[0])
        game = game.lower()
        check = game
        if 'minecraft' in game:
            game = '<:Minecraft:516401572755013639> Minecraft'
        if 'hyperium' in game:
            game = '<:Hyperium:516401570741485573> Hyperium'
        if 'badlion client' in game:
            game = '<:BLC:516401568288079892> Badlion Client'
        if 'labymod' in game:
            game = '<:LabyMod:531495743295586305> LabyMod'
        if 'fortnite' in game:
            game = '<:Fortnite:516401567990153217> Fortnite'
        csgo = ['csgo', 'counter-strike']
        for string in csgo: 
            if string in game:
                game = '<:CSGO:516401568019513370> CS:GO'
        pubg = ['pubg', 'playerunknown\'s battlegrounds']
        for string in pubg:
            if string in game:
                game = '<:PUBG:516401568434618388> PUBG'
        gta = ['gta v', 'grand theft auto v']
        for string in gta:
            if string in game:
                game = '<:GTAV:516401570556936232> GTA V'
        if 'roblox' in game:
            game = '<:Roblox:516403059673530368> Roblox'
        if 'payday 2' in game:
            game = '<:PayDayTwo:516401572847157248> Payday 2'
        if 'overwatch' in game:
            game = '<:Overwatch:516402281806037002> Overwatch'
        if 'portal' in game:
            game = '<:Portal:516401568610779146> Portal'
        if 'geometry dash' in game:
            game = '<:GeometryDash:516403764635238401> Geometry Dash'
        if 'spotify' in game:
            game = '<:Spotify:516401568812105737> Spotify'
        if 'netflix' in game:
            game = '<:Netflix:472000254053580800> Netflix'
        if 'google chrome' in game:
            game = '<:chrome:556997945677840385> Chrome'
        if 'firefox' in game:
            game = '<:FIREFOX:516402280916975637> Firefox'
        if 'internet explorer' in game:
            game = '<:IEXPLORE:516401569005174795> Internet Explorer'
        if 'safari' in game:
            game = '<:SAFARI:516401571433807882> Safari'
        if 'visual studio' in game:
            game = '<:VSCODE:516401572943495169> Visual Studio'
        if 'visual studio code' in game:
            game = '<:VSCODE:516401572943495169> Visual Studio Code'
        if 'jetbrains ide' in game:
            game = '<:jetbrains:556999976496922634> JetBrains IDE'
        if 'sublime text' in game:
            game = '<:SUBLIME:516401568531218454> Sublime Text'
        if 'atom editor' in game:
            game = '<:ATOMEDIT:516401571232219136> Atom'
        if 'vegas pro' in game:
            game = '<:VEGAS:516401568598458378> Vegas Pro'
        if 'after effects' in game:
            game = '<:AE:516401568124370954> After Effects'
        if 'adobe illustrator' in game:
            game = '<:AI:516401567411208227> Illustrator'
        if 'adobe animate' in game:
            game = '<:AN:516401568648790026> Animate'
        if 'adobe audition' in game:
            game = '<:AU:516401568678150144> Audition'
        if 'photoshop' in game:
            game = '<:PS:516401568149536790> Photoshop'
        if 'adobe xd' in game:
            game = '<:XD:516401572708876313> xD'
        if 'premiere pro' in game:
            game = '<:PR:516401568841596968> Premiere Pro'
        if 'blender' in game:
            game = '<:BLEND:516401568321634314> Blender'
        if 'cinema 4d' in game:
            game = '<:C4D:516401570741616659> Cinema 4D'
        if check == game:
            game = str(self.activities[0])
        return game