export type PipelineRun = {
  id: number
  query: string
  status: 'running' | 'succeeded' | 'failed'
  started_at: string
  finished_at: string | null
  records_fetched: number
  records_inserted: number
  records_skipped: number
  error_message: string | null
}

export type Track = {
  id: number
  source: string
  external_id: string
  title: string
  artist_name: string
  album_name: string | null
  release_date: string | null
  artwork_url: string | null
  source_url: string | null
  collected_at: string
}

export type Dashboard = {
  metrics: {
    total_tracks: number
    unique_artists: number
    total_runs: number
    last_run: PipelineRun | null
  }
  activity: (Pick<PipelineRun, 'id' | 'query' | 'status' | 'started_at' | 'records_inserted'>)[]
  recent_tracks: Track[]
}

export type PageResponse<T> = {
  items: T[]
  pagination: {
    page: number
    per_page: number
    total: number
    pages: number
  }
}
