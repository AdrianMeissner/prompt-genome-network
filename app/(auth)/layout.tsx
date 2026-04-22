import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      {/* Nav */}
      <nav className="border-b border-[#1e1e2e] px-6 py-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 rounded-lg bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            PG
          </div>
          <span className="font-semibold text-lg text-[#e8e8f0]">Prompt Genome</span>
        </Link>
      </nav>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        {children}
      </div>
    </div>
  )
}
