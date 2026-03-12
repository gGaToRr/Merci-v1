"""Service TMDB — recherche et import de films/séries/animés"""
import requests
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from deezer_downloader.web.auth import admin_required

TMDB_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJlNjM5MDVlZjk0ZmY1N2Y5YmQxZmJmYTAwNDRjOGEwNCIsIm5iZiI6MTc3MjQ0NjQ3Ni4xNjk5OTk4LCJzdWIiOiI2OWE1NjMwYzE3ZWU5ZGI4YzgxODdmMGUiLCJzY29wZXMiOlsiYXBpX3JlYWQiXSwidmVyc2lvbiI6MX0.RwvQXxvRFNfhLoH1HjXrnJO50B4IUtdksmWOxBRU_24"
TMDB_BASE  = "https://api.themoviedb.org/3"
IMG_BASE   = "https://image.tmdb.org/t/p/w500"

tmdb_bp = Blueprint('tmdb', __name__, url_prefix='/api/tmdb')

HEADERS = {
    "Authorization": f"Bearer {TMDB_TOKEN}",
    "accept": "application/json",
}

def _safe_get(url, params=None):
    try:
        r = requests.get(url, headers=HEADERS, params=params, timeout=10)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        return None

def _format_movie(m):
    genres = ', '.join(g['name'] for g in m.get('genres', []))
    # genres peut être absent dans les résultats de recherche
    genre_ids_map = {
        28:'Action', 12:'Aventure', 16:'Animation', 35:'Comédie', 80:'Crime',
        99:'Documentaire', 18:'Drame', 10751:'Famille', 14:'Fantastique',
        36:'Histoire', 27:'Horreur', 10402:'Musique', 9648:'Mystère',
        10749:'Romance', 878:'Science-Fiction', 10770:'Téléfilm',
        53:'Thriller', 10752:'Guerre', 37:'Western',
    }
    if not genres and m.get('genre_ids'):
        genres = ', '.join(genre_ids_map.get(gid, '') for gid in m['genre_ids'] if gid in genre_ids_map)

    poster = f"{IMG_BASE}{m['poster_path']}" if m.get('poster_path') else None
    release = m.get('release_date') or m.get('first_air_date') or ''
    year = release[:4] if release else ''
    title = m.get('title') or m.get('name') or ''
    rating = round(m.get('vote_average', 0), 1)
    return {
        'tmdb_id':     m.get('id'),
        'title':       title,
        'year':        year,
        'genre':       genres,
        'overview':    m.get('overview') or '',
        'poster_url':  poster,
        'rating':      rating,
        'content_type': 'film',
        'tags':        [],
    }

def _format_serie(s):
    genre_ids_map = {
        10759:'Action', 16:'Animation', 35:'Comédie', 80:'Crime', 99:'Documentaire',
        18:'Drame', 10751:'Famille', 10762:'Enfants', 9648:'Mystère',
        10763:'Actualités', 10764:'Réalité', 10765:'Sci-Fi & Fantastique',
        10766:'Soap', 10767:'Talk', 10768:'Guerre', 37:'Western',
    }
    genres = ', '.join(s.get('genre', '') and [s['genre']] or
                       [genre_ids_map.get(gid, '') for gid in s.get('genre_ids', []) if gid in genre_ids_map])
    poster = f"{IMG_BASE}{s['poster_path']}" if s.get('poster_path') else None
    release = s.get('first_air_date') or ''
    year = release[:4] if release else ''
    return {
        'tmdb_id':      s.get('id'),
        'title':        s.get('name') or s.get('title') or '',
        'year':         year,
        'genre':        genres,
        'overview':     s.get('overview') or '',
        'poster_url':   poster,
        'rating':       round(s.get('vote_average', 0), 1),
        'content_type': 'serie',
        'tags':         [],
    }


# ── Routes ────────────────────────────────────────────────────────────────────

@tmdb_bp.route('/search/movie', methods=['GET'])
@jwt_required()
def search_movie():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'error': 'Paramètre q requis'}), 400
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/search/movie", {'query': q, 'language': lang, 'page': 1})
    if not data:
        return jsonify({'error': 'Erreur TMDB'}), 500
    results = [_format_movie(m) for m in data.get('results', [])[:8]]
    return jsonify({'results': results}), 200


