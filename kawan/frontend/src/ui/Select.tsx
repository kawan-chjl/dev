// Select — custom themed listbox. No native <select>, no external dep.
// role="listbox" / role="option", aria-expanded, keyboard: Up/Down/Enter/Escape/Home/End.
// Controlled via value + onChange. Light + dark via design tokens.

import { ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  disabled?: boolean
  'aria-label'?: string
  className?: string
}

export function Select({
  value,
  onChange,
  options,
  disabled = false,
  'aria-label': ariaLabel,
  className = ''
}: SelectProps) {
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState<number>(() =>
    Math.max(
      0,
      options.findIndex((o) => o.value === value)
    )
  )
  const triggerId = useId()
  const listId = useId()
  const optionIdPrefix = useId()
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const currentLabel = options.find((o) => o.value === value)?.label ?? value

  // Sync activeIdx when value changes externally
  useEffect(() => {
    const idx = options.findIndex((o) => o.value === value)
    if (idx >= 0) setActiveIdx(idx)
  }, [value, options])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [open])

  // Move focus into the listbox on open so keyboard users can arrow through options.
  // The list div holds the keyDown handler; focusing it is required for it to fire.
  useEffect(() => {
    if (open && listRef.current) {
      listRef.current.focus()
    }
  }, [open])

  // Scroll active option into view as activeIdx changes (keyboard navigation).
  // biome-ignore lint/correctness/useExhaustiveDependencies: activeIdx drives the DOM query indirectly via data-active attr
  useEffect(() => {
    if (!open || !listRef.current) return
    const activeEl = listRef.current.querySelector<HTMLDivElement>(`[data-active="true"]`)
    activeEl?.scrollIntoView({ block: 'nearest' })
  }, [open, activeIdx])

  function handleTriggerKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return
    if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setOpen(true)
    }
  }

  function handleListKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIdx((i) => Math.min(i + 1, options.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIdx((i) => Math.max(i - 1, 0))
      return
    }
    if (e.key === 'Home') {
      e.preventDefault()
      setActiveIdx(0)
      return
    }
    if (e.key === 'End') {
      e.preventDefault()
      setActiveIdx(options.length - 1)
      return
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (options[activeIdx]) {
        onChange(options[activeIdx].value)
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
  }

  function handleOptionClick(optValue: string, idx: number) {
    onChange(optValue)
    setActiveIdx(idx)
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div
      ref={containerRef}
      className={`kawan-select${open ? ' kawan-select-open' : ''}${disabled ? ' kawan-select-disabled' : ''}${className ? ` ${className}` : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        id={triggerId}
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        disabled={disabled}
        className="kawan-select-trigger"
        onClick={() => !disabled && setOpen((v) => !v)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="kawan-select-value">{currentLabel}</span>
        <ChevronDown size={14} className="kawan-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div
          ref={listRef}
          id={listId}
          role="listbox"
          aria-labelledby={triggerId}
          aria-activedescendant={`${optionIdPrefix}-${activeIdx}`}
          className="kawan-select-list"
          tabIndex={-1}
          onKeyDown={handleListKeyDown}
        >
          {options.map((opt, idx) => (
            <div
              key={opt.value}
              id={`${optionIdPrefix}-${idx}`}
              role="option"
              aria-selected={opt.value === value}
              data-active={idx === activeIdx ? 'true' : undefined}
              tabIndex={-1}
              className={`kawan-select-option${opt.value === value ? ' kawan-select-option-selected' : ''}${idx === activeIdx ? ' kawan-select-option-active' : ''}`}
              onPointerDown={(e) => {
                e.preventDefault() // prevent blur on trigger before onClick
                handleOptionClick(opt.value, idx)
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
