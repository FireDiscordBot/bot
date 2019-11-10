from math import floor
import os

# TODO: Chop long single-words
# from PIL import ImageFont
from PIL import Image, ImageFont

ROOT_DIR = os.path.dirname(os.path.abspath(__file__))
def get_path(path):
	return os.path.join(ROOT_DIR, path)

def wrap(font, text, line_width):
	words = text.split()

	lines = []
	line = []

	for word in words:
		newline = ' '.join(line + [word])

		w, h = font.getsize(newline)

		if w > line_width:
			lines.append(' '.join(line))
			line = [word]
		else:
			line.append(word)

	if line:
		lines.append(' '.join(line))

	return ('\n'.join(lines)).strip()


def auto_text_size(text, font, desired_width, fallback_size=25, font_scalar=1):
	for size in range(20, 40):
		new_font = font.font_variant(size=floor(size * font_scalar))
		font_width, _ = new_font.getsize(text)
		if font_width >= desired_width:
			wrapped = wrap(new_font, text, desired_width)
			w = max(new_font.getsize(line)[0] for line in wrapped.splitlines())
			if abs(desired_width - w) <= 10:
				return new_font, wrapped

	fallback = font.font_variant(size=fallback_size)
	return fallback, wrap(fallback, text, desired_width)

# def auto_text_size(text, font, size, container_width, min_size=30, max_size=50):
#     ifont = ImageFont.truetype(font=font, size=size)
#     w, _ = ifont.getsize(text)
#
#     while w >= container_width and ifont.size > 0:
#         if not (min_size < ifont.size) < max_size:
#             break
#
#         ifont = ifont.font_variant(size=ifont.size - 1)
#         w, _ = ifont.getsize(text)
#
#     return ifont, wrap(ifont, text, container_width)


def render_text_with_emoji(img, draw, coords:tuple()=(0, 0), text='', font: ImageFont='', fill='black', rgb = None):
	initial_coords = coords
	emoji_size = font.getsize(text)[1] - 12

	emoji_set = 'twemoji'
	if emoji_set == 'apple':
		emojis = os.listdir(get_path('assets/emoji'))
		for i in range(0, len(text)):
			char = text[i]
			if char == '\n':
				coords = (initial_coords[0], coords[1] + emoji_size)
			emoji = str(hex(ord(char))).upper().replace('0X', 'u')
			if i + 1 <= len(text) and emoji + '.png' not in emojis and emoji + '.0.png' in emojis:
				emoji = emoji + '.0'
			try:
				u_vs = str(hex(ord(text[i + 1]))).upper().replace('0X', 'u')
				try:
					u_zws = str(hex(ord(text[i+2]))).upper().replace('0X', 'u')
					if u_vs == 'uFE0F' and u_zws == 'u200D':
						emoji = emoji + '_' + str(hex(ord(text[i + 3]))).upper().replace('0X', 'u')
						try:
							text = text.replace(text[i + 3], '‍', 1)
						except IndexError:
							pass
				except IndexError:
					pass
				if emoji + '_' + u_vs + '.png' in emojis:
					emoji = emoji + '_' + u_vs
					text = text.replace(text[i + 1], '‍', 1)
				if u_vs == 'u1F3FB':
					emoji = emoji + '.1'
					text = text.replace(text[i + 1], '‍', 1)
				elif u_vs == 'u1F3FC':
					emoji = emoji + '.2'
					text = text.replace(text[i + 1], '‍', 1)
				elif u_vs == 'u1F3FD':
					emoji = emoji + '.3'
					text = text.replace(text[i + 1], '‍', 1)
				elif u_vs == 'u1F3FE':
					emoji = emoji + '.4'
					text = text.replace(text[i + 1], '‍', 1)
				elif u_vs == 'u1F3FF':
					emoji = emoji + '.5'
					text = text.replace(text[i + 1], '‍', 1)
				elif emoji == 'uFE0F' or emoji == 'u200D':
					continue
			except IndexError:
				pass
			if emoji == 'u200D':
				pass
			elif emoji + '.png' not in emojis:
				size = draw.textsize(char, font=font)
				draw.text(coords, char, font=font, fill=fill)
				coords = (coords[0] + size[0], coords[1])
			else:
				emoji_img = Image.open(get_path(f'assets/emoji/{emoji}.png')).convert('RGBA').resize((emoji_size, emoji_size), Image.LANCZOS)
				if rgb:
					sub_img = Image.new('RGBA', emoji_img.size, rgb)
					emoji_img.paste(sub_img, (0, 0), emoji_img)
				img.paste(emoji_img, (coords[0], coords[1] + 14), emoji_img)
				coords = (coords[0] + emoji_size + 4, coords[1])
	elif emoji_set == 'twemoji':
		emojis = os.listdir(get_path('assets/twemoji'))
		for i in range(0, len(text)):
			char = text[i]
			if char == '\n':
				coords = (initial_coords[0], coords[1] + emoji_size)
			emoji = str(hex(ord(char))).replace('0x', '')
			if i + 1 <= len(text) and emoji + '.png' not in emojis and emoji + '.0.png' in emojis:
				emoji = emoji + '.0'
			try:
				u_vs = str(hex(ord(text[i + 1]))).replace('0x', '')
				try:
					u_zws = str(hex(ord(text[i + 2]))).replace('0x', '')
					if u_vs == 'fe0f' and u_zws == '200d':
						emoji = emoji + '-' + u_vs + '-' + u_zws + '-' + str(hex(ord(text[i + 3]))).replace('0x', '')
						try:
							text = text.replace(text[i + 3], '‍', 1)
						except IndexError:
							pass
				except IndexError:
					pass
				if emoji + '-' + u_vs + '.png' in emojis:
					emoji = emoji + '-' + u_vs
					text = text.replace(text[i + 1], '‍', 1)
				elif emoji == 'fe0f' or emoji == '200d':
					continue
			except IndexError:
				pass
			if emoji == '200d':
				pass
			elif emoji + '.png' not in emojis:
				size = draw.textsize(char, font=font)
				draw.text(coords, char, font=font, fill=fill)
				coords = (coords[0] + size[0], coords[1])
			else:
				emoji_img = Image.open(get_path(f'assets/twemoji/{emoji}.png')).convert('RGBA').resize((emoji_size, emoji_size),
																						   Image.LANCZOS)
				if rgb:
					sub_img = Image.new('RGBA', emoji_img.size, rgb)
					emoji_img.paste(sub_img, (0, 0), emoji_img)
				img.paste(emoji_img, (coords[0], coords[1] + 14), emoji_img)
				coords = (coords[0] + emoji_size + 4, coords[1])