import { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Plus, X, Film, Tv, Star, Eye, Loader2, Search, AlertTriangle,
         ExternalLink, Trash2, Edit2, ChevronDown, Sparkles, Tag,
         ChevronLeft, ChevronRight, Maximize2, BookOpen, Users, Calendar, Award } from 'lucide-react'

const BASE = '/api'
function authH(): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('token')}` }
}
async function api<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method, headers: authH(),
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) throw new Error(data.error || `Erreur ${res.status}`)
  return data as T
}

interface ContentLink { id: number; hoster: string; url: string; link_type: string; quality: string }
interface Content {
  id: number; title: string; year: string; content_type: string; genre: string
  tags: string[]; overview: string; poster_url: string | null; rating: number | null
  quality: string; view_count: number; links: ContentLink[]
}

// ── Embed parsing ─────────────────────────────────────────────────────────────
function parseEmbedInput(raw: string): { embedUrl: string | null; pageUrl: string } {
  const trimmed = raw.trim()
  const srcMatch = trimmed.match(/src\s*=\s*["']([^"']+)["']/i)
  if (srcMatch) return { embedUrl: srcMatch[1], pageUrl: srcMatch[1] }
  let url = trimmed
  if (!url.startsWith('http')) url = 'https://' + url
  return { embedUrl: null, pageUrl: url }
}

function getEmbedUrl(hoster: string, rawInput: string): string | null {
  const { embedUrl, pageUrl } = parseEmbedInput(rawInput)
  if (embedUrl) return embedUrl

  // ── Lecteurs auto par TMDB ID — URL déjà construite ──────────────────────
  if (['autoembed','vidsrc','vidsrcme','videasy','twoembed','frembed','multiembed','superembed'].includes(hoster)) {
    if (rawInput.startsWith('http')) return rawInput
    return null
  }

  try {
    const u = new URL(pageUrl), path = u.pathname
    if (hoster === 'vidoza') {
      if (path.includes('embed-')) return pageUrl
      const m = path.match(/\/([a-zA-Z0-9]+)(?:\.html)?$/)
      if (m) return `https://vidoza.net/embed-${m[1]}.html`
    }
    if (hoster === 'doodstream') {
      if (path.includes('/e/')) return pageUrl
      const m = path.match(/\/[a-z]\/([a-zA-Z0-9]+)/)
      if (m) return `${u.origin}/e/${m[1]}`
    }
    if (hoster === 'streamtape') {
      if (path.includes('/e/')) return pageUrl
      const m = path.match(/\/[a-z]\/([a-zA-Z0-9_-]+)/)
      if (m) return `https://streamtape.com/e/${m[1]}`
    }
    if (hoster === 'voe') {
      if (path.includes('/e/')) return pageUrl
      const m = path.match(/\/([a-zA-Z0-9]+)$/)
      if (m) return `https://voe.sx/e/${m[1]}`
    }
    if (hoster === 'mixdrop') {
      if (path.includes('/e/')) return pageUrl
      const m = path.match(/\/[a-z]\/([a-zA-Z0-9]+)/)
      if (m) return `https://mixdrop.ag/e/${m[1]}`
    }
    if (hoster === 'filemoon') {
      if (path.includes('/e/')) return pageUrl
      const m = path.match(/\/[a-z]\/([a-zA-Z0-9]+)/)
      if (m) return `https://filemoon.sx/e/${m[1]}`
    }
    if (hoster === 'sendvid') {
      if (path.includes('/embed/')) return pageUrl
      const m = path.match(/\/([a-zA-Z0-9]+)$/)
      if (m) return `https://sendvid.com/embed/${m[1]}`
    }
    if (hoster === 'sibnet') return pageUrl
    if (path.includes('/e/') || path.includes('/embed/') || path.includes('/v/')) return pageUrl
    return null
  } catch { return null }
}

function getStorageUrl(raw: string): string {
  const { embedUrl, pageUrl } = parseEmbedInput(raw)
  return embedUrl || pageUrl
}

// ── Constantes ────────────────────────────────────────────────────────────────
const HOSTER_COLORS: Record<string, string> = {
  doodstream:'#e05252', streamtape:'#f59e0b', vidoza:'#3b82f6', uptobox:'#8b5cf6',
  voe:'#10b981', mixdrop:'#f97316', filemoon:'#ec4899', sendvid:'#14b8a6',
  sibnet:'#6366f1', myvidplay:'#7c3aed', odysee:'#ef4444', autre:'#6b7280',
  autoembed:   '#14b8a6',
  vidsrc:      '#8b5cf6',
  vidsrcme:    '#6366f1',
  videasy:     '#f59e0b',
  twoembed:    '#ec4899',
  frembed:     '#2563eb',
  multiembed:  '#16a34a',
  superembed:  '#dc2626',
  // ── Animés FR ──
  hikari:      '#f472b6',
  animesama:   '#a855f7',
  voiranime:   '#06b6d4',
  ninesama:    '#818cf8',
  // ── Animés EN ──
  embedsu:     '#0ea5e9',
  aniwatch:    '#22c55e',
  // ── Lecteur natif ──
  direct:      '#14b8a6',
}
const HOSTER_LABEL: Record<string, string> = {
  doodstream:'Doodstream', streamtape:'Streamtape', vidoza:'Vidoza', uptobox:'Uptobox',
  voe:'Voe', mixdrop:'Mixdrop', filemoon:'Filemoon', sendvid:'Sendvid',
  sibnet:'Sibnet', myvidplay:'MyVidPlay', odysee:'Odysee', autre:'Autre lien',
  autoembed:  'AutoEmbed',
  vidsrc:     'VidSrc',
  vidsrcme:   'VidSrc.me',
  videasy:    'Videasy',
  twoembed:   '2Embed',
  frembed:    'Frembed 🇫🇷',
  multiembed: 'MultiEmbed',
  superembed: 'SuperEmbed',
  // ── Animés FR ──
  hikari:     'Hikari 🇫🇷',
  animesama:  'AnimeSama 🇫🇷',
  voiranime:  'VoirAnime 🇫🇷',
  ninesama:   '9Anime-sama 🇫🇷',
  // ── Animés EN ──
  embedsu:    'EmbedSu 🌐',
  aniwatch:   'AniWatch 🌐',
  // ── Lecteur natif ──
  direct:     '▶ Lecteur natif',
}
const HOSTER_EXAMPLES: Record<string, string> = {
  autoembed:  '→ Généré automatiquement depuis le TMDB ID',
  vidsrc:     '→ Généré automatiquement depuis le TMDB ID',
  vidsrcme:   '→ Généré automatiquement depuis le TMDB ID',
  videasy:    '→ Généré automatiquement depuis le TMDB ID',
  twoembed:   '→ Généré automatiquement depuis le TMDB ID',
  frembed:    '→ Généré automatiquement depuis le TMDB ID (VF 🇫🇷)',
  multiembed: '→ Généré automatiquement depuis le TMDB ID',
  superembed: '→ Généré automatiquement depuis le TMDB ID',
  embedsu:    '→ Généré automatiquement depuis le TMDB ID (EN/FR subs)',
  aniwatch:   '→ URL embed manuel : https://aniwatch.to/watch/SLUG-ID?ep=EP_ID',
  hikari:     '⚠ AnimeSama/Hikari/VoirAnime bloquent les iframes. Coller l\'URL — un bouton "Ouvrir" s\'affichera.',
  animesama:  '⚠ AnimeSama/Hikari/VoirAnime bloquent les iframes. Coller l\'URL — un bouton "Ouvrir" s\'affichera.',
  voiranime:  '⚠ AnimeSama/Hikari/VoirAnime bloquent les iframes. Coller l\'URL — un bouton "Ouvrir" s\'affichera.',
  ninesama:   '→ URL embed manuel : https://9anime-sama.com/embed/XXXXXXXXXX',
  direct:     '→ Lien direct MP4/MKV : https://example.com/video.mp4',
  vidoza:     '<IFRAME SRC="https://vidoza.net/embed-XXXXXXXXXX.html" FRAMEBORDER=0 allowfullscreen></IFRAME>',
  doodstream: '<iframe src="https://dood.pm/e/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  streamtape: '<iframe src="https://streamtape.com/e/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  voe:        '<iframe src="https://voe.sx/e/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  mixdrop:    '<iframe src="https://mixdrop.ag/e/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  filemoon:   '<iframe src="https://filemoon.sx/e/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  sendvid:    '<iframe src="https://sendvid.com/embed/XXXXXXXXXX" frameborder="0" allowfullscreen></iframe>',
  myvidplay:  'https://myvidplay.com/e/XXXXXXXXXX',
}
const ALL_TAGS = [
  'Action','Aventure','Comédie','Drame','Thriller','Horreur','Science-Fiction',
  'Fantasy','Romance','Animé','Seinen','Shonen','Isekai','Historique','Crime','Documentaire',
  'Famille','Musique','Mystère','Western','Guerre','Sport','Biopic',
]
// Hosters auto-embed (génèrent leur URL depuis le TMDB ID)
const AUTO_HOSTERS = new Set(['autoembed','vidsrc','vidsrcme','videasy','twoembed','frembed','multiembed','superembed','embedsu'])
// Hosters qui bloquent l'iframe (X-Frame-Options: SAMEORIGIN) → ouvrir dans onglet
const IFRAME_BLOCKED = new Set(['hikari','animesama','voiranime','ninesama','aniwatch'])
// Détection lien direct MP4/MKV
const isDirectVideo = (url: string) => /\.(mp4|mkv|webm|m4v|mov|avi)(\?.*)?$/i.test(url)

const HOSTERS_LIST = [
  // Lecteur natif
  'direct',
  // Films / Séries génériques
  'frembed','multiembed','superembed','autoembed','vidsrc','vidsrcme','videasy','twoembed',
  // Animés FR (⚠ iframe bloquée — bouton ouvrir)
  'hikari','animesama','voiranime','ninesama',
  // Animés EN
  'embedsu','aniwatch',
  // Hébergeurs directs
  'vidoza','doodstream','streamtape','voe','mixdrop','filemoon','sendvid','sibnet','myvidplay','odysee','uptobox','autre',
]

