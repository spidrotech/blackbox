"""Seed demo suppliers and equipment."""
import os
from datetime import datetime
from sqlalchemy import create_engine, text

DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@db:3306/gestar")
engine = create_engine(DATABASE_URL)

def main() -> None:
    with engine.connect() as conn:
        row = conn.execute(text("SELECT company_id FROM users LIMIT 1")).fetchone()
        if not row:
            print("ERROR: no users found"); return
        company_id = row[0]
        now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        # ── Suppliers ────────────────────────────────────────────────────
        # type ENUM: MATERIALS, EQUIPMENT, SUBCONTRACTOR, SERVICES, OTHER
        SUPPLIERS = [
            # (name, contact_name, email, phone, type, notes, is_favorite)
            ("ProMateriaux Sarl",  "Laurent Brun",   "contact@promateriaux.fr", "04 72 11 22 33", "MATERIALS",     "Lyon",       1),
            ("Electro Solutions",  "Claire Moreau",  "info@electrosol.fr",       "01 44 55 66 77", "MATERIALS",     "Paris",      0),
            ("Robineau Plomberie", "Michel Robineau","m.robineau@rplomberie.fr", "05 61 80 90 40", "SUBCONTRACTOR", "Toulouse",   1),
            ("BTP Outillage Pro",  "Stephane Fort",  "s.fort@btpoutillage.fr",  "03 80 21 43 65", "EQUIPMENT",     "Dijon",      0),
            ("Transports Girard",  "Estelle Girard", "e.girard@tg-btp.fr",       "02 40 12 34 56", "SERVICES",      "Nantes",     0),
            ("Menuiserie Dubois",  "Antoine Dubois", "a.dubois@menuiseriedubois.fr","04 91 23 45 67","SUBCONTRACTOR","Marseille",  0),
        ]

        inserted_s = 0
        for name, contact, email, phone, stype, city, fav in SUPPLIERS:
            try:
                conn.execute(text(
                    "INSERT INTO suppliers (company_id, name, type, contact_name, email, phone, notes, payment_terms_days, is_favorite, is_active, created_at) "
                    "VALUES (:cid, :name, :stype, :contact, :email, :phone, :notes, 30, :fav, 1, :now)"
                ), dict(cid=company_id, name=name, stype=stype, contact=contact,
                        email=email, phone=phone, notes=city, fav=fav, now=now))
                inserted_s += 1
            except Exception as e:
                print(f"  Supplier '{name}' skipped: {e}")

        conn.commit()
        print(f"OK: {inserted_s} suppliers seeded")

        # ── Equipment ────────────────────────────────────────────────────
        # status ENUM: AVAILABLE, IN_USE, MAINTENANCE, BROKEN, RETIRED
        # ownership_type ENUM: OWNED, RENTED, LEASED
        EQUIPMENT = [
            # (name, serial_number, category, brand, model, status, ownership_type, purchase_price, next_maintenance_date)
            ("Betonniere 350L",     "BET-2021-001", "Gros oeuvre",  "Altrad",    "B350",     "AVAILABLE",   "OWNED",  1200.00, "2025-09-01"),
            ("Nacelle 12m",         "NAC-2019-007", "Elevation",    "Haulotte",  "Optimum8", "IN_USE",      "RENTED", None,    "2025-06-15"),
            ("Scie circulaire",     "SC-2022-014",  "Decoupe",      "Makita",    "HS7601J",  "AVAILABLE",   "OWNED",  280.00,  "2025-08-20"),
            ("Perforateur SDS+",    "PERF-2023-003","Percage",      "Bosch",     "GBH 4-32", "AVAILABLE",   "OWNED",  420.00,  "2025-12-01"),
            ("Compresseur 100L",    "COMP-2020-002","Pneumatique",  "Abac",      "Genesis",  "MAINTENANCE", "OWNED",  650.00,  "2025-05-10"),
            ("Niveau laser rotatif","LASER-2022-01","Mesure",       "Leica",     "Roteo 35", "AVAILABLE",   "OWNED",  1850.00, "2026-01-15"),
            ("Mini-pelle 1.5T",     "MINI-2018-009","Terrassement", "Kubota",    "U17",      "IN_USE",      "RENTED", None,    "2025-07-30"),
        ]

        inserted_e = 0
        for name, serial, cat, brand, model, status, own_type, price, maint in EQUIPMENT:
            try:
                conn.execute(text(
                    "INSERT INTO equipment (company_id, name, serial_number, category, brand, model, "
                    "status, ownership_type, purchase_price, next_maintenance_date, total_hours_used, created_at) "
                    "VALUES (:cid, :name, :serial, :cat, :brand, :model, :status, :own, :price, :maint, 0, :now)"
                ), dict(cid=company_id, name=name, serial=serial, cat=cat, brand=brand,
                        model=model, status=status, own=own_type, price=price, maint=maint, now=now))
                inserted_e += 1
            except Exception as e:
                print(f"  Equipment '{name}' skipped: {e}")

        conn.commit()
        print(f"OK: {inserted_e} equipment seeded")

if __name__ == "__main__":
    main()