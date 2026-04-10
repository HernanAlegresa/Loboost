'use client'

import { useState, useTransition } from 'react'
import { saveCoachNoteAction } from './actions'

const SECTION_TITLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  color: '#6B7280',
  letterSpacing: '0.1em',
  textTransform: 'uppercase',
  marginBottom: 12,
}

type Props = {
  clientId: string
  initialNote: string
}

export default function CoachNotes({ clientId, initialNote }: Props) {
  const [savedNote, setSavedNote] = useState(initialNote)
  const [draft, setDraft] = useState(initialNote)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSave() {
    startTransition(async () => {
      const result = await saveCoachNoteAction(clientId, draft)
      if (result.success) {
        setSavedNote(draft)
        setEditing(false)
        setError(null)
      } else {
        setError(result.error ?? 'Error al guardar')
      }
    })
  }

  function handleCancel() {
    setDraft(savedNote)
    setEditing(false)
    setError(null)
  }

  return (
    <div>
      <p style={SECTION_TITLE}>Notas internas</p>

      <div
        style={{
          backgroundColor: '#111317',
          border: '1px solid #1F2227',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        {editing ? (
          <>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Escribi tus notas sobre este cliente..."
              style={{
                width: '100%',
                minHeight: 100,
                backgroundColor: 'transparent',
                border: 'none',
                outline: 'none',
                color: '#F0F0F0',
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                fontFamily: 'inherit',
                boxSizing: 'border-box',
              }}
            />
            {error && <p style={{ fontSize: 12, color: '#F25252', marginTop: 8 }}>{error}</p>}
            <div
              style={{
                display: 'flex',
                gap: 8,
                marginTop: 12,
                justifyContent: 'flex-end',
              }}
            >
              <button
                type="button"
                onClick={handleCancel}
                disabled={isPending}
                style={{
                  fontSize: 13,
                  color: '#6B7280',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px 12px',
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isPending}
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: '#0A0A0A',
                  backgroundColor: isPending ? '#8BA82B' : '#B5F23D',
                  border: 'none',
                  borderRadius: 8,
                  cursor: isPending ? 'not-allowed' : 'pointer',
                  padding: '6px 16px',
                }}
              >
                {isPending ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </>
        ) : (
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <p
              style={{
                fontSize: 14,
                color: savedNote ? '#F0F0F0' : '#4B5563',
                lineHeight: 1.6,
                flex: 1,
                fontStyle: savedNote ? 'normal' : 'italic',
              }}
            >
              {savedNote || 'Sin notas. Toca Editar para agregar.'}
            </p>
            <button
              type="button"
              onClick={() => setEditing(true)}
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: '#B5F23D',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                flexShrink: 0,
                padding: '2px 0',
              }}
            >
              Editar
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
