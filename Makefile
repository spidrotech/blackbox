.PHONY: start stop restart reset logs

# Démarrer le projet
start:
	@echo "📁 Initialisation des dossiers de données..."
	@mkdir -p data/mysql data/elasticsearch data/logstash
	@echo "🚀 Démarrage de Blackbox..."
	docker-compose up -d
	@echo "✅ Services prêts sur http://gestar.localhost"

# Arrêter les services
stop:
	@echo "🛑 Arrêt des services..."
	docker-compose stop

# Reset complet (Supprime tout)
reset:
	@echo "⚠️  Suppression des données dans 5s (CTRL+C pour annuler)..."
	@sleep 5
	docker-compose down -v
	rm -rf ./data
	@echo "✨ Système réinitialisé."