// DatePicker — themed calendar + time popover, zero dependencies.
// Pure-custom, same house style as ui/Select.tsx.
// Props: value (ISO string or ''), onChange(ISO string), disabled?, aria-label?
//
// UX: clicking the trigger opens a popover with a month calendar and a time row.
// Selecting a date + time closes and calls onChange with the full ISO datetime.
// Keyboard: Escape closes the popover and returns focus to the trigger.
// Month navigation via the prev/next buttons; day selection via click only.

import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface DatePickerProps {
  value: string
  onChange: (iso: string) => void
  disabled?: boolean
  'aria-label'?: string
}

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December'
]

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

// Parse a local datetime-local string "YYYY-MM-DDTHH:MM" into parts, or return null
function parseLocal(iso: string): { year: number; month: number; day: number; hour: number; minute: number } | null {
  if (!iso) return null
  // Accept both "YYYY-MM-DDTHH:MM" and full ISO
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/)
  if (!m) return null
  return {
    year: Number(m[1]),
    month: Number(m[2]) - 1, // 0-indexed
    day: Number(m[3]),
    hour: Number(m[4]),
    minute: Number(m[5])
  }
}

function toLocalString(year: number, month: number, day: number, hour: number, minute: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function firstDayOfWeek(year: number, month: number): number {
  return new Date(year, month, 1).getDay()
}

export function DatePicker({ value, onChange, disabled, 'aria-label': ariaLabel }: DatePickerProps) {
  const parsed = parseLocal(value)
  const now = new Date()

  const [open, setOpen] = useState(false)
  // View state — month/year being displayed in calendar
  const [viewYear, setViewYear] = useState(parsed?.year ?? now.getFullYear())
  const [viewMonth, setViewMonth] = useState(parsed?.month ?? now.getMonth())
  // Selected date parts (null = nothing selected yet)
  const [selYear, setSelYear] = useState<number | null>(parsed?.year ?? null)
  const [selMonth, setSelMonth] = useState<number | null>(parsed?.month ?? null)
  const [selDay, setSelDay] = useState<number | null>(parsed?.day ?? null)
  const [selHour, setSelHour] = useState<number>(parsed?.hour ?? 9)
  const [selMinute, setSelMinute] = useState<number>(parsed?.minute ?? 0)

  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  // Sync internal state when value prop changes externally
  useEffect(() => {
    const p = parseLocal(value)
    if (p) {
      setSelYear(p.year)
      setSelMonth(p.month)
      setSelDay(p.day)
      setSelHour(p.hour)
      setSelMinute(p.minute)
      setViewYear(p.year)
      setViewMonth(p.month)
    } else {
      setSelYear(null)
      setSelMonth(null)
      setSelDay(null)
    }
  }, [value])

  // Outside click closes
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

  function handleDayClick(day: number) {
    const newYear = viewYear
    const newMonth = viewMonth
    setSelYear(newYear)
    setSelMonth(newMonth)
    setSelDay(day)
    // Emit immediately — time was already set
    onChange(toLocalString(newYear, newMonth, day, selHour, selMinute))
  }

  function handleHourChange(h: number) {
    const clamped = Math.max(0, Math.min(23, h))
    setSelHour(clamped)
    if (selYear !== null && selMonth !== null && selDay !== null) {
      onChange(toLocalString(selYear, selMonth, selDay, clamped, selMinute))
    }
  }

  function handleMinuteChange(m: number) {
    const clamped = Math.max(0, Math.min(59, m))
    setSelMinute(clamped)
    if (selYear !== null && selMonth !== null && selDay !== null) {
      onChange(toLocalString(selYear, selMonth, selDay, selHour, clamped))
    }
  }

  function prevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11)
      setViewYear((y) => y - 1)
    } else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0)
      setViewYear((y) => y + 1)
    } else setViewMonth((m) => m + 1)
  }

  // Format trigger label
  let triggerLabel = 'Pick a date and time'
  if (selYear !== null && selMonth !== null && selDay !== null) {
    triggerLabel = `${selDay} ${MONTHS[selMonth].slice(0, 3)} ${selYear}, ${pad(selHour)}:${pad(selMinute)}`
  }

  const isSelected = (day: number) => selYear === viewYear && selMonth === viewMonth && selDay === day

  const isToday = (day: number) => {
    const t = new Date()
    return t.getFullYear() === viewYear && t.getMonth() === viewMonth && t.getDate() === day
  }

  const totalDays = daysInMonth(viewYear, viewMonth)
  const startOffset = firstDayOfWeek(viewYear, viewMonth)
  // Build 6-row grid (0 = empty cell)
  const cells: number[] = []
  for (let i = 0; i < startOffset; i++) cells.push(0)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(0)

  return (
    <div
      ref={containerRef}
      className={`kawan-datepicker${open ? ' kawan-datepicker-open' : ''}${disabled ? ' kawan-datepicker-disabled' : ''}`}
    >
      <button
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={ariaLabel ?? 'Choose date and time'}
        className="kawan-datepicker-trigger"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            setOpen(false)
            triggerRef.current?.focus()
          }
        }}
      >
        <span className="kawan-datepicker-value">{triggerLabel}</span>
        <ChevronDown size={14} className="kawan-select-chevron" aria-hidden="true" />
      </button>

      {open && (
        <div className="kawan-datepicker-popover" role="dialog" aria-label="Date and time picker">
          {/* Month navigation */}
          <div className="kawan-dp-nav">
            <button type="button" className="kawan-dp-nav-btn" aria-label="Previous month" onClick={prevMonth}>
              <ChevronLeft size={14} aria-hidden="true" />
            </button>
            <span className="kawan-dp-month-label">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button type="button" className="kawan-dp-nav-btn" aria-label="Next month" onClick={nextMonth}>
              <ChevronRight size={14} aria-hidden="true" />
            </button>
          </div>

          {/* Day-of-week headers */}
          <div className="kawan-dp-grid">
            {DAYS_SHORT.map((d) => (
              <span key={d} className="kawan-dp-dow" aria-hidden="true">
                {d}
              </span>
            ))}
            {cells.map((day, idx) =>
              day === 0 ? (
                // biome-ignore lint/suspicious/noArrayIndexKey: stable positional empty cells
                <span key={`e-${idx}`} className="kawan-dp-cell kawan-dp-cell-empty" aria-hidden="true" />
              ) : (
                <button
                  // biome-ignore lint/suspicious/noArrayIndexKey: stable positional day cells
                  key={`d-${idx}`}
                  type="button"
                  aria-label={`${day} ${MONTHS[viewMonth]} ${viewYear}${isSelected(day) ? ' (selected)' : ''}`}
                  aria-current={isToday(day) ? 'date' : undefined}
                  className={`kawan-dp-cell kawan-dp-day${isSelected(day) ? ' kawan-dp-day-selected' : ''}${isToday(day) ? ' kawan-dp-day-today' : ''}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {/* Time row */}
          <div className="kawan-dp-time">
            <span className="kawan-dp-time-label">Time</span>
            <div className="kawan-dp-time-inputs">
              <input
                type="number"
                className="kawan-dp-time-input"
                aria-label="Hour (0-23)"
                min={0}
                max={23}
                value={pad(selHour)}
                onChange={(e) => handleHourChange(Number(e.target.value))}
              />
              <span className="kawan-dp-time-sep" aria-hidden="true">
                :
              </span>
              <input
                type="number"
                className="kawan-dp-time-input"
                aria-label="Minute (0-59)"
                min={0}
                max={59}
                step={5}
                value={pad(selMinute)}
                onChange={(e) => handleMinuteChange(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Close button */}
          <div className="kawan-dp-footer">
            <button type="button" className="kawan-dp-done-btn" onClick={() => setOpen(false)}>
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
