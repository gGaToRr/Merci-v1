import { useState, useMemo } from 'react'
import { Video as VideoIcon, Download, Loader2, Music, Link, AlertTriangle, Film } from 'lucide-react'
import { api } from '../api'

// ── Types ─────────────────────────────────────────────────────────────────────
interface VideoFormat {
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
}
interface VideoInfo {
  title: string
  uploader: string
  duration: number
  thumbnail: string
  formats: VideoFormat[]
}

// ── Icônes SVG officielles ────────────────────────────────────────────────────
function IconYouTube({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
    </svg>
  )
}

function IconTikTok({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.75a4.85 4.85 0 0 1-1.01-.06z"/>
    </svg>
  )
}

function IconInstagram({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
    </svg>
  )
}

function IconX({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.737-8.835L1.254 2.25H8.08l4.253 5.622zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  )
}

function IconSoundCloud({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M1.175 12.225c-.015.065-.017.133-.017.2 0 .93.754 1.684 1.684 1.684.93 0 1.683-.754 1.683-1.684 0-.067-.002-.134-.017-.2C4.32 11.362 3.66 10.8 2.86 10.8c-.8 0-1.46.562-1.685 1.425zm3.867-1.226c.128-.307.201-.64.201-.988 0-1.416-1.15-2.565-2.566-2.565-1.417 0-2.566 1.149-2.566 2.565 0 .349.073.681.2.988h4.73zm2.4-1.46c-.22-1.16-1.24-2.04-2.466-2.04-1.38 0-2.5 1.12-2.5 2.5 0 .3.055.587.15.856h4.816zm3.65-1.226c-.38-1.47-1.71-2.564-3.3-2.564-1.89 0-3.42 1.53-3.42 3.42 0 .4.07.784.196 1.14h6.524zm4.1-.8c-.56-2.15-2.52-3.74-4.85-3.74-2.79 0-5.05 2.26-5.05 5.05 0 .5.074.98.208 1.434h9.692zm2.65-.6c-.76-2.75-3.3-4.77-6.33-4.77-3.63 0-6.57 2.94-6.57 6.57 0 .62.086 1.22.244 1.79H21.9c.065-.323.1-.658.1-1 0-3.31-2.25-6.09-5.208-6.59z"/>
    </svg>
  )
}

function IconVimeo({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.977 6.416c-.105 2.338-1.739 5.543-4.894 9.609-3.268 4.247-6.026 6.37-8.29 6.37-1.409 0-2.578-1.294-3.553-3.881L5.322 11.4C4.603 8.816 3.834 7.522 3.01 7.522c-.179 0-.806.378-1.881 1.132L0 7.197c1.185-1.044 2.351-2.084 3.501-3.128C5.08 2.701 6.266 1.984 7.055 1.91c1.867-.18 3.016 1.1 3.447 3.838.465 2.953.789 4.789.971 5.507.539 2.45 1.131 3.674 1.776 3.674.502 0 1.256-.796 2.265-2.385 1.004-1.589 1.54-2.797 1.612-3.628.144-1.371-.395-2.061-1.614-2.061-.574 0-1.167.121-1.777.391 1.186-3.868 3.434-5.757 6.762-5.637 2.473.06 3.628 1.664 3.48 4.807z"/>
    </svg>
  )
}

function IconTwitch({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z"/>
    </svg>
  )
}

function IconDailymotion({ className = 'w-6 h-6' }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.018 0C5.383 0 0 5.383 0 12.018 0 18.652 5.383 24 12.018 24c6.633 0 11.982-5.348 11.982-11.982C24 5.383 18.651 0 12.018 0zm4.953 15.696a5.52 5.52 0 0 1-4.51 2.34c-3.044 0-5.515-2.47-5.515-5.515S9.417 7.007 12.46 7.007c1.916 0 3.614.98 4.624 2.48V4.66h2.315v12.88h-2.315l-.113-1.844zm-4.406.876c1.78 0 3.224-1.443 3.224-3.224s-1.444-3.224-3.224-3.224c-1.781 0-3.225 1.443-3.225 3.224s1.444 3.224 3.225 3.224z"/>
    </svg>
  )
}

