const BASE = '/api'

function getToken(): string | null {
  return localStorage.getItem('token')
}

function authHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  let res: Response

  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers: authHeaders(),
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })
  } catch {
    throw new Error('Impossible de contacter le serveur. Vérifiez que le backend est démarré.')
  }

  if (res.status === 401) {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    window.location.href = '/login'
    throw new Error('Non authentifié')
  }

  // Certaines réponses peuvent avoir un body vide (ex: 204)
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Réponse invalide du serveur (${res.status})`)
    }
  }

  if (!res.ok) {
    const err = (data as any)?.error || `Erreur serveur (${res.status})`
    throw new Error(err)
  }

  return data as T
}

export const api = {
  // Auth
  login: (username: string, password: string) =>
    request<{ access_token: string; user: User }>('POST', '/auth/login', { username, password }),

  signup: (username: string, email: string, password: string) =>
    request<{ access_token: string; user: User }>('POST', '/auth/signup', { username, email, password }),

  logout: () => request('POST', '/auth/logout'),

  me: () => request<User>('GET', '/auth/me'),

  changePassword: (old_password: string, new_password: string) =>
    request('POST', '/auth/change-password', { old_password, new_password }),

  tmdbTvSeasons: (tmdbId: number) =>
    request<{ tmdb_id: number; title: string; seasons: any[]; total_episodes: number }>('GET', `/tmdb/tv/${tmdbId}/seasons`),
  tmdbTvSeason: (tmdbId: number, season: number) =>
    request<{ season_number: number; name: string; episodes: any[] }>('GET', `/tmdb/tv/${tmdbId}/season/${season}`),

  updateProfile: (bio: string, avatar_url: string) =>
    request<{ user: User }>('PUT', '/auth/profile', { bio, avatar_url }),

  // Deezer
  search: (query: string, type: string) =>
    request<{ results: SearchResult[] }>('POST', '/search', { query, type }),

  streamTrackUrl: (id: number) => `${BASE}/stream/track/${id}`,
  streamAlbumUrl: (id: number) => `${BASE}/stream/album/${id}`,

  streamTrack: async (id: number) => {
    const token = getToken()
    const res = await fetch(`${BASE}/stream/track/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = `Erreur (${res.status})`
      try { msg = JSON.parse(text).error || msg } catch {}
      throw new Error(msg)
    }
    return res
  },

  streamAlbum: async (id: number) => {
    const token = getToken()
    const res = await fetch(`${BASE}/stream/album/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = `Erreur (${res.status})`
      try { msg = JSON.parse(text).error || msg } catch {}
      throw new Error(msg)
    }
    return res
  },

  // yt-dlp
  ytdlpInfo: (url: string) =>
    request<YtdlpInfo>('POST', '/ytdlp/info', { url }),

  ytdlpDownloadDirect: async (url: string, format_id: string, fmt_kind: string) => {
    const token = getToken()
    const res = await fetch(`${BASE}/ytdlp/download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url, format_id, fmt_kind }),
    })
    if (!res.ok) {
      const text = await res.text()
      let msg = `Erreur (${res.status})`
      try { msg = JSON.parse(text).error || msg } catch {}
      throw new Error(msg)
    }
    return res
  },

  // Fichiers
  files: () => request<{ files: FileEntry[] }>('GET', '/files'),

  fileDownloadUrl: (path: string) => {
    const token = getToken()
    return `${BASE}/files/download?path=${encodeURIComponent(path)}&token=${token}`
  },

  // Queue
  queue: () => request<QueueState>('GET', '/queue'),
}

// Types
export interface User {
  id: number
  username: string
  email: string
  is_admin: boolean
  created_at: string
  last_login: string | null
  bio?: string | null
  avatar_url?: string | null
  wallet_btc?: string | null
  wallet_eth?: string | null
  wallet_usdt?: string | null
  wallet_sol?: string | null
}

export interface SearchResult {
  id: number
  title?: string
  artist?: string
  album?: string
  type: string
  SNG_ID?: number
  SNG_TITLE?: string
  ART_NAME?: string
  ALB_TITLE?: string
  DURATION?: number
  ALB_ID?: number
  img_url?: string    // pochette Deezer (cover_small)
}

export interface YtdlpFormat {
  format_id: string
  label: string
  ext: string
  kind: 'video+audio' | 'video' | 'audio'
  height: number | null
  resolution: string
  bitrate: number
  size: string
  vcodec: string
  acodec: string
  filesize?: number | null
}

export interface YtdlpInfo {
  title: string
  uploader: string
  duration: number
  thumbnail: string
  formats: YtdlpFormat[]
}

export interface FileEntry {
  name: string
  path: string
  size: number
  folder: string
  mtime: number
}

export interface QueueItem {
  id: string
  title: string
  status: 'pending' | 'downloading' | 'done' | 'error'
  progress?: number
}

export interface QueueState {
  queue: QueueItem[]
  workers: number
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export interface TmdbResult {
  tmdb_id: number
  title: string
  year: string
  genre: string
  overview: string
  poster_url: string | null
  rating: number
  content_type: 'film' | 'serie' | 'anime'
  tags: string[]
}
