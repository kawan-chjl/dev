// Faq — /faq with client-side search + category filters.
// Uses native <details>/<summary> for zero-dep accessible expand/collapse.

import { useEffect, useRef, useState } from 'react'
import { PageHeader } from '../PageHeader'
import { type FaqCategory, faqData } from './faqData'

const ALL = 'All'
const CATEGORIES: (typeof ALL | FaqCategory)[] = ['All', 'Using Kawan', 'How it works', 'Privacy']
const FAQ_PAGE_SIZE = 15

export function Faq() {
  const [query, setQuery] = useState('')
  const [activeCategory, setActiveCategory] = useState<typeof ALL | FaqCategory>(ALL)
  const [currentPage, setCurrentPage] = useState(1)
  const listTopRef = useRef<HTMLDivElement>(null)

  const filtered = faqData.filter((item) => {
    const matchCat = activeCategory === ALL || item.category === activeCategory
    if (!matchCat) return false
    if (query.trim() === '') return true
    const q = query.toLowerCase()
    return item.question.toLowerCase().includes(q) || item.answer.toLowerCase().includes(q)
  })
  const pageCount = Math.ceil(filtered.length / FAQ_PAGE_SIZE)
  const pageStart = (currentPage - 1) * FAQ_PAGE_SIZE
  const pageItems = filtered.slice(pageStart, pageStart + FAQ_PAGE_SIZE)

  useEffect(() => {
    if (pageCount > 0 && currentPage > pageCount) {
      setCurrentPage(pageCount)
    }
  }, [currentPage, pageCount])

  function handleQueryChange(nextQuery: string) {
    setQuery(nextQuery)
    setCurrentPage(1)
  }

  function handleCategoryChange(nextCategory: typeof ALL | FaqCategory) {
    setActiveCategory(nextCategory)
    setCurrentPage(1)
  }

  function handlePageChange(nextPage: number) {
    setCurrentPage(nextPage)
    requestAnimationFrame(() => {
      listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return (
    <div className="shell-page">
      <PageHeader
        title="FAQ"
        subtitle="Answers to common questions about Kawan."
        imageSrc="/illustrations/faq-card.webp"
      />

      <div className="faq-controls">
        <input
          className="faq-search"
          type="search"
          placeholder="Search questions..."
          aria-label="Search FAQ"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
        />
        <fieldset className="faq-filters">
          <legend className="faq-filters-legend">Filter by category</legend>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              className={`faq-filter-chip${activeCategory === cat ? ' faq-filter-chip-active' : ''}`}
              onClick={() => handleCategoryChange(cat)}
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
        <>
          <div ref={listTopRef} className="faq-list">
            {pageItems.map((item) => (
              <details key={item.id} className="faq-item">
                <summary className="faq-question">{item.question}</summary>
                <p className="faq-answer">{item.answer}</p>
              </details>
            ))}
          </div>
          {pageCount > 1 && (
            <nav className="faq-pagination" aria-label="FAQ pages">
              {Array.from({ length: pageCount }, (_, index) => {
                const page = index + 1
                return (
                  <button
                    key={page}
                    type="button"
                    className={`faq-page-node${page === currentPage ? ' faq-page-node-active' : ''}`}
                    onClick={() => handlePageChange(page)}
                    aria-current={page === currentPage ? 'page' : undefined}
                  >
                    {page}
                  </button>
                )
              })}
            </nav>
          )}
        </>
      )}
    </div>
  )
}
