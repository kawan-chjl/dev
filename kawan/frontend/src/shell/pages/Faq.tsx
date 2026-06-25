// Faq — /faq with client-side search + category filters.
// Uses native <details>/<summary> for zero-dep accessible expand/collapse.

import { useState } from 'react'
import { PageHeader } from '../PageHeader'
import { type FaqCategory, faqData } from './faqData'

const ALL = 'All'
const CATEGORIES: (typeof ALL | FaqCategory)[] = ['All', 'Using Kawan', 'How it works', 'Privacy']

export function Faq() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<typeof ALL | FaqCategory>(ALL)

  const filtered = faqData.filter((item) => {
    const matchCat = activeCategory === ALL || item.category === activeCategory
    if (!matchCat) return false
    if (query.trim() === '') return true
    const q = query.toLowerCase()
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
  })

  return (
    <div className="shell-page">
      <PageHeader title="FAQ" subtitle="Answers to common questions about Kawan." />

      <div className="faq-controls">
        <input
          className="faq-search"
          type="search"
          placeholder="Search questions..."
          aria-label="Search FAQ"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <fieldset className="faq-filters">
          <legend className="faq-filters-legend">Filter by category</legend>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`faq-filter-chip${activeCategory === cat ? ' faq-filter-chip-active' : ''}`}
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory === cat}
            >
              {cat}
            </button>
          ))}
        </fieldset>
      </div>

      {filtered.length === 0 ? (
        <p className="faq-empty">No answers match that. Try another word.</p>
      ) : (
        <div className="faq-list">
          {filtered.map((item) => (
            <details key={item.id} className="faq-item">
              <summary className="faq-question">{item.question}</summary>
              <p className="faq-answer">{item.answer}</p>
            </details>
          ))}
        </div>
      )}
    </div>
  )
}
