'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronDown } from 'lucide-react'

export type SelectOption = { value: string; label: string }

type CustomSelectPropsBase = {
  options: SelectOption[]
  placeholder?: string
  required?: boolean
}

/** FormData: valor solo interno + input hidden con `name`. */
export type CustomSelectUncontrolledProps = CustomSelectPropsBase & {
  name: string
  defaultValue?: string
}

/** Estado en el padre; opcional `name` para un hidden en formularios. */
export type CustomSelectControlledProps = CustomSelectPropsBase & {
  value: string
  onChange: (value: string) => void
  name?: string
}

export type CustomSelectProps = CustomSelectUncontrolledProps | CustomSelectControlledProps

function isControlled(props: CustomSelectProps): props is CustomSelectControlledProps {
  return 'onChange' in props && typeof props.onChange === 'function'
}

export default function CustomSelect(props: CustomSelectProps) {
  const { options, placeholder = 'Seleccioná...', required } = props
  const controlled = isControlled(props)

  const [open, setOpen] = useState(false)
  const [internalSelected, setInternalSelected] = useState<SelectOption | null>(() => {
    if (controlled) return null
    const def = props.defaultValue ?? ''
    return def ? (options.find((o) => o.value === def) ?? null) : null
  })

  const selected = controlled
    ? (options.find((o) => o.value === props.value) ?? null)
    : internalSelected

  const hiddenValue = controlled ? props.value : (internalSelected?.value ?? '')
  const formName = controlled
    ? props.name
    : (props as CustomSelectUncontrolledProps).name

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function pick(option: SelectOption) {
    if (controlled) {
      props.onChange(option.value)
    } else {
      setInternalSelected(option)
    }
    setOpen(false)
  }

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 40 : 'auto' }}>
      {(!controlled || formName) && (
        <input type="hidden" name={formName as string} value={hiddenValue} required={required} />
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          width: '100%',
          height: 44,
          backgroundColor: '#111317',
          border: `1px solid ${open ? '#B5F23D' : '#2A2D34'}`,
          borderRadius: open ? '10px 10px 0 0' : 10,
          padding: '0 14px',
          color: selected ? '#F0F0F0' : '#4B5563',
          fontSize: 15,
          outline: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          boxSizing: 'border-box',
          transition: 'border-color 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {selected?.label ?? placeholder}
        </span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.15 }}
          style={{ flexShrink: 0, marginLeft: 8 }}
        >
          <ChevronDown size={16} color="#B5F23D" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              maxHeight: 'min(50vh, 280px)',
              overflowY: 'auto',
              backgroundColor: '#111317',
              border: '1px solid #B5F23D',
              borderTop: 'none',
              borderRadius: '0 0 10px 10px',
              overflowX: 'hidden',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}
          >
            {options.map((option, i) => {
              const isSelected = selected?.value === option.value
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => pick(option)}
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    backgroundColor: isSelected ? 'rgba(181,242,61,0.08)' : 'transparent',
                    color: isSelected ? '#B5F23D' : '#F0F0F0',
                    fontSize: 15,
                    border: 'none',
                    borderTop: i > 0 ? '1px solid #1A1D22' : 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    textAlign: 'left',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'rgba(255,255,255,0.04)'
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
                  }}
                >
                  <span>{option.label}</span>
                  {isSelected && <Check size={14} color="#B5F23D" strokeWidth={2.5} />}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
