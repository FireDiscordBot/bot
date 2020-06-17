from copy import copy
import logging
import datetime


BLACK, RED, GREEN, YELLOW, BLUE, MAGENTA, CYAN, WHITE = range(8)


RESET_SEQ = "\033[0m"
COLOR_SEQ = "\033[1;%dm"
BOLD_SEQ = "\033[1m"
HIGHLIGHT_SEQ = "\033[4%dm"
HIGHLIGHT_SEQ_ALT = "\033[10%dm"


def getcolor(color=None):
    return COLOR_SEQ % (30 + (color or WHITE))


def gethighlight(color=None, alt=False):
    if alt:
        return HIGHLIGHT_SEQ % (color or WHITE)
    return HIGHLIGHT_SEQ % (color or BLACK)


def formatter_message(message):
    for k, v in COLORS.items():
        message = message.replace(k, v)
    return message


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
    "$BOLD": BOLD_SEQ,
    "!GREEN": gethighlight(GREEN),
    "!BLUE": gethighlight(BLUE),
    "!RED": gethighlight(RED),
    "!YELLOW": gethighlight(YELLOW),
    "!BLACK": gethighlight(BLACK),
    "!MAGENTA": gethighlight(MAGENTA),
    "!CYAN": gethighlight(CYAN),
    "!WHITE": gethighlight(WHITE, alt=True),
    "!LBLUE": gethighlight(BLUE, alt=True),
    "!LGREEN": gethighlight(GREEN, alt=True),
    "!LRED": gethighlight(RED, alt=True),
    "!LYELLOW": gethighlight(YELLOW, alt=True),
    "!GRAY": gethighlight(BLACK, alt=True),
    "!GREY": gethighlight(BLACK, alt=True),
    "!LMAGENTA": gethighlight(MAGENTA, alt=True),
    "!LCYAN": gethighlight(CYAN, alt=True),
}



DATE_LEVELS = {
    "INFO": COLORS["!CYAN"],
    "WARNING": COLORS["!YELLOW"],
    "ERROR": COLORS["!LRED"],
    "CRITICAL": COLORS["!RED"],
    "DEBUG": COLORS["!GRAY"]
}

LEVELS = {
    "INFO": COLORS["GREEN"],
    "WARNING": COLORS["YELLOW"],
    "ERROR": COLORS["RED"],
    "CRITICAL": COLORS["RED"],
    "DEBUG": COLORS["GRAY"]
}


class ColoredFormatter(logging.Formatter):
    def __init__(self, msg):
        super().__init__(msg)

    def format(self, record):
        record = copy(record)
        levelname = record.levelname
        if levelname in LEVELS:
            date_color = DATE_LEVELS[levelname]
            level_color = LEVELS[levelname]
            now = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(hours=1)  # fuck daylight savings
            now = datetime.datetime.strftime(now, '%d/%m/%Y @ %I:%M:%S %p')
            record.levelname = f'{date_color}{now}{level_color}{COLORS["$RESET"]}'
            for k, v in COLORS.items():
                record.msg = record.msg.replace(k, v)
        return super().format(record)
