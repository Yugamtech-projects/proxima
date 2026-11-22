"""
PROXIMA Structured Logger
Outputs logs formatted with Indian Standard Time (IST, Asia/Kolkata).
Exports module-level `logger` variable directly for use across the application.
"""

import logging
from datetime import datetime
from zoneinfo import ZoneInfo


class ISTFormatter(logging.Formatter):
    """Custom logging formatter that renders timestamps in Indian Standard Time (IST)."""


    def formatTime(self, record, datefmt=None):
        dt = datetime.fromtimestamp(record.created, tz=ZoneInfo("Asia/Kolkata"))
        if datefmt:
            return dt.strftime(datefmt)
        return dt.strftime("%d-%m-%Y %H:%M:%S")


def _setup_logger(name: str = "proxima") -> logging.Logger:
    """Configures and returns the central application logger."""
    log = logging.getLogger(name)
    if not log.handlers:
        handler = logging.StreamHandler()
        formatter = ISTFormatter(
            fmt="%(asctime)s | %(filename)s:%(lineno)s | %(levelname)s | %(message)s",
            datefmt="%d-%m-%Y %H:%M:%S",
        )
        handler.setFormatter(formatter)
        log.addHandler(handler)
        log.setLevel(logging.INFO)
    return log


# Direct module-level logger variable export
logger = _setup_logger(name="proxima")