// ── Étoiles ───────────────────────────────────────────────────────────────────
function Stars({ r }: { r: number }) {
  const on5 = r / 2; const full = Math.floor(on5); const frac = on5 - full
  const uid = `s${Math.random().toString(36).slice(2,6)}`
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="#FBBF24" stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ))}
      {frac > 0.1 && (
        <svg width="11" height="11" viewBox="0 0 24 24">
          <defs><linearGradient id={uid}><stop offset={`${Math.round(frac*100)}%`} stopColor="#FBBF24"/><stop offset={`${Math.round(frac*100)}%`} stopColor="transparent"/></linearGradient></defs>
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill={`url(#${uid})`} stroke="#FBBF24" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      )}
      {Array.from({ length: 5 - Math.ceil(on5) }).map((_, i) => (
        <svg key={i} width="11" height="11" viewBox="0 0 24 24">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" fill="none" stroke="#374151" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      ))}
      <span className="text-yellow-400 text-[10px] font-semibold ml-1">{r.toFixed(1)}</span>
    </div>
  )
}

// ── Hero Carousel ─────────────────────────────────────────────────────────────
function HeroCarousel({ items, onPlay }: { items: Content[]; onPlay: (c: Content, l: ContentLink) => void }) {
  const withPosters = items.filter(c => c.poster_url && c.links.length > 0)
  const track = useRef<HTMLDivElement>(null)

  if (withPosters.length === 0) return null

  const scroll = (dir: 'left' | 'right') => {
    if (!track.current) return
    const w = track.current.clientWidth
    track.current.scrollBy({ left: dir === 'left' ? -w * 0.7 : w * 0.7, behavior: 'smooth' })
  }

  const featured = withPosters[0]
  const bestLink = featured.links.find(l => getEmbedUrl(l.hoster, l.url)) || featured.links[0]

  return (
    <div className="mb-6 sm:mb-8">
      <div className="relative w-full h-48 sm:h-72 lg:h-80 rounded-xl sm:rounded-2xl overflow-hidden mb-4 group cursor-pointer"
           onClick={() => bestLink && onPlay(featured, bestLink)}>
        <div className="absolute inset-0">
          <img src={featured.poster_url!} alt="" className="w-full h-full object-cover scale-110 blur-sm opacity-40" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute inset-0 flex items-end p-4 sm:p-8">
          <div className="flex items-end gap-4 sm:gap-6 w-full">
            <img src={featured.poster_url!} alt={featured.title}
              className="w-20 sm:w-32 lg:w-36 flex-shrink-0 rounded-xl shadow-2xl border border-white/10 transition-transform duration-500 group-hover:scale-105"
              style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
            <div className="flex-1 min-w-0 pb-1">
              <div className="flex flex-wrap gap-1.5 mb-2">
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold text-white ${featured.content_type==='serie'?'bg-purple-600':featured.content_type==='anime'?'bg-pink-600':'bg-blue-600'}`}>
                  {featured.content_type==='serie'?'Série':featured.content_type==='anime'?'Animé':'Film'}
                </span>
                {featured.year && <span className="px-2 py-0.5 bg-white/10 text-white text-[10px] rounded-full">{featured.year}</span>}
              </div>
              <h2 className="text-white font-bold text-xl sm:text-2xl lg:text-3xl leading-tight mb-1 sm:mb-2 line-clamp-2">{featured.title}</h2>
              {featured.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2 sm:mb-3">
                  {featured.tags.slice(0,3).map(t => (
                    <span key={t} className="px-2 py-0.5 bg-teal-500/20 border border-teal-500/30 text-teal-300 rounded-full text-[9px]">{t}</span>
                  ))}
                </div>
              )}
              {featured.overview && <p className="text-gray-300 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-3 hidden sm:block">{featured.overview}</p>}
              <button className="flex items-center gap-2 px-4 py-2 bg-teal-500 hover:bg-teal-400 rounded-xl text-white text-sm font-semibold transition-all shadow-lg shadow-teal-900/40 hover:scale-105">
                <Play className="w-4 h-4 fill-white" />Regarder maintenant
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <p className="text-[10px] sm:text-xs text-gray-500 uppercase tracking-widest mb-2 sm:mb-3">À découvrir</p>
        <div className="relative group/carousel">
          <button onClick={() => scroll('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-2 z-10 w-8 h-8 rounded-full bg-black/70 border border-gray-700/60 flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black shadow-xl">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => scroll('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-2 z-10 w-8 h-8 rounded-full bg-black/70 border border-gray-700/60 flex items-center justify-center text-white opacity-0 group-hover/carousel:opacity-100 transition-opacity hover:bg-black shadow-xl">
            <ChevronRight className="w-4 h-4" />
          </button>
          <div ref={track} className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {withPosters.map(item => {
              const bl = item.links.find(l => getEmbedUrl(l.hoster, l.url)) || item.links[0]
              return (
                <div key={item.id} onClick={() => bl && onPlay(item, bl)}
                  className="flex-shrink-0 w-20 sm:w-28 cursor-pointer group/poster relative rounded-lg overflow-hidden border border-white/5 hover:border-teal-500/50 transition-all duration-300">
                  <img src={item.poster_url!} alt={item.title} className="w-full transition-transform duration-500 group-hover/poster:scale-105"
                    style={{ aspectRatio: '2/3', objectFit: 'cover' }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300 flex items-end p-1.5">
                    <p className="text-white text-[9px] font-medium leading-tight line-clamp-2">{item.title}</p>
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/poster:opacity-100 transition-opacity duration-300">
                    <div className="w-8 h-8 rounded-full bg-teal-500/90 flex items-center justify-center">
                      <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Anime Detail Modal ────────────────────────────────────────────────────────
// Récupère les infos AniList + Jikan, affiche la fiche, puis ouvre SeriesPlayerModal
const ANILIST_GQL = 'https://graphql.anilist.co'
const JIKAN_BASE  = 'https://api.jikan.moe/v4'

interface AniData {
  id: number
  titleRomaji: string
  titleEnglish: string
  titleNative: string
  description: string
  coverLarge: string
  banner: string
  score: number        // sur 100
  popularity: number
  genres: string[]
  status: string
  episodes: number | null
  season: string
  seasonYear: number
  studios: string[]
  trailer?: { id: string; site: string }
}

interface JikanEp {
  mal_id: number
  title: string
  title_romanji: string
  aired: string
  filler: boolean
  recap: boolean
}

async function fetchAniList(title: string): Promise<AniData | null> {
  const query = `
    query($search: String) {
      Media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title { romaji english native }
        description(asHtml: false)
        coverImage { extraLarge large }
        bannerImage
        averageScore
        popularity
        genres
        status
        episodes
        season
        seasonYear
        studios(isMain: true) { nodes { name } }
        trailer { id site }
      }
    }
  `
  try {
    const res = await fetch(ANILIST_GQL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { search: title } }),
    })
    const data = await res.json()
    const m = data?.data?.Media
    if (!m) return null
    return {
      id:           m.id,
      titleRomaji:  m.title?.romaji  || '',
      titleEnglish: m.title?.english || '',
      titleNative:  m.title?.native  || '',
      description:  m.description?.replace(/<[^>]+>/g, '').replace(/\n+/g, ' ').trim() || '',
      coverLarge:   m.coverImage?.extraLarge || m.coverImage?.large || '',
      banner:       m.bannerImage || '',
      score:        m.averageScore || 0,
      popularity:   m.popularity  || 0,
      genres:       m.genres      || [],
      status:       m.status      || '',
      episodes:     m.episodes,
      season:       m.season      || '',
      seasonYear:   m.seasonYear  || 0,
      studios:      m.studios?.nodes?.map((s: any) => s.name) || [],
      trailer:      m.trailer,
    }
  } catch { return null }
}

async function fetchJikanEpisodes(title: string, page = 1): Promise<JikanEp[]> {
  try {
    const search = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(title)}&limit=1`)
    const sd = await search.json()
    const malId = sd?.data?.[0]?.mal_id
    if (!malId) return []
    const eps = await fetch(`${JIKAN_BASE}/anime/${malId}/episodes?page=${page}`)
    const ed = await eps.json()
    return (ed?.data || []) as JikanEp[]
  } catch { return [] }
}

