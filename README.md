# 🎬 Merci Media

Une application web personnelle **tout-en-un pour gérer vos médias** : musique, films, séries et téléchargements vidéo.

![Stack](https://img.shields.io/badge/Flask-Backend-blue)
![React](https://img.shields.io/badge/React-Frontend-61DAFB)
![Docker](https://img.shields.io/badge/Docker-Ready-2496ED)

---

# Fonctionnalités

* 🎵 **Deezer** — Recherche et téléchargement de musique (MP3 / FLAC)
* 🎬 **Films & Séries** — Catalogue basé sur TMDB
* 📺 **Animés** — Recherche via AniList / Jikan
* 📥 **YouTube / yt-dlp** — Téléchargement vidéo multi-qualité
* 📁 **Fichiers locaux** — Lecture de votre collection en streaming
* 👥 **Multi-utilisateurs** — Comptes avec rôles admin / user
* 📊 **File d'attente** — Gestion des téléchargements en temps réel

---

# Installation

## Prérequis

Avant de commencer :

* Avoir **Docker + Docker Compose**
* Créer un **compte Deezer**
* Créer un **compte TMDB** et obtenir une **clé API**

---

# Exécution

## 1️⃣ Créer un compte Deezer

Créer un compte sur :

https://www.deezer.com

---

## 2️⃣ Créer un compte TMDB

Créer un compte sur :

https://www.themoviedb.org

Puis générer une **clé API** dans les paramètres du compte.

---

## 3️⃣ Télécharger et extraire le projet

Si vous avez téléchargé l’archive :

```bash
unzip merci-media.zip
cd merci-media
```

Ou clonez directement le repository :

```bash
git clone https://github.com/votre-user/merci-media.git
cd merci-media
```

---

## 4️⃣ Lancer l'installation

Exécuter le script :

```bash
./setup.sh
```

Le script va :

* créer le fichier `.env`
* demander les clés API nécessaires
* construire les conteneurs Docker
* lancer l'application

⚠️ **Linux uniquement pour le moment**

---

# 🌐 Accéder à l'application

Une fois lancée :

```
http://localhost:8080
```

---

# Configuration manuelle (optionnel)

```bash
cp .env.example .env
nano .env
docker compose up --build -d
```

---

# 🔑 Variables d'environnement

| Variable            | Description                  |
| ------------------- | ---------------------------- |
| `JWT_SECRET_KEY`    | Clé secrète JWT              |
| `ADMIN_PASSWORD`    | Mot de passe administrateur  |
| `DEEZER_COOKIE_ARL` | Cookie Deezer                |
| `TMDB_API_KEY`      | Clé API TMDB                 |
| `PORT`              | Port de l'application        |
| `MOVIES_PATH`       | Chemin vers les films locaux |

---

# 🍪 Récupérer le cookie Deezer (ARL)

1. Connectez-vous sur https://deezer.com
2. Ouvrez les **DevTools du navigateur**
3. Onglet **Application → Cookies → deezer.com**
4. Copier la valeur du cookie **`arl`**

---

# 🔑 Obtenir une clé API TMDB

1. Créer un compte sur https://www.themoviedb.org
2. Aller dans **Paramètres → API**
3. Demander une **clé API gratuite**

---

# 🐳 Commandes Docker utiles

```bash
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Voir les logs
docker compose logs -f

# Rebuild après modification
docker compose up --build -d
```

---

# Stack technique

| Composant      | Technologie       |
| -------------- | ----------------- |
| Backend        | Python, Flask     |
| Frontend       | React, TypeScript |
| Proxy          | Nginx             |
| Conteneurs     | Docker            |
| Téléchargement | yt-dlp            |

---

# ⚠️ Avertissement légal

Ce projet est destiné à un **usage personnel uniquement**.

Le téléchargement de contenu protégé par le droit d’auteur peut être illégal selon votre pays.
Utilisez ce projet uniquement pour vos contenus personnels ou libres de droits.

---

# 📄 Licence

Made with love by @KAETS0NER @pierre.untersinger
