import re
from models.excel.cell_dependency import CellDependency
from models.excel.dependency_type import DependencyType


def find_cell(table, column_letter, row_index):

    column_index = ord(column_letter.upper()) - ord("A") + 1

    for row in table.get_rows():

        if row.index != row_index:
            continue

        for cell in row.get_cells():

            if cell.column_index == column_index:
                return cell

    return None


def extract_intra_references(formula):

    formula = re.sub(r"[A-Za-z0-9_]+![A-Z]+\d+", "", formula)

    pattern = r"([A-Z]+)(\d+)"
    references = []

    for column_letter, row_index in re.findall(pattern, formula):
        references.append((column_letter, int(row_index)))

    return references


def detect_intra_dependencies(workbook):

    for worksheet in workbook.get_worksheets():

        for table in worksheet.get_tables():

            for row in table.get_rows():

                for cell in row.get_cells():

                    if not cell.has_formula():
                        continue

                    for column_letter, row_index in extract_intra_references(cell.formula):

                        target_cell = find_cell(table, column_letter, row_index)

                        if target_cell is None:
                            continue

                        workbook.add_dependency(CellDependency(
                            source_worksheet=worksheet,
                            source_cell=cell,
                            target_worksheet=worksheet,
                            target_cell=target_cell,
                            dependency_type=DependencyType.INTRA
                        ))


def column_index_to_letter(index):
    return chr(ord("A") + index - 1)


def extract_inter_references(formula):

    pattern = r"([A-Za-z0-9_]+)!([A-Z]+)(\d+)"
    references = []

    for sheet_name, column_letter, row_index in re.findall(pattern, formula):
        references.append((sheet_name, column_letter, int(row_index)))

    return references


def find_worksheet(workbook, worksheet_name):

    for worksheet in workbook.get_worksheets():

        if worksheet.name.lower() == worksheet_name.lower():
            return worksheet

    return None


def detect_inter_dependencies(workbook):

    for worksheet in workbook.get_worksheets():

        for table in worksheet.get_tables():

            for row in table.get_rows():

                for cell in row.get_cells():

                    if not cell.has_formula():
                        continue

                    for sheet_name, column_letter, row_index in extract_inter_references(cell.formula):

                        target_worksheet = find_worksheet(workbook, sheet_name)

                        if target_worksheet is None:
                            continue

                        for target_table in target_worksheet.get_tables():

                            target_cell = find_cell(target_table, column_letter, row_index)

                            if target_cell is None:
                                continue

                            workbook.add_dependency(CellDependency(
                                source_worksheet=worksheet,
                                source_cell=cell,
                                target_worksheet=target_worksheet,
                                target_cell=target_cell,
                                dependency_type=DependencyType.INTER
                            ))
