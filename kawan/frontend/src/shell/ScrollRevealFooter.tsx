// ScrollRevealFooter — Layer 4. Warm-dark band, revealed at end of scroll.
// Footer text uses no emdash per design-system.md §7.

import { Eye } from 'lucide-react'
import { Link } from 'react-router-dom'

export function ScrollRevealFooter() {
  return (
    <footer className="shell-footer" role="contentinfo">
      <div className="shell-footer-inner">
        <p className="shell-footer-copy">
          <span className="shell-footer-eye" aria-hidden="true">
            <Eye size={16} />
          </span>
          Kawan is watching, with your permission.
        </p>
        <nav className="shell-footer-nav" aria-label="Footer navigation">
          <Link to="/settings">Settings</Link>
          <Link to="/settings/audit">History</Link>
        </nav>
      </div>
    </footer>
  )
}
