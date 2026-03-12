# ═══════════════════════════════════════════════════════════════════════════════
# app.py — Usine Flask principale de Deezer Downloader
# Auteur  : KAETS
# Rôle    : Création et configuration de l'application Flask.
#           Enregistrement de tous les blueprints et routes API.
# ═══════════════════════════════════════════════════════════════════════════════

import os
import re
import zipfile
import urllib.parse
import atexit
import warnings
import logging
from subprocess import Popen, PIPE
from concurrent.futures import ThreadPoolExecutor

import requests
from flask import Flask, render_template, request, jsonify, send_file, Response, stream_with_context
from flask_autoindex import AutoIndex
from flask_jwt_extended import JWTManager, jwt_required, get_jwt_identity
import giphypop

from deezer_downloader.configuration import config
from deezer_downloader.web.music_backend import sched
from deezer_downloader.deezer import (
    deezer_search, init_deezer_session,
    get_song_infos_from_deezer_website, download_song,
    TYPE_TRACK, TYPE_ALBUM,
)
from deezer_downloader.web.models import db, User
from deezer_downloader.web.auth import auth_bp
from deezer_downloader.web.admin import admin_bp
from deezer_downloader.web.tmdb import tmdb_bp
from deezer_downloader.web.direct import direct_bp
from deezer_downloader.web.movies import movies_bp
from deezer_downloader.ytdlp import get_formats, download_video, validate_url

logger = logging.getLogger(__name__)

# ── Helpers internes ────────────────────────────────────────────────────────

def _safe(s: str, max_len: int = 120) -> str:
    """Sanitize une chaîne pour l'utiliser comme nom de fichier."""
    s = str(s).strip()
    s = re.sub(r'[\\/*?:"<>|]', '-', s)
    s = re.sub(r'\s+', ' ', s)
    return s[:max_len]


def _create_default_admin(app):
    """Crée un compte admin par défaut si la base est vide."""
    if User.query.count() == 0:
        password = os.environ.get('ADMIN_PASSWORD', 'Admin1234')
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        admin = User(username=username, email='admin@localhost', is_admin=True)
        admin.set_password(password)
        db.session.add(admin)
        db.session.commit()
        app.logger.warning('═' * 55)
        app.logger.warning(f'  Admin créé  →  login: {username}  |  password: {password}')
        app.logger.warning('  ⚠  Changez le mot de passe après la première connexion.')
        app.logger.warning('═' * 55)




def _ascii_fallback(name: str) -> str:
    """
    Supprime tous les caractères non ASCII (emoji, unicode exotiques)
    pour compatibilité avec Waitress (latin-1 headers).
    """
    return name.encode("ascii", "ignore").decode("ascii")


def _attachment(response, filename: str):
    """
    Ajoute un header Content-Disposition sécurisé et compatible Waitress.
    """
    ascii_name = _ascii_fallback(filename)
    encoded    = urllib.parse.quote(filename)

    response.headers["Content-Disposition"] = (
        f'attachment; filename="{ascii_name}"; '
        f"filename*=UTF-8''{encoded}"
    )

    return response

# ── App factory ──────────────────────────────────────────────────────────────

