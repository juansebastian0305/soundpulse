import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { Dashboard } from '../types'

type ActivityPoint = Dashboard['activity'][number] & { label: string }

export default function CollectionChart({ data }: { data: ActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="trackGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ad8bff" stopOpacity={0.28} />
            <stop offset="95%" stopColor="#ad8bff" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#292925" strokeDasharray="3 5" vertical={false} />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: '#77766f', fontSize: 11 }} dy={10} />
        <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: '#77766f', fontSize: 11 }} />
        <Tooltip
          contentStyle={{ background: '#1b1b18', border: '1px solid #35352e', borderRadius: 10, color: '#f5f2e9', fontSize: 12 }}
          labelStyle={{ color: '#a8a69c' }}
        />
        <Area type="monotone" dataKey="records_inserted" name="New tracks" stroke="#b69bff" strokeWidth={2} fill="url(#trackGradient)" />
      </AreaChart>
    </ResponsiveContainer>
  )
}
