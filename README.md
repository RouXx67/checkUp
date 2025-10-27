# CheckUp

CheckUp est une application web moderne de monitoring et de suivi des mises à jour qui combine les fonctionnalités de surveillance des services et de gestion des mises à jour d'applications.

## 🚀 Fonctionnalités

### Monitoring des Services
- **Surveillance HTTP/HTTPS** : Vérification de la disponibilité et du temps de réponse des sites web
- **Monitoring Docker** : Surveillance des conteneurs Docker (statut, santé, ressources)
- **Surveillance Proxmox** : Monitoring des machines virtuelles et conteneurs Proxmox
- **Ping Network** : Vérification de la connectivité réseau
- **Métriques en temps réel** : Collecte et affichage des métriques de performance
- **Alertes automatiques** : Notifications en cas de panne ou de ralentissement

### Suivi des Mises à Jour
- **GitHub Releases** : Surveillance des nouvelles versions sur GitHub
- **Docker Hub** : Suivi des mises à jour d'images Docker
- **APIs personnalisées** : Support pour des sources de mise à jour personnalisées
- **Historique des versions** : Suivi complet des changements de version
- **Notifications de mise à jour** : Alertes lors de nouvelles versions disponibles

### Système d'Alertes
- **Notifications Email** : Envoi d'alertes par email via SMTP
- **Gotify** : Intégration avec Gotify pour les notifications push
- **Webhooks** : Support des webhooks personnalisés (Slack, Discord, etc.)
- **Gestion des priorités** : Classification des alertes par niveau d'importance
- **Acquittement** : Système de gestion et de résolution des alertes

### Interface Utilisateur
- **Dashboard moderne** : Vue d'ensemble avec statistiques et graphiques
- **Interface responsive** : Compatible mobile et desktop
- **Thème sombre/clair** : Interface adaptable
- **Gestion des utilisateurs** : Authentification et profils utilisateur
- **Configuration intuitive** : Paramétrage facile des services et notifications

## 🛠️ Technologies

### Backend
- **Node.js** avec Express.js
- **SQLite** pour la base de données
- **JWT** pour l'authentification
- **Axios** pour les requêtes HTTP
- **Nodemailer** pour les emails
- **Bcrypt** pour le hachage des mots de passe

### Frontend
- **React 18** avec Hooks
- **Vite** pour le build et le développement
- **Tailwind CSS** pour le styling
- **Axios** pour les appels API
- **React Router** pour la navigation
- **Lucide React** pour les icônes
- **React Hot Toast** pour les notifications

## 📦 Installation

### Prérequis
- Node.js 16+ 
- npm ou yarn

### Installation rapide

1. **Cloner le repository**
```bash
git clone https://github.com/votre-username/CheckUp.git
cd CheckUp
```

2. **Installer les dépendances**
```bash
# Dépendances du serveur
npm install

# Dépendances du client
cd client
npm install
cd ..
```

3. **Configuration**
```bash
# Copier le fichier d'exemple
cp .env.example .env

# Éditer le fichier .env avec vos paramètres
nano .env
```

4. **Initialiser la base de données**
```bash
npm run init-db
```

5. **Lancer l'application**
```bash
# Mode développement (serveur + client)
npm run dev

# Ou séparément
npm run server    # Backend seulement
npm run client    # Frontend seulement
```

6. **Accéder à l'application**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000

## ⚙️ Configuration

### Variables d'environnement

Copiez `.env.example` vers `.env` et configurez les variables suivantes :

```env
# Configuration de base
NODE_ENV=development
PORT=3000
FRONTEND_URL=http://localhost:5173

# Base de données
DATABASE_PATH=./data/checkup.db

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Gotify (optionnel)
GOTIFY_URL=https://gotify.example.com
GOTIFY_TOKEN=your-gotify-token

# Email SMTP (optionnel)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
EMAIL_FROM=CheckUp <noreply@example.com>
EMAIL_TO=admin@example.com

# Monitoring
CHECK_INTERVAL=300000
METRICS_RETENTION_DAYS=30
UPDATE_CHECK_INTERVAL=3600000

# Proxmox (optionnel)
PROXMOX_HOST=https://proxmox.example.com:8006
PROXMOX_USER=monitoring@pve
PROXMOX_PASSWORD=your-password
PROXMOX_NODE=pve

# Docker (optionnel)
DOCKER_SOCKET_PATH=/var/run/docker.sock
```

