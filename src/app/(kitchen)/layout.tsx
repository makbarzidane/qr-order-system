export default function KitchenLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="bg-gray-800 border-b border-gray-700 px-6 py-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">🍳</span>
          <div>
            <h1 className="text-lg font-bold text-white">Kitchen Display</h1>
            <p className="text-xs text-gray-400">Hanya menampilkan order yang sudah PAID</p>
          </div>
        </div>
      </header>
      <main className="p-6">{children}</main>
    </div>
  )
}
