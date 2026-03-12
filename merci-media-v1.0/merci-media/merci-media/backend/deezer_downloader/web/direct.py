"""Routes pour The Good Place (films/séries/animés avec liens hébergeurs)"""
import logging
import urllib.parse
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

def _sanitize_url(raw: str | None) -> str | None:
    """Accepte seulement des URLs http(s) valides pour les posters."""
    if not raw: return None
    url = (raw or '').strip()
    if not url.startswith('http'): return None
    # Empêcher les injections JS
    if 'javascript:' in url.lower() or 'data:' in url.lower(): return None
    return url if len(url) < 600 else None
from deezer_downloader.web.models import db, DirectContent, ContentLink
from deezer_downloader.web.auth import admin_required

logger = logging.getLogger(__name__)
direct_bp = Blueprint('direct', __name__, url_prefix='/api/direct')

CONTENT_TYPES = ('film', 'serie', 'anime')

def _detect_hoster(url: str) -> str:
    url_l = url.lower()
    for h in ('doodstream','dood','vidoza','streamtape','uptobox','voe',
              'mixdrop','filemoon','sendvid','sibnet'):
        if h in url_l:
            return 'doodstream' if h == 'dood' else h
    return 'autre'

def _parse_tags(raw):
    """'Comédie, Action , Thriller' → ['Comédie','Action','Thriller']"""
    if not raw:
        return []
    return [t.strip() for t in raw.split(',') if t.strip()]

def _tags_to_str(tags_list):
    if isinstance(tags_list, list):
        return ','.join(tags_list)
    return tags_list or ''


# ── Lecture (authentifiée) ────────────────────────────────────────────────────

@direct_bp.route('', methods=['GET'])
@jwt_required()
def list_content():
    ctype  = request.args.get('type', '')
    search = request.args.get('q', '').strip()
    tag    = request.args.get('tag', '').strip()

    q = DirectContent.query.filter_by(is_active=True)
    if ctype in CONTENT_TYPES:
        q = q.filter_by(content_type=ctype)
    if search:
        q = q.filter(DirectContent.title.ilike(f'%{search}%'))
    if tag:
        q = q.filter(DirectContent.tags.ilike(f'%{tag}%'))

    items = q.order_by(DirectContent.created_at.desc()).all()
    return jsonify({'content': [c.to_dict() for c in items], 'total': len(items)}), 200


@direct_bp.route('/<int:content_id>/view', methods=['POST'])
@jwt_required()
def increment_view(content_id):
    c = DirectContent.query.filter_by(id=content_id, is_active=True).first_or_404()
    c.view_count = (c.view_count or 0) + 1
    db.session.commit()
    return jsonify({'view_count': c.view_count}), 200


# ── CRUD admin ────────────────────────────────────────────────────────────────

@direct_bp.route('', methods=['POST'])
@admin_required
def create_content():
    data  = request.get_json() or {}
    title = (data.get('title') or '').strip()
    if not title:
        return jsonify({'error': 'Le titre est requis.'}), 400

    ctype = data.get('content_type', 'film')
    if ctype not in CONTENT_TYPES:
        ctype = 'film'

    user_id = get_jwt_identity()
    content = DirectContent(
        title        = title,
        year         = (data.get('year') or '').strip() or None,
        content_type = ctype,
        genre        = (data.get('genre') or '').strip() or None,
        tags         = _tags_to_str(data.get('tags', [])),
        overview     = (data.get('overview') or '').strip() or None,
        poster_url   = _sanitize_url(data.get('poster_url')),
        rating       = float(data['rating']) if data.get('rating') else None,
        quality      = data.get('quality', '1080p'),
        added_by     = user_id,
    )
    db.session.add(content)
    db.session.flush()

    for ld in (data.get('links') or []):
        url = (ld.get('url') or '').strip()
        if not url:
            continue
        db.session.add(ContentLink(
            content_id = content.id,
            hoster     = ld.get('hoster') or _detect_hoster(url),
            url        = url,
            link_type  = ld.get('link_type', 'stream'),
            quality    = ld.get('quality') or content.quality,
        ))

    db.session.commit()
    return jsonify({'message': 'Contenu ajouté.', 'content': content.to_dict()}), 201


@direct_bp.route('/<int:content_id>', methods=['PUT'])
@admin_required
def update_content(content_id):
    content = DirectContent.query.get_or_404(content_id)
    data    = request.get_json() or {}

    for field in ('title', 'year', 'genre', 'overview', 'poster_url', 'quality'):
        if field in data:
            setattr(content, field, data[field])

    if 'content_type' in data and data['content_type'] in CONTENT_TYPES:
        content.content_type = data['content_type']
    if 'rating' in data:
        content.rating = float(data['rating']) if data['rating'] else None
    if 'tags' in data:
        content.tags = _tags_to_str(data['tags'])

    # Remplace tous les liens si fournis
    if 'links' in data:
        for old in list(content.links):
            db.session.delete(old)
        for ld in (data['links'] or []):
            url = (ld.get('url') or '').strip()
            if not url:
                continue
            db.session.add(ContentLink(
                content_id = content.id,
                hoster     = ld.get('hoster') or _detect_hoster(url),
                url        = url,
                link_type  = ld.get('link_type', 'stream'),
                quality    = ld.get('quality') or content.quality,
            ))

    db.session.commit()
    return jsonify({'content': content.to_dict()}), 200


@direct_bp.route('/<int:content_id>', methods=['DELETE'])
@admin_required
def delete_content(content_id):
    content = DirectContent.query.get_or_404(content_id)
    db.session.delete(content)
    db.session.commit()
    return jsonify({'message': 'Supprimé.'}), 200


@direct_bp.route('/<int:content_id>/links', methods=['POST'])
@admin_required
def add_link(content_id):
    DirectContent.query.get_or_404(content_id)
    data = request.get_json() or {}
    url  = (data.get('url') or '').strip()
    if not url:
        return jsonify({'error': 'URL requise.'}), 400
    lnk = ContentLink(
        content_id = content_id,
        hoster     = data.get('hoster') or _detect_hoster(url),
        url        = url,
        link_type  = data.get('link_type', 'stream'),
        quality    = data.get('quality', '1080p'),
    )
    db.session.add(lnk)
    db.session.commit()
    return jsonify({'link': lnk.to_dict()}), 201


@direct_bp.route('/links/<int:link_id>', methods=['DELETE'])
@admin_required
def delete_link(link_id):
    lnk = ContentLink.query.get_or_404(link_id)
    db.session.delete(lnk)
    db.session.commit()
    return jsonify({'message': 'Lien supprimé.'}), 200