def create_app(config_path=None):
    """
    Crée et configure l'application Flask.
    Point d'entrée unique (pattern factory).
    """
    app = Flask(__name__)

    # ── Configuration Flask ──────────────────────────────────────────────────
    app.config['JWT_SECRET_KEY']              = os.environ.get('JWT_SECRET_KEY', 'change-me-in-production')
    app.config['JWT_ACCESS_TOKEN_EXPIRES']    = False
    app.config['SQLALCHEMY_DATABASE_URI']     = os.environ.get('DATABASE_URL', 'sqlite:///deezer_downloader.db')
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # ── Extensions ───────────────────────────────────────────────────────────
    db.init_app(app)
    JWTManager(app)

    with app.app_context():
        db.create_all()
        _create_default_admin(app)

    AutoIndex(app, config['download_dirs']['base'], add_url_rules=False)
    warnings.filterwarnings('ignore', message='You are using the giphy public api key')
    giphypop.Giphy()

    # ── Workers musicaux ─────────────────────────────────────────────────────
    sched.run_workers(config.getint('threadpool', 'workers'))
    init_deezer_session(config['proxy']['server'], config['deezer']['quality'])

    @atexit.register
    def _stop_workers():
        sched.stop_workers()

    # ── Blueprints ───────────────────────────────────────────────────────────
    app.register_blueprint(auth_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(tmdb_bp)
    app.register_blueprint(direct_bp)
    app.register_blueprint(movies_bp)

    # ════════════════════════════════════════════════════════════════════════
    # ROUTES — Pages HTML
    # ════════════════════════════════════════════════════════════════════════

    @app.route('/')
    def index():
        """Page principale de l'application."""
        return render_template(
            'index.html',
            api_root=config['http']['api_root'],
            static_root=config['http']['static_root'],
            use_mpd=str(config['mpd'].getboolean('use_mpd')).lower(),
        )

    @app.route('/admin')
    def admin_panel():
        """Panneau d'administration."""
        return render_template(
            'admin.html',
            api_root=config['http']['api_root'],
            static_root=config['http']['static_root'],
        )

    @app.route('/debug')
    def show_debug():
        """Page de debug — dernières lignes du log."""
        log = os.environ.get('LOG_FILE', config.get('debug', 'log_file'))
        proc = Popen(f'tail -n 100 {log}'.split(), stdout=PIPE)
        return render_template('debug.html', logs=proc.stdout.read().decode('utf-8'))

    # ════════════════════════════════════════════════════════════════════════
    # ROUTES — API Deezer
    # ════════════════════════════════════════════════════════════════════════

    @app.route('/api/search', methods=['POST'])
    @jwt_required()
    def search():
        """Recherche Deezer — titre, album, artiste."""
        data  = request.get_json() or {}
        query = (data.get('query') or '').strip()
        if not query:
            return jsonify({'error': 'Paramètre query manquant.'}), 400

        stype = data.get('type', 'track').lower()
        if stype not in ('track', 'album', 'artist', 'artist_album'):
            return jsonify({'error': 'Type de recherche invalide.'}), 400

        try:
            results = deezer_search(query, stype)
            return jsonify({'results': results}), 200
        except Exception as exc:
            logger.exception('Erreur recherche Deezer')
            return jsonify({'error': str(exc)}), 500


    @app.route('/api/stream/track/<int:track_id>', methods=['GET'])
    @jwt_required()
    def stream_track(track_id):
        """
        Télécharge une piste Deezer et la renvoie directement au navigateur.
        Sauvegarde également une copie dans le dossier songs/.
        """
        ext       = 'flac' if config['deezer'].get('quality', 'mp3') == 'flac' else 'mp3'
        songs_dir = config['download_dirs']['songs']
        os.makedirs(songs_dir, exist_ok=True)

        try:
            song     = get_song_infos_from_deezer_website(TYPE_TRACK, track_id)
            artist   = _safe(song.get('ART_NAME', 'Inconnu'))
            title    = _safe(song.get('SNG_TITLE', 'Inconnu'))
            filename = f"{artist} - {title}.{ext}"
            dest     = os.path.join(songs_dir, filename)

            # Ne re-télécharge pas si le fichier existe déjà
            if not os.path.isfile(dest):
                tmp = dest + '.tmp'
                download_song(song, tmp)
                os.rename(tmp, dest)

            mime = 'audio/flac' if ext == 'flac' else 'audio/mpeg'
            return _attachment(
                send_file(dest, mimetype=mime, as_attachment=True, download_name=filename),
                filename,
            )
        except Exception as exc:
            logger.exception(f'Erreur stream track {track_id}')
            return jsonify({'error': str(exc)}), 500


    @app.route('/api/stream/album/<int:album_id>', methods=['GET'])
    @jwt_required()
    def stream_album(album_id):
        """
        Télécharge toutes les pistes d'un album Deezer,
        les zippe et renvoie l'archive au navigateur.
        """
        ext        = 'flac' if config['deezer'].get('quality', 'mp3') == 'flac' else 'mp3'
        albums_dir = config['download_dirs']['albums']
        os.makedirs(albums_dir, exist_ok=True)

        try:
            songs = get_song_infos_from_deezer_website(TYPE_ALBUM, album_id)
            if not songs:
                return jsonify({'error': 'Album vide ou introuvable.'}), 404

            album_artist  = _safe(songs[0].get('ALB_ART_NAME') or songs[0].get('ART_NAME', 'Inconnu'))
            album_title   = _safe(songs[0].get('ALB_TITLE', f'album_{album_id}'))
            album_folder  = os.path.join(albums_dir, f"{album_artist} - {album_title}")
            os.makedirs(album_folder, exist_ok=True)

            zip_filename = f"{album_artist} - {album_title}.zip"
            zip_path     = os.path.join(albums_dir, zip_filename)

            with zipfile.ZipFile(zip_path, 'w', compression=zipfile.ZIP_DEFLATED) as zf:
                for i, song in enumerate(songs, 1):
                    artist    = _safe(song.get('ART_NAME', 'Inconnu'))
                    title     = _safe(song.get('SNG_TITLE', 'Inconnu'))
                    track_num = str(i).zfill(2)
                    fname     = f"{track_num} - {artist} - {title}.{ext}"
                    fpath     = os.path.join(album_folder, fname)
                    if not os.path.isfile(fpath):
                        try:
                            tmp = fpath + '.tmp'
                            download_song(song, tmp)
                            os.rename(tmp, fpath)
                        except Exception as exc:
                            app.logger.warning(f'Piste ignorée {title}: {exc}')
                            continue
                    zf.write(fpath, fname)

            return _attachment(
                send_file(zip_path, mimetype='application/zip', as_attachment=True, download_name=zip_filename),
                zip_filename,
            )
        except Exception as exc:
            logger.exception(f'Erreur stream album {album_id}')
            return jsonify({'error': str(exc)}), 500

    # ════════════════════════════════════════════════════════════════════════
    # ROUTES — API yt-dlp
    # ════════════════════════════════════════════════════════════════════════

    @app.route('/api/ytdlp/info', methods=['POST'])
    @jwt_required()
    def ytdlp_info():
        """
        Retourne les métadonnées et la liste des formats disponibles
        pour une URL vidéo externe (YouTube, Vimeo, etc.).
        Corps JSON attendu : { "url": "https://..." }
        """
        data = request.get_json() or {}
        url  = (data.get('url') or '').strip()
        if not url:
            return jsonify({'error': 'URL manquante.'}), 400

        try:
            info = get_formats(url)
            return jsonify(info), 200
        except ValueError as exc:
            # Erreur de validation URL
            return jsonify({'error': str(exc)}), 422
        except Exception as exc:
            logger.exception(f'Erreur ytdlp_info pour {url}')
            return jsonify({'error': f'Impossible d\'extraire les informations : {exc}'}), 500


    @app.route('/api/ytdlp/download', methods=['POST'])
    @jwt_required()
    def ytdlp_download():
        """
        Télécharge une vidéo/audio avec le format choisi par l'utilisateur.

        Stratégie automatique selon fmt_kind :
          - video+audio : format déjà fusionné → MP4
          - video       : vidéo seule + meilleur audio → merge ffmpeg → MP4
          - audio       : meilleure qualité audio → M4A

        Corps JSON attendu :
          { "url": "https://...", "format_id": "137", "fmt_kind": "video" }
        """
        data      = request.get_json() or {}
        url       = (data.get('url')       or '').strip()
        format_id = (data.get('format_id') or '').strip()
        fmt_kind  = (data.get('fmt_kind')  or 'video+audio').strip()

        # ── Validation des entrées ────────────────────────────────────────
        if not url:
            return jsonify({'error': 'URL manquante.'}), 400
        if not format_id:
            return jsonify({'error': 'format_id manquant.'}), 400
        if fmt_kind not in ('video+audio', 'video', 'audio', 'av'):
            return jsonify({'error': 'fmt_kind invalide (video+audio | video | audio).'}), 422
        if fmt_kind == 'av':
            fmt_kind = 'video+audio'

        # format_id : chiffres, lettres, tirets, underscores, points — PAS de shell injection
        if not re.match(r'^[\w\-\.]+$', format_id):
            return jsonify({'error': 'format_id invalide.'}), 422

        dest_dir = config['download_dirs']['youtubedl']
        os.makedirs(dest_dir, exist_ok=True)

        try:
            # Le module ytdlp gère la stratégie de merge selon fmt_kind
            filepath = download_video(url, format_id, fmt_kind, dest_dir)
            filename = os.path.basename(filepath)
            ext      = filename.rsplit('.', 1)[-1].lower()
            mimes    = {
                'mp4':  'video/mp4',
                'webm': 'video/webm',
                'mkv':  'video/x-matroska',
                'mp3':  'audio/mpeg',
                'opus': 'audio/ogg',
                'm4a':  'audio/mp4',
                'flac': 'audio/flac',
                'ogg':  'audio/ogg',
            }
            mime = mimes.get(ext, 'application/octet-stream')
            logger.info(f"Envoi de {filename} ({mime}) à l'utilisateur")
            return _attachment(
                send_file(filepath, mimetype=mime, as_attachment=True, download_name=filename),
                filename,
            )
        except ValueError as exc:
            return jsonify({'error': str(exc)}), 422
        except Exception as exc:
            logger.exception(f'Erreur ytdlp_download pour {url}')
            return jsonify({'error': str(exc)}), 500

    # ════════════════════════════════════════════════════════════════════════
    # ROUTES — Bibliothèque de fichiers
    # ════════════════════════════════════════════════════════════════════════

    @app.route('/api/files', methods=['GET'])
    @jwt_required()
    def list_files():
        """
        Liste récursive de tous les fichiers téléchargés dans le dossier de base.
        Retourne du plus récent au plus ancien.
        """
        base   = config['download_dirs']['base']
        result = []

        for root, dirs, files in os.walk(base):
            dirs.sort()
            for fname in sorted(files):
                # Ignorer les fichiers cachés et temporaires
                if fname.startswith('.') or fname.endswith('.tmp'):
                    continue
                full   = os.path.join(root, fname)
                rel    = os.path.relpath(full, base)
                folder = os.path.relpath(root, base)
                result.append({
                    'name':   fname,
                    'path':   rel,
                    'size':   os.path.getsize(full),
                    'folder': '' if folder == '.' else folder,
                    'mtime':  int(os.path.getmtime(full)),
                })

        # Trier du plus récent
        result.sort(key=lambda x: x['mtime'], reverse=True)
        return jsonify({'files': result}), 200


    @app.route('/api/files/download', methods=['GET'])
    @jwt_required()
    def download_file():
        """
        Sert un fichier de la bibliothèque directement au navigateur.
        Paramètre GET : path (chemin relatif depuis le dossier base).
        """
        rel = request.args.get('path', '').strip()

        # Sécurité : interdire la traversée de répertoire
        if not rel or '..' in rel or rel.startswith('/'):
            return jsonify({'error': 'Chemin invalide.'}), 400

        base = config['download_dirs']['base']
        full = os.path.realpath(os.path.join(base, rel))

        # Double vérification : le chemin résolu doit rester dans base
        if not full.startswith(os.path.realpath(base)):
            return jsonify({'error': 'Accès refusé.'}), 403

        if not os.path.isfile(full):
            return jsonify({'error': 'Fichier introuvable.'}), 404

        filename = os.path.basename(full)
        ext      = filename.rsplit('.', 1)[-1].lower()
        mimes    = {
            'mp3': 'audio/mpeg', 'flac': 'audio/flac',
            'mp4': 'video/mp4',  'webm': 'video/webm',
            'mkv': 'video/x-matroska', 'm4a': 'audio/mp4',
            'zip': 'application/zip', 'm3u8': 'audio/x-mpegurl',
        }
        mime = mimes.get(ext, 'application/octet-stream')
        return _attachment(
            send_file(full, mimetype=mime, as_attachment=True, download_name=filename),
            filename,
        )

    # ════════════════════════════════════════════════════════════════════════
    # ROUTES — Queue & divers
    # ════════════════════════════════════════════════════════════════════════

    @app.route('/api/queue', methods=['GET'])
    @jwt_required()
    def queue():
        """État de la file de téléchargements Deezer."""
        try:
            return jsonify(sched.get_queue()), 200
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/version', methods=['GET'])
    def version():
        """Version de l'application."""
        return jsonify({'version': '3.1.0', 'name': 'Deezer Downloader Pro'}), 200

    # ── Gestionnaires d'erreur ───────────────────────────────────────────────

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Ressource introuvable.'}), 404

    @app.errorhandler(500)
    def server_error(e):
        return jsonify({'error': 'Erreur interne du serveur.'}), 500

    return app


# ── Instance WSGI ────────────────────────────────────────────────────────────
app = create_app()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)
