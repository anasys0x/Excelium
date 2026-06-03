from src.excelium.services.excel_reader import get_column_values


def detect_column_type(values):
    value_type = []
    for value in values:
        if value is None:
            continue
        elif isinstance(value, bool):
            if bool not in value_type:
                value_type.append(bool)
        elif isinstance(value, int):
            if int not in value_type:
                value_type.append(int)
        elif isinstance(value, float):
            if float not in value_type:
                value_type.append(float)
        elif isinstance(value, str):
            if str not in value_type:
                value_type.append(str)

    if int in value_type and float in value_type and len(value_type) == 2:
        return float
    elif len(value_type) == 0:
        return str
    elif len(value_type) > 1:
        return str
    return value_type[0]


def detect_all_column_types(headers, data):
    col_type = {}
    for index, header in enumerate(headers):
        values = get_column_values(data, index)
        col_type[header] = detect_column_type(values)

    return col_type

def get_column_values(data, column_index):
    values = []
    for row in data:
        values.append(row[column_index])
    return values