class CellDependency:

    def __init__(
        self,
        source_worksheet,
        source_cell,
        target_worksheet,
        target_cell,
        dependency_type
    ):
        self.source_worksheet = source_worksheet
        self.source_cell = source_cell

        self.target_worksheet = target_worksheet
        self.target_cell = target_cell

        self.dependency_type = dependency_type