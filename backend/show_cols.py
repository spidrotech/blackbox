import os
from sqlalchemy import create_engine, text
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/gestar")
e = create_engine(DATABASE_URL)
with e.connect() as conn:
    print("=== EQUIPMENT ===")
    for r in conn.execute(text("SHOW COLUMNS FROM equipment")).fetchall():
        print(r[0], r[1])
    print("=== SUPPLIERS ===")
    for r in conn.execute(text("SHOW COLUMNS FROM suppliers")).fetchall():
        print(r[0], r[1])
