from fastapi import APIRouter
from app.api.v1.endpoints import (
    auth,
    customers,
    projects,
    quotes,
    invoices,
    suppliers,
    purchases,
    time_entries,
    equipment,
    price_library,
    dashboard,
)

api_router = APIRouter()

# Authentication
api_router.include_router(auth.router, prefix="/auth", tags=["Authentification"])

# Core business entities
api_router.include_router(customers.router, prefix="/customers", tags=["Clients"])
api_router.include_router(projects.router, prefix="/projects", tags=["Projets"])
api_router.include_router(quotes.router, prefix="/quotes", tags=["Devis"])
api_router.include_router(invoices.router, prefix="/invoices", tags=["Factures"])

# Suppliers & Purchases
api_router.include_router(suppliers.router, prefix="/suppliers", tags=["Fournisseurs"])
api_router.include_router(purchases.router, prefix="/purchases", tags=["Achats"])

# Time tracking & Equipment
api_router.include_router(time_entries.router, prefix="/time-entries", tags=["Pointages"])
api_router.include_router(equipment.router, prefix="/equipment", tags=["Équipements"])

# Price Library
api_router.include_router(price_library.router, prefix="/price-library", tags=["Bibliothèque de prix"])

# Dashboard & Analytics
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["Tableau de bord"])