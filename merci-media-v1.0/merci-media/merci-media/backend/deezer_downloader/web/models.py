"""Database models for authentication"""
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timedelta
import secrets

db = SQLAlchemy()


class User(db.Model):
    """User model for authentication"""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime, nullable=True)
    is_active = db.Column(db.Boolean, default=True)

    def set_password(self, password):
        """Hash and set password"""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Verify password"""
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'is_admin': self.is_admin,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }


class DownloadLog(db.Model):
    """Log of user downloads"""
    __tablename__ = 'download_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    song_title = db.Column(db.String(255), nullable=False)
    status = db.Column(db.String(50), default='pending')  # pending, success, failed
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    task_id = db.Column(db.String(255), nullable=True)

    user = db.relationship('User', backref='downloads')

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'user_id': self.user_id,
            'song_title': self.song_title,
            'status': self.status,
            'created_at': self.created_at.isoformat(),
            'task_id': self.task_id
        }


class LoginAttempt(db.Model):
    """Track login attempts for security"""
    __tablename__ = 'login_attempts'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), nullable=False)
    success = db.Column(db.Boolean, default=False)
    ip_address = db.Column(db.String(45), nullable=True)
    user_agent = db.Column(db.String(255), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        """Convert to dictionary"""
        return {
            'id': self.id,
            'username': self.username,
            'success': self.success,
            'ip_address': self.ip_address,
            'timestamp': self.timestamp.isoformat()
        }


class DirectContent(db.Model):
    """Contenu The Good Place — films, séries, animés avec lecteurs hébergeurs"""
    __tablename__ = 'direct_content'

    id           = db.Column(db.Integer, primary_key=True)
    title        = db.Column(db.String(255), nullable=False)
    content_type = db.Column(db.String(20), default='film')
    year         = db.Column(db.String(10), nullable=True)
    genre        = db.Column(db.String(255), nullable=True)
    overview     = db.Column(db.Text, nullable=True)
    poster_url   = db.Column(db.String(500), nullable=True)
    rating       = db.Column(db.Float, default=0.0)
    tmdb_id      = db.Column(db.Integer, nullable=True)
    tags         = db.Column(db.String(500), nullable=True)
    quality      = db.Column(db.String(20), default='1080p')
    added_by     = db.Column(db.String(50), nullable=True)
    is_active    = db.Column(db.Boolean, default=True)
    views        = db.Column(db.Integer, default=0)
    view_count   = db.Column(db.Integer, default=0)
    created_at   = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at   = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    links = db.relationship('ContentLink', backref='content', lazy=True, cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id':           self.id,
            'title':        self.title,
            'content_type': self.content_type,
            'year':         self.year,
            'genre':        self.genre,
            'overview':     self.overview,
            'poster_url':   self.poster_url,
            'rating':       self.rating,
            'tmdb_id':      self.tmdb_id,
            'tags':         self.tags.split(',') if self.tags else [],
            'quality':      self.quality,
            'views':        self.view_count or 0,
            'links':        [l.to_dict() for l in self.links],
            'created_at':   self.created_at.isoformat(),
        }


class ContentLink(db.Model):
    """Lien hébergeur associé à un DirectContent"""
    __tablename__ = 'content_links'

    id         = db.Column(db.Integer, primary_key=True)
    content_id = db.Column(db.Integer, db.ForeignKey('direct_content.id'), nullable=False)
    label      = db.Column(db.String(100), nullable=True)
    url        = db.Column(db.String(1000), nullable=False)
    hoster     = db.Column(db.String(50), nullable=True)
    quality    = db.Column(db.String(20), nullable=True)
    link_type  = db.Column(db.String(20), default='stream')
    lang       = db.Column(db.String(10), default='fr')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'id':         self.id,
            'content_id': self.content_id,
            'label':      self.label,
            'url':        self.url,
            'hoster':     self.hoster,
            'quality':    self.quality,
            'link_type':  self.link_type,
            'lang':       self.lang,
        }
