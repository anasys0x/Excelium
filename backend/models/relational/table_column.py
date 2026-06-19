class TableColumn:

    def __init__(self, name, relational_type, is_serial=False):
        self.name = name
        self.relational_type = relational_type
        self.is_primary_key = False
        self.is_serial = is_serial
        self.foreign_key = None

    def set_primary_key(self, value):
        self.is_primary_key = value

    def set_foreign_key(self, fk):
        self.foreign_key = fk
