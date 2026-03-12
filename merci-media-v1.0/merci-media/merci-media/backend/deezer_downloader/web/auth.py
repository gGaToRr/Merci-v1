"""Authentication routes and utilities"""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta
from deezer_downloader.web.models import db, User, LoginAttempt
import re
from functools import wraps

auth_bp = Blueprint('auth', __name__, url_prefix='/api/auth')


def get_client_ip():
    """Get client IP address"""
    if request.environ.get('HTTP_CF_CONNECTING_IP'):
        return request.environ.get('HTTP_CF_CONNECTING_IP')
    return request.remote_addr


def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None


def validate_password(password):
    """Validate password strength (min 8 chars, at least 1 number and 1 uppercase)"""
    if len(password) < 8:
        return False, "Le mot de passe doit contenir au moins 8 caractères"
    if not any(char.isupper() for char in password):
        return False, "Le mot de passe doit contenir au moins une majuscule"
    if not any(char.isdigit() for char in password):
        return False, "Le mot de passe doit contenir au moins un chiffre"
    return True, "OK"


@auth_bp.route('/signup', methods=['POST'])
def signup():
    """Register a new user"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('email') or not data.get('password'):
        return jsonify({'error': 'Username, email and password required'}), 400

    username = data.get('username').strip()
    email = data.get('email').strip().lower()
    password = data.get('password')

    # Validate email
    if not validate_email(email):
        return jsonify({'error': 'Invalid email format'}), 400

    # Validate password strength
    valid, msg = validate_password(password)
    if not valid:
        return jsonify({'error': msg}), 400

    # Check if user exists
    if User.query.filter_by(username=username).first():
        return jsonify({'error': 'Username already exists'}), 409

    if User.query.filter_by(email=email).first():
        return jsonify({'error': 'Email already exists'}), 409

    # Create user
    try:
        user = User(username=username, email=email)
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Log successful registration
        login_log = LoginAttempt(
            username=username,
            success=True,
            ip_address=get_client_ip(),
            user_agent=request.headers.get('User-Agent', '')[:255]
        )
        db.session.add(login_log)
        db.session.commit()

        return jsonify({
            'message': 'User created successfully',
            'user': user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Registration failed: ' + str(e)}), 500


@auth_bp.route('/login', methods=['POST'])
def login():
    """User login"""
    data = request.get_json()

    if not data or not data.get('username') or not data.get('password'):
        return jsonify({'error': 'Username and password required'}), 400

    username = data.get('username').strip()
    password = data.get('password')

    user = User.query.filter_by(username=username).first()

    # Log attempt
    login_log = LoginAttempt(
        username=username,
        success=user is not None and user.check_password(password),
        ip_address=get_client_ip(),
        user_agent=request.headers.get('User-Agent', '')[:255]
    )
    db.session.add(login_log)
    db.session.commit()

    if not user or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password'}), 401

    if not user.is_active:
        return jsonify({'error': 'User account is disabled'}), 403

    # Update last login
    user.last_login = db.func.now()
    db.session.commit()

    # Create JWT token
    access_token = create_access_token(
        identity=str(user.id),
        expires_delta=timedelta(days=30)
    )

    return jsonify({
        'message': 'Login successful',
        'access_token': access_token,
        'user': user.to_dict()
    }), 200


@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user info"""
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))

    if not user:
        return jsonify({'error': 'User not found'}), 404

    return jsonify(user.to_dict()), 200


@auth_bp.route('/logout', methods=['POST'])
@jwt_required()
def logout():
    """Logout user (client should discard token)"""
    return jsonify({'message': 'Logout successful'}), 200


@auth_bp.route('/change-password', methods=['POST'])
@jwt_required()
def change_password():
    """Change user password"""
    user_id = get_jwt_identity()
    data = request.get_json()

    if not data or not data.get('old_password') or not data.get('new_password'):
        return jsonify({'error': 'Old and new password required'}), 400

    user = User.query.get(int(user_id))
    if not user:
        return jsonify({'error': 'User not found'}), 404

    if not user.check_password(data.get('old_password')):
        return jsonify({'error': 'Old password is incorrect'}), 401

    valid, msg = validate_password(data.get('new_password'))
    if not valid:
        return jsonify({'error': msg}), 400

    user.set_password(data.get('new_password'))
    db.session.commit()

    return jsonify({'message': 'Password changed successfully'}), 200


def admin_required(f):
    """Decorator to require admin privileges"""
    @wraps(f)
    @jwt_required()
    def decorated_function(*args, **kwargs):
        user_id = get_jwt_identity()
        user = User.query.get(int(user_id))
        if not user or not user.is_admin:
            return jsonify({'error': 'Admin access required'}), 403
        return f(*args, **kwargs)
    return decorated_function
