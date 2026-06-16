import re
from models.cell_dependency import CellDependency
from models.dependency_type import DependencyType

def find_cell(
    worksheet,
    column_letter,
    row_index
):

    column_index = (
        ord(column_letter.upper()) - ord("A") + 1
    )

    for row in worksheet.get_rows():

        if row.index != row_index:
            continue

        for cell in row.get_cells():

            if (
                cell.column_index
                == column_index
            ):
                return cell

    return None

def extract_intra_references(formula):

    formula = re.sub(
        r"[A-Za-z0-9_]+![A-Z]+\d+",
        "",
        formula
    )

    pattern = r"([A-Z]+)(\d+)"

    references = []

    matches = re.findall(
        pattern,
        formula
    )

    for column_letter, row_index in matches:

        references.append(
            (
                column_letter,
                int(row_index)
            )
        )

    return references

def detect_intra_dependencies(workbook):

    for worksheet in workbook.get_worksheets():

        for row in worksheet.get_rows():

            for cell in row.get_cells():

                if not cell.has_formula():
                    continue

                references = extract_intra_references(
                    cell.formula
                )

                for (
                    column_letter,
                    row_index
                ) in references:

                    target_cell = find_cell(
                        worksheet,
                        column_letter,
                        row_index
                    )

                    if target_cell is None:
                        continue

                    dependency = CellDependency(
                        source_worksheet=worksheet,
                        source_cell=cell,
                        target_worksheet=worksheet,
                        target_cell=target_cell,
                        dependency_type=DependencyType.INTRA
                    )

                    workbook.add_dependency(
                        dependency
                    )

def column_index_to_letter(index):
    return chr(ord("A") + index - 1)


def extract_inter_references(formula):

    pattern = r"([A-Za-z0-9_]+)!([A-Z]+)(\d+)"

    references = []

    matches = re.findall(
        pattern,
        formula
    )

    for (
        sheet_name,
        column_letter,
        row_index
    ) in matches:

        references.append(
            (
                sheet_name,
                column_letter,
                int(row_index)
            )
        )

    return references
def find_worksheet(
    workbook,
    worksheet_name
):

    for worksheet in workbook.get_worksheets():

        if (
            worksheet.name.lower()
            ==
            worksheet_name.lower()
        ):
            return worksheet

    return None

def detect_inter_dependencies(workbook):

    for worksheet in workbook.get_worksheets():

        for row in worksheet.get_rows():

            for cell in row.get_cells():

                if not cell.has_formula():
                    continue

                references = (
                    extract_inter_references(
                        cell.formula
                    )
                )

                for (
                    sheet_name,
                    column_letter,
                    row_index
                ) in references:

                    target_worksheet = (
                        find_worksheet(
                            workbook,
                            sheet_name
                        )
                    )

                    if target_worksheet is None:
                        continue

                    target_cell = find_cell(
                        target_worksheet,
                        column_letter,
                        row_index
                    )

                    if target_cell is None:
                        continue

                    dependency = CellDependency(
                        source_worksheet=worksheet,
                        source_cell=cell,
                        target_worksheet=target_worksheet,
                        target_cell=target_cell,
                        dependency_type=DependencyType.INTER
                    )

                    workbook.add_dependency(
                        dependency
                    )