@tmdb_bp.route('/search/tv', methods=['GET'])
@jwt_required()
def search_tv():
    q = request.args.get('q', '').strip()
    if not q:
        return jsonify({'error': 'Paramètre q requis'}), 400
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/search/tv", {'query': q, 'language': lang, 'page': 1})
    if not data:
        return jsonify({'error': 'Erreur TMDB'}), 500
    results = [_format_serie(s) for s in data.get('results', [])[:8]]
    return jsonify({'results': results}), 200


@tmdb_bp.route('/movie/<int:tmdb_id>', methods=['GET'])
@jwt_required()
def get_movie(tmdb_id):
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/movie/{tmdb_id}", {'language': lang})
    if not data:
        return jsonify({'error': 'Film introuvable'}), 404
    result = _format_movie(data)
    # Récupérer aussi les mots-clés comme tags
    kw = _safe_get(f"{TMDB_BASE}/movie/{tmdb_id}/keywords")
    if kw:
        result['tags'] = [k['name'] for k in kw.get('keywords', [])[:6]]
    return jsonify(result), 200


@tmdb_bp.route('/tv/<int:tmdb_id>', methods=['GET'])
@jwt_required()
def get_tv(tmdb_id):
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/tv/{tmdb_id}", {'language': lang})
    if not data:
        return jsonify({'error': 'Série introuvable'}), 404
    result = _format_serie(data)
    # Mots-clés
    kw = _safe_get(f"{TMDB_BASE}/tv/{tmdb_id}/keywords")
    if kw:
        result['tags'] = [k['name'] for k in kw.get('results', [])[:6]]
    return jsonify(result), 200


@tmdb_bp.route('/tv/<int:tmdb_id>/seasons', methods=['GET'])
@jwt_required()
def get_tv_seasons(tmdb_id):
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/tv/{tmdb_id}", {'language': lang})
    if not data:
        return jsonify({'error': 'Série introuvable'}), 404
    seasons = [
        {
            'season_number': s.get('season_number'),
            'name':          s.get('name'),
            'episode_count': s.get('episode_count'),
            'poster_url':    f"{IMG_BASE}{s['poster_path']}" if s.get('poster_path') else None,
            'air_date':      s.get('air_date'),
        }
        for s in data.get('seasons', [])
        if s.get('season_number', 0) > 0
    ]
    return jsonify({'seasons': seasons}), 200


@tmdb_bp.route('/tv/<int:tmdb_id>/season/<int:season_number>', methods=['GET'])
@jwt_required()
def get_tv_season_episodes(tmdb_id, season_number):
    lang = request.args.get('lang', 'fr-FR')
    data = _safe_get(f"{TMDB_BASE}/tv/{tmdb_id}/season/{season_number}", {'language': lang})
    if not data:
        return jsonify({'error': 'Saison introuvable'}), 404
    episodes = [
        {
            'episode_number': e.get('episode_number'),
            'name':           e.get('name'),
            'overview':       e.get('overview') or '',
            'air_date':       e.get('air_date'),
            'still_url':      f"{IMG_BASE}{e['still_path']}" if e.get('still_path') else None,
            'runtime':        e.get('runtime'),
        }
        for e in data.get('episodes', [])
    ]
    return jsonify({'episodes': episodes}), 200


@tmdb_bp.route('/trending', methods=['GET'])
@jwt_required()
def trending():
    """Films et séries tendance du moment"""
    lang = request.args.get('lang', 'fr-FR')
    movies = _safe_get(f"{TMDB_BASE}/trending/movie/week", {'language': lang})
    series = _safe_get(f"{TMDB_BASE}/trending/tv/week",    {'language': lang})
    return jsonify({
        'movies': [_format_movie(m) for m in (movies or {}).get('results', [])[:6]],
        'series': [_format_serie(s) for s in (series or {}).get('results', [])[:6]],
    }), 200
