from PIL import Image, ImageDraw, ImageFont
from imageutils.textutils import render_text_with_emoji

import os

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
def get_path(path):
    return os.path.join(ROOT_DIR, path)

class _CharRenderer:
    ''' A class to render single characters at correct height
    This is needed because Pillow doesn't have info about the 
    character's y offset, so if you draw each character for itself
    with Pillow you'll get 'bumpy' text
    '''
    def __init__(self, font, offset=6):
        self.font = font
        self.image = Image.new("RGBA", (300,100), (255,255,255,0))
        self.drawer = ImageDraw.Draw(self.image)
        self.fill = ' 0j '
        self.fill_width = font.getsize(self.fill)[0]
        self.offset = offset
        
    def render(self, image, pos, character, color=(255,255,255)):
        full_width, full_height = self.font.getsize(self.fill + character)
        char_width = full_width - self.fill_width
        
        #self.drawer.text((0,-self.offset), self.fill+character, fill=color, 
        #                 font=self.font)

        render_text_with_emoji(self.image, self.drawer, (0,-self.offset), text=self.fill+character, fill=color, font=self.font, rgb=color)
        
        char_img = self.image.crop((self.fill_width,0, full_width,
                                    full_height))
        image.paste(char_img, pos, char_img)
        self.drawer.rectangle((0,0,300,100), (255,255,255,0))
    
    def __str__(self):
        return f'<CharRenderer font={self.font.getname()}>'

    def __repr__(self):
        return f'<CharRenderer font={self.font.getname()}>'

inmcfont = ' !"#$%&\'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\]^_`abcdefghijklmnopqrstuvwxyz{|}~¡¢£¤¥¦§¨©ª«¬­®¯°±²³´µ¶·¸¹º»¼½¾¿ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõö÷øùúûüýþÿŸẞ—‘’‚‛“”„†•…‹›€™ﬁ'

# Load the fonts
font_regular = ImageFont.truetype(get_path("static/font/regular.ttf"), 30)
font_arial = ImageFont.truetype(get_path("static/font/arial.ttf"), 30)
font_impact = ImageFont.truetype(get_path("static/font/impact.ttf"), 30)
font_bold = ImageFont.truetype(get_path("static/font/bold.ttf"), 30)
font_italics = ImageFont.truetype(get_path("static/font/italics.ttf"), 30)
font_bold_italics = ImageFont.truetype(
                        get_path("static/font/bold-italics.ttf"), 30)
font_small = ImageFont.truetype(get_path("static/font/regular.ttf"), 18)

renderer_regular = _CharRenderer(font_regular)
renderer_arial = _CharRenderer(font_arial)
renderer_impact = _CharRenderer(font_impact)
renderer_bold = _CharRenderer(font_bold)
renderer_italics = _CharRenderer(font_italics)
renderer_bold_italics = _CharRenderer(font_bold_italics)
renderer_small = _CharRenderer(font_small, 4)

# Create the color codes. The loop is parsed form the original Minecraft 
# source code
colorCodes = list()
for i in range(0, 32):
    j = int((i >> 3 & 1) * 85)
    k = int((i >> 2 & 1) * 170 + j)
    l = int((i >> 1 & 1) * 170 + j)
    i1 = int((i >> 0 & 1) * 170 + j)
    if i == 6:
        k += 85
    if i >= 16:
        k = int(k/4)
        l = int(l/4)
        i1 = int(i1/4)
    colorCodes.append((k & 255) << 16 | (l & 255) << 8 | i1 & 255)     

def _get_colour(c):
    ''' Get the RGB-tuple for the color
    Color can be a string, one of the chars in: 0123456789abcdef
    or an int in range 0 to 15, including 15
    '''
    if type(c) == str:
        if c == 'r':
            c = int('f', 16)
        else:
            c = int(c, 16)
    c = colorCodes[c]
    return ( c >> 16 , c >> 8 & 255 , c & 255 )

def _get_shadow(c):
    ''' Get the shadow RGB-tuple for the color
    Color can be a string, one of the chars in: 0123456789abcdefr
    or an int in range 0 to 15, including 15
    '''
    if type(c) == str:
        if c == 'r':
            c = int('f', 16)
        else:
            c = int(c, 16)
    return _get_colour(c+16)

def _get_font(bold, italics):
    font = font_regular
    if bold and italics:
        font = font_bold_italics
    elif bold:
        font = font_bold
    elif italics:
        font = font_italics
    return font
    
def _get_renderer(bold, italics, char):
    if char not in inmcfont:
        return renderer_impact
    renderer = renderer_regular
    if bold and italics:
        renderer = renderer_bold_italics
    elif bold:
        renderer = renderer_bold
    elif italics:
        renderer = renderer_italics
    return renderer

def parse(message):
    ''' Parse the message in a format readable by render
    this will return a touple like this:
    [((int,int),str,str)]
    so if you where to send it directly to the rederer you have to do 
    this:
    render(pos, parse(message), drawer)
    '''
    result = []
    lastColour = 'r'
    total_width = 0
    bold = False
    italics = False
    posheight = 0
    newline = 0
    startline = True
    newx = 0
    for i in range(0,len(message)):
        if message[i] == '§':
            continue
        if message[i] == '|':
            continue
        elif message[i-1] == '§':
            if message[i] in "01234567890abcdef":
                lastColour = message[i]
                bold = False
                italics = False
            if message[i] == 'l':
                bold = True
            if message[i] == 'o':
                italics = True

            if message[i] == 'r':
                bold = False
                italics = False
                lastColour = message[i]  
            continue
        if message[i-1] == '|' and message[i] == 'n':
            posheight += 42
            newline += 1
            startline = True
            newx = 5
            continue
        if startline:
            startline = False
        else:
            newx += 1
        width, height = _get_font(bold, italics).getsize(message[i])
        total_width += width
        result.append(((width, height), lastColour, bold, italics, 
                        message[i], newx, posheight, newline))
    return result
 
def get_width(message):
    ''' Calculate the width of the message
    The message has to be in the format returned by the parse funtion
    '''
    w = 0
    ws = {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
        6: 0,
        7: 0,
        8: 0,
        9: 0,
        10: 0,
    }
    highestw = 0
    for i in message:
        if i[-1] == 0:
            w += i[0][0]
    for i in message:
        if i[-1] != 0:
            ws[i[-1]] += i[0][0]
    for width in ws:
        width = ws[width]
        if width > highestw:
            highestw = width
    if w > highestw:
        highestw = w
    return highestw

def get_height(message):
    ''' Calculate the height of the message
    The message has to be in the format returned by the parse funtion
    '''
    return message[-1][6] + 42
    
def render(pos, message, image):
    ''' Render the message to the image with shadow
    The message has to be in the format returned by the parse function
    '''
    x = pos[0]
    y = pos[1]
    needswidth = False
    for i in message:
        (width, height), colour, bold, italics, char, newx, posheight, newline = i
        if posheight != 0:
            y = posheight
            if not needswidth:
                x = newx
                needswidth = True
            if newx == 5:
                x = 5
        renderer = _get_renderer(bold, italics, char)
        renderer.render(image, (x,y), char, color=_get_colour(colour))
        x += width