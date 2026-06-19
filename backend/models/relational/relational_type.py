from enum import Enum


class RelationalType(Enum):
    INTEGER = "INTEGER"
    FLOAT = "DOUBLE PRECISION"
    TEXT = "VARCHAR"
    DATE = "DATE"
    BOOLEAN = "BOOLEAN"
