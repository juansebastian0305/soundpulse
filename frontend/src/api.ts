import type { Dashboard, PageResponse, PipelineRun, Track } from './types'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:5000/api/v1'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
  const payload = await response.json()
  if (!response.ok) {
    const message = payload?.error?.message ?? 'The request could not be completed.'
    throw new Error(message)
  }
  return payload as T
}

export async function getHealth() {
  return request<{ status: string; database: string }>('/health')
}

export async function getDashboard() {
  return request<Dashboard>('/dashboard')
}

export async function getTracks(query = '', page = 1, perPage = 20) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) })
  if (query) params.set('q', query)
  return request<PageResponse<Track>>(`/tracks?${params.toString()}`)
}

export async function getPipelineRuns() {
  return request<PageResponse<PipelineRun>>('/pipelines/runs?page=1&per_page=100')
}

export async function getPipelineRun(id: number) {
  const response = await request<{ run: PipelineRun }>(`/pipelines/runs/${id}`)
  return response.run
}

export async function runPipeline(query: string) {
  const response = await request<{ run: PipelineRun }>('/pipelines/run', {
    method: 'POST',
    body: JSON.stringify({ query }),
  })
  return response.run
}
