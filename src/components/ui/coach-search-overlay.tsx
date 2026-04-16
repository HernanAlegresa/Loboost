'use client'

import React, {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, ChevronRight, Dumbbell, Search, Users, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  COACH_HEADER_TOTAL_HEIGHT,
  SAFE_BOTTOM_NAV_HEIGHT,
} from '@/lib/ui/safe-area'

// ─── Types ────────────────────────────────────────────────────────────────────

type ClientItem = { id: string; fullName: string }
type ExerciseItem = { id: string; name: string; category: string; muscle_group: string }
type PlanItem = { id: string; name: string; weeks: number }

type LoadedData = {
  exercises: ExerciseItem[]
  plans: PlanItem[]
}

type SearchResults = {
  clients: ClientItem[]
  exercises: ExerciseItem[]
  plans: PlanItem[]
  total: number
}

export type Props = {
  coachId: string
  clients: ClientItem[]
}

const SEARCH_OVERLAY_Z = 45

/** Rojo suave para “Cancelar”, legible sin gritar. */
const CANCEL_SOFT_RED = '#E57373'

// ─── Highlight matching substring ─────────────────────────────────────────────

function HighlightMatch({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <>{text}</>
  return (
    <>
      {text.slice(0, idx)}
      <span style={{ color: '#B5F23D', fontWeight: 700 }}>
        {text.slice(idx, idx + query.length)}
      </span>
      {text.slice(idx + query.length)}
    </>
  )
}

// ─── Result row ───────────────────────────────────────────────────────────────

function ResultRow({
  href,
  label,
  sublabel,
  query,
  onNavigate,
}: {
  href: string
  label: string
  sublabel?: string
  query: string
  onNavigate: () => void
}) {
  return (
    <motion.div whileTap={{ opacity: 0.6, scale: 0.99 }} transition={{ duration: 0.08 }}>
      <Link
        href={href}
        onClick={onNavigate}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '13px 20px',
          textDecoration: 'none',
          borderBottom: '1px solid rgba(31, 34, 39, 0.5)',
          transition: 'background-color 100ms ease',
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 500,
              color: '#F0F0F0',
              lineHeight: 1.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            <HighlightMatch text={label} query={query} />
          </p>
          {sublabel ? (
            <p
              style={{
                margin: '3px 0 0',
                fontSize: 12,
                color: '#6B7280',
                lineHeight: 1.3,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {sublabel}
            </p>
          ) : null}
        </div>
        <ChevronRight size={16} color="#3D3F45" style={{ flexShrink: 0 }} />
      </Link>
    </motion.div>
  )
}

// ─── Section header ───────────────────────────────────────────────────────────

type LucideIconProps = React.ComponentProps<typeof Users>
type IconComponent = (props: LucideIconProps) => React.ReactElement

function SectionHeader({ label, Icon }: { label: string; Icon: IconComponent }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        padding: '16px 20px 7px',
      }}
    >
      <Icon size={12} color="#6B7280" />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: '#6B7280',
          letterSpacing: '0.09em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
    </div>
  )
}

// ─── Empty / hint states ──────────────────────────────────────────────────────

function SearchHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1, duration: 0.22 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 72,
        gap: 10,
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 16,
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Search size={24} color="#2A2D34" />
      </div>
      <p style={{ fontSize: 14, color: '#3D3F45', margin: 0, textAlign: 'center' }}>
        Buscá clientes, ejercicios o planes
      </p>
    </motion.div>
  )
}

function NoResults({ query }: { query: string }) {
  return (
    <div
      style={{
        padding: '56px 24px',
        textAlign: 'center',
      }}
    >
      <p style={{ fontSize: 15, color: '#4B5563', margin: '0 0 6px' }}>Sin resultados</p>
      <p style={{ fontSize: 13, color: '#3D3F45', margin: 0 }}>
        Nada coincide con{' '}
        <span style={{ color: '#6B7280', fontStyle: 'italic' }}>&ldquo;{query}&rdquo;</span>
      </p>
    </div>
  )
}

// ─── Overlay inner content ────────────────────────────────────────────────────

