class RelationalDB:

    def __init__(self, name):
        self.name = name
        self.tables = []

    def add_table(self, table):
        self.tables.append(table)

    def get_tables(self):
        return self.tables

    def is_empty(self):
        return len(self.tables) == 0
