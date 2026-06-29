// ScrollRevealFooter — Layer 4. Fixed band, revealed at end of scroll.
// Footer copy uses no emdash per design-system.md §7.

import { Link } from 'react-router-dom'

export function ScrollRevealFooter() {
  return (
    <footer className="shell-footer" role="contentinfo">
      <div className="shell-footer-inner">
        {/* Row 1: Logo lockup */}
        <div className="shell-footer-row shell-footer-row-logo">
          <Link to="/" className="shell-footer-logo-link" aria-label="Kawan home">
            <img src="/kawan-logo.png" alt="" className="shell-footer-logo-img" width={26} height={26} />
            <span className="shell-footer-logo-name">Kawan</span>
          </Link>
        </div>
        {/* Row 2: Link row */}
        <div className="shell-footer-row shell-footer-row-links">
          <a href="https://github.com/kawan-chjl/dev" target="_blank" rel="noreferrer" className="shell-footer-link">
            GitHub
          </a>
          <Link to="/privacy" className="shell-footer-link">
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  )
}
