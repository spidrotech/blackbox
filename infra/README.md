# Infrastructure - Scripts de Gestion

## 📁 Structure

```
infra/
├── scripts/           # Scripts PowerShell
│   ├── start.ps1      # Démarre les services + initialise ./data/
│   ├── stop.ps1       # Arrête (préserve ./data/)
│   └── reset.ps1      # Supprime ./data/ + arrête (DANGER!)
├── config/            # Fichiers de configuration
│   └── .env           # Variables d'environnement
└── init/              # Scripts d'initialisation
    └── init-data.ps1  # Crée ./data/mysql et ./data/elasticsearch
```

## 🚀 Commandes

```powershell
# Démarrer
.\infra\scripts\start.ps1

# Arrêter (données préservées)
.\infra\scripts\stop.ps1

# Réinitialiser (supprime tout)
.\infra\scripts\reset.ps1
```

## 💾 Données

Les données sont stockées sur disque dans `./data/`:

```
./data/
├── mysql/              ← Base de données MySQL
└── elasticsearch/      ← Index Elasticsearch
```

Les données **persistent** après `stop.ps1` et sont restaurées au `start.ps1`.

## ⚙️ Configuration

Les variables d'environnement sont dans `infra/config/.env`:

```env
DB_USER=gestar_user
DB_PASSWORD=gestar_password
DB_ROOT_PASSWORD=rootpassword
DB_NAME=gestar_db
```

## 🔗 Voir aussi

- [../README.md](../README.md) - Vue d'ensemble générale
- [../docker-compose.yml](../docker-compose.yml) - Configuration complète
