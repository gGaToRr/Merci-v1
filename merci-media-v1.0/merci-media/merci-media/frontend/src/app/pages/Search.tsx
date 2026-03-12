import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Search as SearchIcon, Download, Music, AlertTriangle, Loader2, Disc,
  CheckSquare, Square, X, ChevronDown, ChevronUp, Zap,
  ListMusic, UploadCloud, Clock, Trash2
} from 'lucide-react'
import { api, type SearchResult, formatDuration } from '../api'

type SearchType = 'track' | 'album'
type BatchStatus = 'idle' | 'pending' | 'downloading' | 'done' | 'error'
type DlStatus    = 'pending' | 'downloading' | 'done' | 'error'

interface DlItem {
  id: number; title: string; artist: string; cover?: string
  type: SearchType; status: DlStatus; filename?: string; error?: string
}
interface HistoryItem {
  id: number; title: string; artist: string; cover?: string
  type: SearchType; filename: string; date: string
}
interface BatchItem {
  query: string; status: BatchStatus; result?: SearchResult
  error?: string; filename?: string; cover?: string; title?: string; artist?: string
}

// ── Storage historique isolé par user ────────────────────────────────────────
function getUserKey() {
  try { return `dl_history_${JSON.parse(localStorage.getItem('user') || '{}').id || 'guest'}` }
  catch { return 'dl_history_guest' }
}
function loadHistory(): HistoryItem[] {
  try { return JSON.parse(localStorage.getItem(getUserKey()) || '[]') } catch { return [] }
}
function saveHistory(items: HistoryItem[]) {
  try { localStorage.setItem(getUserKey(), JSON.stringify(items.slice(0, 100))) } catch {}
}

// ── Pochette ─────────────────────────────────────────────────────────────────
function Cover({ src, type, size = 10 }: { src?: string; type: SearchType; size?: number }) {
  const [err, setErr] = useState(false)
  const s = `w-${size} h-${size}`
  if (src && !err)
    return <img src={src} alt="" onError={() => setErr(true)} className={`${s} rounded-lg object-cover flex-shrink-0 shadow-md`} />
  return (
    <div className={`${s} rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center flex-shrink-0`}>
      {type === 'track' ? <Music className="w-4 h-4 text-blue-400" /> : <Disc className="w-4 h-4 text-blue-400" />}
    </div>
  )
}

// ── Barre de progression ──────────────────────────────────────────────────────
function ProgressBar({ value, total, color = 'from-blue-600 to-blue-400' }: { value: number; total: number; color?: string }) {
  return (
    <div className="h-1 bg-gray-800/80">
      <div className={`h-full bg-gradient-to-r ${color} transition-all duration-500`}
        style={{ width: `${total > 0 ? (value / total) * 100 : 0}%` }} />
    </div>
  )
}

// ── Icône statut ──────────────────────────────────────────────────────────────
function StatusIcon({ status }: { status: DlStatus | BatchStatus }) {
  if (status === 'downloading') return <Loader2 className="w-4 h-4 text-blue-400 animate-spin flex-shrink-0" />
  if (status === 'done')        return <span className="text-green-400 font-bold text-sm flex-shrink-0">✓</span>
  if (status === 'error')       return <span className="text-red-400 font-bold text-sm flex-shrink-0">✗</span>
  return <span className="text-gray-700 text-lg leading-none flex-shrink-0">·</span>
}

