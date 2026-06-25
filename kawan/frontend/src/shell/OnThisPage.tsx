// OnThisPage — spy-scroll "on this page" island (sticky right rail).
// Uses IntersectionObserver to track which section is in view and highlights it.
// Click scrolls to the section. Hidden below the two-column breakpoint.

import { useEffect, useRef, useState } from 'react'

export interface PageSection {
  id: string
  label: string
}

interface OnThisPageProps {
  sections: PageSection[]
}

export function OnThisPage({ sections }: OnThisPageProps) {
  const [activeId, setActiveId] = useState<string>(sections[0]?.id ?? '')
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    if (sections.length === 0) return

    const handlers = new Map<string, boolean>()

    observerRef.current = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          handlers.set(entry.target.id, entry.isIntersecting)
        }
        // Set active to the first visible section (document order)
        for (const s of sections) {
          if (handlers.get(s.id)) {
            setActiveId(s.id)
            break
          }
        }
      },
      { rootMargin: '-10% 0px -70% 0px', threshold: 0 }
    )

    for (const s of sections) {
      const el = document.getElementById(s.id)
      if (el) observerRef.current.observe(el)
    }

    return () => {
      observerRef.current?.disconnect()
    }
  }, [sections])

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (!el) return
    el.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'
    })
  }

  if (sections.length === 0) return null

  return (
    <nav className="on-this-page" aria-label="On this page">
      <p className="on-this-page-heading">On this page</p>
      <ul className="on-this-page-list">
        {sections.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              className={`on-this-page-link${activeId === s.id ? ' on-this-page-link-active' : ''}`}
              onClick={() => scrollTo(s.id)}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
