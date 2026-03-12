FROM python:3.12-slim

LABEL description="Merci Media - Backend Flask"

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Dépendances système
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# yt-dlp
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp \
    -o /usr/local/bin/yt-dlp && chmod +x /usr/local/bin/yt-dlp

WORKDIR /app

# Installer les dépendances Python directement (sans Poetry)
RUN pip install --no-cache-dir \
    flask \
    flask-sqlalchemy \
    flask-jwt-extended \
    flask-autoindex \
    requests \
    waitress \
    pycryptodome \
    mutagen \
    yt-dlp \
    giphypop \
    python-mpd2 \
    pyotp \
    werkzeug \
    markupsafe \
    flask-cors

# Copier le code
COPY deezer_downloader/ ./deezer_downloader/
COPY create_config.py ./
COPY entrypoint.py ./

# Dossiers de données + fichier de config
RUN mkdir -p /data /mnt/deezer-downloader && \
    echo "Config will be generated at runtime"

ENV DEEZER_CONFIG=/etc/deezer-downloader.ini
ENV DOWNLOAD_DIR=/mnt/deezer-downloader

EXPOSE 5000

CMD ["python", "entrypoint.py"]
