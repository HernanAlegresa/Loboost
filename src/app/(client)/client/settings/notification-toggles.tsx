'use client'

import { useState, useTransition } from 'react'
import { saveNotificationPrefsAction } from '@/features/training/actions/save-notification-prefs'
import type { NotificationPrefs } from '@/features/training/types'

function Toggle({
  label,
  sublabel,
  checked,
  onChange,
}: {
  label: string
  sublabel?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '14px 0',
      }}
    >
      <div>
        <p style={{ fontSize: 14, color: '#F0F0F0' }}>{label}</p>
        {sublabel && (
          <p style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{sublabel}</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        style={{
          width: 44,
          height: 26,
          borderRadius: 9999,
          backgroundColor: checked ? '#B5F23D' : '#1F2227',
          border: 'none',
          cursor: 'pointer',
          position: 'relative',
          flexShrink: 0,
          transition: 'background-color 0.15s',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 3,
            left: checked ? 21 : 3,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: checked ? '#0A0A0A' : '#4B5563',
            transition: 'left 0.15s',
          }}
        />
      </button>
    </div>
  )
}

export default function NotificationToggles({
  initial,
}: {
  initial: NotificationPrefs
}) {
  const [reminders, setReminders] = useState(initial.reminders)
  const [coachMsgs, setCoachMsgs] = useState(initial.coachMsgs)
  const [isPending, startTransition] = useTransition()
  const [saved, setSaved] = useState(false)

  function handleChange(field: 'reminders' | 'coachMsgs', value: boolean) {
    if (field === 'reminders') setReminders(value)
    else setCoachMsgs(value)

    setSaved(false)
    startTransition(async () => {
      const r = field === 'reminders' ? value : reminders
      const c = field === 'coachMsgs' ? value : coachMsgs
      await saveNotificationPrefsAction(r, c)
      setSaved(true)
    })
  }

  return (
    <div>
      <Toggle
        label="Recordatorios de entrenamiento"
        sublabel="Recordatorio diario en días de entrenamiento"
        checked={reminders}
        onChange={(v) => handleChange('reminders', v)}
      />
      <div style={{ height: 1, backgroundColor: '#1F2227' }} />
      <Toggle
        label="Mensajes del coach"
        sublabel="Notificaciones cuando tu coach escribe"
        checked={coachMsgs}
        onChange={(v) => handleChange('coachMsgs', v)}
      />
      {saved && !isPending && (
        <p style={{ fontSize: 11, color: '#B5F23D', marginTop: 4 }}>Preferencias guardadas</p>
      )}
    </div>
  )
}
