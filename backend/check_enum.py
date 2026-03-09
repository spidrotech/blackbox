from app.db.session import engine
from sqlalchemy import text
from sqlmodel import Session

with Session(engine) as s:
    r = s.exec(text("SHOW COLUMNS FROM price_library_items LIKE 'item_type'")).fetchone()
    print(r)
