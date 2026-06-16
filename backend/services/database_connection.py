import os
import psycopg2

from dotenv import load_dotenv
from errors import ConfigurationError, DatabaseConnectionError

load_dotenv()

def get_connection():

    required = ["DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD"]
    missing = [key for key in required if not os.getenv(key)]

    if missing:
        raise ConfigurationError(
            f"Variables manquantes dans le fichier .env : {', '.join(missing)}"
        )

    try:
        return psycopg2.connect(
            host=os.getenv("DB_HOST"),
            port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
    except psycopg2.OperationalError as e:
        raise DatabaseConnectionError(
            f"Impossible de se connecter à PostgreSQL : {e}"
        )