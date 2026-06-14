import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { formatRupiah } from '@/lib/menu-data'
import { Badge, Card, PageHeader } from '@/components/admin/UI'
import type { OrderItem } from '@/types'

function startOfToday() { const date = new Date(); date.setHours(0, 0, 0, 0); return date }

export default async function AdminDashboardPage() {
  const today = startOfToday()
  const [menuActive, categories, ordersToday, pending, paid, revenue, recent, paidOrders, audits] = await prisma.$transaction([
    prisma.menuItem.count({ where: { isActive: true } }), prisma.category.count(), prisma.order.count({ where: { createdAt: { gte: today } } }),
    prisma.order.count({ where: { paymentStatus: 'UNPAID' } }), prisma.order.count({ where: { paymentStatus: 'PAID', paidAt: { gte: today } } }),
    prisma.order.aggregate({ where: { paymentStatus: 'PAID', paidAt: { gte: today } }, _sum: { total: true } }),
    prisma.order.findMany({ orderBy: { createdAt: 'desc' }, take: 6 }),
    prisma.order.findMany({ where: { paymentStatus: 'PAID' }, select: { itemsJson: true } }),
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
  ])

  const sales = new Map<string, number>()
  paidOrders.forEach(({ itemsJson }) => { try { (JSON.parse(itemsJson) as OrderItem[]).forEach((item) => sales.set(item.nameSnapshot, (sales.get(item.nameSnapshot) ?? 0) + item.quantity)) } catch {} })
  const best = Array.from(sales.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  const stats = [
    ['Menu Aktif', menuActive, 'amber'], ['Kategori', categories, 'blue'], ['Order Hari Ini', ordersToday, 'green'],
    ['Menunggu Bayar', pending, 'red'], ['Sudah Dibayar', paid, 'green'], ['Pemasukan Hari Ini', formatRupiah(revenue._sum.total ?? 0), 'amber'],
  ] as const

  return <div><PageHeader title="Ringkasan operasional" description="Pantau performa cafe dan tindakan penting hari ini." action={<div className="flex gap-2"><Link href="/cashier" className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold">Buka Kasir</Link><Link href="/admin/menu" className="rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-bold text-slate-950">Kelola Menu</Link></div>}/>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{stats.map(([label, value, tone]) => <Card key={label} className="p-5"><div className="flex items-start justify-between"><div><p className="text-sm font-medium text-slate-500">{label}</p><p className="mt-3 text-2xl font-bold tracking-tight text-slate-950">{value}</p></div><span className={`h-3 w-3 rounded-full ${tone === 'green' ? 'bg-emerald-500' : tone === 'red' ? 'bg-red-500' : tone === 'blue' ? 'bg-blue-500' : 'bg-amber-500'}`}/></div></Card>)}</div>
    <div className="mt-6 grid gap-6 xl:grid-cols-[1.7fr_1fr]">
      <Card><div className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><div><h2 className="font-bold text-slate-900">Order terbaru</h2><p className="text-xs text-slate-500">Aktivitas transaksi paling baru</p></div><Link href="/admin/reports" className="text-sm font-semibold text-amber-700">Lihat laporan</Link></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="px-5 py-3">Order</th><th className="px-5 py-3">Pelanggan</th><th className="px-5 py-3">Status</th><th className="px-5 py-3 text-right">Total</th></tr></thead><tbody className="divide-y divide-slate-100">{recent.map((order) => <tr key={order.id}><td className="px-5 py-4 font-semibold text-slate-900">{order.orderNumber}</td><td className="px-5 py-4 text-slate-600">{order.customerName}<span className="block text-xs text-slate-400">{order.tableId || 'Take away'}</span></td><td className="px-5 py-4"><Badge tone={order.paymentStatus === 'PAID' ? 'green' : 'amber'}>{order.paymentStatus}</Badge></td><td className="px-5 py-4 text-right font-semibold">{formatRupiah(order.total)}</td></tr>)}</tbody></table></div></Card>
      <div className="space-y-6"><Card className="p-5"><h2 className="font-bold text-slate-900">Menu terlaris</h2><div className="mt-4 space-y-3">{best.length ? best.map(([name, qty], index) => <div key={name} className="flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-xs font-bold">{index + 1}</span><span className="flex-1 text-sm font-medium text-slate-700">{name}</span><span className="text-sm font-bold text-slate-900">{qty}</span></div>) : <p className="text-sm text-slate-500">Belum ada data penjualan.</p>}</div></Card>
      <Card className="p-5"><h2 className="font-bold text-slate-900">Aktivitas terbaru</h2><div className="mt-4 space-y-3">{audits.map((log) => <div key={log.id} className="border-l-2 border-amber-400 pl-3"><p className="text-sm font-medium text-slate-700">{log.action} {log.entity}</p><p className="text-xs text-slate-400">{log.userName ?? 'System'} · {log.createdAt.toLocaleString('id-ID')}</p></div>)}</div></Card></div>
    </div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{[['Menu & kategori','/admin/menu'],['Promo','/admin/promos'],['Kitchen','/kitchen/display'],['Meja & QR','/admin/tables']].map(([label, href]) => <Link key={href} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm font-bold text-slate-800 shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300">{label}<span className="float-right text-amber-600">→</span></Link>)}</div>
  </div>
}
