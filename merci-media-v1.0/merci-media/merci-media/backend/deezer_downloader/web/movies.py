"""
Routes API pour la bibliothèque de films locaux.
Scanne un dossier configurable, enrichit via TMDB si une clé est fournie.
"""
import os
import re
import logging
import urllib.parse
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required

logger = logging.getLogger(__name__)

movies_bp = Blueprint('movies', __name__, url_prefix='/api/movies')

VIDEO_EXTENSIONS = {'.mkv', '.mp4', '.avi', '.mov', '.wmv', '.m4v', '.webm', '.ts', '.m2ts'}

# Cache TMDB en mémoire
_tmdb_cache: dict = {}

TMDB_GENRES = {
    28: 'Action', 12: 'Aventure', 16: 'Animation', 35: 'Comédie',
    80: 'Crime', 99: 'Documentaire', 18: 'Drame', 10751: 'Famille',
    14: 'Fantaisie', 36: 'Histoire', 27: 'Horreur', 10402: 'Musique',
    9648: 'Mystère', 10749: 'Romance', 878: 'Science-Fiction',
    10770: 'Téléfilm', 53: 'Thriller', 10752: 'Guerre', 37: 'Western',
}


def _parse_filename(filename: str) -> dict:
    stem = os.path.splitext(filename)[0]
    stem_clean = re.sub(
        r'\b(1080p|2160p|720p|480p|4K|UHD|BluRay|BDRip|WEBRip|WEB[-.]DL|HDTV|DVDRip|REMUX'
        r'|x264|x265|HEVC|AVC|AAC|DTS|AC3|H\.264|H\.265|HDR|SDR|EXTENDED|REMASTERED)\b.*',
        '', stem, flags=re.IGNORECASE
    ).strip(' .-_')

    year_match = re.search(r'\b(19|20)\d{2}\b', stem_clean)
    year = int(year_match.group()) if year_match else None

    if year_match:
        title = stem_clean[:year_match.start()].strip(' .-_()')
    else:
        title = stem_clean

    title = re.sub(r'[._]', ' ', title).strip()
    title = re.sub(r'\s+', ' ', title)

    return {'title': title or stem, 'year': year}


def _fetch_tmdb(title: str, year, api_key: str) -> dict:
    cache_key = f"{title}_{year}"
    if cache_key in _tmdb_cache:
        return _tmdb_cache[cache_key]

    import requests as req

    try:
        # 1. Recherche du film
        params = {'api_key': api_key, 'query': title, 'language': 'fr-FR'}
        if year:
            params['year'] = year

        r = req.get('https://api.themoviedb.org/3/search/movie', params=params, timeout=8)
        r.raise_for_status()
        results = r.json().get('results', [])

        # Si pas de résultat en français, retry sans année
        if not results and year:
            params.pop('year', None)
            r = req.get('https://api.themoviedb.org/3/search/movie', params=params, timeout=8)
            r.raise_for_status()
            results = r.json().get('results', [])

        if not results:
            _tmdb_cache[cache_key] = {}
            return {}

        movie = results[0]
        tmdb_id = movie.get('id')

        # 2. Détails complets pour récupérer la description en français
        details = {}
        if tmdb_id:
            dr = req.get(
                f'https://api.themoviedb.org/3/movie/{tmdb_id}',
                params={'api_key': api_key, 'language': 'fr-FR'},
                timeout=8
            )
            if dr.ok:
                details = dr.json()

        overview = details.get('overview') or movie.get('overview', '')
        # Fallback en anglais si la description française est vide
        if not overview and tmdb_id:
            er = req.get(
                f'https://api.themoviedb.org/3/movie/{tmdb_id}',
                params={'api_key': api_key, 'language': 'en-US'},
                timeout=8
            )
            if er.ok:
                overview = er.json().get('overview', '')

        vote_avg = details.get('vote_average') or movie.get('vote_average', 0)
        vote_count = details.get('vote_count') or movie.get('vote_count', 0)

        # Genres depuis les détails (plus complet) ou fallback sur genre_ids
        genres = []
        if details.get('genres'):
            genres = [g['name'] for g in details['genres'][:3]]
        else:
            genres = [TMDB_GENRES[gid] for gid in movie.get('genre_ids', [])[:3] if gid in TMDB_GENRES]

        # Poster : priorité w342 (bon compromis qualité/poids)
        poster_path = details.get('poster_path') or movie.get('poster_path')
        poster_url = f"https://image.tmdb.org/t/p/w342{poster_path}" if poster_path else None

        data = {
            'tmdb_id':    tmdb_id,
            'title':      details.get('title') or movie.get('title', title),
            'year':       (details.get('release_date') or movie.get('release_date', ''))[:4] or str(year or ''),
            'overview':   overview,
            'rating':     round(float(vote_avg), 1) if vote_avg else 0.0,
            'vote_count': vote_count,
            'poster_url': poster_url,
            'genres':     genres,
            'runtime':    details.get('runtime'),  # minutes
        }
        _tmdb_cache[cache_key] = data
        return data

    except Exception as e:
        logger.warning(f"TMDB error for '{title}': {e}")
        _tmdb_cache[cache_key] = {}
        return {}


