# Gestar — Gestion d'Entreprise Artisanale & BTP

Application web complète pour la gestion d'entreprises artisanales et du bâtiment (BTP). Devis, factures, clients, fournisseurs, relances, rapports financiers, et fonctionnalités métier BTP avancées.

## Table des matières

1. [Architecture](#architecture)
2. [Démarrage rapide](#démarrage-rapide)
3. [Fonctionnalités](#fonctionnalités)
4. [Fonctionnalités BTP](#fonctionnalités-btp)
5. [API Backend](#api-backend)
6. [Structure du projet](#structure-du-projet)
7. [Configuration](#configuration)
8. [Services Docker](#services-docker)
9. [Développement](#développement)
10. [Troubleshooting](#troubleshooting)

---

## Architecture

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | Next.js App Router + TypeScript + Tailwind CSS | 14+ |
| Backend | FastAPI + SQLModel + Alembic | Python 3.11 |
| Base de données | MySQL | 8.0 |
| Reverse proxy | Traefik | 2.x |
| Logs | Elasticsearch + Logstash + Kibana | 8.x |
| Conteneurs | Docker Compose | — |

---

## Démarrage rapide

```powershell
cd c:\workspace\blackbox

# Démarrer tous les services
.\infra\scripts\start.ps1

# Arrêter (données conservées)
.\infra\scripts\stop.ps1

# Réinitialiser (DANGER — efface les données)
.\infra\scripts\reset.ps1
```

**URLs d'accès :**

| Accès | URL |
|-------|-----|
| Application | http://gestar.localhost:8000 |
| API + Swagger | http://api.localhost:8000/docs |
| Traefik Dashboard | http://localhost:8888 |
| PhpMyAdmin | http://phpmyadmin.localhost:8000 |
| MySQL (local) | localhost:3306 |

**Compte de test :**
- Email : `test@gmail.com`
- Mot de passe : `000000`

> Les données sont persistées dans `./data/mysql/` et `./data/elasticsearch/`.

---

## Fonctionnalités

### Tableau de bord
- KPIs financiers : CA TTC/HT, devis en cours, dépenses
- Graphiques Recharts : évolution mensuelle CA et devis
- Activités récentes (factures, devis, paiements)
- Accès rapide aux actions fréquentes

### Clients
- Création clients particuliers et entreprises
- Coordonnées complètes (adresse, téléphone, email)
- Informations légales (SIRET, numéro TVA)
- Adresse de livraison distincte de l'adresse de facturation
- Historique factures et devis par client

### Devis
- Numérotation automatique configurable (`DEV-YYYY-XXXX`)
- Lignes de prestation avec quantité, prix unitaire HT, taux TVA
- Calcul automatique HT / TVA / TTC
- Expiration paramétrable
- Workflow de statuts : Brouillon → Envoyé → Consulté → Accepté / Refusé
- Conversion directe en facture
- Export CSV des listes filtrées

### Factures
- Types : Facture standard, Avoir, Facture d'acompte, Facture de situation, Facture BTP
- Numérotation automatique configurable (`FAC-YYYY-XXXX`)
- Paiements partiels avec suivi du solde restant
- Paiement total en un clic
- Workflow de statuts : Brouillon → Envoyé → En retard / Payé
- Export CSV des listes filtrées

### Relances paiement
- Vue centralisée des factures impayées et en retard
- KPIs : nombre de relances, montant total dû, retard moyen
- Code couleur par urgence : rouge (30j+), orange (14j+), amber (7j+), bleu (en attente)
- Compteur de relances par facture (1re, 2e, 3e…)
- Barre de progression du paiement partiel
- Envoi de relance avec horodatage

### Rapports financiers
- Sélecteur d'année
- KPIs annuels : CA encaissé HT/TTC, montant en attente, taux de conversion
- Graphiques SVG interactifs : Chiffre d'affaires, Devis, TVA — avec tooltip au survol
- Tableau TVA mensuel (HT / TVA collectée / TTC)
- Tableau mensuel détaillé avec code couleur du taux de conversion
- Export CSV du récapitulatif TVA

### Achats & Fournisseurs
- Gestion des fournisseurs (SIRET, IBAN, contacts)
- Enregistrement des achats avec catégories
- Suivi des dépenses par période
- Rapprochement fournisseur/factures

### Bibliothèque de prix
- Catalogue d'articles/prestations réutilisables
- Unités : m², ml, u, h, forfait…
- Prix HT et taux TVA par article
- Import rapide dans les lignes de devis/factures

### Équipements
- Inventaire du matériel
- Suivi de l'état (opérationnel, en maintenance, hors service)
- Affectation à un projet/chantier

### Pointages
- Saisie des heures par employé et par projet
- Calcul du coût horaire
- Export des données de temps

### Paramètres entreprise
- Logo, coordonnées, mentions légales
- Format des numéros (préfixe, année, séquence)
- Conditions de paiement par défaut
- Pied de page PDF personnalisable

---

## Fonctionnalités BTP

Modules spécialisés pour les entreprises du bâtiment.

### Acomptes
- Création de factures d'acompte liées à un devis ou projet
- Pourcentage ou montant fixe
- Déduction automatique sur la facture de solde
- Numérotation `ACP-YYYY-XXXX`

### Situations de travaux
- Facturation progressive par avancement (%)
- Situation N+1 tient compte des situations précédentes
- Cumul des situations par chantier

### Avoirs
- Émission d'avoirs sur factures existantes
- Montant partiel ou total
- Lien automatique avec la facture d'origine

### Avenants
- Modification du périmètre contractuel en cours de chantier
- Traçabilité des changements avec motif
- Impact sur le montant global du marché

### Retenue de garantie
- Application automatique du taux légal (5 % par défaut)
- Suivi du montant retenu par chantier
- Libération à la fin de la période de parfait achèvement

### Factur-X (facture électronique)
- Génération de fichiers PDF/A-3 conformes Factur-X EN 16931
- Embedded XML ZUGFeRD/Factur-X
- Prêt pour la réforme de facturation électronique obligatoire

---

## API Backend

Base URL : `http://api.localhost:8000/api/v1`

### Authentification
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/auth/login` | Connexion — retourne un JWT |
| POST | `/auth/register` | Inscription |
| GET | `/auth/me` | Profil utilisateur courant |

### Clients
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/customers` | Liste des clients |
| POST | `/customers` | Créer un client |
| GET | `/customers/{id}` | Détail client |
| PUT | `/customers/{id}` | Modifier |
| DELETE | `/customers/{id}` | Supprimer |

### Devis
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/quotes` | Liste (filtres : status, customer_id) |
| POST | `/quotes` | Créer |
| GET | `/quotes/{id}` | Détail + lignes |
| PUT | `/quotes/{id}` | Modifier |
| DELETE | `/quotes/{id}` | Supprimer |
| POST | `/quotes/{id}/convert-to-invoice` | Convertir en facture |
| GET | `/quotes/stats` | Statistiques (CA, taux conversion) |

### Factures
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/invoices` | Liste (filtres : status, type, customer_id) |
| POST | `/invoices` | Créer |
| GET | `/invoices/{id}` | Détail + lignes |
| PUT | `/invoices/{id}` | Modifier |
| DELETE | `/invoices/{id}` | Supprimer |
| POST | `/invoices/{id}/record-payment` | Enregistrer un paiement |
| POST | `/invoices/{id}/send-reminder` | Envoyer une relance |
| GET | `/invoices/overdue` | Factures impayées avec stats |

### Dashboard & Rapports
| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/dashboard/stats` | KPIs résumé |
| GET | `/dashboard/reports/financial?year=YYYY` | Rapport financier mensuel détaillé |

### Autres modules
| Module | Endpoint de base |
|--------|-----------------|
| Achats | `/purchases` |
| Fournisseurs | `/suppliers` |
| Équipements | `/equipment` |
| Pointages | `/time-entries` |
| Projets | `/projects` |
| Bibliothèque de prix | `/price-library` |
| Paramètres | `/settings` |

Documentation interactive complète : **http://api.localhost:8000/docs**

---

## Structure du projet

```
blackbox/
├── frontend/
│   ├── src/
│   │   ├── app/                  # Pages (Next.js App Router)
│   │   │   ├── dashboard/        # Tableau de bord
│   │   │   ├── invoices/         # Factures (liste + détail + nouveau)
│   │   │   ├── quotes/           # Devis
│   │   │   ├── customers/        # Clients
│   │   │   ├── suppliers/        # Fournisseurs
│   │   │   ├── purchases/        # Achats
│   │   │   ├── time-entries/     # Pointages
│   │   │   ├── equipment/        # Équipements
│   │   │   ├── price-library/    # Bibliothèque de prix
│   │   │   ├── relances/         # Relances paiement
│   │   │   ├── reports/          # Rapports financiers
│   │   │   ├── projects/         # Projets
│   │   │   └── settings/         # Paramètres
│   │   ├── components/
│   │   │   ├── layout/           # Sidebar, MainLayout, Header
│   │   │   └── ui/               # Button, Input, Badge, Card…
│   │   ├── services/
│   │   │   └── api.ts            # Tous les appels API
│   │   ├── types/
│   │   │   └── index.ts          # Types TypeScript centralisés
│   │   └── lib/
│   │       ├── utils.ts          # formatCurrency, formatDate…
│   │       └── routes.ts         # buildDetailPath, buildEditPath
│   └── package.json
├── backend/
│   ├── app/
│   │   ├── api/v1/endpoints/     # Routeurs FastAPI
│   │   ├── models/               # Modèles SQLModel
│   │   ├── services/             # Logique métier
│   │   ├── core/                 # Auth, config, sécurité
│   │   └── db/                   # Session DB, init
│   ├── alembic/
│   │   └── versions/             # Fichiers de migration
│   └── requirements.txt
├── docker-compose.yml
└── README.md
```

---

## Configuration

**Fichier `.env`** (à la racine) :

```env
# Base de données
DATABASE_URL=mysql+pymysql://root:rootpassword@gestar_db:3306/gestar_db?charset=utf8mb4

# JWT
SECRET_KEY=your-secret-key-change-in-production
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API
NEXT_PUBLIC_API_URL=http://api.localhost:8000/api/v1
```

---

## Services Docker

| Service | URL | Port interne | Rôle |
|---------|-----|--------------|------|
| Traefik | localhost:8000 | — | Reverse proxy |
| Traefik Dashboard | localhost:8888 | 8080 | Gestion routes |
| Frontend | gestar.localhost:8000 | 3001 | Next.js |
| Backend | api.localhost:8000 | 8001 | FastAPI |
| PhpMyAdmin | phpmyadmin.localhost:8000 | 80 | Admin DB |
| MySQL | localhost:3306 | 3306 | Base de données |
| Elasticsearch | — | 9200 | Indexation logs |
| Logstash | — | 5000 | Ingestion logs |
| Kibana | — | 5601 | Visualisation logs |

---

## Développement

### Backend (avec Docker)

```powershell
# Accéder au conteneur
docker exec -it gestar_api bash

# Appliquer les migrations
docker exec gestar_api alembic upgrade head

# Créer une nouvelle migration
docker exec gestar_api alembic revision --autogenerate -m "description"

# Voir les logs en temps réel
docker compose logs -f backend
```

### Frontend (avec Docker)

```powershell
docker compose logs -f frontend
```

### Développement local (hors Docker)

```powershell
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001

# Frontend
cd frontend
npm install
npm run dev
```

---

## Troubleshooting

### Impossible de se connecter
→ Vérifier que tous les services Docker sont démarrés : `docker compose ps`
→ Vérifier les logs : `docker compose logs -f`

### Erreur CORS
→ S'assurer que `NEXT_PUBLIC_API_URL` pointe bien vers le bon host

### Migration échoue
```powershell
docker exec gestar_api alembic current   # Version actuelle
docker exec gestar_api alembic history   # Historique des migrations
```

### Port déjà utilisé
```powershell
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Réinitialiser la base de données
```powershell
# DANGER — efface toutes les données
.\infra\scripts\reset.ps1
docker exec gestar_api alembic upgrade head
docker exec gestar_api python seed_demo_data.py
```
