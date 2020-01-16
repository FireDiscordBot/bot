# Taken from https://stackoverflow.com/a/384125, modified to copy the record as pointed out in the comments
from copy import copy
import logging


BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE = range(8)

# The background is set with 40 plus the number of the color, and the foreground with 30

# These are the sequences need to get colored ouput
RESET_SEQ = "\033[0m"
COLOR_SEQ = "\033[1;%dm"
BOLD_SEQ = "\033[1m"

def getcolor(color):
    return COLOR_SEQ % (30 + ALLCOLORS.get(color, "WHITE"))


def formatter_message(message, use_color=True):
    if use_color:
        message = message.replace("$RESET", RESET_SEQ).replace("$BOLD", BOLD_SEQ).replace("$GREEN", getcolor("GREEN")).replace("$BLUE", getcolor("BLUE")).replace("$RED", getcolor("RED")).replace("$YELLOW", getcolor("YELLOW"))
    else:
        message = message.replace("$RESET", "").replace("$BOLD", "").replace("$GREEN", "").replace("$BLUE", "").replace("$RED", "").replace("$YELLOW", "")
    return message


COLORS = {
    "WARNING": YELLOW,
    "INFO": GREEN,
    "DEBUG": BLUE,
    "CRITICAL": YELLOW,
    "ERROR": RED
}


ALLCOLORS = {
    "GREEN": GREEN,
    "BLUE": BLUE,
    "RED": RED,
    "YELLOW": YELLOW,
    "BLACK": BLACK,
    "MAGENTA": MAGENTA,
    "CYAN": CYAN,
    "WHITE": WHITE
}


class ColoredFormatter(logging.Formatter):
    def __init__(self, msg, use_color=True):
        logging.Formatter.__init__(self, msg)
        self.use_color = use_color

    def format(self, record):
        record = copy(record)
        levelname = record.levelname
        if self.use_color and levelname in COLORS:
            levelname_color = COLOR_SEQ % (30 + COLORS[levelname]) + levelname + RESET_SEQ
            record.levelname = levelname_color
            record.msg = record.msg.replace("$BOLD", BOLD_SEQ).replace("$GREEN", getcolor("GREEN")).replace("$BLUE", getcolor("BLUE")).replace("$RED", getcolor("RED")).replace("$YELLOW", getcolor("YELLOW"))
        return logging.Formatter.format(self, record)
