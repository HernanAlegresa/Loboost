'use client'

import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { RotateCcw, Smartphone } from 'lucide-react'

type MaybeScreenOrientation = ScreenOrientation & {
  lock?: (orientation: 'portrait') => Promise<void>
}

/**
 * Best-effort portrait lock for installed app contexts.
 * Some browsers (notably iOS) may ignore this API; failures are intentionally silent.
 */
export default function OrientationLock() {
  const [isLandscape, setIsLandscape] = useState(false)
  const [isMobileLike, setIsMobileLike] = useState(false)

  useEffect(() => {
    async function lockPortrait() {
      try {
        const orientation = screen.orientation as MaybeScreenOrientation | undefined
        if (!orientation?.lock) return
        await orientation.lock('portrait')
      } catch {
        // No-op: unsupported or blocked by platform policy.
      }
    }

    void lockPortrait()
    window.addEventListener('orientationchange', lockPortrait)
    return () => window.removeEventListener('orientationchange', lockPortrait)
  }, [])

  useEffect(() => {
    const orientationQuery = window.matchMedia('(orientation: landscape)')
    const mobileQuery = window.matchMedia('(pointer: coarse) and (max-width: 1024px)')

    function sync() {
      setIsLandscape(orientationQuery.matches)
      setIsMobileLike(mobileQuery.matches)
    }

    sync()
    orientationQuery.addEventListener('change', sync)
    mobileQuery.addEventListener('change', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    return () => {
      orientationQuery.removeEventListener('change', sync)
      mobileQuery.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
    }
  }, [])

  const shouldBlock = useMemo(() => isMobileLike && isLandscape, [isLandscape, isMobileLike])

  return (
    <AnimatePresence>
      {shouldBlock ? (
        <motion.div
          key="orientation-guard"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            backgroundColor: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            initial={{ y: 12, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
            style={{
              width: '100%',
              maxWidth: 360,
              borderRadius: 18,
              border: '1px solid #1F2227',
              backgroundColor: '#111317',
              padding: '22px 18px',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                marginBottom: 12,
              }}
            >
              <Smartphone size={21} color="#B5F23D" />
              <RotateCcw size={18} color="#B5F23D" />
            </div>

            <p style={{ margin: 0, fontSize: 17, fontWeight: 700, color: '#F0F0F0', lineHeight: 1.3 }}>
              Girá el celular a vertical
            </p>
            <p style={{ margin: '8px 0 0', fontSize: 13, color: '#9CA3AF', lineHeight: 1.45 }}>
              Para una mejor experiencia en LoBoost, usá la app en formato retrato.
            </p>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