def _detect_quality(filename: str) -> str:
    f = filename.upper()
    if '4K' in f or 'UHD' in f or '2160' in f:
        return '4K'
    if '1080' in f:
        return '1080p'
    if '720' in f:
        return '720p'
    if '480' in f:
        return '480p'
    return 'SD'


def _format_size(size: int) -> str:
    if size >= 1024 ** 3:
        return f"{size / 1024 ** 3:.1f} Go"
    if size >= 1024 ** 2:
        return f"{size / 1024 ** 2:.0f} Mo"
    return f"{size / 1024:.0f} Ko"


def _scan_movies_dir(movies_dir: str, tmdb_api_key: str) -> list:
    if not os.path.isdir(movies_dir):
        return []

    results = []
    for fname in sorted(os.listdir(movies_dir)):
        ext = os.path.splitext(fname)[1].lower()
        if ext not in VIDEO_EXTENSIONS or fname.startswith('.'):
            continue

        full_path = os.path.join(movies_dir, fname)
        size = os.path.getsize(full_path)
        parsed = _parse_filename(fname)

        movie = {
            'filename':   fname,
            'size':       size,
            'size_str':   _format_size(size),
            'title':      parsed['title'],
            'year':       str(parsed['year']) if parsed['year'] else '',
            'genres':     [],
            'rating':     0.0,
            'vote_count': 0,
            'overview':   '',
            'poster_url': None,
            'quality':    _detect_quality(fname),
            'runtime':    None,
        }

        if tmdb_api_key and tmdb_api_key.strip():
            tmdb = _fetch_tmdb(parsed['title'], parsed['year'], tmdb_api_key.strip())
            if tmdb:
                movie.update({
                    'title':      tmdb.get('title', movie['title']),
                    'year':       tmdb.get('year', movie['year']),
                    'overview':   tmdb.get('overview', ''),
                    'rating':     tmdb.get('rating', 0.0),
                    'vote_count': tmdb.get('vote_count', 0),
                    'poster_url': tmdb.get('poster_url'),
                    'genres':     tmdb.get('genres', []),
                    'runtime':    tmdb.get('runtime'),
                })

        results.append(movie)

    return results


def register_movies_routes(app, config):

    @movies_bp.route('', methods=['GET'])
    @jwt_required()
    def list_movies():
        movies_dir = config.get('movies', 'dir', fallback='/mnt/movies')
        tmdb_key   = config.get('movies', 'tmdb_api_key', fallback='')
        movies = _scan_movies_dir(movies_dir, tmdb_key)
        return jsonify({'movies': movies, 'total': len(movies)}), 200

    @movies_bp.route('/download', methods=['GET'])
    @jwt_required()
    def download_movie():
        filename = request.args.get('file', '').strip()
        if not filename or '..' in filename or '/' in filename or '\\' in filename:
            return jsonify({'error': 'Fichier invalide.'}), 400

        movies_dir = config.get('movies', 'dir', fallback='/mnt/movies')
        full_path  = os.path.realpath(os.path.join(movies_dir, filename))

        if not full_path.startswith(os.path.realpath(movies_dir)):
            return jsonify({'error': 'Accès refusé.'}), 403
        if not os.path.isfile(full_path):
            return jsonify({'error': 'Fichier introuvable.'}), 404

        ext  = os.path.splitext(filename)[1].lower()
        mime = {
            '.mkv': 'video/x-matroska', '.mp4': 'video/mp4',
            '.avi': 'video/x-msvideo',  '.webm': 'video/webm',
            '.mov': 'video/quicktime',  '.m4v': 'video/mp4',
        }.get(ext, 'application/octet-stream')

        encoded = urllib.parse.quote(filename)
        response = send_file(full_path, mimetype=mime, as_attachment=True, download_name=filename)
        response.headers['Content-Disposition'] = (
            f'attachment; filename="{filename}"; filename*=UTF-8\'\'{encoded}'
        )
        return response

    app.register_blueprint(movies_bp)