function AnimeDetailModal({ item, onClose, onWatch }: {
  item: Content
  onClose: () => void
  onWatch: () => void
}) {
  const [ani,       setAni]       = useState<AniData | null>(null)
  const [jikanEps,  setJikanEps]  = useState<JikanEp[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showFull,  setShowFull]  = useState(false)
  const [tab,       setTab]       = useState<'info' | 'episodes'>('info')

  const STATUS_FR: Record<string, string> = {
    FINISHED:         'Terminé',
    RELEASING:        'En cours',
    NOT_YET_RELEASED: 'À venir',
    CANCELLED:        'Annulé',
    HIATUS:           'En pause',
  }
  const SEASON_FR: Record<string, string> = { WINTER: 'Hiver', SPRING: 'Printemps', SUMMER: 'Été', FALL: 'Automne' }

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchAniList(item.title),
      fetchJikanEpisodes(item.title),
    ]).then(([aniData, eps]) => {
      if (cancelled) return
      setAni(aniData)
      setJikanEps(eps)
      setLoading(false)
    })
    return () => { cancelled = true }
  }, [item.title])

  const desc = ani?.description || item.overview || ''
  const truncated = desc.length > 300 && !showFull ? desc.slice(0, 300) + '…' : desc

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col overflow-hidden">

      {/* Banner */}
      {ani?.banner ? (
        <div className="relative h-36 sm:h-48 flex-shrink-0 overflow-hidden">
          <img src={ani.banner} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/90" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center rounded-xl bg-black/60 border border-white/20 text-white hover:bg-red-600/60 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800/60 bg-[#0a0a12]/90 flex-shrink-0">
          <h2 className="text-white font-semibold text-sm truncate">{item.title}</h2>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-red-600/20 text-gray-500 hover:text-red-400 transition-all">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Body scrollable */}
      <div className="flex-1 overflow-y-auto bg-[#0a0a12]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-full border-2 border-pink-900 border-t-pink-400 animate-spin" />
            <p className="text-gray-500 text-sm">Chargement des infos…</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">

            {/* Hero : cover + méta */}
            <div className="flex gap-4 p-4 sm:p-5">
              {/* Cover */}
              <div className="flex-shrink-0">
                <img src={ani?.coverLarge || item.poster_url || ''}
                  alt={item.title}
                  className="w-24 sm:w-32 rounded-xl object-cover shadow-2xl border border-white/10"
                  style={{ aspectRatio: '2/3' }} />
              </div>

              {/* Infos */}
              <div className="flex-1 min-w-0">
                {ani?.banner && (
                  <button onClick={onClose} className="hidden sm:flex absolute top-3 right-3 w-8 h-8 items-center justify-center rounded-xl bg-black/60 border border-white/20 text-white hover:bg-red-600/60 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}

                <h1 className="text-white text-lg sm:text-xl font-bold leading-tight mb-0.5">
                  {ani?.titleEnglish || ani?.titleRomaji || item.title}
                </h1>
                {ani?.titleNative && (
                  <p className="text-gray-500 text-xs mb-2">{ani.titleNative}</p>
                )}

                {/* Badges méta */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {ani?.score > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 text-[10px] font-bold">
                      <Star className="w-2.5 h-2.5 fill-current" />{(ani.score / 10).toFixed(1)}
                    </span>
                  )}
                  {ani?.status && (
                    <span className="px-2 py-0.5 rounded-full bg-pink-500/15 border border-pink-500/30 text-pink-400 text-[10px] font-medium">
                      {STATUS_FR[ani.status] || ani.status}
                    </span>
                  )}
                  {ani?.episodes && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/40 text-gray-400 text-[10px]">
                      <Film className="w-2.5 h-2.5" />{ani.episodes} épisodes
                    </span>
                  )}
                  {ani?.season && ani.seasonYear && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/40 text-gray-400 text-[10px]">
                      <Calendar className="w-2.5 h-2.5" />{SEASON_FR[ani.season] || ani.season} {ani.seasonYear}
                    </span>
                  )}
                  {ani?.popularity > 0 && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-700/50 border border-gray-600/40 text-gray-400 text-[10px]">
                      <Users className="w-2.5 h-2.5" />{(ani.popularity / 1000).toFixed(0)}k
                    </span>
                  )}
                </div>

                {/* Studios */}
                {ani?.studios?.length > 0 && (
                  <p className="text-gray-500 text-[11px] mb-2">
                    <span className="text-gray-600">Studio · </span>{ani.studios.join(', ')}
                  </p>
                )}

                {/* Genres */}
                {ani?.genres?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {ani.genres.slice(0, 6).map(g => (
                      <span key={g} className="px-2 py-0.5 rounded-full bg-pink-600/10 border border-pink-600/20 text-pink-400/80 text-[10px]">{g}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Bouton regarder */}
            <div className="px-4 sm:px-5 mb-4">
              <button onClick={onWatch}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-pink-600 to-pink-500 hover:from-pink-500 hover:to-pink-400 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-pink-900/40">
                <Play className="w-4 h-4 fill-current" />Regarder — Choisir l'épisode
              </button>
            </div>

            {/* Onglets Info / Épisodes Jikan */}
            <div className="flex gap-1 px-4 sm:px-5 mb-4">
              {[
                { key: 'info',     label: 'Synopsis',  icon: <BookOpen className="w-3.5 h-3.5" /> },
                { key: 'episodes', label: `Épisodes${jikanEps.length ? ` (${jikanEps.length})` : ''}`, icon: <Film className="w-3.5 h-3.5" /> },
              ].map(t => (
                <button key={t.key} onClick={() => setTab(t.key as any)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-medium transition-all ${
                    tab === t.key
                      ? 'bg-pink-600/20 border-pink-600/40 text-pink-400'
                      : 'bg-gray-800/30 border-gray-700/40 text-gray-500 hover:text-gray-300'
                  }`}>
                  {t.icon}{t.label}
                </button>
              ))}
            </div>

            {/* Tab Info */}
            {tab === 'info' && (
              <div className="px-4 sm:px-5 pb-6">
                {desc ? (
                  <div>
                    <p className="text-gray-300 text-xs leading-relaxed">{truncated}</p>
                    {desc.length > 300 && (
                      <button onClick={() => setShowFull(v => !v)} className="mt-2 text-pink-400 text-xs hover:underline">
                        {showFull ? 'Voir moins' : 'Lire la suite'}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-600 text-xs">Aucun synopsis disponible</p>
                )}

                {/* Trailer AniList */}
                {ani?.trailer?.site === 'youtube' && (
                  <div className="mt-4">
                    <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Award className="w-3 h-3" />Bande-annonce
                    </p>
                    <a href={`https://www.youtube.com/watch?v=${ani.trailer.id}`} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 text-xs hover:bg-red-600/20 transition-all w-fit">
                      <ExternalLink className="w-3.5 h-3.5" />Voir sur YouTube
                    </a>
                  </div>
                )}

                {/* Source info */}
                <div className="mt-6 pt-4 border-t border-gray-800/60">
                  <p className="text-[10px] text-gray-700 flex items-center gap-1">
                    Données · AniList{ani?.id ? ` #${ani.id}` : ''} · MyAnimeList via Jikan
                  </p>
                </div>
              </div>
            )}

            {/* Tab Épisodes (Jikan) */}
            {tab === 'episodes' && (
              <div className="px-4 sm:px-5 pb-6">
                {jikanEps.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600 text-xs">Aucune donnée d'épisode disponible via MyAnimeList</p>
                    <button onClick={onWatch} className="mt-3 text-pink-400 text-xs hover:underline">
                      → Accéder directement au player
                    </button>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {jikanEps.map(ep => (
                      <button key={ep.mal_id} onClick={onWatch}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e]/60 hover:bg-pink-900/15 border border-gray-800/60 hover:border-pink-600/30 transition-all text-left group">
                        <div className="w-9 h-9 rounded-lg bg-pink-600/20 border border-pink-600/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-pink-400 text-[10px] font-bold">{ep.mal_id}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate group-hover:text-pink-300 transition-colors">
                            {ep.title || ep.title_romanji || `Épisode ${ep.mal_id}`}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {ep.aired && <span className="text-gray-600 text-[10px]">{ep.aired.slice(0, 10)}</span>}
                            {ep.filler && <span className="text-yellow-600 text-[9px] bg-yellow-600/10 px-1.5 rounded-full">Filler</span>}
                            {ep.recap && <span className="text-blue-600 text-[9px] bg-blue-600/10 px-1.5 rounded-full">Récap</span>}
                          </div>
                        </div>
                        <Play className="w-3.5 h-3.5 text-gray-600 group-hover:text-pink-400 transition-colors flex-shrink-0" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  )
}

// ── Séries : Sélecteur saison/épisode ────────────────────────────────────────
function SeriesPlayerModal({ item, onClose }: {
  item: Content; onClose: () => void
}) {
  const tmdbId = (item as any).tmdb_id
  const [seasons,       setSeasons]       = useState<any[]>([])
  const [activeSeason,  setActiveSeason]  = useState(1)
  const [episodes,      setEpisodes]      = useState<any[]>([])
  const [activeEp,      setActiveEp]      = useState<any>(null)
  const [loadingS,      setLoadingS]      = useState(false)
  const [loadingEp,     setLoadingEp]     = useState(false)
  const [playerOpen,    setPlayerOpen]    = useState(false)
  const [iframeKey,     setIframeKey]     = useState(0)
  const [loadingPlayer, setLoadingPlayer] = useState(true)
  const [open,          setOpen]          = useState(false)
  const [activeLink,    setActiveLink]    = useState<ContentLink>(item.links[0])
  const containerRef = useRef<HTMLDivElement>(null)
  const token = localStorage.getItem('token')

  useEffect(() => {
    if (!tmdbId) return
    setLoadingS(true)
    fetch(`/api/tmdb/tv/${tmdbId}/seasons`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => {
        setSeasons(d.seasons || [])
        setActiveSeason(d.seasons?.[0]?.season_number || 1)
      })
      .catch(() => {})
      .finally(() => setLoadingS(false))
  }, [tmdbId])

  useEffect(() => {
    if (!tmdbId) return
    setLoadingEp(true); setEpisodes([]); setActiveEp(null)
    fetch(`/api/tmdb/tv/${tmdbId}/season/${activeSeason}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(d => setEpisodes(d.episodes || []))
      .catch(() => {})
      .finally(() => setLoadingEp(false))
  }, [tmdbId, activeSeason])

  const buildUrl = (link: ContentLink, season: number, ep: number) => {
    const h = link.hoster
    // ── Auto-embed (TMDB ID) ──────────────────────────────────────────────────
    if (h === 'autoembed')  return `https://player.autoembed.cc/embed/tv/${tmdbId}/${season}/${ep}`
    if (h === 'vidsrc')     return `https://vidsrc.cc/embed/tv/${tmdbId}/${season}/${ep}`
    if (h === 'vidsrcme')   return `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=${season}&episode=${ep}`
    if (h === 'videasy')    return `https://player.videasy.net/tv/${tmdbId}/${season}/${ep}`
    if (h === 'twoembed')   return `https://www.2embed.cc/embed/tmdb/tv/${tmdbId}/${season}/${ep}`
    if (h === 'frembed')    return `https://frembed.work/api/serie.php?id=${tmdbId}&sa=${season}&epi=${ep}`
    if (h === 'multiembed') return `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${ep}`
    if (h === 'superembed') return `https://getsuperembed.link/?video_id=${tmdbId}&tmdb=1&s=${season}&e=${ep}`
    if (h === 'embedsu')    return `https://embed.su/embed/tv/${tmdbId}/${season}/${ep}`
    // ── Lecteurs animés (URL manuelle) ────────────────────────────────────────
    // hikari, animesama, voiranime, ninesama, aniwatch → URL stockée directement
    return link.url
  }

  // Hosters qui bloquent l'iframe → ouvrir dans un onglet
  const IFRAME_BLOCKED_HOSTERS = new Set(['hikari','animesama','voiranime','ninesama','aniwatch'])
  const isBlocked = (h: string) => IFRAME_BLOCKED_HOSTERS.has(h)

  const playEpisode = (ep: any) => {
    setActiveEp(ep); setPlayerOpen(true); setLoadingPlayer(true); setIframeKey(k => k + 1)
  }

  const nextEpisode = () => {
    const idx = episodes.findIndex(e => e.episode_number === activeEp?.episode_number)
    if (idx < episodes.length - 1) {
      playEpisode(episodes[idx + 1])
    } else {
      const nextSeason = seasons.find(s => s.season_number === activeSeason + 1)
      if (nextSeason) { setActiveSeason(nextSeason.season_number); setPlayerOpen(false) }
    }
  }

  const goFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {})
    else {
      const fs = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen
      if (fs) fs.call(el).catch(() => {})
    }
  }

  const currentUrl = activeEp && activeLink ? buildUrl(activeLink, activeSeason, activeEp.episode_number) : ''

  const [bannerErr, setBannerErr] = useState(false)

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">

      {/* ── Bannière cinématique (visible quand player inactif) ── */}
      {item.poster_url && !bannerErr && !playerOpen && (
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: '130px' }}>
          <img src={item.poster_url} alt="" onError={() => setBannerErr(true)}
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: 'blur(20px)', transform: 'scale(1.15)', objectPosition: 'center top' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/50 to-black/95" />
          <div className="absolute inset-0 flex items-center gap-4 px-4">
            <img src={item.poster_url} alt="" onError={() => setBannerErr(true)}
              className="w-14 h-20 object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold text-white ${item.content_type === 'anime' ? 'bg-pink-600' : 'bg-purple-600'}`}>
                  {item.content_type === 'anime' ? 'Animé' : 'Série'}
                </span>
                {item.year && <span className="text-gray-400 text-[10px]">{item.year}</span>}
              </div>
              <h2 className="text-white text-base font-bold leading-tight truncate">{item.title}</h2>
              {item.rating && item.rating > 0 && (
                <span className="flex items-center gap-1 mt-1 w-fit px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                  <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                  <span className="text-yellow-400 text-[11px] font-bold">{item.rating.toFixed(1)}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b border-gray-800/60 bg-[#0a0a12]/90 flex-shrink-0">
        {item.poster_url && (
          <img src={item.poster_url} alt="" className="w-7 h-9 object-cover rounded-md flex-shrink-0 hidden sm:block" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xs sm:text-sm font-semibold truncate">{item.title}</h2>
          {activeEp ? (
            <p className="text-gray-500 text-[10px] truncate">
              S{String(activeSeason).padStart(2,'0')}E{String(activeEp.episode_number).padStart(2,'0')} — {activeEp.name}
            </p>
          ) : (
            <p className="text-gray-500 text-[10px]">Choisir un épisode</p>
          )}
        </div>

        {/* Dropdown sources */}
        {item.links.length > 1 && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 text-gray-300 text-[11px] transition-all">
              <div className="w-2 h-2 rounded-full" style={{ background: HOSTER_COLORS[activeLink.hoster] || '#6b7280' }} />
              <span>{HOSTER_LABEL[activeLink.hoster] || activeLink.hoster}</span>
              <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-gray-700/60 rounded-xl shadow-2xl z-20 overflow-hidden">
                {item.links.map(l => (
                  <button key={l.id} onClick={() => { setActiveLink(l); setOpen(false); if (activeEp) { setIframeKey(k => k+1); setLoadingPlayer(true) } }}
                    className={`w-full flex items-center gap-2 px-3 py-2.5 hover:bg-teal-600/10 transition-colors ${l.id===activeLink.id?'bg-teal-600/15':''}`}>
                    <div className="w-5 h-5 rounded text-[9px] font-bold text-white flex items-center justify-center"
                         style={{ background: HOSTER_COLORS[l.hoster] || '#6b7280' }}>
                      {(l.hoster[0]||'?').toUpperCase()}
                    </div>
                    <span className={`text-xs ${l.id===activeLink.id?'text-teal-400':'text-white'}`}>{HOSTER_LABEL[l.hoster]||l.hoster}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {playerOpen && activeEp && (
          <button onClick={nextEpisode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 text-teal-400 text-[11px] font-semibold transition-all flex-shrink-0">
            Ep. suivant <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
        {playerOpen && (
          <button onClick={goFullscreen}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-teal-600/20 text-gray-500 hover:text-teal-400 transition-all flex-shrink-0">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
        {playerOpen && (
          <button onClick={() => setPlayerOpen(false)}
            className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-all flex-shrink-0"
            title="Retour aux épisodes">
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        <button onClick={onClose}
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-red-600/20 hover:border-red-600/40 text-gray-500 hover:text-red-400 transition-all flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Player actif */}
      {playerOpen && activeEp && (
        <div ref={containerRef} className="flex-1 bg-black relative" onClick={() => setOpen(false)}>

          {/* Lecteur natif MP4/MKV */}
          {isDirectVideo(currentUrl) ? (
            <video
              key={iframeKey}
              src={currentUrl}
              controls autoPlay
              className="absolute inset-0 w-full h-full bg-black"
              onLoadedData={() => setLoadingPlayer(false)}
              style={{ outline: 'none' }}
            />
          ) : IFRAME_BLOCKED.has(activeLink.hoster) ? (
            /* Iframe bloquée (AnimeSama, Hikari…) */
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 p-6 text-center">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center">
                <ExternalLink className="w-5 h-5 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-semibold mb-1">{HOSTER_LABEL[activeLink.hoster] || activeLink.hoster}</p>
                <p className="text-gray-500 text-xs">Ce site bloque l'intégration. Ouvre dans un onglet.</p>
              </div>
              <button onClick={() => window.open(currentUrl, '_blank', 'noopener')}
                className="flex items-center gap-2 px-5 py-2.5 bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30 rounded-xl text-orange-400 font-semibold text-sm transition-all">
                <ExternalLink className="w-4 h-4" />Ouvrir l'épisode
              </button>
            </div>
          ) : (
            /* Iframe normale */
            <>
              {loadingPlayer && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 rounded-full border-2 border-teal-900 border-t-teal-400 animate-spin"/>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-teal-400"/>
                    </div>
                  </div>
                  <p className="text-gray-500 text-sm">Chargement de l'épisode…</p>
                  <p className="text-gray-700 text-[10px]">Si la vidéo ne charge pas, essayez une autre source</p>
                </div>
              )}
              <iframe key={iframeKey}
                src={currentUrl + (currentUrl.includes('?') ? '&' : '?') + 'autoplay=1'}
                className="absolute inset-0 w-full h-full border-none" allowFullScreen
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write; accelerometer; gyroscope"
                referrerPolicy="no-referrer-when-downgrade"
                loading="eager"
                onLoad={() => setLoadingPlayer(false)} />
            </>
          )}
        </div>
      )}

      {/* Sélecteur saisons + épisodes */}
      {!playerOpen && (
        <div className="flex-1 overflow-y-auto bg-[#0a0a12]">
          {loadingS ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-teal-400 animate-spin"/></div>
          ) : (
            <>
              {/* Saisons */}
              <div className="flex gap-2 p-4 overflow-x-auto border-b border-gray-800/60 flex-shrink-0" style={{ scrollbarWidth: 'none' }}>
                {seasons.map(s => (
                  <button key={s.season_number} onClick={() => setActiveSeason(s.season_number)}
                    className={`flex-shrink-0 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                      activeSeason === s.season_number
                        ? 'bg-teal-600/20 border-teal-600/50 text-teal-400'
                        : 'bg-gray-800/40 border-gray-700/40 text-gray-500 hover:text-gray-300'
                    }`}>
                    {s.name}
                    <span className="ml-1.5 text-[10px] opacity-60">{s.episode_count} ep.</span>
                  </button>
                ))}
                {seasons.length === 0 && !loadingS && (
                  <p className="text-gray-600 text-xs py-1">Aucune saison trouvée — vérifiez le TMDB ID</p>
                )}
              </div>

              {/* Épisodes */}
              {loadingEp ? (
                <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 text-teal-400 animate-spin"/></div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
                  {episodes.map(ep => (
                    <button key={ep.episode_number} onClick={() => playEpisode(ep)}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#1a1a2e]/60 hover:bg-teal-900/20 border border-gray-800/60 hover:border-teal-600/40 transition-all text-left group">
                      {ep.still_url
                        ? <img src={ep.still_url} alt="" className="w-24 h-14 object-cover rounded-lg flex-shrink-0 border border-white/10"/>
                        : <div className="w-24 h-14 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center">
                            <Play className="w-5 h-5 text-gray-600"/>
                          </div>
                      }
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-teal-500 text-[10px] font-bold flex-shrink-0">
                            E{String(ep.episode_number).padStart(2,'0')}
                          </span>
                          <p className="text-white text-xs font-medium truncate group-hover:text-teal-300 transition-colors">{ep.name}</p>
                        </div>
                        {ep.overview && <p className="text-gray-600 text-[10px] mt-0.5 line-clamp-2">{ep.overview}</p>}
                        <div className="flex items-center gap-2 mt-1">
                          {ep.runtime > 0 && <span className="text-gray-600 text-[10px]">{ep.runtime} min</span>}
                          {ep.rating > 0 && <span className="text-yellow-500 text-[10px]">★ {ep.rating}</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Player Modal (Films) ──────────────────────────────────────────────────────
function PlayerModal({ item, initialLink, onClose }: {
  item: Content; initialLink: ContentLink; onClose: () => void
}) {
  const [activeLink, setActiveLink] = useState<ContentLink>(initialLink)
  const [iframeKey, setIframeKey]   = useState(0)
  const [loading, setLoading]       = useState(true)
  const [open, setOpen]             = useState(false)
  const [imgErr, setImgErr]         = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef    = useRef<HTMLIFrameElement>(null)

  const embedUrl     = getEmbedUrl(activeLink.hoster, activeLink.url)
  const videoUrl     = activeLink.hoster === 'direct' ? activeLink.url
                     : isDirectVideo(activeLink.url) ? activeLink.url : null
  const isBlocked    = IFRAME_BLOCKED.has(activeLink.hoster)
  const openExternal = () => window.open(activeLink.url, '_blank', 'noopener')

  const changeSource = (l: ContentLink) => {
    setActiveLink(l); setLoading(true); setIframeKey(k => k + 1); setOpen(false)
  }

  const goFullscreen = () => {
    const el = containerRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      const fs = (el as any).requestFullscreen
        || (el as any).webkitRequestFullscreen
        || (el as any).mozRequestFullScreen
        || (el as any).msRequestFullscreen
      if (fs) fs.call(el).catch(() => {})
    }
  }

  return (
    <div className="fixed inset-0 bg-black/95 z-50 flex flex-col">

      {/* ── Bannière cinématique ── */}
      {item.poster_url && !imgErr && (
        <div className="relative flex-shrink-0 overflow-hidden" style={{ height: loading ? '140px' : '0px', transition: 'height 0.4s ease' }}>
          {/* Poster flouté en fond */}
          <img src={item.poster_url} alt="" onError={() => setImgErr(true)}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: 'blur(18px)', transform: 'scale(1.15)' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/40 to-black/95" />
          {/* Contenu centré */}
          <div className="absolute inset-0 flex items-center gap-4 px-5">
            <img src={item.poster_url} alt="" onError={() => setImgErr(true)}
              className="w-16 h-24 object-cover rounded-xl shadow-2xl border border-white/10 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h2 className="text-white text-lg font-bold leading-tight truncate">{item.title}</h2>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {item.year && <span className="text-gray-300 text-xs">{item.year}</span>}
                {item.rating && item.rating > 0 && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30">
                    <Star className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400" />
                    <span className="text-yellow-400 text-[11px] font-bold">{item.rating.toFixed(1)}</span>
                  </span>
                )}
                {item.genre && <span className="text-gray-400 text-[11px]">{item.genre}</span>}
              </div>
              {item.overview && <p className="text-gray-400 text-[10px] mt-1 line-clamp-1">{item.overview}</p>}
            </div>
          </div>
        </div>
      )}

      {/* ── Header contrôles ── */}
      <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 border-b border-gray-800/60 bg-[#0a0a12]/90 flex-shrink-0">
        {item.poster_url && !imgErr && (
          <img src={item.poster_url} alt="" onError={() => setImgErr(true)}
            className="w-7 h-9 object-cover rounded-md flex-shrink-0 hidden sm:block" />
        )}
        <div className="flex-1 min-w-0">
          <h2 className="text-white text-xs sm:text-sm font-semibold truncate">{item.title}</h2>
          <div className="flex items-center gap-1.5">
            {item.year && <span className="text-gray-500 text-[10px]">{item.year}</span>}
            {item.rating && item.rating > 0 && (
              <span className="flex items-center gap-0.5">
                <Star className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                <span className="text-yellow-400 text-[10px]">{item.rating.toFixed(1)}</span>
              </span>
            )}
          </div>
        </div>
        {item.links.length > 0 && (
          <div className="relative flex-shrink-0">
            <button onClick={() => setOpen(!open)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/60 border border-gray-700/50 hover:border-teal-600/50 text-gray-300 text-[11px] transition-all min-w-[100px] justify-between">
              <span className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: HOSTER_COLORS[activeLink.hoster] || '#6b7280' }} />
                <span className="truncate max-w-[70px]">{HOSTER_LABEL[activeLink.hoster] || activeLink.hoster}</span>
              </span>
              <ChevronDown className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>
            {open && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-[#1a1a2e] border border-gray-700/60 rounded-xl shadow-2xl z-20 overflow-hidden">
                {item.links.map(l => {
                  const hasEmbed = !!getEmbedUrl(l.hoster, l.url)
                  return (
                    <button key={l.id} onClick={() => changeSource(l)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-teal-600/10 transition-colors ${l.id === activeLink.id ? 'bg-teal-600/15' : ''}`}>
                      <div className="w-6 h-6 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold text-white"
                           style={{ background: HOSTER_COLORS[l.hoster] || '#6b7280' }}>
                        {(l.hoster[0] || '?').toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium ${l.id === activeLink.id ? 'text-teal-400' : 'text-white'}`}>{HOSTER_LABEL[l.hoster] || l.hoster}</p>
                        <p className="text-[9px]">
                          <span className="text-gray-500">{l.quality}</span>
                          {' · '}
                          {hasEmbed ? <span className="text-teal-500">● Intégré</span> : <span className="text-orange-400">↗ Externe</span>}
                        </p>
                      </div>
                      {l.id === activeLink.id && <div className="w-1.5 h-1.5 rounded-full bg-teal-400 flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <button onClick={goFullscreen} title="Plein écran"
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-teal-600/20 hover:border-teal-600/40 text-gray-500 hover:text-teal-400 transition-all flex-shrink-0">
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button onClick={openExternal} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-gray-700 text-gray-500 hover:text-gray-300 transition-all flex-shrink-0">
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-red-600/20 hover:border-red-600/40 text-gray-500 hover:text-red-400 transition-all flex-shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div ref={containerRef} className="flex-1 bg-black relative" onClick={() => setOpen(false)}>

        {/* ── Cas 1 : Lecteur natif HTML5 (MP4/MKV direct) ── */}
        {videoUrl ? (
          <video
            key={`${iframeKey}-${videoUrl}`}
            src={videoUrl}
            controls
            autoPlay
            className="absolute inset-0 w-full h-full bg-black"
            onLoadedData={() => setLoading(false)}
            onError={() => setLoading(false)}
            style={{ outline: 'none' }}
          >
            Votre navigateur ne supporte pas la lecture vidéo.
          </video>
        ) : isBlocked ? (
          /* ── Cas 2 : Iframe bloquée (AnimeSama, Hikari…) ── */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            {item.poster_url && !imgErr && (
              <img src={item.poster_url} alt="" onError={() => setImgErr(true)}
                className="w-20 h-28 object-cover rounded-xl opacity-30 shadow-2xl" />
            )}
            <div className="max-w-sm">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center mx-auto mb-3">
                <ExternalLink className="w-5 h-5 text-orange-400" />
              </div>
              <p className="text-white font-semibold text-base mb-2">{HOSTER_LABEL[activeLink.hoster] || activeLink.hoster}</p>
              <p className="text-gray-500 text-xs mb-1">Ce site bloque l'intégration en iframe.</p>
              <p className="text-gray-600 text-[11px]">Clique sur le bouton pour regarder dans un nouvel onglet.</p>
            </div>
            <button onClick={openExternal}
              className="flex items-center gap-2 px-6 py-3 bg-orange-500/20 border border-orange-500/40 hover:bg-orange-500/30 rounded-2xl text-orange-400 font-semibold transition-all hover:scale-105">
              <ExternalLink className="w-4 h-4" />Ouvrir {HOSTER_LABEL[activeLink.hoster] || activeLink.hoster}
            </button>
          </div>
        ) : embedUrl ? (
          /* ── Cas 3 : Iframe normale ── */
          <>
            {loading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-10 gap-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-full border-2 border-teal-900 border-t-teal-400 animate-spin"/>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-2 h-2 rounded-full bg-teal-400"/>
                  </div>
                </div>
                <p className="text-gray-500 text-sm">{HOSTER_LABEL[activeLink.hoster] || activeLink.hoster} — chargement…</p>
                <p className="text-gray-700 text-[10px]">Si la vidéo ne charge pas, essayez une autre source</p>
              </div>
            )}
            <iframe ref={iframeRef} key={`${iframeKey}-${embedUrl}`}
              src={embedUrl + (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1'}
              className="absolute inset-0 w-full h-full border-none" allowFullScreen
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write; accelerometer; gyroscope"
              referrerPolicy="no-referrer-when-downgrade"
              loading="eager"
              onLoad={() => setLoading(false)} />
          </>
        ) : (
          /* ── Cas 4 : Externe générique ── */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 p-6 text-center">
            {item.poster_url && !imgErr && (
              <img src={item.poster_url} alt="" onError={() => setImgErr(true)}
                className="w-24 h-36 object-cover rounded-xl opacity-40 shadow-2xl" />
            )}
            <div>
              <p className="text-white font-semibold text-base mb-2">Lecture externe</p>
              <p className="text-gray-500 text-sm max-w-xs">{HOSTER_LABEL[activeLink.hoster]} ne supporte pas la lecture intégrée.</p>
            </div>
            <button onClick={openExternal}
              className="flex items-center gap-2 px-6 py-3 bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 rounded-2xl text-teal-400 font-medium transition-all hover:scale-105">
              <Play className="w-4 h-4 fill-teal-400" />Regarder sur {HOSTER_LABEL[activeLink.hoster]}
            </button>
          </div>
        )}
      </div>
      {item.overview && (
        <div className="px-4 py-2 border-t border-gray-800/60 bg-[#0a0a12]/60 flex-shrink-0">
          <p className="text-gray-500 text-[11px] line-clamp-1">{item.overview}</p>
        </div>
      )}
    </div>
  )
}

// ── Carte contenu ─────────────────────────────────────────────────────────────
function ContentCard({ item, isAdmin, onPlay, onEdit, onDelete }: {
  item: Content; isAdmin: boolean
  onPlay: (c: Content, l: ContentLink) => void
  onEdit: (c: Content) => void
  onDelete: (id: number) => void
}) {
  const [imgErr, setImgErr]       = useState(false)
  const [preloaded, setPreloaded] = useState(false)
  const bestLink = item.links.find(l => getEmbedUrl(l.hoster, l.url)) || item.links[0]
  const typeBg    = item.content_type==='serie'?'bg-purple-600/80':item.content_type==='anime'?'bg-pink-600/80':'bg-blue-600/80'
  const typeLabel = item.content_type==='serie'?'Série':item.content_type==='anime'?'Animé':'Film'
  const preloadUrl = bestLink ? getEmbedUrl(bestLink.hoster, bestLink.url) : null

  return (
    <div
      className="bg-[#11101e] border border-gray-800/60 rounded-xl sm:rounded-2xl overflow-hidden hover:border-teal-600/40 hover:shadow-xl hover:shadow-teal-950/20 transition-all duration-300 group flex flex-col"
      onMouseEnter={() => { if (!preloaded && preloadUrl) setPreloaded(true) }}
    >
      {/* Iframe préchargé caché */}
      {preloaded && preloadUrl && (
        <iframe src={preloadUrl} className="hidden" style={{ display: 'none' }}
          allow="autoplay; fullscreen; encrypted-media"
          referrerPolicy="no-referrer-when-downgrade" />
      )}
      <div className="relative w-full aspect-[2/3] bg-gradient-to-br from-[#1a1a2e] to-[#0a0a12] overflow-hidden cursor-pointer"
           onClick={() => bestLink && onPlay(item, bestLink)}>
        {item.poster_url && !imgErr
          ? <img src={item.poster_url} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" onError={() => setImgErr(true)} />
          : <div className="w-full h-full flex flex-col items-center justify-center gap-2">
              {item.content_type==='anime'?<Sparkles className="w-10 h-10 text-gray-700"/>:item.content_type==='serie'?<Tv className="w-10 h-10 text-gray-700"/>:<Film className="w-10 h-10 text-gray-700"/>}
              <p className="text-gray-600 text-[9px] text-center px-3">{item.title}</p>
            </div>
        }
        <div className="absolute inset-0 bg-gradient-to-t from-[#11101e] via-[#11101e]/10 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-teal-500/90 backdrop-blur-sm flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform duration-300">
            {item.content_type === 'serie' || item.content_type === 'anime'
              ? <Tv className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              : <Play className="w-5 h-5 sm:w-6 sm:h-6 text-white fill-white ml-0.5" />
            }
          </div>
        </div>
        <div className="absolute top-2 left-2">
          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${typeBg} text-white`}>{typeLabel}</span>
        </div>
        {isAdmin && (
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button onClick={e => { e.stopPropagation(); onEdit(item) }}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-blue-600/90 text-white shadow-lg hover:bg-blue-500">
              <Edit2 className="w-3 h-3" />
            </button>
            <button onClick={e => { e.stopPropagation(); onDelete(item.id) }}
              className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-600/90 text-white shadow-lg hover:bg-red-500">
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="absolute bottom-2 left-2 flex gap-1">
          {item.year && <span className="text-[9px] text-gray-200 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">{item.year}</span>}
          <span className="text-[9px] text-gray-200 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded flex items-center gap-0.5">
            <Eye className="w-2 h-2" />{item.view_count}
          </span>
        </div>
      </div>
      <div className="p-2.5 sm:p-3 flex flex-col gap-1 sm:gap-1.5 flex-1">
        <h3 className="text-white font-semibold text-[11px] sm:text-xs leading-snug line-clamp-2">{item.title}</h3>
        {item.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {item.tags.slice(0,2).map(t => (
              <span key={t} className="text-[8px] sm:text-[9px] px-1.5 py-0.5 bg-teal-900/30 border border-teal-700/30 text-teal-300 rounded-full">{t}</span>
            ))}
            {item.tags.length > 2 && <span className="text-[8px] px-1.5 py-0.5 bg-gray-800/60 text-gray-500 rounded-full">+{item.tags.length-2}</span>}
          </div>
        )}
        {item.rating !== null && item.rating > 0 && <Stars r={item.rating} />}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex gap-0.5 sm:gap-1">
            {item.links.slice(0,4).map(l => (
              <div key={l.id} title={HOSTER_LABEL[l.hoster]||l.hoster}
                className={`w-4 h-4 sm:w-5 sm:h-5 rounded flex items-center justify-center text-[7px] sm:text-[8px] font-bold text-white ${!!getEmbedUrl(l.hoster,l.url)?'ring-1 ring-teal-400/60':'opacity-60'}`}
                style={{ background: HOSTER_COLORS[l.hoster]||'#6b7280' }}>
                {(l.hoster[0]||'?').toUpperCase()}
              </div>
            ))}
          </div>
          {bestLink && (
            <button onClick={() => onPlay(item, bestLink)}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 sm:py-1.5 rounded-lg bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 text-teal-400 text-[9px] sm:text-[10px] font-medium transition-all">
              <Play className="w-2.5 h-2.5 fill-teal-400" /><span className="hidden sm:inline">Regarder</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Recherche utilisateur (TMDB → player direct) ─────────────────────────────
function UserSearchModal({ initialQuery = '', contentType: initialType = 'film', onClose, onPlay }: {
  initialQuery?: string
  contentType?: 'film' | 'serie' | 'anime'
  onClose: () => void
  onPlay: (item: Content, link: ContentLink) => void
}) {
  const [query,       setQuery]       = useState(initialQuery)
  const [results,     setResults]     = useState<any[]>([])
  const [loading,     setLoading]     = useState(false)
  const [contentType, setContentType] = useState<'film'|'serie'|'anime'>(initialType)
  const token = localStorage.getItem('token')

  // Lancer la recherche automatiquement si une query est passée
  useEffect(() => {
    if (initialQuery.trim()) doSearch(initialQuery, initialType)
  }, [])

  const doSearch = async (q: string, type: string) => {
    if (!q.trim()) return
    setLoading(true); setResults([])
    try {
      const isTv = type === 'serie' || type === 'anime'
      const res = await fetch(`/api/tmdb/search/${isTv?'tv':'movie'}?q=${encodeURIComponent(q)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setResults((data.results || []).slice(0, 8))
    } catch {}
    finally { setLoading(false) }
  }

  const search = () => doSearch(query, contentType)

  const selectItem = async (r: any) => {
    setLoading(true)
    try {
      const isTv = contentType === 'serie' || contentType === 'anime'
      const res = await fetch(`/api/tmdb/${isTv?'tv':'movie'}/${r.tmdb_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const detail = await res.json()
      const tmdbId = r.tmdb_id

      // Construire un objet Content temporaire avec Frembed + Videasy
      const frembedUrl = isTv
        ? `https://frembed.work/api/serie.php?id=${tmdbId}&sa=1&epi=1`
        : `https://frembed.work/api/film.php?id=${tmdbId}`
      const videasyUrl = isTv
        ? `https://player.videasy.net/tv/${tmdbId}/1/1`
        : `https://player.videasy.net/movie/${tmdbId}`

      const fakeContent: Content = {
        id: -1, title: detail.title || '', year: detail.year || '',
        content_type: contentType, genre: detail.genre || '',
        tags: detail.tags || [], overview: detail.overview || '',
        poster_url: detail.poster_url || null, rating: detail.rating || null,
        quality: '1080p', view_count: 0,
        links: [
          { id: 1, hoster: 'frembed',  url: frembedUrl,  link_type: 'embed', quality: '1080p' },
          { id: 2, hoster: 'videasy',  url: videasyUrl,  link_type: 'embed', quality: '1080p' },
        ],
      }
      ;(fakeContent as any).tmdb_id = tmdbId
      onClose()
      onPlay(fakeContent, fakeContent.links[0])
    } catch {}
    finally { setLoading(false) }
  }

  const typeColors: Record<string, string> = {
    film:  'bg-blue-600/20 border-blue-600/40 text-blue-400',
    serie: 'bg-purple-600/20 border-purple-600/40 text-purple-400',
    anime: 'bg-pink-600/20 border-pink-600/40 text-pink-400',
  }
  const typeLabels: Record<string, string> = { film: '🎬 Film', serie: '📺 Série', anime: '✨ Animé' }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-gray-700/60 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-y-auto max-h-[92vh] shadow-2xl"
           onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 sticky top-0 bg-[#1a1a2e] z-10">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-teal-400" />
            <h2 className="text-sm font-semibold text-white">Rechercher un film ou une série</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Type */}
          <div className="flex gap-2">
            {(['film','serie','anime'] as const).map(v => (
              <button key={v} onClick={() => { setContentType(v); setResults([]); if (query.trim()) doSearch(query, v) }}
                className={`flex-1 py-2 rounded-xl border text-xs font-semibold transition-all ${contentType===v ? typeColors[v] : 'bg-gray-800/30 border-gray-700/40 text-gray-500 hover:text-gray-300'}`}>
                {typeLabels[v]}
              </button>
            ))}
          </div>

          {/* Barre de recherche */}
          <div className="flex gap-2">
            <input
              className="flex-1 px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all"
              placeholder={contentType === 'film' ? 'Ex: Inception, Interstellar…' : 'Ex: Breaking Bad, Death Note…'}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              autoFocus
            />
            <button onClick={search} disabled={loading || !query.trim()}
              className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-all flex-shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
            </button>
          </div>

          {/* Résultats */}
          {results.length > 0 && (
            <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{results.length} résultats</p>
              {results.map((r: any) => (
                <button key={r.tmdb_id} onClick={() => selectItem(r)} disabled={loading}
                  className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0d0d1a] hover:bg-teal-900/20 border border-gray-800 hover:border-teal-600/50 transition-all text-left group disabled:opacity-50">
                  {r.poster_url
                    ? <img src={r.poster_url} alt={r.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0 border border-white/10 shadow-md"/>
                    : <div className="w-12 h-16 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center text-gray-600 text-lg">?</div>
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold truncate group-hover:text-teal-300 transition-colors">{r.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {r.year && <span className="text-gray-500 text-xs">{r.year}</span>}
                      {r.genre && <span className="text-gray-600 text-[10px]">{r.genre.split(',')[0]}</span>}
                      {r.rating > 0 && <span className="text-yellow-400 text-[10px]">★ {r.rating}</span>}
                    </div>
                    {r.overview && <p className="text-gray-600 text-[10px] mt-1 line-clamp-2">{r.overview}</p>}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-600/20 border border-blue-600/30 text-blue-400 font-semibold">Frembed 🇫🇷</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-yellow-600/20 border border-yellow-600/30 text-yellow-400 font-semibold">Videasy</span>
                    </div>
                  </div>
                  <Play className="w-4 h-4 text-teal-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Formulaire ajout/édition ──────────────────────────────────────────────────
interface FormData {
  title: string; year: string; content_type: string; genre: string
  tags: string[]; overview: string; poster_url: string; rating: string; quality: string
}
type FormLink = { url: string; hoster: string; quality: string }

function ContentForm({ initial, onClose, onSaved }: {
  initial?: Content; onClose: () => void; onSaved: () => void
}) {
  const isEdit = !!initial
  const [step, setStep] = useState<1|2>(isEdit ? 2 : 1)

  const emptyForm: FormData = {
    title: '', year: '', content_type: initial?.content_type||'film', genre: '',
    tags: [], overview: '', poster_url: '', rating: '', quality: '1080p',
  }
  const [form, setForm] = useState<FormData>(initial ? {
    title: initial.title, year: initial.year, content_type: initial.content_type,
    genre: initial.genre, tags: initial.tags, overview: initial.overview,
    poster_url: initial.poster_url||'', rating: initial.rating?.toString()||'',
    quality: initial.quality,
  } : emptyForm)
  const [tmdbId, setTmdbId]   = useState<number|null>((initial as any)?.tmdb_id || null)
  const [links, setLinks]     = useState<FormLink[]>(
    initial?.links?.length
      ? initial.links.map(l => ({ url: l.url, hoster: l.hoster, quality: l.quality||'1080p' }))
      : [{ url: '', hoster: 'vidoza', quality: '1080p' }]
  )
  const [useAutoembed, setUseAutoembed] = useState(false)
  const [tmdbQuery,    setTmdbQuery]    = useState('')
  const [tmdbResults,  setTmdbResults]  = useState<any[]>([])
  const [tmdbLoading,  setTmdbLoading]  = useState(false)
  const [contentType,  setContentType]  = useState<'film'|'serie'|'anime'>(initial?.content_type||'film')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')
  const [successMsg,   setSuccessMsg]   = useState('')
  const [tagInput,     setTagInput]     = useState('')

  const inp = "w-full px-3 py-2 bg-[#0a0a12] border border-gray-700 rounded-lg text-white text-xs placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all"
  const lbl = "block text-[10px] font-medium text-gray-400 mb-1"

  const typeColors: Record<string, string> = {
    film:  'bg-blue-600/20 border-blue-600/40 text-blue-400',
    serie: 'bg-purple-600/20 border-purple-600/40 text-purple-400',
    anime: 'bg-pink-600/20 border-pink-600/40 text-pink-400',
  }
  const typeLabels: Record<string, string> = { film: '🎬 Film', serie: '📺 Série', anime: '✨ Animé' }

  const autoembedUrls: Record<string, string> = tmdbId ? {
    autoembed:  contentType === 'film' ? `https://player.autoembed.cc/embed/movie/${tmdbId}` : `https://player.autoembed.cc/embed/tv/${tmdbId}/1/1`,
    vidsrc:     contentType === 'film' ? `https://vidsrc.cc/embed/movie/${tmdbId}`            : `https://vidsrc.cc/embed/tv/${tmdbId}/1/1`,
    vidsrcme:   contentType === 'film' ? `https://vidsrc.me/embed/movie?tmdb=${tmdbId}`       : `https://vidsrc.me/embed/tv?tmdb=${tmdbId}&season=1&episode=1`,
    videasy:    contentType === 'film' ? `https://player.videasy.net/movie/${tmdbId}`         : `https://player.videasy.net/tv/${tmdbId}/1/1`,
    twoembed:   contentType === 'film' ? `https://www.2embed.cc/embed/tmdb/movie/${tmdbId}`   : `https://www.2embed.cc/embed/tmdb/tv/${tmdbId}/1/1`,
    frembed:    contentType === 'film' ? `https://frembed.work/api/film.php?id=${tmdbId}` : `https://frembed.work/api/serie.php?id=${tmdbId}&sa=1&epi=1`,
    multiembed: contentType === 'film' ? `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1` : `https://multiembed.mov/?video_id=${tmdbId}&tmdb=1&s=1&e=1`,
    superembed: contentType === 'film' ? `https://getsuperembed.link/?video_id=${tmdbId}&tmdb=1` : `https://getsuperembed.link/?video_id=${tmdbId}&tmdb=1&s=1&e=1`,
  } : {}
  const autoembedUrl = autoembedUrls['autoembed'] || ''

  const searchTmdb = async () => {
    if (!tmdbQuery.trim()) return
    setTmdbLoading(true); setTmdbResults([])
    try {
      const isTv = contentType === 'serie' || contentType === 'anime'
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tmdb/search/${isTv?'tv':'movie'}?q=${encodeURIComponent(tmdbQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      setTmdbResults((data.results || []).slice(0, 8))
    } catch {}
    finally { setTmdbLoading(false) }
  }

  const selectTmdb = async (item: any) => {
    setTmdbLoading(true)
    try {
      const isTv = contentType === 'serie' || contentType === 'anime'
      const token = localStorage.getItem('token')
      const res = await fetch(`/api/tmdb/${isTv?'tv':'movie'}/${item.tmdb_id}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const detail = await res.json()
      setTmdbId(item.tmdb_id)
      setForm({
        title: detail.title || '', year: detail.year || '',
        genre: detail.genre || '', overview: detail.overview || '',
        poster_url: detail.poster_url || '', rating: detail.rating?.toString() || '',
        content_type: contentType, tags: detail.tags || [], quality: '1080p',
      })
      setTmdbResults([]); setTmdbQuery(''); setStep(2)
    } catch {}
    finally { setTmdbLoading(false) }
  }

  const addTag = (t: string) => {
    const clean = t.trim()
    if (clean && !form.tags.includes(clean)) setForm(p => ({ ...p, tags: [...p.tags, clean] }))
    setTagInput('')
  }

  const submit = async () => {
    if (!form.title) { setError('Le titre est requis.'); return }
    setSaving(true); setError('')
    try {
      const selectedService = (form as any)._autoService || 'autoembed'
      const selectedUrl = autoembedUrls[selectedService] || autoembedUrl
      const finalLinks = useAutoembed && selectedUrl
        ? [{ url: selectedUrl, hoster: selectedService, quality: form.quality }]
        : links.filter(l => l.url.trim()).map(l => ({ ...l, url: getStorageUrl(l.url) }))

      const payload = {
        ...form, tmdb_id: tmdbId,
        rating: form.rating ? parseFloat(form.rating) : null,
        links: finalLinks,
      }
      if (isEdit) {
        await api('PUT', `/direct/${initial!.id}`, payload)
        await onSaved(); onClose()
      } else {
        await api('POST', '/direct', payload)
        await onSaved()
        setForm({ ...emptyForm }); setLinks([{ url: '', hoster: 'vidoza', quality: '1080p' }])
        setTmdbId(null); setTagInput(''); setTmdbQuery(''); setTmdbResults([])
        setUseAutoembed(false); setStep(1)
        setSuccessMsg(`✓ "${payload.title}" ajouté !`)
        setTimeout(() => setSuccessMsg(''), 4000)
      }
    } catch (e: any) { setError(e.message) }
    finally { setSaving(false) }
  }

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="bg-[#1a1a2e] border border-gray-700/60 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg overflow-y-auto max-h-[92vh] shadow-2xl"
           onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-700/50 sticky top-0 bg-[#1a1a2e] z-10">
          <div className="flex items-center gap-2">
            {!isEdit && step === 2 && (
              <button onClick={() => { setStep(1); setTmdbResults([]) }}
                className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white/5 text-gray-500 hover:text-white transition-all">
                <ChevronLeft className="w-4 h-4" />
              </button>
            )}
            <h2 className="text-sm font-semibold text-white">
              {isEdit ? `Modifier — ${initial!.title}`
                : step === 1 ? 'Ajouter — Recherche TMDB'
                : `Ajouter — ${form.title}`}
            </h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* ── STEP 1 : Recherche TMDB ── */}
          {step === 1 && (
            <>
              <div>
                <label className={lbl}>Type de contenu</label>
                <div className="flex gap-2">
                  {(['film','serie','anime'] as const).map(v => (
                    <button key={v} onClick={() => setContentType(v)}
                      className={`flex-1 py-2.5 rounded-xl border text-xs font-semibold transition-all ${contentType===v ? typeColors[v] : 'bg-gray-800/30 border-gray-700/40 text-gray-500 hover:text-gray-300'}`}>
                      {typeLabels[v]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Rechercher sur TMDB</label>
                <div className="flex gap-2">
                  <input
                    className="flex-1 px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-xl text-white text-sm placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all"
                    placeholder={contentType === 'film' ? 'Ex: Inception, Interstellar…' : 'Ex: Breaking Bad, Death Note…'}
                    value={tmdbQuery}
                    onChange={e => setTmdbQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && searchTmdb()}
                    autoFocus
                  />
                  <button onClick={searchTmdb} disabled={tmdbLoading || !tmdbQuery.trim()}
                    className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition-all flex-shrink-0">
                    {tmdbLoading ? <Loader2 className="w-4 h-4 animate-spin"/> : <Search className="w-4 h-4"/>}
                    Chercher
                  </button>
                </div>
              </div>
              {tmdbResults.length > 0 && (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{tmdbResults.length} résultats — clique pour sélectionner</p>
                  {tmdbResults.map((r: any) => (
                    <button key={r.tmdb_id} onClick={() => selectTmdb(r)} disabled={tmdbLoading}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-[#0d0d1a] hover:bg-teal-900/20 border border-gray-800 hover:border-teal-600/50 transition-all text-left group disabled:opacity-50">
                      {r.poster_url
                        ? <img src={r.poster_url} alt={r.title} className="w-12 h-16 object-cover rounded-lg flex-shrink-0 border border-white/10 shadow-md"/>
                        : <div className="w-12 h-16 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center text-gray-600 text-lg">?</div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate group-hover:text-teal-300 transition-colors">{r.title}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {r.year && <span className="text-gray-500 text-xs">{r.year}</span>}
                          {r.genre && <span className="text-gray-600 text-[10px]">{r.genre.split(',')[0]}</span>}
                          {r.rating > 0 && <span className="text-yellow-400 text-[10px]">★ {r.rating}</span>}
                        </div>
                        {r.overview && <p className="text-gray-600 text-[10px] mt-1 line-clamp-2">{r.overview}</p>}
                        <p className="text-teal-500 text-[10px] mt-1 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">→ Sélectionner</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gray-800"/>
                <span className="text-gray-600 text-[10px]">ou</span>
                <div className="flex-1 h-px bg-gray-800"/>
              </div>
              <button onClick={() => { setForm(p => ({...p, content_type: contentType})); setStep(2) }}
                className="w-full py-2.5 rounded-xl bg-gray-800/40 border border-gray-700/40 hover:bg-gray-800/60 text-gray-400 text-xs font-medium transition-all">
                Remplir manuellement sans TMDB
              </button>
              {successMsg && (
                <div className="flex items-center gap-2 text-teal-400 text-xs bg-teal-500/10 border border-teal-500/30 rounded-lg px-3 py-2.5">
                  <span>🎬</span><span className="font-medium">{successMsg}</span>
                </div>
              )}
            </>
          )}

          {/* ── STEP 2 : Aperçu + Sources ── */}
          {step === 2 && (
            <>
              {form.poster_url && (
                <div className="flex gap-4 p-3 bg-[#0d0d1a] border border-teal-700/20 rounded-2xl">
                  <img src={form.poster_url} alt={form.title}
                    className="w-16 h-24 object-cover rounded-xl border border-white/10 shadow-lg flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-bold text-sm">{form.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {form.year && <span className="text-gray-400 text-xs">{form.year}</span>}
                      {form.rating && <span className="text-yellow-400 text-xs">★ {form.rating}</span>}
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${typeColors[form.content_type]}`}>
                        {typeLabels[form.content_type]}
                      </span>
                    </div>
                    {form.genre && <p className="text-gray-500 text-[10px] mt-1">{form.genre}</p>}
                    {tmdbId && <p className="text-gray-600 text-[10px] mt-1 font-mono">TMDB ID: {tmdbId}</p>}
                    {form.overview && <p className="text-gray-600 text-[10px] mt-1 line-clamp-2">{form.overview}</p>}
                  </div>
                </div>
              )}

              {!form.poster_url && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className={lbl}>Titre *</label>
                    <input className={inp} placeholder="Inception" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Année</label>
                    <input className={inp} placeholder="2010" value={form.year} onChange={e => setForm(p => ({...p, year: e.target.value}))} />
                  </div>
                  <div>
                    <label className={lbl}>Note (0–10)</label>
                    <input className={inp} placeholder="8.8" type="number" min="0" max="10" step="0.1" value={form.rating} onChange={e => setForm(p => ({...p, rating: e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>URL Poster</label>
                    <input className={inp} placeholder="https://image.tmdb.org/t/p/w500/…" value={form.poster_url} onChange={e => setForm(p => ({...p, poster_url: e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Synopsis</label>
                    <textarea className={`${inp} resize-none`} rows={2} placeholder="Description…" value={form.overview} onChange={e => setForm(p => ({...p, overview: e.target.value}))} />
                  </div>
                  <div className="col-span-2">
                    <label className={lbl}>Genre</label>
                    <input className={inp} placeholder="Action, Thriller…" value={form.genre} onChange={e => setForm(p => ({...p, genre: e.target.value}))} />
                  </div>
                </div>
              )}

              <div className="rounded-2xl overflow-hidden border border-gray-700/50">
                <div className="px-4 py-3 bg-gray-900/60 border-b border-gray-700/50">
                  <p className="text-xs font-semibold text-white mb-3">Source vidéo</p>
                  <div className="space-y-1.5 mb-2">
                    {[
                      { key: 'frembed',    label: 'Frembed 🇫🇷',  desc: 'VF prioritaire · 24k films',    color: '#2563eb' },
                      { key: 'multiembed', label: 'MultiEmbed',   desc: 'Multi-sources · VF disponible', color: '#16a34a' },
                      { key: 'superembed', label: 'SuperEmbed',   desc: 'HLS qualité · Sous-titres VF',  color: '#dc2626' },
                      { key: 'autoembed',  label: 'AutoEmbed',    desc: 'Multi-sources · Sous-titres',   color: '#14b8a6' },
                      { key: 'videasy',    label: 'Videasy',      desc: 'Rapide · Haute qualité',        color: '#f59e0b' },
                      { key: 'vidsrc',     label: 'VidSrc',       desc: 'Fiable · Multi-langues',        color: '#8b5cf6' },
                      { key: 'vidsrcme',   label: 'VidSrc.me',    desc: 'Alternative · Sous-titres',     color: '#6366f1' },
                      { key: 'twoembed',   label: '2Embed',       desc: 'Backup · Gratuit',              color: '#ec4899' },
                    ].map(svc => {
                      const svcUrl = autoembedUrls[svc.key]
                      const isSelected = useAutoembed && (form as any)._autoService === svc.key
                      return (
                        <label key={svc.key} className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-all ${
                          isSelected ? 'bg-teal-900/20 border-teal-600/50' : 'bg-[#0a0a14] border-gray-800 hover:border-gray-600'
                        }`} onClick={() => { setUseAutoembed(true); setForm(p => ({...p, _autoService: svc.key} as any)) }}>
                          <div className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all"
                               style={{ background: isSelected ? svc.color : 'transparent', borderColor: isSelected ? svc.color : '#4b5563' }}>
                            {isSelected && <span className="text-white text-[10px] font-bold">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-white text-xs font-semibold">{svc.label}</p>
                            <p className="text-gray-500 text-[10px]">{svc.desc}</p>
                            {isSelected && svcUrl && <p className="text-teal-400 text-[9px] mt-0.5 font-mono truncate">{svcUrl}</p>}
                            {isSelected && !tmdbId && <p className="text-orange-400 text-[10px] mt-0.5">⚠ Nécessite un film sélectionné via TMDB</p>}
                          </div>
                        </label>
                      )
                    })}
                  </div>
                  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    !useAutoembed ? 'bg-teal-900/20 border-teal-600/50' : 'bg-[#0a0a14] border-gray-800 hover:border-gray-600'
                  }`}>
                    <div className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                      !useAutoembed ? 'bg-teal-500 border-teal-500' : 'border-gray-600'
                    }`}>
                      {!useAutoembed && <span className="text-white text-[10px] font-bold">✓</span>}
                    </div>
                    <input type="checkbox" className="sr-only" checked={!useAutoembed} onChange={e => setUseAutoembed(!e.target.checked)} />
                    <div>
                      <p className="text-white text-xs font-semibold">Lien manuel</p>
                      <p className="text-gray-500 text-[10px] mt-0.5">DoodStream, Vidoza, iframe ou autre hébergeur</p>
                    </div>
                  </label>
                </div>

                {!useAutoembed && (
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">Sources <span className="text-gray-600">({links.length})</span></span>
                      <button onClick={() => setLinks(p => [...p, { url: '', hoster: 'vidoza', quality: '1080p' }])}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 text-teal-400 text-[11px] font-medium transition-all">
                        <Plus className="w-3.5 h-3.5" /> Ajouter une source
                      </button>
                    </div>
                    {links.map((l, i) => {
                      const embedOk = l.url ? getEmbedUrl(l.hoster, l.url) !== null : null
                      return (
                        <div key={i} className="bg-[#0a0a14] border border-gray-700/50 rounded-xl overflow-hidden">
                          <div className="flex items-center gap-2 px-3 py-2.5 bg-gray-900/60 border-b border-gray-700/50">
                            <div className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[8px] font-bold text-white"
                                 style={{ background: HOSTER_COLORS[l.hoster]||'#6b7280' }}>
                              {(l.hoster[0]||'?').toUpperCase()}
                            </div>
                            <span className="text-white text-xs font-medium flex-1">Source {i+1} — {HOSTER_LABEL[l.hoster]||l.hoster}</span>
                            {l.url && embedOk!==null && (
                              <span className={`text-[10px] font-semibold ${embedOk?'text-teal-400':'text-orange-400'}`}>
                                {embedOk?'● Intégré':'↗ Externe'}
                              </span>
                            )}
                            <button onClick={() => setLinks(p => p.filter((_,j) => j!==i))}
                              className="w-6 h-6 flex items-center justify-center rounded-lg bg-red-600/10 border border-red-600/20 hover:bg-red-600/30 text-red-400 transition-all flex-shrink-0">
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                          <div className="p-3 space-y-2.5">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <p className="text-[10px] text-gray-500 mb-1">Hébergeur</p>
                                <select className="w-full px-2.5 py-2 bg-[#0a0a12] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-teal-500 transition-all"
                                  value={l.hoster} onChange={e => setLinks(p => p.map((x,j)=>j===i?{...x,hoster:e.target.value}:x))}>
                                  {HOSTERS_LIST.map(h => <option key={h} value={h}>{HOSTER_LABEL[h]||h}</option>)}
                                </select>
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-500 mb-1">Qualité</p>
                                <select className="w-full px-2.5 py-2 bg-[#0a0a12] border border-gray-700 rounded-lg text-white text-xs focus:outline-none focus:border-teal-500 transition-all"
                                  value={l.quality} onChange={e => setLinks(p => p.map((x,j)=>j===i?{...x,quality:e.target.value}:x))}>
                                  {['4K','1080p','720p','480p','SD'].map(q => <option key={q}>{q}</option>)}
                                </select>
                              </div>
                            </div>
                            {HOSTER_EXAMPLES[l.hoster] && (
                              <div className="bg-black/40 border border-gray-800 rounded-lg p-2">
                                <p className="text-[9px] text-gray-600 mb-0.5">Exemple :</p>
                                <p className="text-[9px] text-gray-500 font-mono break-all select-all">{HOSTER_EXAMPLES[l.hoster]}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-[10px] text-gray-500 mb-1">Code &lt;iframe&gt; ou URL directe</p>
                              <textarea className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-lg text-white text-[11px] font-mono placeholder-gray-700 focus:outline-none focus:border-teal-500 transition-all resize-none"
                                rows={3} placeholder="Ex: https://doodstream.com/e/XXX"
                                value={l.url} onChange={e => setLinks(p => p.map((x,j)=>j===i?{...x,url:e.target.value}:x))} />
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {isEdit && (
                <div>
                  <label className={lbl}>Tags</label>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {form.tags.map(t => (
                      <span key={t} className="flex items-center gap-1 px-2 py-0.5 bg-teal-900/30 border border-teal-700/40 text-teal-300 rounded-full text-[10px]">
                        {t}<button onClick={() => setForm(p => ({...p, tags: p.tags.filter(x=>x!==t)}))}><X className="w-2.5 h-2.5" /></button>
                      </span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <input className={inp} placeholder="Nouveau tag…" value={tagInput} onChange={e => setTagInput(e.target.value)}
                      onKeyDown={e => { if (e.key==='Enter'||e.key===','){e.preventDefault();addTag(tagInput)} }} />
                    <button onClick={() => addTag(tagInput)} disabled={!tagInput.trim()}
                      className="px-3 py-2 rounded-lg bg-teal-600/20 border border-teal-600/40 text-teal-400 text-xs disabled:opacity-50 hover:bg-teal-600/30 transition-all flex-shrink-0">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}

              {error && <p className="text-red-400 text-[11px] bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</p>}

              <button onClick={submit} disabled={saving || !form.title || (useAutoembed && !tmdbId)}
                className="w-full py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2 shadow-lg shadow-teal-900/30">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : isEdit ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                {saving ? 'Enregistrement…' : isEdit ? 'Enregistrer' : `Ajouter "${form.title}"`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
type Section = 'film' | 'serie' | 'anime'

export function TheGoodPlace() {
  const [content, setContent]       = useState<Content[]>([])
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState('')
  const [filter, setFilter]         = useState('')
  const [section, setSection]       = useState<Section>('film')
  const [activeTag, setActiveTag]   = useState('')
  const [player, setPlayer]             = useState<{ item: Content; link: ContentLink } | null>(null)
  const [seriesPlayer, setSeriesPlayer] = useState<Content | null>(null)
  const [animeDetail, setAnimeDetail]   = useState<Content | null>(null)
  const [showForm, setShowForm]         = useState(false)
  const [editTarget, setEditTarget]     = useState<Content | undefined>(undefined)
  const [showUserSearch, setShowUserSearch] = useState(false)

  const isAdmin = (() => {
    try { return !!JSON.parse(localStorage.getItem('user') || '{}').is_admin } catch { return false }
  })()

  const load = async () => {
    setLoading(true); setError('')
    try { setContent((await api<{ content: Content[] }>('GET', '/direct')).content) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }
  useEffect(() => { load() }, [])

  const handlePlay = async (item: Content, link: ContentLink) => {
    await fetch(`${BASE}/direct/${item.id}/view`, { method: 'POST', headers: authH() }).catch(() => {})
    if (item.content_type === 'anime') {
      // Animés → fiche détaillée AniList/Jikan d'abord
      setAnimeDetail(item)
    } else if (item.content_type === 'serie') {
      setSeriesPlayer(item)
    } else {
      setPlayer({ item, link })
      setTimeout(() => {
        const el = document.documentElement
        const fs = (el as any).requestFullscreen || (el as any).webkitRequestFullscreen
        if (fs) fs.call(el).catch(() => {})
      }, 300)
    }
  }

  const handleEdit  = (item: Content) => { setEditTarget(item); setShowForm(true) }
  const handleAdd   = () => { setEditTarget(undefined); setShowForm(true) }
  const handleClose = () => { setShowForm(false); setEditTarget(undefined) }

  const handleDelete = async (id: number) => {
    if (!confirm('Supprimer ce contenu ?')) return
    try { await api('DELETE', `/direct/${id}`); load() }
    catch (e: any) { setError(e.message) }
  }

  const sectionContent   = content.filter(c => c.content_type === section)
  const allTagsInSection = Array.from(new Set(sectionContent.flatMap(c => c.tags))).sort()
  const filtered = sectionContent
    .filter(c => !filter || [c.title,c.genre,c.year].join(' ').toLowerCase().includes(filter.toLowerCase()))
    .filter(c => !activeTag || c.tags.includes(activeTag))

  const LIMIT = 30
  const filteredDisplay = filtered.slice(0, LIMIT)
  const hasMore = filtered.length > LIMIT

  const SECTIONS: { key: Section; label: string; icon: typeof Film; color: string }[] = [
    { key:'film',  label:'Films',  icon:Film,     color:'text-blue-400 border-blue-600/40 bg-blue-600/20'       },
    { key:'serie', label:'Séries', icon:Tv,       color:'text-purple-400 border-purple-600/40 bg-purple-600/20' },
    { key:'anime', label:'Animés', icon:Sparkles, color:'text-pink-400 border-pink-600/40 bg-pink-600/20'       },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f0f1a] to-[#1a1a2e]">
      {/* Player films */}
      {player && (
        <PlayerModal item={player.item} initialLink={player.link}
          onClose={() => {
            setPlayer(null)
            const doc = document as any
            if (doc.fullscreenElement || doc.webkitFullscreenElement) {
              (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(document).catch(() => {})
            }
          }} />
      )}

      {/* Fiche animé */}
      {animeDetail && (
        <AnimeDetailModal
          item={animeDetail}
          onClose={() => setAnimeDetail(null)}
          onWatch={() => { setSeriesPlayer(animeDetail); setAnimeDetail(null) }}
        />
      )}

      {/* Player séries/animés */}
      {seriesPlayer && (
        <SeriesPlayerModal item={seriesPlayer}
          onClose={() => {
            setSeriesPlayer(null)
            const doc = document as any
            if (doc.fullscreenElement || doc.webkitFullscreenElement) {
              (doc.exitFullscreen || doc.webkitExitFullscreen)?.call(document).catch(() => {})
            }
          }} />
      )}

      {showUserSearch && (
        <UserSearchModal initialQuery={filter} contentType={section === 'anime' ? 'anime' : section === 'serie' ? 'serie' : 'film'} onClose={() => setShowUserSearch(false)} onPlay={handlePlay} />
      )}

      {showForm && (
        <ContentForm initial={editTarget} onClose={handleClose} onSaved={load} />
      )}

      <div className="max-w-5xl mx-auto px-3 sm:px-5 py-4 sm:py-5">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div>
            <div className="flex items-center gap-2 sm:gap-2.5 mb-0.5 sm:mb-1">
              <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-gradient-to-br from-teal-500 to-emerald-700 flex items-center justify-center shadow-lg shadow-teal-900/40">
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white fill-white" />
              </div>
              <h1 className="text-xl sm:text-3xl font-bold text-white tracking-tight">The Good Place</h1>
            </div>
            <p className="text-gray-500 text-[10px] sm:text-xs ml-9 sm:ml-11">Films · Séries · Animés</p>
          </div>
          <button onClick={() => setShowUserSearch(true)}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 bg-gray-800/40 border border-gray-700/40 hover:bg-gray-800/60 rounded-xl text-gray-400 hover:text-white text-xs sm:text-sm font-medium transition-all">
            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            <span className="hidden sm:inline">Rechercher</span>
          </button>
        </div>

        {!loading && content.length > 0 && (
          <HeroCarousel items={content} onPlay={handlePlay} />
        )}

        <div className="flex gap-1.5 sm:gap-2 mb-4 sm:mb-5">
          {SECTIONS.map(({ key, label, icon: Icon, color }) => (
            <button key={key} onClick={() => { setSection(key); setActiveTag('') }}
              className={`flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border text-xs sm:text-sm font-medium transition-all duration-200 ${
                section===key ? color : 'border-gray-700/40 bg-gray-800/30 text-gray-500 hover:text-gray-300 hover:border-gray-600'
              }`}>
              <Icon className="w-3.5 h-3.5" />{label}
              <span className={`text-[10px] px-1 rounded ${section===key?'bg-white/20 text-white':'bg-gray-700/50 text-gray-500'}`}>
                {content.filter(c => c.content_type===key).length}
              </span>
            </button>
          ))}
        </div>

        <div className="space-y-2.5 mb-4 sm:mb-5">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none" />
              <input type="text" value={filter} onChange={e => setFilter(e.target.value)} placeholder="Rechercher…"
                className="w-full pl-9 pr-4 py-2.5 bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all" />
            </div>
            {isAdmin && (
              <button onClick={handleAdd}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2.5 bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 rounded-xl text-teal-400 text-xs font-medium transition-all shadow-lg shadow-teal-900/20 flex-shrink-0">
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ajouter</span>
              </button>
            )}
          </div>
          {allTagsInSection.length > 0 && (
            <div className="flex gap-1.5 flex-wrap">
              <button onClick={() => setActiveTag('')}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border transition-all ${!activeTag?'bg-teal-600/20 border-teal-600/40 text-teal-400':'border-gray-700/30 bg-gray-800/30 text-gray-500 hover:text-gray-300'}`}>
                <Tag className="w-2.5 h-2.5" />Tous
              </button>
              {allTagsInSection.map(t => (
                <button key={t} onClick={() => setActiveTag(activeTag===t?'':t)}
                  className={`px-2.5 py-1 rounded-full text-[10px] sm:text-[11px] font-medium border transition-all ${activeTag===t?'bg-teal-600/20 border-teal-600/40 text-teal-400':'border-gray-700/30 bg-gray-800/30 text-gray-500 hover:text-gray-300'}`}>
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>

        {section === 'serie' && (
          <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <div className="flex gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <p className="text-orange-300/80 text-[11px] leading-relaxed">
                Problème technique en cours sur les séries — certains lecteurs peuvent ne pas fonctionner correctement. Merci de votre patience.
              </p>
            </div>
          </div>
        )}
        {error && <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">{error}</div>}

        {loading ? (
          <div className="flex justify-center py-20"><Loader2 className="w-7 h-7 text-teal-400 animate-spin" /></div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            {section==='anime'?<Sparkles className="w-10 h-10 text-gray-700 mx-auto mb-3"/>:section==='serie'?<Tv className="w-10 h-10 text-gray-700 mx-auto mb-3"/>:<Film className="w-10 h-10 text-gray-700 mx-auto mb-3"/>}
            <p className="text-gray-400 text-sm mb-1">{filter||activeTag?'Aucun résultat':`Aucun ${section==='film'?'film':section==='serie'?'série':'animé'} disponible`}</p>
            {filter && (
              <button onClick={() => setShowUserSearch(true)}
                className="mt-4 flex items-center gap-2 mx-auto px-4 py-2.5 bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 rounded-xl text-teal-400 text-xs font-medium transition-all">
                <Search className="w-3.5 h-3.5" />Rechercher "{filter}" sur TMDB
              </button>
            )}
            {isAdmin && !filter && !activeTag && (
              <button onClick={handleAdd}
                className="mt-4 flex items-center gap-1.5 mx-auto px-4 py-2 bg-teal-600/20 border border-teal-600/40 hover:bg-teal-600/30 rounded-xl text-teal-400 text-xs transition-all">
                <Plus className="w-3.5 h-3.5" />Ajouter le premier contenu
              </button>
            )}
          </div>
        ) : (
          <>
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3 sm:mb-4">
              {filteredDisplay.length}{hasMore ? `/${filtered.length}` : ''} {section==='film'?'film':section==='serie'?'série':'animé'}{filtered.length>1?'s':''}
              {activeTag && <span className="ml-1 text-teal-600">· {activeTag}</span>}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4">
              {filteredDisplay.map(c => (
                <ContentCard key={c.id} item={c} isAdmin={isAdmin} onPlay={handlePlay} onEdit={handleEdit} onDelete={handleDelete} />
              ))}
            </div>
            {hasMore && (
              <div className="mt-6 text-center">
                <p className="text-gray-600 text-xs">
                  Affichage limité à {LIMIT} contenus — utilisez la recherche pour trouver un titre précis
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
