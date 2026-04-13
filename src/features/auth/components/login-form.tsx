'use client'

import { useActionState } from 'react'
import { signIn } from '@/features/auth/actions/sign-in'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(signIn, null)

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full">
      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm text-gray-400">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="tu@email.com"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm text-gray-400">
          Contraseña
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-[#b5f23d] transition-colors"
          placeholder="••••••••"
        />
      </div>

      {state?.error && (
        <p className="text-red-400 text-sm">{state.error}</p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-[#b5f23d] text-black font-semibold rounded-lg px-4 py-3 hover:bg-[#c8ff55] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {pending ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  )
}
