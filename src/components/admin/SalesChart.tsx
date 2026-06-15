import { formatRupiah } from '@/lib/menu-data'

export interface SalesPoint {
  label: string
  revenue: number
  orders: number
}

export function SalesChart({ data }: { data: SalesPoint[] }) {
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1)
  const maxOrders = Math.max(...data.map((point) => point.orders), 1)
  const width = 700
  const height = 230
  const paddingX = 34
  const paddingY = 24
  const plotWidth = width - paddingX * 2
  const plotHeight = height - paddingY * 2
  const step = data.length > 1 ? plotWidth / (data.length - 1) : plotWidth
  const linePoints = data
    .map((point, index) => {
      const x = paddingX + step * index
      const y = paddingY + plotHeight - (point.orders / maxOrders) * plotHeight
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-500">
        <span className="inline-flex items-center gap-2"><i className="h-2.5 w-5 rounded-sm bg-amber-500" />Omzet</span>
        <span className="inline-flex items-center gap-2"><i className="h-0.5 w-5 bg-slate-900" />Jumlah order</span>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[620px]">
          <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" role="img" aria-label="Grafik omzet dan jumlah order tujuh hari terakhir">
            {[0, 1, 2, 3, 4].map((row) => {
              const y = paddingY + (plotHeight / 4) * row
              return <line key={row} x1={paddingX} x2={width - paddingX} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
            })}
            {data.map((point, index) => {
              const barWidth = 42
              const xCenter = paddingX + step * index
              const barHeight = Math.max(3, (point.revenue / maxRevenue) * plotHeight)
              return (
                <g key={point.label}>
                  <rect x={xCenter - barWidth / 2} y={paddingY + plotHeight - barHeight} width={barWidth} height={barHeight} rx="7" fill="#f59e0b" opacity="0.9" />
                  <text x={xCenter} y={height - 4} textAnchor="middle" className="fill-slate-500 text-[11px] font-semibold">{point.label}</text>
                </g>
              )
            })}
            <polyline points={linePoints} fill="none" stroke="#0f1f33" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {data.map((point, index) => {
              const x = paddingX + step * index
              const y = paddingY + plotHeight - (point.orders / maxOrders) * plotHeight
              return <circle key={point.label} cx={x} cy={y} r="5" fill="white" stroke="#0f1f33" strokeWidth="3" />
            })}
          </svg>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-4">
        <div><p className="text-xs text-slate-500">Omzet 7 hari</p><p className="mt-1 font-bold text-slate-950">{formatRupiah(data.reduce((sum, point) => sum + point.revenue, 0))}</p></div>
        <div><p className="text-xs text-slate-500">Total order</p><p className="mt-1 font-bold text-slate-950">{data.reduce((sum, point) => sum + point.orders, 0)}</p></div>
        <div><p className="text-xs text-slate-500">Hari terbaik</p><p className="mt-1 font-bold text-slate-950">{data.reduce((best, point) => point.revenue > best.revenue ? point : best, data[0]).label}</p></div>
        <div><p className="text-xs text-slate-500">Rata-rata harian</p><p className="mt-1 font-bold text-slate-950">{formatRupiah(data.reduce((sum, point) => sum + point.revenue, 0) / Math.max(data.length, 1))}</p></div>
      </div>
    </div>
  )
}
