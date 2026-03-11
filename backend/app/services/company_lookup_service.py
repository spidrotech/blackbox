from typing import Any

import requests

from app.core.config import settings


def search_companies(query: str, limit: int = 8) -> list[dict[str, Any]]:
    normalized_query = query.strip()
    if len(normalized_query) < 3:
        return []

    per_page = max(1, min(limit, 10))

    try:
        response = requests.get(
            settings.COMPANY_SEARCH_API_URL,
            params={
                "q": normalized_query,
                "per_page": per_page,
                "page": 1,
                "etat_administratif": "A",
            },
            headers={"User-Agent": settings.COMPANY_SEARCH_USER_AGENT},
            timeout=settings.COMPANY_SEARCH_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException:
        return []

    results: list[dict[str, Any]] = []
    for item in payload.get("results", []):
        headquarters = item.get("siege") or {}
        address = headquarters.get("geo_adresse") or headquarters.get("adresse") or ""
        results.append(
            {
                "name": item.get("nom_complet") or item.get("nom_raison_sociale") or "",
                "siren": item.get("siren") or "",
                "siret": headquarters.get("siret") or "",
                "address": address.replace("\n", " ").strip(),
                "postal_code": headquarters.get("code_postal") or "",
                "city": headquarters.get("libelle_commune") or "",
                "country": "France",
                "ape_code": item.get("activite_principale") or headquarters.get("activite_principale") or "",
                "legal_form": item.get("nature_juridique") or "",
                "is_rge": bool((item.get("complements") or {}).get("est_rge")),
            }
        )

    return [result for result in results if result["name"]]