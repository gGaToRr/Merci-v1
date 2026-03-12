"""Admin routes for management"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from deezer_downloader.web.models import db, User, LoginAttempt, DownloadLog
from deezer_downloader.web.auth import admin_required
from datetime import datetime, timedelta

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/users', methods=['GET'])
@admin_required
def list_users():
    """List all users"""
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    users = User.query.paginate(page=page, per_page=per_page)

    return jsonify({
        'total': users.total,
        'pages': users.pages,
        'current_page': page,
        'users': [user.to_dict() for user in users.items]
    }), 200


@admin_bp.route('/users/<int:user_id>', methods=['GET'])
@admin_required
def get_user(user_id):
    """Get user details"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user_data = user.to_dict()
    user_data['login_attempts'] = len(user.downloads)

    return jsonify(user_data), 200


@admin_bp.route('/users/<int:user_id>/toggle-admin', methods=['PUT'])
@admin_required
def toggle_admin(user_id):
    """Toggle admin status"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    user.is_admin = not user.is_admin
    db.session.commit()

    return jsonify({
        'message': 'Admin status updated',
        'user': user.to_dict()
    }), 200


@admin_bp.route('/users/<int:user_id>/toggle-active', methods=['PUT'])
@admin_required
def toggle_active(user_id):
    """Toggle user active status"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Don't allow disabling yourself
    current_user_id = get_jwt_identity()
    if user_id == current_user_id:
        return jsonify({'error': 'Cannot disable your own account'}), 400

    user.is_active = not user.is_active
    db.session.commit()

    return jsonify({
        'message': 'User status updated',
        'user': user.to_dict()
    }), 200


@admin_bp.route('/login-attempts', methods=['GET'])
@admin_required
def get_login_attempts():
    """Get recent login attempts"""
    hours = request.args.get('hours', 24, type=int)
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 50, type=int)

    since = datetime.utcnow() - timedelta(hours=hours)
    attempts = LoginAttempt.query.filter(
        LoginAttempt.timestamp >= since
    ).order_by(LoginAttempt.timestamp.desc()).paginate(page=page, per_page=per_page)

    return jsonify({
        'total': attempts.total,
        'pages': attempts.pages,
        'current_page': page,
        'attempts': [attempt.to_dict() for attempt in attempts.items]
    }), 200


@admin_bp.route('/login-attempts/failed', methods=['GET'])
@admin_required
def get_failed_logins():
    """Get failed login attempts"""
    hours = request.args.get('hours', 24, type=int)

    since = datetime.utcnow() - timedelta(hours=hours)
    failed = LoginAttempt.query.filter(
        LoginAttempt.success == False,
        LoginAttempt.timestamp >= since
    ).all()

    # Group by username
    grouped = {}
    for attempt in failed:
        if attempt.username not in grouped:
            grouped[attempt.username] = 0
        grouped[attempt.username] += 1

    return jsonify({
        'total_failed': len(failed),
        'by_username': grouped
    }), 200


@admin_bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    """Get admin dashboard statistics"""
    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    admin_users = User.query.filter_by(is_admin=True).count()

    # Recent logins
    since = datetime.utcnow() - timedelta(days=7)
    recent_logins = LoginAttempt.query.filter(
        LoginAttempt.timestamp >= since,
        LoginAttempt.success == True
    ).count()

    # Failed logins
    failed_logins = LoginAttempt.query.filter(
        LoginAttempt.timestamp >= since,
        LoginAttempt.success == False
    ).count()

    return jsonify({
        'users': {
            'total': total_users,
            'active': active_users,
            'admin': admin_users
        },
        'logins': {
            'successful': recent_logins,
            'failed': failed_logins,
            'period_days': 7
        }
    }), 200


@admin_bp.route('/users/<int:user_id>/downloads', methods=['GET'])
@admin_required
def get_user_downloads(user_id):
    """Get user download history"""
    user = User.query.get(user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)

    downloads = DownloadLog.query.filter_by(user_id=user_id).order_by(
        DownloadLog.created_at.desc()
    ).paginate(page=page, per_page=per_page)

    return jsonify({
        'total': downloads.total,
        'pages': downloads.pages,
        'current_page': page,
        'downloads': [download.to_dict() for download in downloads.items]
    }), 200
