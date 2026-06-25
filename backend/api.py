import tempfile
import os
from typing import Any

from fastapi import FastAPI, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from services.excel_reader import load_workbook_model
from services.type_detector import detect_workbook_types
from services.database_connection import get_connection
from services.db_creator import create_tables

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Modèles de requête pour /create ──────────────────────────────────────────

class CreateColumn(BaseModel):
    name: str
    type: str
    isPrimaryKey: bool = False


class CreateTable(BaseModel):
    tableName: str
    columns: list[CreateColumn]
    rows: list[list[Any]]


class CreatePayload(BaseModel):
    tables: list[CreateTable]

@app.post("/parse")
async def parse_excel(file: UploadFile):

    with tempfile.NamedTemporaryFile(delete=False, suffix='.xlsx') as tmp:
        tmp.write(await file.read())
        tmp_path = tmp.name

    workbook = load_workbook_model(tmp_path)
    detect_workbook_types(workbook)
    os.unlink(tmp_path)

    sheets = []

    for worksheet in workbook.get_worksheets():

        tables = []

        # Sur cette branche, une feuille peut contenir plusieurs tableaux
        for table in worksheet.get_tables():

            columns = [
                {
                    "name": col.name,
                    "type": col.detected_type.value if col.detected_type else "STRING"
                }
                for col in table.get_columns()
            ]

            rows = [
                [cell.value for cell in row.get_cells()]
                for row in table.get_rows()
            ]

            tables.append({
                "name": table.name,
                "columns": columns,
                "rows": rows
            })

        sheets.append({
            "name": worksheet.name,
            "tables": tables
        })

    return {"sheets": sheets}


@app.post("/create")
def create_database(payload: CreatePayload):

    if not payload.tables:
        raise HTTPException(status_code=400, detail="Aucune table à créer.")

    try:
        conn = get_connection()
    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Connexion à la base de données impossible : {exc}"
        )

    try:
        tables = [table.model_dump() for table in payload.tables]
        results = create_tables(conn, tables)
    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Erreur lors de la création des tables : {exc}"
        )
    finally:
        conn.close()

    return {"created": results}
