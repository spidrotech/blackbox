# Blackbox - Gestion Artisanale

Application web complète pour la gestion d'entreprises artisanales avec suivi des clients, projets, devis, factures et achats.

## 🏗️ Architecture

- **Frontend**: Next.js 16.1.1 avec TypeScript et Tailwind CSS
- **Backend**: FastAPI avec SQLModel ORM
- **Database**: MySQL 8.0 avec migrations Alembic
- **Infrastructure**: Docker Compose (dev + services)
- **Logging**: Elasticsearch, Logstash, Kibana

## 🚀 Quick Start

### Prérequis
- Docker & Docker Compose
- Windows PowerShell (pour les commandes fournies) ou terminal standard

### Installation & Démarrage

```powershell
# Aller dans le répertoire blackbox
cd c:\workspace\blackbox

# Lancer tous les services
docker-compose up -d

# Attendre 30 secondes que tout soit initialisé
# Les services seront accessibles sur:
# - Frontend: http://localhost:3001
# - Backend API: http://localhost:8001
# - PhpMyAdmin: http://localhost:8080
# - Kibana: http://localhost:5601
```

### Arrêter les services

```powershell
docker-compose down
```

## 📝 Identifiants par défaut

Pour tester l'application, utilisez:

- **Email**: test@gmail.com
- **Mot de passe**: 000000

Ces identifiants sont créés automatiquement lors du premier démarrage.

## 📊 Structure du Projet

```
blackbox/
├── frontend/                 # Application Next.js
│   ├── src/
│   │   ├── app/             # Routing Next.js 13+
│   │   ├── components/      # Composants réutilisables
│   │   ├── services/        # Appels API
│   │   ├── contexts/        # Context React
│   │   └── types/           # Types TypeScript
│   ├── public/              # Assets statiques
│   └── package.json
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── api/             # Routes API
│   │   ├── models/          # Modèles SQLModel
│   │   ├── core/            # Logique métier
│   │   └── db/              # Configuration DB
│   ├── alembic/             # Migrations de schéma
│   └── requirements.txt
├── docker-compose.yml       # Orchestration services
├── .env                     # Variables d'environnement
└── README.md               # Cette documentation
```

## 🔐 Authentification

### Login
- Endpoint: `POST /api/v1/auth/login`
- Body: `{ "email": "user@example.com", "password": "password" }`
- Réponse: JWT token stocké en localStorage

### Endpoints disponibles
- `POST /api/v1/auth/register` - Inscription
- `GET /api/v1/auth/me` - Profil utilisateur
- `GET /api/v1/customers` - Liste des clients
- `POST /api/v1/customers` - Créer un client
- Et tous les autres endpoints CRUD

## 📱 Fonctionnalités Principales

### Clients
- ✅ Créer/Lire/Modifier/Supprimer clients
- ✅ Support particuliers et entreprises
- ✅ Gestion adresses (livraison, facturation)
- ✅ Informations légales (SIRET, TVA)

### Projets
- ✅ Planification de projets
- ✅ Suivi des tâches
- ✅ Historique modifications

### Devis & Factures
- ✅ Génération automatique numéros
- ✅ Lignes détaillées avec tarification
- ✅ Suivi statuts

### Achats
- ✅ Gestion fournisseurs
- ✅ Suivi commandes
- ✅ Intégration coûts

## 🔧 Configuration

### Variables d'environnement

Fichier `.env`:
```env
# Database
DATABASE_URL=mysql+pymysql://root:rootpassword@localhost:3306/gestar_db?charset=utf8mb4

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API
API_URL=http://localhost:8001/api/v1
NEXT_PUBLIC_API_URL=http://localhost:8001/api/v1
```

## 🗂️ Services Docker

| Service | Port | Description |
|---------|------|-------------|
| frontend | 3001 | Application Next.js |
| backend | 8001 | API FastAPI |
| mysql | 3306 | Base de données |
| phpmyadmin | 8080 | Gestion DB UI |
| elasticsearch | 9200 | Logs indexés |
| logstash | 5000 | Ingestion logs |
| kibana | 5601 | Visualisation logs |

## 📚 Développement

### Backend

```powershell
# Installation dépendances
pip install -r backend/requirements.txt

# Migrations DB
cd backend
alembic upgrade head

# Lancer le serveur dev
uvicorn app.main:app --reload --host 0.0.0.0 --port 8001
```

### Frontend

```powershell
# Installation dépendances
cd frontend
npm install

# Démarrer le serveur dev
npm run dev
```

## 🐛 Troubleshooting

### "ERR_BAD_REQUEST" lors du login
→ Vérifier que le token est bien stocké en localStorage
→ Vérifier les headers CORS du backend

### "Client non trouvé" après création
→ Rafraîchir la page (F5)
→ Vérifier que la company_id est correcte

### Port déjà utilisé
```powershell
# Arrêter tous les containers
docker-compose down

# Ou arrêter un port spécifique
netstat -ano | findstr :3001  # Trouver le PID
taskkill /PID <PID> /F         # Tuer le processus
```

## 📖 Documentation Complète

- **API Swagger**: http://localhost:8001/docs
- **Migrations**: Voir `backend/alembic/versions/`
- **Types Frontend**: `frontend/src/types/index.ts`
- **Modèles Backend**: `backend/app/models/`

## 🎯 Prochaines Étapes

1. ✅ Authentification complète
2. ✅ CRUD Clients
3. ⏳ CRUD Projets et Devis
4. ⏳ Génération factures PDF
5. ⏳ Dashboard analytics
6. ⏳ Rapports & exports
7. ⏳ Mobile app

## 📝 Notes de Développement

### Architecture Décisions
- **JWT au lieu de sessions**: Stateless, scalable
- **SQLModel**: Type-safe ORM avec Pydantic
- **Next.js App Router**: Modern, TypeScript-first
- **Tailwind CSS**: Utility-first, rapide

### Problèmes Connus & Solutions
1. **Relationships SQLModel**: Certaines relations commentées pour éviter les erreurs ForeignKey auto-detect
   - Solution: Utiliser `foreign_keys` explicites ou `primaryjoin`
   
2. **CORS**: Doit être configuré avant les routes
   - Solution: Middleware placé en premier dans FastAPI

3. **Argon2 backend**: Nécessite `argon2-cffi`
   - Solution: Fallback vers bcrypt dans `security.py`

## 📞 Support

Pour les problèmes, vérifier:
1. Les logs Docker: `docker-compose logs -f backend`
2. La console navigateur (F12 → Console)
3. Les migrations: `alembic current`
4. La connexion DB: `docker-compose logs -f mysql`

---

**Dernière mise à jour**: Février 2026
**Status**: 🟢 En développement actif
