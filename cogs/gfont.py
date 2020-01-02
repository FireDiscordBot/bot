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

# Load the font
font_regular = ImageFont.truetype(get_path("static/font/Roboto-Regular.ttf"), 30)
renderer_regular = _CharRenderer(font_regular)


def parse(message):
    ''' Parse the message in a format readable by render
    this will return a touple like this:
    [((int,int),str,str)]
    so if you where to send it directly to the rederer you have to do 
    this:
    render(pos, parse(message), drawer)
    '''
    result = []
    total_width = 0
    bold = False
    italics = False
    posheight = 0
    newline = 0
    startline = True
    newx = 0
    for i in range(0,len(message)):
        if message[i] == '|':
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
        width, height = font_regular.getsize(message[i])
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
        renderer = renderer_regular(bold, italics, char)
        renderer.render(image, (x,y), char, color=_get_colour(colour))
        x += width