function OverlayContent({
  coachId,
  clients,
  onClose,
}: {
  coachId: string
  clients: ClientItem[]
  onClose: () => void
}) {
  const [rawQuery, setRawQuery] = useState('')
  const [loadedData, setLoadedData] = useState<LoadedData | null>(null)
  const [loadingData, setLoadingData] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (loadedData || loadingData) return
    setLoadingData(true)
    const supabase = createClient()
    Promise.all([
      supabase
        .from('exercises')
        .select('id, name, category, muscle_group')
        .eq('coach_id', coachId)
        .order('name'),
      supabase
        .from('plans')
        .select('id, name, weeks')
        .eq('coach_id', coachId)
        .order('created_at', { ascending: false }),
    ]).then(([exRes, planRes]) => {
      setLoadedData({
        exercises: (exRes.data ?? []) as ExerciseItem[],
        plans: (planRes.data ?? []) as PlanItem[],
      })
      setLoadingData(false)
    })
  }, [loadedData, loadingData, coachId])

  const query = useDeferredValue(rawQuery)

  const results = useMemo<SearchResults | null>(() => {
    const q = query.trim().toLowerCase()
    if (!q) return null

    const matchedClients = clients
      .filter((c) => c.fullName.toLowerCase().includes(q))
      .slice(0, 6)

    const matchedExercises = (loadedData?.exercises ?? [])
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.muscle_group.toLowerCase().includes(q)
      )
      .slice(0, 6)

    const matchedPlans = (loadedData?.plans ?? [])
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, 6)

    return {
      clients: matchedClients,
      exercises: matchedExercises,
      plans: matchedPlans,
      total: matchedClients.length + matchedExercises.length + matchedPlans.length,
    }
  }, [query, clients, loadedData])

  const showHint = !rawQuery.trim()
  const showNoResults = results !== null && results.total === 0

  return (
    <>
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -8, opacity: 0 }}
        transition={{ duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] }}
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '12px 16px',
          borderBottom: '1px solid #1F2227',
          backgroundColor: '#0A0A0A',
        }}
      >
        <Search size={24} color="#FFFFFF" strokeWidth={2.25} style={{ flexShrink: 0 }} />

        <div
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#111317',
            border: '1px solid #2A2D34',
            borderRadius: 12,
            padding: '0 12px',
            minHeight: 42,
            boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
          }}
        >
          <input
            ref={inputRef}
            type="text"
            value={rawQuery}
            onChange={(e) => setRawQuery(e.target.value)}
            placeholder="Clientes, ejercicios, planes…"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              outline: 'none',
              fontSize: 16,
              fontWeight: 400,
              color: '#F0F0F0',
              caretColor: '#B5F23D',
              fontFamily: 'inherit',
              padding: '10px 0',
            }}
          />
        </div>

        <AnimatePresence>
          {rawQuery.length > 0 && (
            <motion.button
              key="clear"
              type="button"
              onClick={() => {
                setRawQuery('')
                inputRef.current?.focus()
              }}
              aria-label="Limpiar búsqueda"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.12 }}
              whileTap={{ scale: 0.88 }}
              style={{
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 28,
                height: 28,
                borderRadius: 9999,
                backgroundColor: '#252A31',
                border: 'none',
                cursor: 'pointer',
                color: '#9CA3AF',
              }}
            >
              <X size={13} strokeWidth={2.5} />
            </motion.button>
          )}
        </AnimatePresence>

        <motion.button
          type="button"
          onClick={onClose}
          whileTap={{ opacity: 0.65 }}
          transition={{ duration: 0.08 }}
          style={{
            flexShrink: 0,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
            color: CANCEL_SOFT_RED,
            padding: '8px 4px',
            fontFamily: 'inherit',
            letterSpacing: '0.01em',
          }}
        >
          Cancelar
        </motion.button>
      </motion.div>

      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
          backgroundColor: '#0A0A0A',
          paddingBottom: 24,
        }}
      >
        {showHint && <SearchHint />}

        {showNoResults && <NoResults query={rawQuery} />}

        {!loadedData && loadingData && query.trim() && (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: 0 }}>Cargando…</p>
          </div>
        )}

        <AnimatePresence mode="wait">
          {results && results.total > 0 && (
            <motion.div
              key={query}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.14 }}
            >
              {results.clients.length > 0 && (
                <section>
                  <SectionHeader label="Clientes" Icon={Users as IconComponent} />
                  {results.clients.map((c) => (
                    <ResultRow
                      key={c.id}
                      href={`/coach/clients/${c.id}`}
                      label={c.fullName}
                      query={query}
                      onNavigate={onClose}
                    />
                  ))}
                </section>
              )}

              {results.exercises.length > 0 && (
                <section>
                  <SectionHeader label="Ejercicios" Icon={Dumbbell as IconComponent} />
                  {results.exercises.map((e) => {
                    const sublabel = [e.muscle_group, e.category]
                      .filter(Boolean)
                      .join(' · ')
                    return (
                      <ResultRow
                        key={e.id}
                        href={`/coach/library/exercises/${e.id}/edit`}
                        label={e.name}
                        sublabel={sublabel || undefined}
                        query={query}
                        onNavigate={onClose}
                      />
                    )
                  })}
                </section>
              )}

              {results.plans.length > 0 && (
                <section>
                  <SectionHeader label="Planes" Icon={BookOpen as IconComponent} />
                  {results.plans.map((p) => (
                    <ResultRow
                      key={p.id}
                      href={`/coach/library/plans/${p.id}`}
                      label={p.name}
                      sublabel={`${p.weeks} ${p.weeks === 1 ? 'semana' : 'semanas'}`}
                      query={query}
                      onNavigate={onClose}
                    />
                  ))}
                </section>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function CoachSearchOverlay({ coachId, clients }: Props) {
  const [open, setOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const pathname = usePathname()

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const handleClose = useCallback(() => setOpen(false), [])

  const overlay = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="coach-search-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.14, ease: [0.4, 0, 0.2, 1] }}
            onClick={handleClose}
            style={{
              position: 'fixed',
              top: COACH_HEADER_TOTAL_HEIGHT,
              left: 0,
              right: 0,
              bottom: SAFE_BOTTOM_NAV_HEIGHT,
              zIndex: SEARCH_OVERLAY_Z,
              backgroundColor: 'rgba(10, 10, 10, 0.92)',
              backdropFilter: 'blur(16px) saturate(130%)',
              WebkitBackdropFilter: 'blur(16px) saturate(130%)',
            }}
          />
          <motion.div
            key="coach-search-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Búsqueda"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: COACH_HEADER_TOTAL_HEIGHT,
              left: 0,
              right: 0,
              bottom: SAFE_BOTTOM_NAV_HEIGHT,
              zIndex: SEARCH_OVERLAY_Z + 1,
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'none',
              boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
            }}
          >
            <div style={{ pointerEvents: 'auto', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
              <OverlayContent coachId={coachId} clients={clients} onClose={handleClose} />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )

  return (
    <>
      <motion.button
        type="button"
        aria-label="Buscar"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen(true)}
        whileTap={{ scale: 0.88, opacity: 0.7 }}
        transition={{ duration: 0.1 }}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 10,
          borderRadius: 10,
          minWidth: 44,
          minHeight: 44,
        }}
      >
        <Search size={24} color="#FFFFFF" strokeWidth={2.25} />
      </motion.button>

      {mounted && createPortal(overlay, document.body)}
    </>
  )
}
