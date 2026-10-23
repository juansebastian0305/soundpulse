import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  AudioLines,
  Check,
  ChevronDown,
  CircleAlert,
  Clock3,
  Disc3,
  ExternalLink,
  LoaderCircle,
  Music2,
  Play,
  Radio,
  RefreshCw,
  Search,
  Signal,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import {
  getDashboard,
  getHealth,
  getPipelineRun,
  getPipelineRuns,
  getTracks,
  runPipeline,
} from './api'
import type { Dashboard, PipelineRun, Track } from './types'

const CollectionChart = lazy(() => import('./components/CollectionChart'))

type Page = 'overview' | 'explorer' | 'runs'

const navigation: { id: Page; label: string; icon: LucideIcon }[] = [
  { id: 'overview', label: 'Overview', icon: Activity },
  { id: 'explorer', label: 'Data explorer', icon: Disc3 },
  { id: 'runs', label: 'Pipeline runs', icon: Radio },
]

const emptyDashboard: Dashboard = {
  metrics: { total_tracks: 0, unique_artists: 0, total_runs: 0, last_run: null },
  activity: [],
  recent_tracks: [],
}

function App() {
  const [page, setPage] = useState<Page>('overview')
  const [dashboard, setDashboard] = useState<Dashboard>(emptyDashboard)
  const [tracks, setTracks] = useState<Track[]>([])
  const [trackSearch, setTrackSearch] = useState('')
  const [trackTotal, setTrackTotal] = useState(0)
  const [trackPage, setTrackPage] = useState(1)
  const [trackPages, setTrackPages] = useState(1)
  const [runs, setRuns] = useState<PipelineRun[]>([])
  const [selectedRun, setSelectedRun] = useState<PipelineRun | null>(null)
  const [connected, setConnected] = useState<boolean | null>(null)
  const [query, setQuery] = useState('')
  const [running, setRunning] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [todayLabel] = useState(() =>
    new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }),
  )

  const refreshAll = useCallback(async () => {
    try {
      const [health, nextDashboard, nextTracks, nextRuns] = await Promise.all([
        getHealth(),
        getDashboard(),
        getTracks(),
        getPipelineRuns(),
      ])
      setConnected(health.status === 'healthy')
      setDashboard(nextDashboard)
      setTracks(nextTracks.items)
      setTrackTotal(nextTracks.pagination.total)
      setTrackPage(nextTracks.pagination.page)
      setTrackPages(nextTracks.pagination.pages)
      setRuns(nextRuns.items)
    } catch (cause) {
      setConnected(false)
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar SoundPulse.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const request = window.setTimeout(() => void refreshAll(), 0)
    return () => window.clearTimeout(request)
  }, [refreshAll])

  const chartData = useMemo(
    () =>
      dashboard.activity.map((run) => ({
        ...run,
        label: new Date(run.started_at).toLocaleDateString('es', {
          day: '2-digit',
          month: 'short',
        }),
      })),
    [dashboard.activity],
  )

  async function handleRun(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setNotice('')
    setError('')
    setRunning(true)
    try {
      const result = await runPipeline(query.trim())
      setNotice(
        `Recopilación completa: ${result.records_inserted} nuevos, ${result.records_skipped} omitidos.`,
      )
      setQuery('')
      await refreshAll()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'La recopilación no se pudo completar.')
      await refreshAll()
    } finally {
      setRunning(false)
    }
  }

  async function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    try {
      const result = await getTracks(trackSearch.trim(), 1)
      setTracks(result.items)
      setTrackTotal(result.pagination.total)
      setTrackPage(result.pagination.page)
      setTrackPages(result.pagination.pages)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron buscar canciones.')
    }
  }

  async function handleTrackPageChange(nextPage: number) {
    setError('')
    try {
      const result = await getTracks(trackSearch.trim(), nextPage)
      setTracks(result.items)
      setTrackTotal(result.pagination.total)
      setTrackPage(result.pagination.page)
      setTrackPages(result.pagination.pages)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudieron cargar las canciones.')
    }
  }

  async function openRun(runId: number) {
    setError('')
    try {
      setSelectedRun(await getPipelineRun(runId))
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo cargar la ejecución.')
    }
  }

  const title =
    page === 'overview' ? 'Music intelligence' : page === 'explorer' ? 'Data explorer' : 'Pipeline runs'

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#" onClick={(event) => { event.preventDefault(); setPage('overview') }}>
          <span className="brand-mark"><AudioLines size={21} strokeWidth={2.2} /></span>
          <span>sound<span>pulse</span></span>
        </a>

        <div className="workspace-label">WORKSPACE</div>
        <div className="workspace-switcher">
          <span className="workspace-icon"><AudioLines size={17} /></span>
          <span className="workspace-copy"><strong>Music data</strong><small>Personal workspace</small></span>
          <ChevronDown size={15} className="muted-icon" />
        </div>

        <div className="nav-label">ANALYTICS</div>
        <nav className="navigation" aria-label="Main navigation">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`nav-item ${page === id ? 'active' : ''}`}
              key={id}
              onClick={() => {
                setPage(id)
                setSelectedRun(null)
                setError('')
              }}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === 'runs' && runs.length > 0 && <span className="nav-count">{runs.length}</span>}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className={`connection-card ${connected === false ? 'offline' : ''}`}>
            <span className="connection-icon"><Signal size={16} /></span>
            <div><strong>{connected === false ? 'API offline' : 'API connection'}</strong><small>{connected === false ? 'Check backend status' : 'iTunes Search API'}</small></div>
            <span className={`connection-dot ${connected ? 'online' : ''}`} />
          </div>
          <div className="profile">
            <div className="profile-avatar">SP</div>
            <div className="profile-copy"><strong>SoundPulse</strong><small>Data workspace</small></div>
            <button className="icon-button profile-menu" aria-label="Opciones"><ChevronDown size={16} /></button>
          </div>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div className="breadcrumb"><span>Workspace</span><span className="breadcrumb-separator">/</span><strong>{title}</strong></div>
          <div className="topbar-actions">
            <span className={`status-pill ${connected === false ? 'status-offline' : ''}`}>
              <span className="status-dot" />{connected === false ? 'Disconnected' : 'System operational'}
            </span>
            <button className="icon-button refresh-button" onClick={() => { setError(''); void refreshAll() }} aria-label="Actualizar datos">
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        <div className="page-content">
          <div className="page-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" /> SOUND DATA, IN FOCUS</div>
              <h1>{page === 'overview' ? <>Your music data,<br /><span>in sync.</span></> : title}</h1>
              <p className="page-subtitle">
                {page === 'overview' && 'A clear view of every track collected from your music pipeline.'}
                {page === 'explorer' && 'Search and inspect the music metadata stored in your workspace.'}
                {page === 'runs' && 'Monitor collection runs and inspect their results.'}
              </p>
            </div>
            <div className="date-badge"><Clock3 size={15} /> Live data <span className="badge-divider" /> {todayLabel}</div>
          </div>

          {error && <div className="alert alert-error" role="alert"><CircleAlert size={17} /><span>{error}</span><button onClick={() => setError('')} aria-label="Cerrar aviso">×</button></div>}
          {notice && <div className="alert alert-success" role="status"><Check size={17} /><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}

          {loading ? (
            <div className="loading-panel"><LoaderCircle className="spin" size={22} /> Loading data from your backend…</div>
          ) : (
            <>
              {page === 'overview' && (
                <Overview
                  dashboard={dashboard}
                  chartData={chartData}
                  query={query}
                  setQuery={setQuery}
                  running={running}
                  onRun={handleRun}
                  onExplore={() => setPage('explorer')}
                  onViewRuns={() => setPage('runs')}
                />
              )}
              {page === 'explorer' && (
                <Explorer
                  tracks={tracks}
                  total={trackTotal}
                  search={trackSearch}
                  setSearch={setTrackSearch}
                  onSearch={handleSearch}
                  page={trackPage}
                  pages={trackPages}
                  onPageChange={(nextPage) => void handleTrackPageChange(nextPage)}
                />
              )}
              {page === 'runs' && (
                <Runs
                  runs={runs}
                  selectedRun={selectedRun}
                  onOpen={(id) => void openRun(id)}
                  onClose={() => setSelectedRun(null)}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function Overview({
  dashboard,
  chartData,
  query,
  setQuery,
  running,
  onRun,
  onExplore,
  onViewRuns,
}: {
  dashboard: Dashboard
  chartData: (Dashboard['activity'][number] & { label: string })[]
  query: string
  setQuery: (query: string) => void
  running: boolean
  onRun: (event: FormEvent<HTMLFormElement>) => void
  onExplore: () => void
  onViewRuns: () => void
}) {
  const { metrics } = dashboard
  const metricsList = [
    { label: 'Tracks collected', value: metrics.total_tracks, icon: Music2, accent: 'violet', note: 'Stored records' },
    { label: 'Unique artists', value: metrics.unique_artists, icon: Sparkles, accent: 'green', note: 'Across all sources' },
    { label: 'Pipeline runs', value: metrics.total_runs, icon: Activity, accent: 'amber', note: 'Collection history' },
    { label: 'Last run', value: metrics.last_run ? statusLabel(metrics.last_run.status) : '—', icon: Clock3, accent: 'blue', note: metrics.last_run ? formatDate(metrics.last_run.started_at) : 'No runs yet' },
  ]

  return (
    <>
      <section className="metrics-grid" aria-label="Music data metrics">
        {metricsList.map(({ label, value, icon: Icon, accent, note }, index) => (
          <article className="metric-card" key={label}>
            <div className="metric-top"><span className={`metric-icon ${accent}`}><Icon size={17} /></span><span className="metric-index">0{index + 1}</span></div>
            <div className="metric-value">{typeof value === 'number' ? value.toLocaleString() : value}</div>
            <div className="metric-label">{label}</div>
            <div className="metric-note">{note}</div>
          </article>
        ))}
      </section>

      <section className="content-grid">
        <article className="panel activity-panel">
          <div className="panel-heading">
            <div><div className="panel-kicker">PIPELINE ACTIVITY</div><h2>Collection volume</h2></div>
            <span className="range-chip">Latest runs <ChevronDown size={13} /></span>
          </div>
          {chartData.length ? (
            <div className="chart-wrap">
              <Suspense fallback={<div className="chart-loading"><LoaderCircle className="spin" size={18} /> Preparing chart…</div>}>
                <CollectionChart data={chartData} />
              </Suspense>
            </div>
          ) : (
            <div className="chart-empty"><div className="empty-wave"><AudioLines size={24} /></div><strong>Your first collection starts here</strong><span>Run a real search to see activity appear in this chart.</span></div>
          )}
          <div className="chart-footer"><span><span className="legend-dot" /> Tracks added per run</span><span>{metrics.total_runs} total {metrics.total_runs === 1 ? 'run' : 'runs'}</span></div>
        </article>

        <article className="panel collect-panel">
          <div className="collect-art"><div className="art-orbit orbit-one" /><div className="art-orbit orbit-two" /><div className="art-core"><AudioLines size={25} /></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">✳</span></div>
          <div className="panel-kicker">DATA COLLECTION</div>
          <h2>Find your next<br />data point.</h2>
          <p>Search iTunes for a track, artist, or album. Results will be normalized and stored in your local database.</p>
          <form className="collect-form" onSubmit={onRun}>
            <label className="sr-only" htmlFor="pipeline-query">Search for a song or artist</label>
            <div className="input-wrap"><Search size={16} /><input id="pipeline-query" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="e.g. Daft Punk" maxLength={200} required disabled={running} /><span className="input-source">iTunes</span></div>
            <button className="primary-button" type="submit" disabled={running || !query.trim()}>
              {running ? <><LoaderCircle size={16} className="spin" /> Collecting…</> : <><Play size={15} fill="currentColor" /> Run pipeline</>}
            </button>
          </form>
          <div className="collect-footnote"><span className="live-dot" /> Synchronous run · status saved to history</div>
        </article>
      </section>

      <section className="panel tracks-panel">
        <div className="panel-heading">
          <div><div className="panel-kicker">LATEST RECORDS</div><h2>Recently collected</h2></div>
          <button className="text-button" onClick={onExplore}>Explore data <ArrowUpRight size={15} /></button>
        </div>
        <TrackTable tracks={dashboard.recent_tracks} />
      </section>
      <button className="quiet-link" onClick={onViewRuns}>Review pipeline history <ArrowDownRight size={14} /></button>
    </>
  )
}

function Explorer({
  tracks,
  total,
  search,
  setSearch,
  onSearch,
  page,
  pages,
  onPageChange,
}: {
  tracks: Track[]
  total: number
  search: string
  setSearch: (search: string) => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  page: number
  pages: number
  onPageChange: (page: number) => void
}) {
  return (
    <section className="panel explorer-panel">
      <div className="panel-heading">
        <div><div className="panel-kicker">YOUR DATABASE</div><h2>Track metadata</h2></div>
        <span className="count-chip">{total} {total === 1 ? 'record' : 'records'}</span>
      </div>
      <form className="explorer-search" onSubmit={onSearch}>
        <Search size={16} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter by track or artist…" aria-label="Filter tracks by title or artist" />
        <button className="secondary-button" type="submit">Search</button>
      </form>
      <TrackTable tracks={tracks} />
      <div className="table-footnote">
        <span>Showing {tracks.length ? (page - 1) * 20 + 1 : 0}–{Math.min(page * 20, total)} of {total} stored records</span>
        <div className="pagination">
          <button className="secondary-button" type="button" onClick={() => onPageChange(page - 1)} disabled={page <= 1}>Previous</button>
          <span>Page {page} of {Math.max(pages, 1)}</span>
          <button className="secondary-button" type="button" onClick={() => onPageChange(page + 1)} disabled={page >= pages}>Next</button>
        </div>
      </div>
    </section>
  )
}

function Runs({
  runs,
  selectedRun,
  onOpen,
  onClose,
}: {
  runs: PipelineRun[]
  selectedRun: PipelineRun | null
  onOpen: (id: number) => void
  onClose: () => void
}) {
  return (
    <section className="panel runs-panel">
      <div className="panel-heading">
        <div><div className="panel-kicker">OBSERVABILITY</div><h2>Execution history</h2></div>
        <span className="count-chip">{runs.length} {runs.length === 1 ? 'execution' : 'executions'}</span>
      </div>
      {runs.length ? (
        <div className="runs-list">
          {runs.map((run, index) => (
            <button className="run-row" key={run.id} onClick={() => onOpen(run.id)}>
              <span className={`run-number ${run.status}`}>{String(runs.length - index).padStart(2, '0')}</span>
              <span className="run-main"><strong>{run.query}</strong><small>{formatDate(run.started_at)}</small></span>
              <StatusBadge status={run.status} />
              <span className="run-stat"><strong>{run.records_fetched}</strong><small>fetched</small></span>
              <span className="run-stat"><strong>{run.records_inserted}</strong><small>new</small></span>
              <ExternalLink size={15} className="muted-icon" />
            </button>
          ))}
        </div>
      ) : (
        <div className="empty-state"><div className="empty-wave"><Radio size={22} /></div><strong>No pipeline runs yet</strong><span>Start a collection from the Overview to create the first execution record.</span></div>
      )}
      {selectedRun && (
        <div className="detail-backdrop" role="presentation" onClick={onClose}>
          <section className="run-detail" role="dialog" aria-modal="true" aria-labelledby="run-detail-title" onClick={(event) => event.stopPropagation()}>
            <div className="detail-top"><div><div className="panel-kicker">RUN #{selectedRun.id}</div><h2 id="run-detail-title">{selectedRun.query}</h2></div><button className="icon-button" onClick={onClose} aria-label="Close run details">×</button></div>
            <StatusBadge status={selectedRun.status} />
            <div className="detail-grid">
              <DetailItem label="Started" value={formatDate(selectedRun.started_at)} />
              <DetailItem label="Finished" value={selectedRun.finished_at ? formatDate(selectedRun.finished_at) : 'In progress'} />
              <DetailItem label="Records fetched" value={selectedRun.records_fetched} />
              <DetailItem label="New records" value={selectedRun.records_inserted} />
              <DetailItem label="Skipped" value={selectedRun.records_skipped} />
            </div>
            {selectedRun.error_message && <div className="run-error"><CircleAlert size={16} /><div><strong>Error detail</strong><p>{selectedRun.error_message}</p></div></div>}
          </section>
        </div>
      )}
    </section>
  )
}

function TrackTable({ tracks }: { tracks: Track[] }) {
  if (!tracks.length) {
    return <div className="empty-state compact"><div className="empty-wave"><Music2 size={21} /></div><strong>No tracks stored yet</strong><span>Collected records from the API will appear here.</span></div>
  }

  return (
    <div className="table-scroll">
      <table className="data-table">
        <thead><tr><th>TRACK</th><th>ARTIST</th><th>ALBUM</th><th>SOURCE</th><th>COLLECTED</th><th aria-label="Link" /></tr></thead>
        <tbody>{tracks.map((track) => (
          <tr key={track.id}>
            <td><div className="track-cell">{track.artwork_url ? <img src={track.artwork_url} alt="" className="track-artwork" /> : <span className="track-placeholder"><Music2 size={15} /></span>}<strong>{track.title}</strong></div></td>
            <td>{track.artist_name}</td>
            <td className="album-cell">{track.album_name || '—'}</td>
            <td><span className="source-badge"><span />{track.source}</span></td>
            <td className="date-cell">{formatDate(track.collected_at)}</td>
            <td>{track.source_url && <a className="external-link" href={track.source_url} target="_blank" rel="noreferrer" aria-label={`Open ${track.title} in source`}><ExternalLink size={14} /></a>}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  return <span className={`status-badge ${status}`}><span />{statusLabel(status)}</span>
}

function DetailItem({ label, value }: { label: string; value: string | number }) {
  return <div className="detail-item"><span>{label}</span><strong>{value}</strong></div>
}

function statusLabel(status: string) {
  if (status === 'succeeded') return 'Succeeded'
  if (status === 'failed') return 'Failed'
  return 'Running'
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('es', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default App
