import Link from 'next/link'
import { LoginForm } from '@/features/auth/components/login-form'

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Lo<span className="text-[#b5f23d]">Boost</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm">Ingresá a tu cuenta</p>
        </div>

        <LoginForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="text-[#b5f23d] hover:underline">
            Registrate como coach
          </Link>
        </p>
      </div>
    </main>
  )
}
