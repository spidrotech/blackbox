"""Seed 20 BTP price library items using raw SQL (matches DB enum: SUPPLY/LABOR/OTHER)."""
import os
from datetime import datetime
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "mysql+pymysql://root:root@db:3306/gestar"
)
engine = create_engine(DATABASE_URL)

# (name, item_type, category, unit, unit_price)
ITEMS = [
    # 5 Main d'oeuvre
    ("Main d'oeuvre plombier",           "LABOR",  "Plomberie",   "h",       55.00),
    ("Main d'oeuvre electricien",        "LABOR",  "Electricite", "h",       65.00),
    ("Main d'oeuvre macon",              "LABOR",  "Gros oeuvre", "h",       48.00),
    ("Main d'oeuvre menuisier",          "LABOR",  "Menuiserie",  "h",       52.00),
    ("Main d'oeuvre peintre",            "LABOR",  "Peinture",    "h",       42.00),
    # 8 Fournitures
    ("Tube PVC 32mm",                    "SUPPLY", "Plomberie",   "ml",       3.20),
    ("Cable electrique 2.5mm2",          "SUPPLY", "Electricite", "ml",       1.85),
    ("Parpaing 20x20x50",                "SUPPLY", "Gros oeuvre", "u",        1.45),
    ("Sac ciment Portland 25kg",         "SUPPLY", "Gros oeuvre", "u",        8.90),
    ("Plaque de platre BA13",            "SUPPLY", "Cloisons",    "u",        7.50),
    ("Peinture acrylique blanche 15L",   "SUPPLY", "Peinture",    "u",       38.00),
    ("Isolant laine de verre 100mm",     "SUPPLY", "Isolation",   "m2",       9.80),
    ("Robinet mitigeur lavabo chrome",   "SUPPLY", "Plomberie",   "u",       65.00),
    # 6 Forfaits (mapped to OTHER)
    ("Pose fenetre PVC 2 vantaux",       "OTHER",  "Menuiserie",  "u",      680.00),
    ("Sol carrelage gres cerame 60x60",  "OTHER",  "Carrelage",   "m2",      65.00),
    ("Peinture complete piece 15m2",     "OTHER",  "Peinture",    "forfait", 850.00),
    ("Creation cloison BA13 doublage",   "OTHER",  "Cloisons",    "m2",      55.00),
    ("Installation VMC double flux",     "OTHER",  "Ventilation", "forfait", 2800.00),
    ("Chauffe-eau electrique 200L pose", "OTHER",  "Plomberie",   "u",      950.00),
    # 1 Divers
    ("Evacuation gravats benne 8m3",     "OTHER",  "Divers",      "forfait", 320.00),
]

def main() -> None:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT company_id FROM users LIMIT 1")).fetchone()
        if not row:
            print("ERROR: no users found")
            return
        company_id = row[0]
        print(f"Seeding for company_id={company_id}")
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        inserted = 0
        for name, item_type, category, unit, price in ITEMS:
            conn.execute(text(
                "INSERT INTO price_library_items "
                "(company_id, name, item_type, category, unit, unit_price, tax_rate, "
                "usage_count, is_favorite, is_active, created_at) "
                "VALUES (:cid, :name, :itype, :cat, :unit, :price, 20.00, 0, 0, 1, :now)"
            ), {"cid": company_id, "name": name, "itype": item_type,
                "cat": category, "unit": unit, "price": price, "now": now})
            inserted += 1
        conn.commit()
        print(f"OK: {inserted} items seeded for company_id={company_id}")

if __name__ == "__main__":
    main()
