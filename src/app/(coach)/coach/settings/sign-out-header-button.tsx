'use client'

import { useState, useEffect } from 'react'
import { LogOut } from 'lucide-react'
import { signOut } from '@/features/auth/actions/sign-out'

export default function SignOutHeaderButton() {
  const [confirming, setConfirming] = useState(false)

  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3000)
    return () => clearTimeout(timer)
  }, [confirming])

  return (
    <form action={signOut} style={{ display: 'flex', alignItems: 'center' }}>
      <button
        type={confirming ? 'submit' : 'button'}
        onClick={(e) => {
          if (!confirming) {
            e.preventDefault()
            setConfirming(true)
          }
        }}
        style={{
          background: 'transparent',
          border: 'none',
          padding: '4px',
          color: '#F25252',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {confirming ? (
          <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.02em', padding: '0 4px' }}>
            Cerrar sesión
          </span>
        ) : (
          <LogOut size={20} strokeWidth={2.5} />
        )}
      </button>
    </form>
  )
}
