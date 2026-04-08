import { getCurrentUser } from '@/lib/auth/session'

export default async function ClientDashboardPage() {
  const user = await getCurrentUser()

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Mi entrenamiento</h1>
      <p className="text-gray-400 text-sm">
        Bienvenido, {user?.email}
      </p>
      <div className="mt-8 p-6 bg-[#141414] rounded-xl border border-[#1e1e1e]">
        <p className="text-gray-500 text-sm">
          Panel del cliente — próximamente: tus planes de entrenamiento y progreso.
        </p>
      </div>
    </div>
  )
}
