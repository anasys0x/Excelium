class Cell:

    def __init__(
        self,
        value=None,
        row_index=0,
        column_index=0,
        formula=None
    ):
        self.value = value
        self.row_index = row_index
        self.column_index = column_index
        self.formula = formula

    def is_empty(self):
        return self.value is None

    def has_formula(self):
        return self.formula is not None