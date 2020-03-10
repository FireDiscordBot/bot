from copy import copy
import logging


BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE = range(8)


RESET_SEQ = "\033[0m"
COLOR_SEQ = "\033[1;%dm"
BOLD_SEQ = "\033[1m"


def getcolor(color=None):
    return COLOR_SEQ % (30 + (color or WHITE))


LEVELS = {
    "WARNING": YELLOW,
    "INFO": GREEN,
    "DEBUG": BLUE,
    "CRITICAL": YELLOW,
    "ERROR": RED
}


COLORS = {
    "$GREEN": getcolor(GREEN),
    "$BLUE": getcolor(BLUE),
    "$RED": getcolor(RED),
    "$YELLOW": getcolor(YELLOW),
    "$BLACK": getcolor(BLACK),
    "$MAGENTA": getcolor(MAGENTA),
    "$CYAN": getcolor(CYAN),
    "$WHITE": getcolor(WHITE),
    "$RESET": RESET_SEQ,
    "$BOLD": BOLD_SEQ
}


class ColoredFormatter(logging.Formatter):
    def __init__(self, msg, use_color=True):
        super().__init__(msg)
        self.use_color = use_color

    def format(self, record):
        record = copy(record)
        levelname = record.levelname
        if self.use_color and levelname in LEVELS:
            levelname_color = COLOR_SEQ % (30 + LEVELS[levelname]) + levelname + RESET_SEQ
            record.levelname = levelname_color
            for k, v in COLORS.items():
                record.message = record.message.replace(k, v)
        return logging.Formatter.format(self, record)
