import Link from 'next/link'
import { RegisterForm } from '@/features/auth/components/register-form'
import { SAFE_AREA_BOTTOM, SAFE_AREA_TOP } from '@/lib/ui/safe-area'

export default function RegisterPage() {
  return (
    <main
      className="min-h-dvh bg-[#0a0a0a] flex flex-col items-center justify-center px-4"
      style={{
        paddingTop: `calc(max(32px, ${SAFE_AREA_TOP}))`,
        paddingBottom: `calc(max(32px, ${SAFE_AREA_BOTTOM}))`,
        overflowY: 'auto',
      }}
    >
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Lo<span className="text-[#b5f23d]">Boost</span>
          </h1>
          <p className="mt-2 text-gray-400 text-sm">Creá tu cuenta como coach</p>
        </div>

        <RegisterForm />

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="text-[#b5f23d] hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </main>
  )
}