export function Search() {
  const [tab, setTab] = useState<'search' | 'batch' | 'downloads'>('search')

  // ── Recherche ────────────────────────────────────────────────────────────────
  const [query,      setQuery]      = useState('')
  const [type,       setType]       = useState<SearchType>('track')
  const [results,    setResults]    = useState<SearchResult[]>([])
  const [loading,    setLoading]    = useState(false)
  const [downloading,setDownloading]= useState<number | null>(null)
  const [error,      setError]      = useState('')
  const [selected,   setSelected]   = useState<Set<number>>(new Set())

  // ── DL session ───────────────────────────────────────────────────────────────
  const [dlItems,  setDlItems]  = useState<DlItem[]>([])
  const abortSelRef = useRef(false)

  // ── Historique ────────────────────────────────────────────────────────────────
  const [history, setHistory] = useState<HistoryItem[]>([])
  useEffect(() => { setHistory(loadHistory()) }, [])

  const addToHistory = useCallback((item: Omit<HistoryItem, 'date'>) => {
    setHistory(prev => {
      const next = [{ ...item, date: new Date().toISOString() }, ...prev.filter(h => h.id !== item.id)].slice(0, 100)
      saveHistory(next)
      return next
    })
  }, [])

  // ── Batch ─────────────────────────────────────────────────────────────────────
  const [batchText,    setBatchText]    = useState('')
  const [batchItems,   setBatchItems]   = useState<BatchItem[]>([])
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchType,    setBatchType]    = useState<SearchType>('track')
  const [showBatchLog, setShowBatchLog] = useState(true)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortRef     = useRef(false)

  // ── Dérivés ───────────────────────────────────────────────────────────────────
  const dlDone    = dlItems.filter(i => i.status === 'done').length
  const dlError   = dlItems.filter(i => i.status === 'error').length
  const dlTotal   = dlItems.length
  const dlRunning = dlItems.some(i => i.status === 'downloading' || i.status === 'pending')
  const batchDone  = batchItems.filter(i => i.status === 'done').length
  const batchError = batchItems.filter(i => i.status === 'error').length
  const batchTotal = batchItems.length
  const anyActive  = dlRunning || batchRunning

  // ── Recherche ─────────────────────────────────────────────────────────────────
  const handleSearch = async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setSelected(new Set())
    try { const { results } = await api.search(query, type); setResults(results) }
    catch (e: any) { setError(e.message) }
    finally { setLoading(false) }
  }

  // ── DL unitaire ───────────────────────────────────────────────────────────────
  const downloadOne = useCallback(async (result: SearchResult, t: SearchType): Promise<string> => {
    const id  = t === 'track' ? result.SNG_ID ?? result.id : result.ALB_ID ?? result.id
    const url = t === 'track' ? api.streamTrackUrl(id) : api.streamAlbumUrl(id)
    const token = localStorage.getItem('token')
    const res = await fetch(url.replace(`?token=${token}`, ''), { headers: { Authorization: `Bearer ${token}` } })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/)
    const filename = match ? decodeURIComponent(match[1]) : `download_${id}`
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = filename; a.click()
    URL.revokeObjectURL(a.href)
    return filename
  }, [])

  // ── DL sélection ─────────────────────────────────────────────────────────────
  const handleDownloadSelected = async () => {
    const toDownload = results.filter(r => selected.has(type === 'track' ? r.SNG_ID ?? r.id : r.ALB_ID ?? r.id))
    abortSelRef.current = false
    const items: DlItem[] = toDownload.map(r => ({
      id:     type === 'track' ? r.SNG_ID ?? r.id : r.ALB_ID ?? r.id,
      title:  type === 'track' ? r.SNG_TITLE ?? r.title ?? 'Inconnu' : r.album ?? r.ALB_TITLE ?? r.title ?? 'Inconnu',
      artist: r.ART_NAME ?? r.artist ?? '',
      cover:  r.img_url?.replace('/56x56', '/264x264'),
      type, status: 'pending',
    }))
    setDlItems(items); setSelected(new Set()); setTab('downloads')

    for (let i = 0; i < items.length; i++) {
      if (abortSelRef.current) {
        setDlItems(prev => prev.map((it, j) => j >= i ? { ...it, status: 'error', error: 'Annulé' } : it)); break
      }
      const r = toDownload[i]
      setDlItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'downloading' } : it))
      setDownloading(items[i].id)
      try {
        const filename = await downloadOne(r, type)
        setDlItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'done', filename } : it))
        addToHistory({ id: items[i].id, title: items[i].title, artist: items[i].artist, cover: items[i].cover, type, filename })
      } catch (e: any) {
        setDlItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'error', error: e.message } : it))
      }
    }
    setDownloading(null)
  }

  const toggleSelect = (id: number) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  const toggleAll    = () => {
    if (selected.size === results.length) { setSelected(new Set()); return }
    setSelected(new Set(results.map(r => type === 'track' ? r.SNG_ID ?? r.id : r.ALB_ID ?? r.id)))
  }

  // ── Import fichier ────────────────────────────────────────────────────────────
  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setBatchText((ev.target?.result as string) || '')
    reader.readAsText(file); e.target.value = ''
  }
  const parseBatchLines = (text: string) =>
    text.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'))

  // ── Batch run ─────────────────────────────────────────────────────────────────
  const handleBatchRun = async () => {
    const lines = parseBatchLines(batchText)
    if (!lines.length) return
    abortRef.current = false; setBatchRunning(true); setShowBatchLog(true); setTab('downloads')
    const items: BatchItem[] = lines.map(q => ({ query: q, status: 'pending' }))
    setBatchItems(items)

    for (let i = 0; i < items.length; i++) {
      if (abortRef.current) {
        setBatchItems(prev => prev.map((it, j) => j >= i ? { ...it, status: 'error', error: 'Annulé' } : it)); break
      }
      setBatchItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'downloading' } : it))
      try {
        const { results } = await api.search(items[i].query, batchType)
        const first = results[0]
        if (!first) throw new Error('Aucun résultat')
        const filename = await downloadOne(first, batchType)
        const title  = batchType === 'track' ? first.SNG_TITLE ?? first.title ?? items[i].query : first.album ?? first.ALB_TITLE ?? items[i].query
        const artist = first.ART_NAME ?? first.artist ?? ''
        const cover  = first.img_url?.replace('/56x56', '/264x264')
        setBatchItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'done', result: first, filename, title, artist, cover } : it))
        addToHistory({ id: Number(batchType === 'track' ? first.SNG_ID ?? first.id : first.ALB_ID ?? first.id), title: title ?? '', artist, cover, type: batchType, filename })
      } catch (e: any) {
        setBatchItems(prev => prev.map((it, j) => j === i ? { ...it, status: 'error', error: e.message } : it))
      }
    }
    setBatchRunning(false)
  }

  const fmtDate = (iso: string) => {
    const d = new Date(iso), now = new Date(), diff = now.getTime() - d.getTime()
    if (diff < 60000)    return "À l'instant"
    if (diff < 3600000)  return `Il y a ${Math.floor(diff / 60000)} min`
    if (diff < 86400000) return `Il y a ${Math.floor(diff / 3600000)}h`
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  return (
    <div className="min-h-screen p-4 sm:p-5">
      <div className="max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-lg shadow-blue-900/40">
            <Music className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white">Deezer</h1>
            <p className="text-gray-500 text-[11px]">Recherche, import liste et téléchargements</p>
          </div>
        </div>

        {/* Avertissement */}
        <div className="mb-4 bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
          <div className="flex gap-2">
            <AlertTriangle className="w-3.5 h-3.5 text-orange-400 flex-shrink-0 mt-0.5" />
            <p className="text-orange-300/70 text-[10px] leading-relaxed">
              Le téléchargement de contenus protégés peut être illégal selon votre pays. Utilisation sous votre entière responsabilité.
            </p>
          </div>
        </div>

        {/* Onglets */}
        <div className="flex gap-1 mb-4 bg-[#0f0f1a] border border-gray-800/50 rounded-xl p-1">
          {[
            { key: 'search',    label: 'Recherche',       icon: <SearchIcon className="w-3.5 h-3.5" />, active: 'bg-blue-600/20 border-blue-600/40 text-blue-400' },
            { key: 'batch',     label: 'Import list',     icon: <ListMusic className="w-3.5 h-3.5" />,  active: 'bg-purple-600/20 border-purple-600/40 text-purple-400' },
            { key: 'downloads', label: 'Téléchargements', icon: <Download className="w-3.5 h-3.5" />,   active: 'bg-blue-600/20 border-blue-600/40 text-blue-400' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as any)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all ${tab === t.key ? `border ${t.active}` : 'text-gray-500 hover:text-gray-300'}`}>
              {t.icon}{t.label}
              {t.key === 'batch' && batchRunning && <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />}
              {t.key === 'downloads' && anyActive  && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
              {t.key === 'downloads' && !anyActive && dlTotal > 0 && (
                <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold ${dlError > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}>
                  {dlDone}/{dlTotal}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ RECHERCHE ══════════════════════════════════════════════════════════ */}
        {tab === 'search' && (
          <>
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl p-4 shadow-xl mb-4">
              <div className="flex gap-2 mb-3">
                {(['track', 'album'] as SearchType[]).map(t => (
                  <button key={t} onClick={() => { setType(t); setResults([]); setSelected(new Set()) }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${type === t ? 'bg-blue-600/30 border border-blue-600/50 text-blue-400' : 'bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:text-gray-300'}`}>
                    {t === 'track' ? 'Titre' : 'Album'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={query} onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={type === 'track' ? 'Artiste, titre…' : 'Artiste, album…'}
                  className="flex-1 px-3.5 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-all" />
                <button onClick={handleSearch} disabled={loading || !query.trim()}
                  className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-medium transition-all flex items-center gap-1.5 flex-shrink-0">
                  {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <SearchIcon className="w-3.5 h-3.5" />}
                  {loading ? 'Recherche…' : 'Chercher'}
                </button>
              </div>
            </div>

            {error && <div className="mb-4 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-400 text-xs">{error}</div>}

            {results.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <button onClick={toggleAll} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors">
                      {selected.size === results.length ? <CheckSquare className="w-3.5 h-3.5 text-blue-400" /> : <Square className="w-3.5 h-3.5" />}
                      {selected.size === results.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <span className="text-[10px] text-gray-600">{results.length} résultat{results.length > 1 ? 's' : ''}</span>
                  </div>
                  {selected.size > 0 && (
                    <button onClick={handleDownloadSelected} disabled={dlRunning}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-600/20 border border-blue-600/40 hover:bg-blue-600/30 text-blue-400 text-xs font-medium disabled:opacity-60 transition-all">
                      <Download className="w-3.5 h-3.5" />Télécharger {selected.size} titre{selected.size > 1 ? 's' : ''}
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {results.map((r, i) => {
                    const id     = type === 'track' ? r.SNG_ID ?? r.id : r.ALB_ID ?? r.id
                    const title  = type === 'track' ? r.SNG_TITLE ?? r.title ?? 'Inconnu' : r.album ?? r.ALB_TITLE ?? r.title ?? 'Inconnu'
                    const artist = r.ART_NAME ?? r.artist ?? ''
                    const album  = r.album ?? r.ALB_TITLE ?? ''
                    const cover  = r.img_url?.replace('/56x56', '/264x264')
                    const isLoad = downloading === id
                    const isSel  = selected.has(id)
                    return (
                      <div key={i} onClick={() => toggleSelect(id)}
                        className={`group flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${isSel ? 'bg-blue-600/10 border-blue-600/40' : 'bg-[#1a1a2e]/60 border-gray-700/40 hover:border-blue-500/30 hover:bg-[#1a1a2e]'}`}>
                        <div className="flex-shrink-0">
                          {isSel ? <CheckSquare className="w-4 h-4 text-blue-400" /> : <Square className="w-4 h-4 text-gray-600 group-hover:text-gray-400 transition-colors" />}
                        </div>
                        <Cover src={cover} type={type} size={10} />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-medium truncate">{title}</p>
                          <p className="text-gray-400 text-[11px] truncate">{artist}{album && type === 'track' ? ` · ${album}` : ''}</p>
                        </div>
                        {type === 'track' && r.DURATION && (
                          <span className="text-gray-500 text-[11px] tabular-nums flex-shrink-0">{formatDuration(r.DURATION)}</span>
                        )}
                        <button onClick={async e => {
                          e.stopPropagation(); setDownloading(id)
                          try {
                            const fn = await downloadOne(r, type)
                            addToHistory({ id, title, artist, cover, type, filename: fn })
                          } catch (err: any) { setError(err.message) }
                          finally { setDownloading(null) }
                        }} disabled={isLoad || dlRunning}
                          className="w-7 h-7 rounded-lg bg-blue-600/20 border border-blue-600/30 flex items-center justify-center hover:bg-blue-600/40 transition-all disabled:opacity-50 flex-shrink-0">
                          {isLoad ? <Loader2 className="w-3 h-3 text-blue-400 animate-spin" /> : <Download className="w-3 h-3 text-blue-400" />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            {!loading && results.length === 0 && query && (
              <div className="text-center py-10 text-gray-500 text-xs">Aucun résultat pour "{query}"</div>
            )}
          </>
        )}

        {/* ══ IMPORT LIST ════════════════════════════════════════════════════════ */}
        {tab === 'batch' && (
          <>
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-300 font-medium">Liste de titres à télécharger</p>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600">{parseBatchLines(batchText).length} ligne{parseBatchLines(batchText).length !== 1 ? 's' : ''}</span>
                  <button onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-800/50 border border-gray-700/40 hover:bg-gray-700/50 text-gray-400 hover:text-white text-[10px] transition-all">
                    <UploadCloud className="w-3 h-3" />Importer .txt/.csv
                  </button>
                  <input ref={fileInputRef} type="file" accept=".txt,.csv" className="hidden" onChange={handleFileImport} />
                </div>
              </div>
              <textarea value={batchText} onChange={e => setBatchText(e.target.value)}
                placeholder={"Un titre ou artiste par ligne :\nDaft Punk - Get Lucky\nAdo - Idol\n# Les lignes commençant par # sont ignorées"}
                rows={8}
                className="w-full px-3 py-2.5 bg-[#0a0a12] border border-gray-700 rounded-xl text-white text-xs placeholder-gray-600 focus:outline-none focus:border-purple-500 transition-all font-mono resize-none leading-relaxed" />
              <div className="mt-3 flex gap-2">
                {!batchRunning ? (
                  <button onClick={handleBatchRun} disabled={!parseBatchLines(batchText).length}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600/20 border border-purple-600/40 hover:bg-purple-600/30 disabled:opacity-50 text-purple-400 text-xs font-medium transition-all">
                    <Zap className="w-3.5 h-3.5" />Télécharger ({parseBatchLines(batchText).length} titres)
                  </button>
                ) : (
                  <button onClick={() => { abortRef.current = true }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-600/20 border border-red-600/40 hover:bg-red-600/30 text-red-400 text-xs font-medium transition-all">
                    <X className="w-3.5 h-3.5" />Arrêter
                  </button>
                )}
              </div>
            </div>
            {batchItems.length === 0 && (
              <div className="bg-[#0f0f1a] border border-gray-800/50 rounded-xl p-4">
                <p className="text-gray-500 text-[11px] font-medium mb-2">Comment utiliser :</p>
                <ul className="space-y-1.5 text-gray-600 text-[10px]">
                  <li className="flex gap-2"><span className="text-gray-500">1.</span>Colle tes titres, un par ligne</li>
                  <li className="flex gap-2"><span className="text-gray-500">2.</span>Ou importe un fichier .txt / .csv</li>
                  <li className="flex gap-2"><span className="text-gray-500">3.</span>Format conseillé : <code className="text-purple-400 bg-purple-900/20 px-1 rounded">Artiste - Titre</code></li>
                  <li className="flex gap-2"><span className="text-gray-500">4.</span>Clique Télécharger — chaque titre est recherché puis téléchargé automatiquement</li>
                </ul>
              </div>
            )}
          </>
        )}

        {/* ══ TÉLÉCHARGEMENTS ════════════════════════════════════════════════════ */}
        {tab === 'downloads' && (
          <div className="space-y-4">

            {/* Bloc 1 — En cours (sélection recherche) */}
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-semibold text-white">Téléchargements en cours</p>
                  {dlTotal > 0 && (
                    <span className="text-[10px] text-gray-500">{dlDone}/{dlTotal}
                      {dlRunning && <span className="ml-1.5 text-blue-400">· actif</span>}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {dlRunning && (
                    <button onClick={() => { abortSelRef.current = true }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/15 border border-red-600/30 hover:bg-red-600/25 text-red-400 text-[10px] font-medium transition-all">
                      <X className="w-3 h-3" />Annuler
                    </button>
                  )}
                  {!dlRunning && dlTotal > 0 && (
                    <button onClick={() => setDlItems([])} className="text-gray-600 hover:text-gray-400 text-[10px] transition-colors">Effacer</button>
                  )}
                </div>
              </div>
              {dlTotal > 0 && <ProgressBar value={dlDone + dlError} total={dlTotal} />}
              {dlTotal === 0 ? (
                <div className="px-4 py-7 text-center">
                  <p className="text-gray-600 text-xs mb-2">Aucun téléchargement en cours</p>
                  <button onClick={() => setTab('search')} className="text-blue-400 text-xs hover:underline">→ Aller dans Recherche</button>
                </div>
              ) : (
                <div className="divide-y divide-gray-800/40 max-h-64 overflow-y-auto">
                  {dlItems.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${item.status === 'downloading' ? 'bg-blue-600/5' : ''}`}>
                      <Cover src={item.cover} type={item.type} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                        <p className="text-gray-500 text-[10px] truncate">{item.artist}</p>
                        {item.status === 'downloading' && (
                          <div className="mt-1 h-0.5 bg-gray-800 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500 animate-pulse" style={{ width: '65%' }} />
                          </div>
                        )}
                        {item.error && <p className="text-red-400 text-[10px]">{item.error}</p>}
                        {item.filename && <p className="text-gray-600 text-[9px] truncate">{item.filename}</p>}
                      </div>
                      <StatusIcon status={item.status} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bloc 2 — Import list */}
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
                <div className="flex items-center gap-3">
                  <ListMusic className="w-3.5 h-3.5 text-purple-400" />
                  <p className="text-xs font-semibold text-white">Import list</p>
                  {batchTotal > 0 && (
                    <span className="text-[10px] text-gray-500">{batchDone}/{batchTotal}
                      {batchRunning && <span className="ml-1.5 text-purple-400">· actif</span>}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {batchRunning && (
                    <button onClick={() => { abortRef.current = true }}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-600/15 border border-red-600/30 hover:bg-red-600/25 text-red-400 text-[10px] font-medium transition-all">
                      <X className="w-3 h-3" />Annuler
                    </button>
                  )}
                  {!batchRunning && batchTotal > 0 && (
                    <button onClick={() => { setBatchItems([]); setBatchText('') }} className="text-gray-600 hover:text-gray-400 text-[10px] transition-colors">Effacer</button>
                  )}
                  {batchTotal > 0 && (
                    <button onClick={() => setShowBatchLog(v => !v)} className="text-gray-600 hover:text-gray-300 transition-colors">
                      {showBatchLog ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              {batchTotal > 0 && <ProgressBar value={batchDone + batchError} total={batchTotal} color="from-purple-600 to-purple-400" />}

              {batchTotal === 0 ? (
                <div className="px-4 py-7 text-center">
                  <p className="text-gray-600 text-xs mb-2">Aucune liste en cours</p>
                  <button onClick={() => setTab('batch')} className="text-purple-400 text-xs hover:underline">→ Aller dans Import list</button>
                </div>
              ) : showBatchLog ? (
                <div className="divide-y divide-gray-800/40 max-h-64 overflow-y-auto">
                  {batchItems.map((item, i) => (
                    <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${item.status === 'downloading' ? 'bg-purple-600/5' : ''}`}>
                      {item.cover
                        ? <img src={item.cover} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                        : <div className="w-9 h-9 rounded-lg bg-gray-800 flex-shrink-0 flex items-center justify-center"><Music className="w-3.5 h-3.5 text-gray-600" /></div>
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.title ?? item.query}</p>
                        {item.artist && <p className="text-gray-500 text-[10px] truncate">{item.artist}</p>}
                        {!item.title && <p className="text-gray-600 text-[10px] truncate italic">{item.query}</p>}
                        {item.error && <p className="text-red-400 text-[10px]">{item.error}</p>}
                      </div>
                      <StatusIcon status={item.status} />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Bloc 3 — Historique */}
            <div className="bg-[#1a1a2e]/80 border border-gray-700/50 rounded-xl overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/40">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-gray-500" />
                  <p className="text-xs font-semibold text-white">Historique</p>
                  {history.length > 0 && <span className="text-gray-600 text-[10px]">{history.length} fichier{history.length > 1 ? 's' : ''}</span>}
                </div>
                {history.length > 0 && (
                  <button onClick={() => { saveHistory([]); setHistory([]) }}
                    className="flex items-center gap-1 text-gray-600 hover:text-red-400 text-[10px] transition-colors">
                    <Trash2 className="w-3 h-3" />Effacer
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <div className="px-4 py-7 text-center text-gray-600 text-xs">Aucun téléchargement précédent</div>
              ) : (
                <div className="divide-y divide-gray-800/40 max-h-80 overflow-y-auto">
                  {history.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-800/20 transition-colors">
                      <Cover src={item.cover} type={item.type} size={9} />
                      <div className="flex-1 min-w-0">
                        <p className="text-white text-xs font-medium truncate">{item.title}</p>
                        <p className="text-gray-500 text-[10px] truncate">{item.artist}</p>
                        <p className="text-gray-700 text-[9px] truncate">{item.filename}</p>
                      </div>
                      <span className="text-gray-600 text-[9px] flex-shrink-0 whitespace-nowrap">{fmtDate(item.date)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  )
}
