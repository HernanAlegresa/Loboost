import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { getUserRole } from '@/lib/auth/roles'
import { signOut } from '@/features/auth/actions/sign-out'

export default async function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = await getUserRole()
  if (role !== 'client') redirect('/coach/dashboard')

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <header className="border-b border-[#1a1a1a] px-6 py-4 flex items-center justify-between">
        <span className="text-xl font-bold text-white">
          Lo<span className="text-[#b5f23d]">Boost</span>
        </span>
        <form action={signOut}>
          <button
            type="submit"
            className="text-sm text-gray-400 hover:text-white transition-colors"
          >
            Salir
          </button>
        </form>
      </header>
      <main className="px-6 py-8">{children}</main>
    </div>
  )
}
