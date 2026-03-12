#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
#  Merci Media — Script d'installation et de lancement
#  Usage : chmod +x setup.sh && ./setup.sh
# ══════════════════════════════════════════════════════════════════════════════

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log()   { echo -e "${GREEN}✔${NC}  $1"; }
warn()  { echo -e "${YELLOW}⚠${NC}  $1"; }
error() { echo -e "${RED}✘${NC}  $1"; exit 1; }
info()  { echo -e "${CYAN}ℹ${NC}  $1"; }
title() { echo -e "\n${BOLD}${BLUE}▶ $1${NC}"; }

echo ""
echo -e "${BOLD}${BLUE}╔══════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${BLUE}║         Merci Media — Setup              ║${NC}"
echo -e "${BOLD}${BLUE}╚══════════════════════════════════════════╝${NC}"
echo ""

# ── 1. Prérequis ──────────────────────────────────────────────────────────
title "Vérification des prérequis"

if ! command -v docker &>/dev/null; then
    error "Docker n'est pas installé. Installez Docker : https://docs.docker.com/get-docker/"
fi
log "Docker trouvé : $(docker --version)"

if docker compose version &>/dev/null 2>&1; then
    COMPOSE="docker compose"
elif command -v docker-compose &>/dev/null; then
    COMPOSE="docker-compose"
else
    error "Docker Compose introuvable. Installez Docker Desktop ou le plugin Compose."
fi
log "Docker Compose disponible ($COMPOSE)"

# ── 2. Configuration .env ──────────────────────────────────────────────────
title "Configuration"

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo ""
    echo -e "  ${YELLOW}Fichier .env créé depuis .env.example.${NC}"
    echo -e "  ${BOLD}Renseignez les valeurs suivantes :${NC}"
    echo ""
    echo -e "  ${CYAN}  DEEZER_COOKIE_ARL${NC}  → Cookie ARL de votre compte Deezer"
    echo -e "  ${CYAN}  TMDB_API_KEY${NC}        → Clé API TMDB (gratuite sur themoviedb.org)"
    echo -e "  ${CYAN}  JWT_SECRET_KEY${NC}      → Clé secrète longue et aléatoire"
    echo -e "  ${CYAN}  ADMIN_PASSWORD${NC}      → Mot de passe administrateur"
    echo ""

    read -p "  Éditer le fichier .env maintenant ? [O/n] " answer
    answer="${answer:-O}"
    if [[ "$answer" =~ ^[Oo]$ ]]; then
        if command -v nano &>/dev/null; then
            nano .env
        elif command -v vim &>/dev/null; then
            vim .env
        elif command -v vi &>/dev/null; then
            vi .env
        else
            warn "Aucun éditeur trouvé. Éditez .env manuellement puis relancez setup.sh"
            exit 0
        fi
    fi
else
    log ".env déjà présent"
fi

# Charger le .env pour les avertissements
set -o allexport
source .env 2>/dev/null || true
set +o allexport

if [ -z "$DEEZER_COOKIE_ARL" ] || [ "$DEEZER_COOKIE_ARL" = "VOTRE_ARL_ICI" ]; then
    warn "DEEZER_COOKIE_ARL non renseigné — le téléchargement Deezer ne fonctionnera pas"
fi
if [ -z "$TMDB_API_KEY" ] || [ "$TMDB_API_KEY" = "VOTRE_CLE_TMDB_ICI" ]; then
    warn "TMDB_API_KEY non renseigné — les films/séries ne s'afficheront pas"
fi
if [[ "$JWT_SECRET_KEY" == *"CHANGEZ_MOI"* ]]; then
    warn "JWT_SECRET_KEY pas encore changée — changez-la pour la sécurité !"
fi

# ── 3. Dossiers de données ─────────────────────────────────────────────────
title "Préparation des dossiers"
mkdir -p data downloads
log "Dossiers data/ et downloads/ prêts"

# ── 4. Build Docker ────────────────────────────────────────────────────────
title "Construction des images Docker"
info "Première installation : peut prendre 3–5 minutes..."
echo ""

$COMPOSE build --parallel

echo ""
log "Images construites !"

# ── 5. Démarrage ──────────────────────────────────────────────────────────
title "Démarrage des services"
$COMPOSE up -d
log "Services démarrés"

# ── 6. Attente du backend ─────────────────────────────────────────────────
title "Attente du démarrage"

MAX_WAIT=90
WAITED=0
echo -n "  Attente du backend"
while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -sf "http://localhost:${PORT:-8080}/api/version" &>/dev/null; then
        echo ""
        log "Backend opérationnel !"
        break
    fi
    echo -n "."
    sleep 2
    WAITED=$((WAITED + 2))
done

if [ $WAITED -ge $MAX_WAIT ]; then
    echo ""
    warn "Timeout — vérifiez les logs : $COMPOSE logs backend"
fi

# ── 7. Résumé ──────────────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${GREEN}╔════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}${GREEN}║       Merci Media est prêt !                   ║${NC}"
echo -e "${BOLD}${GREEN}╚════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  ${BOLD}URL :${NC}       http://localhost:${PORT:-8080}"
echo -e "  ${BOLD}Login :${NC}     ${ADMIN_USERNAME:-admin}"
echo -e "  ${BOLD}Password :${NC}  ${ADMIN_PASSWORD:-[voir .env]}"
echo ""
echo -e "  ${CYAN}Commandes utiles :${NC}"
echo -e "  ${YELLOW}$COMPOSE logs -f${NC}     → Logs en temps réel"
echo -e "  ${YELLOW}$COMPOSE down${NC}        → Arrêter"
echo -e "  ${YELLOW}$COMPOSE restart${NC}     → Redémarrer"
echo -e "  ${YELLOW}$COMPOSE pull${NC}        → Mettre à jour"
echo ""
