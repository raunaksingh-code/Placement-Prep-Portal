import sys
import os

from sqlalchemy import create_engine, text
from app.core.config import settings

def main():
    if not settings.DATABASE_URL:
        print("No DATABASE_URL, skipping fix")
        return
    
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.begin() as conn:
            result = conn.execute(text("SELECT version_num FROM alembic_version")).scalar()
            print("Current alembic_version:", result)
            if result == 'b4c69f83c5c3':
                print("Fixing broken alembic_version...")
                conn.execute(text("UPDATE alembic_version SET version_num = '4b40f6e5d69e'"))
                print("Fixed.")
    except Exception as e:
        print("Error checking/fixing alembic_version:", e)

if __name__ == '__main__':
    main()
