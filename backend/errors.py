class ExceliumError(Exception):
    pass

class ConfigurationError(ExceliumError):
    pass

class DatabaseConnectionError(ExceliumError):
    pass

class DatabaseExecutionError(ExceliumError):
    pass

class ExcelReadError(ExceliumError):
    pass
