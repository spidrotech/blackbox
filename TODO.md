# TODO — Gestar

Suivi de toutes les fonctionnalités implémentées et planifiées.

---

## ✅ Fonctionnalités terminées

### Socle applicatif
- [x] Authentification JWT (login / register / profil)
- [x] Layout avec Sidebar navigation responsive
- [x] Gestion multi-entreprises (company_id par utilisateur)
- [x] Paramètres entreprise (logo, coordonnées, mentions légales, format numéros)
- [x] Inscription avec création automatique de l'entreprise

### Clients
- [x] CRUD complet clients (particuliers + entreprises)
- [x] Champs SIRET, numéro TVA, IBAN
- [x] Adresse livraison distincte de l'adresse de facturation
- [x] Historique factures/devis par client

### Devis
- [x] CRUD complet devis
- [x] Lignes avec quantité, unité, prix HT, taux TVA
- [x] Calcul automatique HT / TVA / TTC
- [x] Workflow de statuts (draft → sent → viewed → accepted/refused)
- [x] Expiration configurable
- [x] Conversion devis → facture
- [x] Statistiques devis (taux conversion, CA, expiration imminente)
- [x] Export CSV de la liste filtrée

### Factures
- [x] CRUD complet factures
- [x] Types : invoice, avoir, acompte, situation, btp
- [x] Paiements partiels avec suivi du solde restant
- [x] Paiement total en un clic
- [x] Workflow de statuts (draft → sent → overdue / paid)
- [x] Export CSV de la liste filtrée

### Relances paiement
- [x] Page `/relances` — vue centralisée factures impayées
- [x] KPIs : total dû, retard moyen, nb relances envoyées
- [x] Code couleur par urgence (rouge / orange / amber / bleu)
- [x] Compteur de relances par facture
- [x] Barre de progression paiement partiel
- [x] Bouton « Relancer » avec horodatage
- [x] Champs `reminder_count` + `last_reminder_at` sur Invoice (migration)
- [x] Endpoint `POST /invoices/{id}/send-reminder`
- [x] Endpoint `GET /invoices/overdue`

### Rapports financiers
- [x] Page `/reports` — analytics financiers annuels
- [x] KPIs : CA HT/TTC, en attente, taux de conversion
- [x] Graphiques barres SVG interactifs (CA, Devis, TVA)
- [x] Tableau TVA mensuel (HT / TVA / TTC)
- [x] Tableau mensuel détaillé avec code couleur taux de conversion
- [x] Export CSV récapitulatif TVA
- [x] Endpoint `GET /dashboard/reports/financial?year=YYYY`

### Achats & Fournisseurs
- [x] CRUD fournisseurs
- [x] CRUD achats avec catégories
- [x] Suivi des dépenses

### Ressources
- [x] Bibliothèque de prix (catalogue articles/prestations)
- [x] Équipements (inventaire + états)
- [x] Pointages / heures travaillées

### Tableau de bord
- [x] KPIs résumé (CA, devis, factures, dépenses)
- [x] Graphiques Recharts (évolution mensuelle)
- [x] Activités récentes

---

## 🏗️ Fonctionnalités BTP

- [x] **Acomptes** — factures d'acompte liées à un devis/projet, déduction automatique sur facture de solde
- [x] **Situations de travaux** — facturation progressive par avancement %, cumul inter-situations
- [x] **Avoirs** — émission d'avoirs partiels ou totaux, lien avec facture d'origine
- [x] **Avenants** — modifications contractuelles en cours de chantier avec traçabilité
- [x] **Retenue de garantie** — taux configurable (5 % légal), suivi et libération
- [x] **Factur-X** — génération PDF/A-3 conforme EN 16931 avec XML embedded

---

## 🔄 En cours / Priorité haute

- [ ] **Génération PDF** — export PDF des factures et devis avec en-tête entreprise et logo
- [ ] **Envoi email** — envoi des factures/devis par email directement depuis l'application
- [ ] **Signature électronique** — signature des devis en ligne par le client (lien sécurisé)
- [ ] **Portail client** — espace client pour consulter et télécharger ses documents

---

## 📋 Planifié / Priorité moyenne

### Gestion de projet & planning
- [ ] **Planning chantier** — vue Gantt ou calendrier par projet
- [ ] **Suivi avancement** — tableau Kanban ou % d'avancement par tâche

### Notifications & automatisation
- [ ] **Notifications email automatiques** — relances paiement automatiques après X jours
- [ ] **Alertes** — notification in-app pour devis expirés, factures en retard
- [ ] **Webhooks** — intégration avec outils tiers (Zapier, Make…)

### Import & synchronisation
- [ ] **Import CSV clients** — import en masse depuis un fichier CSV/Excel
- [ ] **Import catalogue fournisseurs** — import prix depuis PDF ou CSV
- [ ] **Synchronisation bancaire** — rapprochement automatique avec relevé bancaire

### Comptabilité
- [ ] **Grand livre** — export comptable (FEC — Fichier des Écritures Comptables)
- [ ] **Déclaration TVA** — récapitulatif TVA par période prêt à déclarer
- [ ] **Intégration comptable** — export vers Sage, QuickBooks, EBP

---

## 🔮 Planifié / Priorité basse / Long terme

- [ ] **Multi-utilisateurs** — rôles Admin / Comptable / Commercial / Lecture seule
- [ ] **Application mobile** — React Native ou PWA pour saisie mobile (pointages, photos chantier)
- [ ] **OCR factures fournisseurs** — import auto des factures fournisseurs par photo/scan
- [ ] **Devis dynamique** — configurateur interactif pour le client avec options au choix
- [ ] **Sous-traitance** — gestion des sous-traitants et de la co-traitance (DC4)
- [ ] **DUME** — Document Unique de Marché Européen pour les appels d'offres publics
- [ ] **Répertoire des marchés** — suivi des appels d'offres et résultats

---

## 🐛 Bugs connus

*(aucun bug critique connu)*

---

## 📅 Historique des migrations Alembic

| Fichier | Description |
|---------|-------------|
| `20260308_btp_features` | Acomptes, situations, retenue garantie, avenants, avoirs, Factur-X |
| `20260309_relances_reports` | Champs `reminder_count` et `last_reminder_at` sur la table invoices |