### Premier utilisateur

Lors du premier lancement, créez un compte administrateur via l'interface web à l'adresse http://localhost:5173/register

## 📖 Utilisation

### Ajouter un service à monitorer

1. Accédez à la section **Services**
2. Cliquez sur **Ajouter un service**
3. Configurez les paramètres :
   - **Nom** : Nom du service
   - **Type** : HTTP, Docker, Proxmox, ou Ping
   - **URL/Cible** : Adresse à surveiller
   - **Intervalle** : Fréquence de vérification
   - **Seuils** : Limites pour les alertes

### Ajouter une application à suivre

1. Accédez à la section **Applications**
2. Cliquez sur **Ajouter une application**
3. Configurez les paramètres :
   - **Nom** : Nom de l'application
   - **Type** : GitHub, Docker Hub, ou Custom API
   - **Repository/Image** : Référence de l'application
   - **Version actuelle** : Version installée
   - **Intervalle** : Fréquence de vérification

### Configurer les notifications

1. Accédez aux **Paramètres**
2. Onglet **Notifications**
3. Activez et configurez les canaux souhaités :
   - **Email** : Configuration SMTP
   - **Gotify** : URL et token
   - **Webhook** : URL et secret (optionnel)

## 🔧 API

L'API REST est disponible à l'adresse `http://localhost:3000/api`

### Endpoints principaux

- `POST /api/auth/register` - Créer un compte
- `POST /api/auth/login` - Se connecter
- `GET /api/monitoring/services` - Liste des services
- `POST /api/monitoring/services` - Ajouter un service
- `GET /api/updates/applications` - Liste des applications
- `POST /api/updates/applications` - Ajouter une application
- `GET /api/alerts` - Liste des alertes

Documentation complète disponible via Swagger à `/api/docs` (en développement)

## 🐳 Docker

### Utilisation avec Docker Compose

```yaml
version: '3.8'
services:
  checkup:
    build: .
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - /var/run/docker.sock:/var/run/docker.sock:ro
    environment:
      - NODE_ENV=production
      - DATABASE_PATH=/app/data/checkup.db
      - JWT_SECRET=your-secret-key
    restart: unless-stopped
```

### Build et lancement

```bash
# Build de l'image
docker build -t checkup .

# Lancement
docker run -d \
  --name checkup \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  checkup
```

## 🤝 Contribution

Les contributions sont les bienvenues ! Voici comment contribuer :

1. Fork le projet
2. Créez une branche pour votre fonctionnalité (`git checkout -b feature/AmazingFeature`)
3. Committez vos changements (`git commit -m 'Add some AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrez une Pull Request

### Développement

```bash
# Installation des dépendances de développement
npm install
cd client && npm install && cd ..

# Lancement en mode développement
npm run dev

# Tests
npm test

# Linting
npm run lint

# Build de production
npm run build
```

## 📝 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](LICENSE) pour plus de détails.

## 🙏 Remerciements

Ce projet s'inspire de :
- [Pulse](https://github.com/rcourtman/Pulse) - Pour les fonctionnalités de monitoring
- [SelfUp](https://github.com/RouXx67/SelfUp) - Pour le suivi des mises à jour

## 📞 Support

- 🐛 **Issues** : [GitHub Issues](https://github.com/votre-username/CheckUp/issues)
- 💬 **Discussions** : [GitHub Discussions](https://github.com/votre-username/CheckUp/discussions)
- 📧 **Email** : support@checkup.example.com

## 🗺️ Roadmap

- [ ] Support de Kubernetes
- [ ] Métriques avancées (CPU, RAM, Disk)
- [ ] Graphiques et tableaux de bord personnalisables
- [ ] API GraphQL
- [ ] Application mobile
- [ ] Intégrations supplémentaires (Telegram, Teams, etc.)
- [ ] Système de plugins
- [ ] Mode cluster/haute disponibilité

---

**CheckUp** - Gardez un œil sur tout ce qui compte ! 👀