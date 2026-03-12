"""
ytdlp.py — Wrapper yt-dlp pour Merci Media
Gère la récupération des formats et le téléchargement de vidéos/audio.
"""

import os
import re
import subprocess
import logging
import tempfile
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Chemin vers yt-dlp (dans le PATH du conteneur)
YTDLP_BIN = os.environ.get("YTDLP_BIN", "yt-dlp")

# Dossier de sortie par défaut
OUTPUT_DIR = os.environ.get("DOWNLOAD_DIR", "/mnt/deezer-downloader")


def validate_url(url: str) -> bool:
    """Vérifie qu'une URL est valide et supportée par yt-dlp."""
    if not url or not isinstance(url, str):
        return False
    url = url.strip()
    return url.startswith("http://") or url.startswith("https://")


def get_formats(url: str) -> list[dict]:
    """
    Retourne la liste des formats disponibles pour une URL.
    Chaque format est un dict avec id, ext, resolution, filesize, vcodec, acodec, etc.
    """
    if not validate_url(url):
        raise ValueError(f"URL invalide : {url!r}")

    try:
        result = subprocess.run(
            [
                YTDLP_BIN,
                "--dump-json",
                "--no-playlist",
                "--no-warnings",
                url,
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )

        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp error: {result.stderr[:200]}")

        import json
        info = json.loads(result.stdout)

        def filesize_str(f):
            size = f.get("filesize") or f.get("filesize_approx")
            if not size:
                return ""
            if size > 1024 * 1024 * 1024:
                return f"{size / 1024 / 1024 / 1024:.1f} GB"
            if size > 1024 * 1024:
                return f"{size / 1024 / 1024:.0f} MB"
            return f"{size / 1024:.0f} KB"

        formats = []
        for f in info.get("formats", []):
            ext = f.get("ext", "")
            if ext in ("mhtml", ""):
                continue

            vcodec = f.get("vcodec", "none") or "none"
            acodec = f.get("acodec", "none") or "none"

            if vcodec != "none" and acodec != "none":
                kind = "video+audio"
            elif vcodec != "none":
                kind = "video"
            else:
                kind = "audio"

            height = f.get("height") or 0
            tbr    = f.get("tbr") or f.get("abr") or 0

            fmt = {
                "format_id":  f.get("format_id", ""),
                "ext":        ext,
                "kind":       kind,
                "height":     height,
                "resolution": f.get("resolution") or (f"{height}p" if height else ""),
                "bitrate":    int(tbr) if tbr else 0,
                "size":       filesize_str(f),
                "vcodec":     vcodec,
                "acodec":     acodec,
                "label":      f.get("format_note", ""),
            }
            formats.append(fmt)

        # Tri: vidéo+audio d'abord, puis vidéo seule, puis audio — par hauteur décroissante
        def sort_key(f):
            return (f.get("height") or 0)

        combined   = sorted([f for f in formats if f["kind"] == "video+audio"], key=sort_key, reverse=True)
        video_only = sorted([f for f in formats if f["kind"] == "video"],       key=sort_key, reverse=True)
        audio_only = sorted([f for f in formats if f["kind"] == "audio"],
                            key=lambda f: f.get("bitrate") or 0, reverse=True)

        return {
            "title":     info.get("title", ""),
            "uploader":  info.get("uploader", ""),
            "duration":  info.get("duration"),
            "thumbnail": info.get("thumbnail", ""),
            "formats":   combined + video_only + audio_only,
        }

    except subprocess.TimeoutExpired:
        raise RuntimeError("yt-dlp timeout (30s) — URL peut-être invalide ou lente")
    except Exception as e:
        logger.exception(f"get_formats error for {url}")
        raise


def download_video(
    url: str,
    fmt_id: str,
    fmt_kind: str = "av",
    output_dir: Optional[str] = None,
) -> str:
    """
    Télécharge une vidéo/audio via yt-dlp.
    Retourne le chemin absolu du fichier téléchargé.

    fmt_kind: "av" = vidéo+audio, "video" = vidéo seule, "audio" = audio seul
    """
    if not validate_url(url):
        raise ValueError(f"URL invalide : {url!r}")

    out_dir = output_dir or OUTPUT_DIR
    os.makedirs(out_dir, exist_ok=True)

    # Template de nom de fichier
    outtmpl = os.path.join(out_dir, "%(title)s.%(ext)s")

    # Construire la commande
    cmd = [
        YTDLP_BIN,
        "--no-playlist",
        "--no-warnings",
        "-o", outtmpl,
    ]

    if fmt_kind == "audio":
        # Extraire l'audio uniquement
        cmd += [
            "-f", fmt_id,
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", "0",
        ]
    elif fmt_kind == "video":
        # Vidéo seule + merge avec le meilleur audio dispo
        cmd += [
            "-f", f"{fmt_id}+bestaudio/best",
            "--merge-output-format", "mp4",
        ]
    else:
        # Format combiné
        cmd += [
            "-f", fmt_id,
            "--merge-output-format", "mp4",
        ]

    cmd.append(url)

    logger.info(f"yt-dlp cmd: {' '.join(cmd)}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=3600,  # 1h max
        )

        if result.returncode != 0:
            raise RuntimeError(f"yt-dlp download failed: {result.stderr[:500]}")

        # Retrouver le fichier téléchargé (yt-dlp peut changer l'extension)
        # On cherche le fichier le plus récent dans le dossier
        files = sorted(
            Path(out_dir).iterdir(),
            key=lambda p: p.stat().st_mtime,
            reverse=True,
        )
        if not files:
            raise RuntimeError("Aucun fichier trouvé après téléchargement")

        return str(files[0])

    except subprocess.TimeoutExpired:
        raise RuntimeError("yt-dlp timeout (1h) — fichier trop volumineux ?")
    except Exception as e:
        logger.exception(f"download_video error for {url}")
        raise
