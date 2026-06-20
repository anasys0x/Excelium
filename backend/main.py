from pathlib import Path
from services.excel_to_relational import ExcelToRelational

project_root = Path(__file__).resolve().parents[1]

excel_path = (
    project_root
    / "data"
    #/ "excel.xlsx"
    #/ "excelphase2.xlsx"
    #/ "excelphase3.1.xlsx"
    / "excelphase3.2.xlsx"
    #/ "excel_sans_header.xlsx"
    #/ "excel_multi_tableau_meme_feuille.xlsx"
)

ExcelToRelational(excel_path).run()
