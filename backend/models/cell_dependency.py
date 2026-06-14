class CellDependency:

    def __init__(
        self,
        source_cell,
        target_cell,
        dependency_type
    ):
        self.source_cell = source_cell
        self.target_cell = target_cell
        self.dependency_type = dependency_type