// ── Config plateformes ────────────────────────────────────────────────────────
const PLATFORMS = [
  { name: 'YouTube',     Icon: IconYouTube,     color: 'text-red-500',    bg: 'bg-red-500/10    border-red-500/30',    detect: (u: string) => u.includes('youtube.com') || u.includes('youtu.be') },
  { name: 'TikTok',      Icon: IconTikTok,      color: 'text-white',      bg: 'bg-gray-900/80   border-gray-600/40',   detect: (u: string) => u.includes('tiktok.com') },
  { name: 'Instagram',   Icon: IconInstagram,   color: 'text-pink-500',   bg: 'bg-pink-500/10   border-pink-500/30',   detect: (u: string) => u.includes('instagram.com') },
  { name: 'X / Twitter', Icon: IconX,           color: 'text-white',      bg: 'bg-gray-800/60   border-gray-600/40',   detect: (u: string) => u.includes('twitter.com') || u.includes('x.com') },
  { name: 'SoundCloud',  Icon: IconSoundCloud,  color: 'text-orange-500', bg: 'bg-orange-500/10 border-orange-500/30', detect: (u: string) => u.includes('soundcloud.com') },
  { name: 'Vimeo',       Icon: IconVimeo,       color: 'text-teal-400',   bg: 'bg-teal-500/10   border-teal-500/30',   detect: (u: string) => u.includes('vimeo.com') },
  { name: 'Twitch',      Icon: IconTwitch,      color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/30', detect: (u: string) => u.includes('twitch.tv') },
  { name: 'Dailymotion', Icon: IconDailymotion, color: 'text-blue-400',   bg: 'bg-blue-500/10   border-blue-500/30',   detect: (u: string) => u.includes('dailymotion.com') },
]

function detectPlatform(url: string) {
  return PLATFORMS.find(p => p.detect(url)) ?? null
}

// ── Slider ────────────────────────────────────────────────────────────────────
const SLIDER_STEPS = [
  { label: 'Léger',   desc: '≤ 480p', maxH: 480      },
  { label: 'Correct', desc: '720p',   maxH: 720      },
  { label: 'HD',      desc: '1080p',  maxH: 1080     },
  { label: 'FHD+',    desc: '1440p+', maxH: 1440     },
  { label: 'Max',     desc: 'Meilleur', maxH: Infinity },
]

function pickVideoFormat(formats: VideoFormat[], stepIdx: number): VideoFormat | null {
  const { maxH } = SLIDER_STEPS[stepIdx]
  const videos = formats.filter(f => f.kind !== 'audio' && (f.height ?? 0) > 0)
  if (!videos.length) return formats.find(f => f.kind !== 'audio') ?? null
  if (stepIdx === SLIDER_STEPS.length - 1)
    return videos.reduce((a, b) => (b.height ?? 0) > (a.height ?? 0) ? b : a)
  const candidates = videos.filter(f => (f.height ?? 0) <= maxH)
  if (!candidates.length) return videos.reduce((a, b) => (b.height ?? 0) < (a.height ?? 0) ? b : a)
  return candidates.reduce((a, b) => (b.height ?? 0) > (a.height ?? 0) ? b : a)
}

function pickBestAudio(formats: VideoFormat[]): VideoFormat | null {
  const audios = formats.filter(f => f.kind === 'audio')
  if (!audios.length) return null
  return audios.reduce((a, b) => (b.bitrate ?? 0) > (a.bitrate ?? 0) ? b : a)
}

function fmtDuration(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`
  return `${m}:${String(sec).padStart(2,'0')}`
}

// ─────────────────────────────────────────────────────────────────────────────

export function Video() {
  const [url,         setUrl]         = useState('')
  const [info,        setInfo]        = useState<VideoInfo | null>(null)
  const [sliderIdx,   setSliderIdx]   = useState(2)
  const [mode,        setMode]        = useState<'video' | 'audio'>('video')
  const [loading,     setLoading]     = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [error,       setError]       = useState('')

  const platform = url ? detectPlatform(url) : null

  const selectedFormat = useMemo(() => {
    if (!info) return null
    if (mode === 'audio') return pickBestAudio(info.formats)
    return pickVideoFormat(info.formats, sliderIdx)
  }, [info, sliderIdx, mode])

  const maxSliderIdx = useMemo(() => {
    if (!info) return SLIDER_STEPS.length - 1
    const videos = info.formats.filter(f => f.kind !== 'audio' && (f.height ?? 0) > 0)
    const maxH = Math.max(...videos.map(f => f.height ?? 0))
    if (maxH <= 480) return 0
    if (maxH <= 720) return 1
    if (maxH <= 1080) return 2
    if (maxH <= 1440) return 3
    return 4
  }, [info])

  const handleAnalyze = async () => {
    if (!url.trim()) return
    setLoading(true); setError(''); setInfo(null)
    try {
      const data = await api.ytdlpInfo(url) as any as VideoInfo
      setInfo(data)
      const videos = data.formats.filter(f => f.kind !== 'audio' && (f.height ?? 0) > 0)
      if (!videos.length) setMode('audio')
    } catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  const handleDownload = async () => {
    if (!selectedFormat || !url) return
    setDownloading(true); setError('')
    try {
      const res = await api.ytdlpDownloadDirect(url, selectedFormat.format_id, selectedFormat.kind)
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename\*=UTF-8''([^;\n]+)/) || cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/)
      const filename = match ? decodeURIComponent(match[1]) : `video.${selectedFormat.ext}`
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob); a.download = filename; a.click()
      URL.revokeObjectURL(a.href)
    } catch (e: any) { setError(e.message) }
    finally { setDownloading(false) }
  }

  return (
    <div className="min-h-screen p-4 sm:p-5">
      <div className="max-w-2xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center shadow-lg shadow-red-900/40">
            <VideoIcon className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Téléchargeur vidéo</h1>
            <p className="text-gray-500 text-[11px]">YouTube, TikTok, Instagram et plus</p>
          </div>
        </div>

        {/* Input URL */}
        <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl p-4 mb-4 shadow-xl">
          <label className="block text-[11px] font-medium text-gray-400 mb-1.5 flex items-center gap-2">
            <Link className="w-3 h-3" />URL
            {platform && (
              <span className={`flex items-center gap-1.5 ml-1 font-semibold text-[11px] ${platform.color}`}>
                <platform.Icon className="w-3.5 h-3.5" />{platform.name} détecté
              </span>
            )}
          </label>
          <div className="flex gap-2">
            <input type="text" value={url}
              onChange={e => { setUrl(e.target.value); setInfo(null); setError('') }}
              onKeyDown={e => e.key === 'Enter' && handleAnalyze()}
              placeholder="Colle l'URL ici…"
              className="flex-1 px-3.5 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all" />
            <button onClick={handleAnalyze} disabled={loading || !url.trim()}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0">
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <VideoIcon className="w-3.5 h-3.5" />}
              {loading ? 'Analyse…' : 'Analyser'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-2 text-red-400 text-xs">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{error}
          </div>
        )}

        {/* Résultats */}
        {info && (
          <div className="space-y-4">
            {/* Infos vidéo */}
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl p-4 flex gap-3">
              {info.thumbnail && (
                <img src={info.thumbnail} alt="" className="w-24 h-16 object-cover rounded-xl flex-shrink-0 shadow-md" />
              )}
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-sm font-semibold leading-snug line-clamp-2">{info.title}</h3>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {info.uploader && <span className="text-gray-400 text-[11px]">{info.uploader}</span>}
                  {info.duration > 0 && (
                    <span className="text-[10px] text-gray-600 bg-gray-800/60 px-1.5 py-0.5 rounded">{fmtDuration(info.duration)}</span>
                  )}
                  {platform && <platform.Icon className={`w-3.5 h-3.5 ${platform.color}`} />}
                </div>
              </div>
            </div>

            {/* Vidéo / Audio toggle */}
            <div className="flex gap-2">
              <button onClick={() => setMode('video')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  mode === 'video' ? 'bg-blue-600/20 border-blue-600/50 text-blue-400' : 'bg-gray-800/30 border-gray-700/40 text-gray-400 hover:text-gray-300'
                }`}>
                <Film className="w-3.5 h-3.5" />Vidéo
              </button>
              <button onClick={() => setMode('audio')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-xs font-medium transition-all ${
                  mode === 'audio' ? 'bg-teal-600/20 border-teal-600/50 text-teal-400' : 'bg-gray-800/30 border-gray-700/40 text-gray-400 hover:text-gray-300'
                }`}>
                <Music className="w-3.5 h-3.5" />Audio uniquement
              </button>
            </div>

            {/* Slider qualité */}
            {mode === 'video' && (
              <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-xs font-semibold text-white">Qualité</p>
                  {selectedFormat && (
                    <div className="flex items-center gap-2">
                      {selectedFormat.height && (
                        <span className="text-[11px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-lg">{selectedFormat.height}p</span>
                      )}
                      {selectedFormat.size && <span className="text-[10px] text-gray-500">{selectedFormat.size}</span>}
                      <span className="text-[10px] text-gray-600">{selectedFormat.ext.toUpperCase()}</span>
                    </div>
                  )}
                </div>
                <div className="relative mb-3">
                  <input type="range" min={0} max={SLIDER_STEPS.length - 1} value={sliderIdx}
                    onChange={e => setSliderIdx(Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer
                      [&::-webkit-slider-thumb]:appearance-none
                      [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
                      [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500
                      [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:shadow-blue-900/50
                      [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2
                      [&::-webkit-slider-thumb]:border-blue-300"
                    style={{ background: `linear-gradient(to right, #2563eb ${(sliderIdx/(SLIDER_STEPS.length-1))*100}%, #1f2937 ${(sliderIdx/(SLIDER_STEPS.length-1))*100}%)` }} />
                </div>
                <div className="flex justify-between">
                  {SLIDER_STEPS.map((step, i) => (
                    <button key={i} onClick={() => i <= maxSliderIdx && setSliderIdx(i)}
                      className={`flex flex-col items-center gap-0.5 ${i > maxSliderIdx ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer'}`}>
                      <span className={`text-[10px] font-semibold ${i === sliderIdx ? 'text-blue-400' : 'text-gray-600'}`}>{step.label}</span>
                      <span className="text-[9px] text-gray-700">{step.desc}</span>
                    </button>
                  ))}
                </div>
                {selectedFormat?.kind === 'video' && (
                  <p className="mt-3 text-[10px] text-yellow-500/70 text-center">⚡ Vidéo + meilleur audio fusionnés automatiquement en MP4</p>
                )}
              </div>
            )}

            {/* Mode audio */}
            {mode === 'audio' && (
              <div className="bg-[#1a1a2e]/80 border border-teal-700/30 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-600/20 border border-teal-600/30 flex items-center justify-center flex-shrink-0">
                  <Music className="w-4 h-4 text-teal-400" />
                </div>
                <div>
                  <p className="text-teal-300 text-xs font-semibold">Meilleure qualité audio</p>
                  {selectedFormat ? (
                    <p className="text-gray-500 text-[10px] mt-0.5">
                      {selectedFormat.ext.toUpperCase()}
                      {selectedFormat.bitrate > 0 ? ` · ${selectedFormat.bitrate}kbps` : ''}
                      {selectedFormat.size ? ` · ${selectedFormat.size}` : ''}
                    </p>
                  ) : <p className="text-gray-600 text-[10px]">Aucun format audio disponible</p>}
                </div>
              </div>
            )}

            {/* Bouton DL */}
            {selectedFormat && (
              <button onClick={handleDownload} disabled={downloading}
                className={`w-full py-3 rounded-xl font-semibold text-sm disabled:opacity-60 text-white transition-all flex items-center justify-center gap-2 shadow-lg ${
                  mode === 'audio' ? 'bg-teal-600 hover:bg-teal-500 shadow-teal-900/30' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/30'
                }`}>
                {downloading
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Préparation…</>
                  : <><Download className="w-4 h-4" />{mode === 'audio' ? "Télécharger l'audio" : `Télécharger ${selectedFormat.height ? `en ${selectedFormat.height}p` : 'la vidéo'}`}</>
                }
              </button>
            )}

            {downloading && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                <p className="text-blue-400 text-xs">Préparation côté serveur — le téléchargement démarrera automatiquement</p>
              </div>
            )}
          </div>
        )}

        {/* Plateformes supportées */}
        {!info && !loading && (
          <div className="mt-2">
            <p className="text-[10px] text-gray-600 uppercase tracking-wider mb-3">Plateformes supportées</p>
            <div className="grid grid-cols-4 gap-2">
              {PLATFORMS.map(p => (
                <div key={p.name} className={`flex flex-col items-center gap-2 p-3 rounded-xl border ${p.bg}`}>
                  <p.Icon className={`w-6 h-6 ${p.color}`} />
                  <span className={`text-[10px] font-medium ${p.color}`}>{p.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
              <div className="flex gap-2">
                <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
                <p className="text-orange-300/70 text-[10px] leading-relaxed">
                  Certaines vidéos TikTok/Instagram privées peuvent nécessiter une connexion. Utilisation sous votre responsabilité.
                </p>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
