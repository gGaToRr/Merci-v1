# 🎬 Merci Media

Une application web personnelle tout-en-un pour gérer vos médias : téléchargements Deezer, visionnage de films/séries, téléchargement vidéo, et plus.

![Stack](https://img.shields.io/badge/Flask-Backend-blue) ![React](https://img.shields.io/badge/React-Frontend-61DAFB) ![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

## ✨ Fonctionnalités

- 🎵 **Deezer** — Recherche et téléchargement de musique (MP3/FLAC)
- 🎬 **Films & Séries** — Catalogue TMDB avec lecteurs intégrés (Frembed, VidSrc, MultiEmbed...)
- 📺 **Animés** — Recherche AniList/Jikan avec lecteurs VF/VOSTFR
- 📥 **YouTube/yt-dlp** — Téléchargement vidéo multi-qualité
- 📁 **Fichiers locaux** — Lecture de votre collection films en streaming
- 👥 **Multi-utilisateurs** — Comptes avec rôles admin/user
- 📊 **File d'attente** — Gestion des téléchargements en temps réel

## 🚀 Installation rapide

### Prérequis
- [Docker](https://docs.docker.com/get-docker/) + Docker Compose
- Un compte Deezer (pour le téléchargement musique)
- Une clé API TMDB gratuite (pour les films/séries)

### 1. Cloner le projet

```bash
git clone https://github.com/votre-user/merci-media.git
cd merci-media
```

### 2. Lancer le script d'installation

```bash
chmod +x setup.sh
./setup.sh
```

Le script va :
- Créer votre fichier `.env` depuis `.env.example`
- Vous guider pour renseigner les clés API
- Construire et démarrer les conteneurs Docker
- Ouvrir l'application dans le navigateur

### 3. Accéder à l'application

```
http://localhost:8080
```

---

## ⚙️ Configuration manuelle

```bash
cp .env.example .env
# Éditez .env avec vos valeurs
nano .env
docker compose up --build -d
```

### Variables d'environnement

| Variable | Description | Requis |
|---|---|---|
| `JWT_SECRET_KEY` | Clé secrète JWT (chaîne aléatoire longue) | ✅ |
| `ADMIN_PASSWORD` | Mot de passe admin | ✅ |
| `DEEZER_COOKIE_ARL` | Cookie ARL Deezer | Pour Deezer |
| `TMDB_API_KEY` | Clé API TMDB | Pour films/séries |
| `PORT` | Port d'écoute (défaut: 8080) | Non |
| `MOVIES_PATH` | Chemin collection films locale | Non |

### Récupérer le cookie ARL Deezer

1. Connectez-vous sur [deezer.com](https://deezer.com)
2. Ouvrez les DevTools → Application → Cookies → deezer.com
3. Copiez la valeur du cookie `arl`

### Obtenir une clé TMDB

1. Créez un compte sur [themoviedb.org](https://www.themoviedb.org)
2. Allez dans Paramètres → API → Demander une clé (gratuit)

---

## 🐳 Commandes Docker

```bash
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Logs
docker compose logs -f

# Redémarrer après modification
docker compose up --build -d
```

---

## 🏗️ Stack technique

| Composant | Technologie |
|---|---|
| Backend | Python 3.12, Flask, SQLite, Waitress |
| Frontend | React 18, TypeScript, Vite, Tailwind CSS |
| Proxy | Nginx |
| Conteneurs | Docker + Docker Compose |

---

## ⚠️ Avertissement légal

Ce projet est à usage **personnel** uniquement. Le téléchargement de contenu protégé par le droit d'auteur sans autorisation peut être illégal dans votre pays. Utilisez-le uniquement pour vos propres achats ou contenus libres de droits.

---

## 📄 Licence

MIT — voir [LICENSE](LICENSE)
