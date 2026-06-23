// ScrollRevealFooter — design.md §6 Zone 1, layer 4.
// Footer sits beneath the content plane; content scrolls to expose it at end of scroll.
// Simple version: footer is position sticky-below / content area scrolls to reveal.
// Fancy fold choreography deferred per Q5.

import { Link } from 'react-router-dom'

export function ScrollRevealFooter() {
  return (
    <footer className="shell-footer" role="contentinfo">
      <div className="shell-footer-inner">
        <p className="shell-footer-copy">
          <span className="shell-footer-eye" aria-hidden="true">
            ◉
          </span>
          Kawan is watching — with your permission.
        </p>
        <nav className="shell-footer-nav" aria-label="Footer navigation">
          <Link to="/settings">Settings</Link>
          <Link to="/settings/audit">Audit log</Link>
        </nav>
      </div>
    </footer>
  )
}
