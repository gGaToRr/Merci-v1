import os

BASE = os.environ.get("DOWNLOAD_DIR", "/mnt/deezer-downloader")
ARL  = os.environ.get("DEEZER_COOKIE_ARL", "")

config = f"""[mpd]
use_mpd = False
host = localhost
port = 6600
music_dir_root = {BASE}

[download_dirs]
base = {BASE}
songs = %(base)s/songs
albums = %(base)s/albums
zips = %(base)s/zips
playlists = %(base)s/playlists
youtubedl = %(base)s/youtube-dl

[debug]
command = echo no-debug

[http]
host = 0.0.0.0
port = 5000
url_prefix =
api_root = %(url_prefix)s
static_root = %(url_prefix)s/static

[proxy]
server =

[threadpool]
workers = 4

[deezer]
cookie_arl = {ARL}
quality = mp3

[youtubedl]
command = /usr/local/bin/yt-dlp
"""

os.makedirs(f"{BASE}/songs",      exist_ok=True)
os.makedirs(f"{BASE}/albums",     exist_ok=True)
os.makedirs(f"{BASE}/zips",       exist_ok=True)
os.makedirs(f"{BASE}/playlists",  exist_ok=True)
os.makedirs(f"{BASE}/youtube-dl", exist_ok=True)

with open("/etc/deezer-downloader.ini", "w") as f:
    f.write(config)

print("Config created at /etc/deezer-downloader.ini")
