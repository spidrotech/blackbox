# Blackbox - Gestion Artisanale

Application web complète pour la gestion d'entreprises artisanales avec suivi des clients, projets, devis, factures et achats.

## 🏗️ Architecture

- **Frontend**: Next.js 16.1.1 avec TypeScript et Tailwind CSS
- **Backend**: FastAPI avec SQLModel ORM
- **Database**: MySQL 8.0 avec migrations Alembic
- **Infrastructure**: Docker Compose (dev + services)
- **Logging**: Elasticsearch, Logstash, Kibana

## 🚀 Quick Start

```powershell
cd c:\workspace\blackbox
.\infra\scripts\start.ps1
```

**Accès:**
- Frontend: http://gestar.localhost:8000
- Backend API: http://api.localhost:8000/api/v1
- Traefik Dashboard: http://localhost:8888
- MySQL: `localhost:3306` (port local exposé)
- phpmyadmin: http://phpmyadmin.localhost:8000 

**Test Account:**
- Email: `test@gmail.com`
- Password: `000000`

**Arrêter** (données préservées): `.\infra\scripts\stop.ps1`

**Redémarrer**: `.\infra\scripts\start.ps1`

**Réinitialiser** (DANGER!): `.\infra\scripts\reset.ps1`

---

Les données sont stockées dans `./data/mysql/` et `./data/elasticsearch/` et persistent après arrêt des services.

## 🔄 Démarrage/Arrêt Quotidien

1. **Fermeture du jour**: `.\infra\scripts\stop.ps1` (données conservées)
2. **Ouverture le lendemain**: `.\infra\scripts\start.ps1` (récupère les données)

Tous vos clients, devis, factures, etc. seront disponibles immédiatement! ✅

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
DATABASE_URL=mysql+pymysql://root:rootpassword@gestar_db:3306/gestar_db?charset=utf8mb4

# JWT
SECRET_KEY=your-secret-key-here
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# API (via Traefik)
API_URL=http://api.localhost:8000/api/v1
NEXT_PUBLIC_API_URL=http://api.localhost:8000/api/v1
```

## 🗂️ Services Docker

| Service | Accès | Port Interne | Description |
|---------|-------|--------------|-------------|
| Traefik | localhost:8000 | - | Reverse proxy & load balancer |
| Traefik Dashboard | localhost:8888 | 8080 | Gestion routes & services |
| Frontend | gestar.localhost:8000 | 3001 | Application Next.js |
| Backend | api.localhost:8000 | 8001 | API FastAPI |
| PhpMyAdmin | phpmyadmin.localhost:8000 | 80 | Gestion DB (user/pass) |
| MySQL | localhost:3306 | 3306 | Base de données |
| Elasticsearch | (*via logs*) | 9200 | Logs indexés |
| Logstash | (*via logs*) | 5000 | Ingestion logs |
| Kibana | (*via logs*) | 5601 | Visualisation logs |

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
netstat -ano | findstr :8000  # Traefik main port
taskkill /PID <PID> /F         # Tuer le processus
```

## 📖 Documentation Complète

- **API Swagger**: http://api.localhost:8000/docs
- **Traefik Dashboard**: http://localhost:8888
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
