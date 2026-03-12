import os
import subprocess

# 1. Générer le fichier .ini depuis les variables d'environnement
subprocess.run(["python", "create_config.py"], check=True)

# 2. Charger la config AVANT tout import de deezer_downloader
#    (music_backend.py appelle check_download_dirs_exist() à l'import)
from deezer_downloader.configuration import load_config
load_config(os.environ.get("DEEZER_CONFIG", "/etc/deezer-downloader.ini"))

# 3. Maintenant on peut importer app
from deezer_downloader.web.app import create_app
from waitress import serve

app = create_app(os.environ.get("DEEZER_CONFIG", "/etc/deezer-downloader.ini"))
serve(app, host="0.0.0.0", port=5000, channel_timeout=3600)
